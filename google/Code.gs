// 此程式部署在主辦單位的 Google Apps Script。正式設定請見 README。
const ROSTER = '報名名冊';
const HEADERS = ['報名時間', '姓名', '電子郵件', '服務單位', '報到代碼雜湊', '確認信狀態', '確認信寄出時間', '報到時間'];
const NOTICE_HEADER = '個資告知版本';
const STATE_SENT = '已寄出';
const STATE_PENDING = '待寄送';
const STATE_FAILED = '待重試';

function doGet() {
  return json_({status: 'ready'});
}

function doPost(e) {
  if (String(e?.postData?.type || '').indexOf('application/x-www-form-urlencoded') === 0) {
    return submitPagesForm_(e);
  }
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return json_({status: 'invalid'});
  }
  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty('SITE_SHARED_SECRET');
  if (!secret || !data || !equal_(data.secret, secret)) return json_({status: 'denied'});
  return json_(withRoster_(properties, data));
}

function withRoster_(properties, data) {
  if (!/^[a-f0-9]{64}$/.test(data.ticketHash || '')) return {status: 'invalid'};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(12000)) return {status: 'busy'};
  try {
    const sheet = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID')).getSheetByName(ROSTER);
    if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) {
      return {status: 'configuration'};
    }
    if (data.action === 'register') {
      if (data.noticeVersion && sheet.getRange(1, 9).getValues()[0][0] !== NOTICE_HEADER) return {status: 'configuration'};
      return register_(sheet, properties, data);
    }
    if (data.action === 'check-in') return checkIn_(sheet, data.ticketHash);
    return {status: 'invalid'};
  } catch (error) {
    // Keep registration data and credentials out of execution logs.
    console.error('Symposium request failed: ' + error.name);
    return {status: 'unavailable'};
  } finally {
    lock.releaseLock();
  }
}

function register_(sheet, properties, data) {
  const attendee = data.attendee;
  const event = data.event;
  if (!attendee || !event || !/^[a-z0-9][a-z0-9._+'%-]*@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(attendee.email || '') ||
      typeof attendee.name !== 'string' || !attendee.name || attendee.name.length > 60 || attendee.email.length > 120 ||
      typeof attendee.organization !== 'string' || attendee.organization.length > 100 ||
      !/^TCM-[A-Z0-9]{32}$/.test(data.code || '') || typeof data.qr !== 'string' || data.qr.length > 18000 ||
      !/^[A-Za-z0-9+/=]+$/.test(data.qr) || digest_(data.code) !== data.ticketHash) return {status: 'invalid'};

  const existing = find_(sheet, 3, attendee.email);
  let row = existing;
  if (row) {
    const stored = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    if (stored[5] === STATE_SENT) return {status: 'duplicate'};
    if (stored[4] !== data.ticketHash) return {status: 'configuration'};
    attendee.name = stored[1];
  } else {
    const capacity = Number(properties.getProperty('CAPACITY'));
    if (!Number.isSafeInteger(capacity) || capacity < 1) return {status: 'configuration'};
    row = sheet.getLastRow() + 1;
    if (row - 2 >= capacity) return {status: 'full'};
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 200);
    const record = [
      new Date(), textCell_(attendee.name), textCell_(attendee.email), textCell_(attendee.organization), data.ticketHash,
      STATE_PENDING, '', ''
    ];
    if (data.noticeVersion) record.push(textCell_(data.noticeVersion));
    sheet.getRange(row, 1, 1, record.length).setValues([record]);
    SpreadsheetApp.flush();
  }

  try {
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('quota');
    sendConfirmation_(attendee, event, data);
  } catch (error) {
    sheet.getRange(row, 6).setValue(STATE_FAILED);
    SpreadsheetApp.flush();
    return {status: 'mail_failed'};
  }
  sheet.getRange(row, 6, 1, 2).setValues([[STATE_SENT, new Date()]]);
  SpreadsheetApp.flush();
  return {status: 'sent'};
}

function checkIn_(sheet, hash) {
  const row = find_(sheet, 5, hash);
  if (!row) return {status: 'missing'};
  const record = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const name = String(record[1]);
  if (record[7] instanceof Date) {
    return {status: 'already', name: name, time: Utilities.formatDate(record[7], 'Asia/Taipei', 'yyyy/MM/dd HH:mm')};
  }
  sheet.getRange(row, 8).setValue(new Date());
  SpreadsheetApp.flush();
  return {status: 'checked_in', name: name};
}

function find_(sheet, column, value) {
  const count = sheet.getLastRow() - 1;
  if (count < 1) return null;
  const match = sheet.getRange(2, column, count, 1).createTextFinder(value).matchEntireCell(true).matchCase(true).findNext();
  return match ? match.getRow() : null;
}

function sendConfirmation_(attendee, event, ticket) {
  const link = https_(event.url);
  const line = https_(event.line);
  const subject = '【報名確認】' + event.title;
  const body = [
    attendee.name + ' 您好，您的報名已完成。',
    '日期：' + event.date,
    '地點：' + event.venue + '・' + event.address,
    '請於報到時出示本信中的 QR Code 圖片或報到代碼。',
    '報到代碼：' + ticket.code,
    link ? '會議網站：' + link : '',
    line ? 'LINE 會議群：' + line : ''
  ].filter(Boolean).join('\n');
  const image = Utilities.newBlob(Utilities.base64Decode(ticket.qr), 'image/gif', 'check-in-qr.gif');
  const html = '<div lang="zh-Hant"><h2>' + escape_(subject) + '</h2><p>' +
    escape_(body).replace(/\n/g, '<br>') + '</p><p>' +
    (link ? '<a href="' + escape_(link) + '">查看會議網站</a> ' : '') +
    (line ? '<a href="' + escape_(line) + '">加入 LINE 會議群</a>' : '') +
    '</p><img width="184" height="184" src="cid:ticket" alt="報到 QR Code"></div>';
  const options = {to: attendee.email, subject, body, htmlBody: html, inlineImages: {ticket: image}, attachments: [image], name: event.title};
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.replyTo || '')) options.replyTo = event.replyTo;
  MailApp.sendEmail(options);
}

function textCell_(value) {
  return /^[=+\-@']/.test(value) ? "'" + value : value;
}
function https_(value) {
  return typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value) ? value : '';
}
function escape_(value) {
  return String(value).replace(/[&<>"']/g, function(character) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character];
  });
}
function digest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function(byte) { return ((byte + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}
function equal_(left, right) {
  if (typeof left !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < right.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
