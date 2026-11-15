const PREVIEW_PAGE = 'https://imprjoseph.github.io/tcm-symposium/check-in.html';
const PREVIEW_TICKET = 'TCM-DEMO-000000000001';

function doPost(e) {
  const form = e?.parameter || {};
  if (form.action !== 'check-in' || !e?.postData || e.postData.length > 1024) {
    return result_('報到資料格式有誤', '請返回報到頁後重試。');
  }
  const password = form.staff;
  if (typeof password !== 'string' || !password || password.length > 128 || !validPassword_(password)) {
    return result_('工作人員密碼有誤', '請返回報到頁，確認密碼後再試。');
  }
  if (String(form.code || '').trim() !== PREVIEW_TICKET) {
    return result_('找不到此預覽票券', '請使用會議網站產生的測試票券。');
  }
  return result_('預覽報到完成', '測試票券已通過驗證。');
}

function doGet() {
  return result_('工作人員報到預覽', '請從會議網站提交密碼與預覽票券。');
}

function validPassword_(password) {
  const actual = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, PREVIEW_SALT + ':' + password, Utilities.Charset.UTF_8
  ).map((byte) => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) mismatch |= actual.charCodeAt(i) ^ PREVIEW_PASSWORD_DIGEST.charCodeAt(i);
  return mismatch === 0;
}

function result_(title, message) {
  const html = '<!doctype html><html lang="zh-Hant"><head><base target="_top"><meta name="robots" content="noindex"><style>' +
    'body{margin:0;display:grid;min-height:100vh;place-items:center;background:#f8f6ef;color:#17372e;font:16px/1.7 system-ui,sans-serif}' +
    'main{width:min(30rem,calc(100% - 5rem));padding:1.5rem;background:#fffdf7;border:1px solid #d9ded0;border-radius:5px}' +
    'h1{font-size:1.6rem}a{display:inline-block;padding:.5rem .8rem;background:#17372e;border-radius:4px;color:white;text-decoration:none}' +
    '</style></head><body><main><h1>' + title + '</h1><p>' + message + '</p><a href="' + PREVIEW_PAGE +
    '">返回工作人員報到</a></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
