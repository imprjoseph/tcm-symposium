// GitHub Pages posts ordinary HTML forms directly to this deployment.
function submitPagesForm_(e) {
  const properties = PropertiesService.getScriptProperties();
  const action = e.parameter.action;
  const config = pagesEvent_(properties);
  if (!config || Number(e.postData.length) > 4096) return pagesResult_(action, {status: 'unavailable'}, config);
  let result;
  if (action === 'register') {
    result = registerFromPages_(properties, config, e.parameter);
  } else if (action === 'check-in') {
    result = checkInFromPages_(properties, e.parameter);
  } else {
    result = {status: 'invalid'};
  }
  return pagesResult_(action, result, config);
}

function pagesEvent_(properties) {
  try {
    const config = JSON.parse(properties.getProperty('PAGES_EVENT_JSON') || '{}');
    const fields = ['url', 'title', 'date', 'venue', 'address', 'noticeVersion'];
    if (!fields.every((key) => typeof config[key] === 'string' && config[key].trim())) return null;
    if (!/^https:\/\/[a-z0-9.-]+(?::443)?(?:\/[^?#\s]*)?$/i.test(config.url)) return null;
    return {...config, url: config.url.replace(/\/?$/, '/')};
  } catch {
    return null;
  }
}

function registerFromPages_(properties, config, form) {
  if (properties.getProperty('REGISTRATION_OPEN') !== '1') return {status: 'closed'};
  const ticketSecret = properties.getProperty('TICKET_SECRET');
  if (!ticketSecret || ticketSecret.length < 32) return {status: 'unavailable'};
  if (form.consent !== 'yes' || form.noticeVersion !== config.noticeVersion) return {status: 'notice'};
  const attendee = {
    name: String(form.name || '').trim(),
    email: String(form.email || '').trim().toLowerCase(),
    organization: String(form.organization || '').trim()
  };
  if (form.website || !attendee.name || attendee.name.length > 60 ||
      attendee.email.length > 120 || !/^[a-z0-9][a-z0-9._+'%-]*@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(attendee.email) ||
      attendee.organization.length > 100) return {status: 'invalid'};
  const signature = Utilities.computeHmacSha256Signature(attendee.email, ticketSecret, Utilities.Charset.UTF_8);
  const hex = signature.slice(0, 16).map((byte) => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('').toUpperCase();
  const code = 'TCM-' + hex;
  const qr = TcmQrEncoder.ticketImage(code).split(',')[1];
  return withRoster_(properties, {
    action: 'register', attendee, ticketHash: digest_(code), code, qr, event: config, noticeVersion: config.noticeVersion
  });
}

function checkInFromPages_(properties, form) {
  if (properties.getProperty('CHECK_IN_OPEN') !== '1') return {status: 'closed'};
  const staff = properties.getProperty('STAFF_CODE');
  if (!staff || staff.length < 16 || !equal_(form.staff, staff)) return {status: 'denied'};
  const code = String(form.code || '').trim();
  if (!/^TCM-[A-Z0-9]{32}$/.test(code)) return {status: 'invalid'};
  return withRoster_(properties, {action: 'check-in', ticketHash: digest_(code)});
}

function pagesResult_(action, result, config) {
  const checkIn = action === 'check-in';
  // Keep public responses from disclosing whether an email is in the roster.
  const submissionHandled = !checkIn && ['sent', 'duplicate', 'mail_failed', 'full'].includes(result.status);
  const status = submissionHandled ? 'submitted' : result.status;
  let copy = {
    submitted: ['已處理報名請求', '報名以收到確認信為準。請查看收件匣與垃圾郵件匣。若未收到，可在確認信箱正確後重試，或聯絡主辦單位。'],
    closed: ['目前尚未開放', '請以會議網站公告為準。'],
    notice: ['請重新閱讀個資告知', '告知事項版本可能已更新。請回到網站重新整理，再填寫報名。'],
    denied: ['通行碼有誤', '請確認工作人員通行碼。'],
    missing: ['找不到票券', '請確認使用本次研討會確認信中的報到憑證。'],
    invalid: ['資料格式有誤', '請返回表單檢查後再試。']
  }[status] || ['暫時無法處理', '請稍後重試。如已填寫報名，請使用相同的電子郵件。'];
  if (result.status === 'checked_in') copy = ['報到完成', result.name + ' 已完成報到。'];
  if (result.status === 'already') copy = ['此票券已報到', result.name + ' 已於 ' + result.time + ' 報到。'];
  const link = config ? config.url + (checkIn ? 'check-in.html' : '#register') : '';
  const html = '<!doctype html><html lang="zh-Hant"><head><base target="_top"><meta name="robots" content="noindex"><style>' +
    'body{margin:0;display:grid;min-height:100vh;place-items:center;background:#f0eee4;color:#18372e;font:16px/1.7 system-ui,sans-serif}' +
    'main{width:min(480px,calc(100% - 68px));padding:24px;background:#fffdf5;border:1px solid #c9cec0;border-radius:5px}' +
    'h1{font-size:28px}a{color:#fff;background:#18372e;border-radius:4px;text-decoration:none;padding:9px 14px;display:inline-block}</style></head><body><main><h1>' +
    escape_(copy[0]) + '</h1><p>' + escape_(copy[1]) + '</p>' +
    (link ? '<a href="' + escape_(link) + '">' + (checkIn ? '返回報到頁' : '返回研討會網站') + '</a>' : '') + '</main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(copy[0]).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
