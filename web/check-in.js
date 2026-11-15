import { event, googleWebApp, hasPrivacyNotice, previewCheckInApp } from "./event.js?v=staff-password";
import { githubPages } from "./site-mode.js";

const byId = (id) => document.getElementById(id);
const form = byId("check-form");
const input = byId("check-code");
const submit = form.querySelector('[type="submit"]');
const result = byId("check-result");
const start = byId("start-scan");
const stop = byId("stop-scan");
const file = byId("read-file");
let mode = "closed";
let reader;
let loading;
let scanning = false;
let decoding = false;

function show(message, error = false) {
  result.textContent = message;
  result.dataset.error = String(error);
}
function getReader() {
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./scanner.js";
    script.onload = () => {
      reader = new window.Html5Qrcode("qr-reader", {
        formatsToSupport: [window.Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      resolve(reader);
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("scanner"));
    };
    document.head.append(script);
  });
  return loading;
}
async function stopScanner() {
  if (scanning) await reader.stop();
  scanning = false;
  stop.hidden = true;
  start.disabled = mode === "closed";
  file.disabled = mode === "closed";
}
function applyCode(raw) {
  const code = raw.trim();
  if (!/^(?:TCM-DEMO-[A-Z0-9]{12}|TCM-[A-Z0-9]{32})$/.test(code)) {
    show("此圖片中的 QR Code 不是本研討會的報到憑證。", true);
    return false;
  }
  input.value = code;
  input.focus();
  show("已讀取報到代碼，請按「確認報到」。");
  return true;
}
submit.disabled = start.disabled = file.disabled = true;
function setMode(nextMode) {
  mode = nextMode;
  byId("check-mode").textContent = mode === "demo" ? "預覽模式。請輸入工作人員密碼及測試票券。" : mode === "live" ? "請輸入工作人員密碼以核驗與會者票券。" : "報到目前尚未開放。";
  form.elements.staff.disabled = mode === "closed";
  const last = byId("last-demo");
  let saved;
  try { saved = localStorage.getItem("tcm-demo-ticket"); } catch {}
  last.hidden = mode !== "demo" || !saved;
  last.onclick = () => applyCode(saved);
  submit.disabled = start.disabled = file.disabled = mode === "closed";
}
if (githubPages) {
  const live = event.published && event.checkInOpen && hasPrivacyNotice && googleWebApp;
  const demo = !event.published && previewCheckInApp;
  if (live) form.action = googleWebApp;
  if (demo) form.action = previewCheckInApp;
  setMode(live ? "live" : demo ? "demo" : "closed");
} else {
  fetch("./api/status").then((response) => {
    if (!response.ok) throw new Error("status");
    return response.json();
  }).then((data) => setMode(data.checkMode)).catch(() => {
    byId("check-mode").textContent = "暫時無法確認報到狀態。";
  });
}

start.onclick = async () => {
  start.disabled = file.disabled = true;
  show("正在開啟相機…");
  try {
    const scanner = await getReader();
    await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 205, height: 205 } }, async (code) => {
      if (decoding || !scanning || !applyCode(code)) return;
      decoding = true;
      try { await stopScanner(); } finally { decoding = false; }
    });
    scanning = true;
    stop.hidden = false;
    show("請將 QR Code 對準相機中央。");
  } catch {
    await stopScanner();
    show("無法開啟相機。可改用圖片或手動輸入報到代碼。", true);
  }
};
stop.onclick = () => stopScanner().catch(() => show("相機暫時無法關閉，請重新整理頁面。", true));
file.onchange = async () => {
  if (!file.files.length) return;
  start.disabled = file.disabled = true;
  try { applyCode(await (await getReader()).scanFile(file.files[0], false)); }
  catch { show("無法讀取圖片中的 QR Code，請使用清晰截圖。", true); }
  finally { file.value = ""; start.disabled = file.disabled = false; }
};

form.onsubmit = async (e) => {
  if (githubPages && mode !== "closed" && !submit.disabled) return;
  e.preventDefault();
  if (submit.disabled) return;
  const code = input.value.trim();
  submit.disabled = true;
  show("正在核驗票券…");
  try {
    const response = await fetch("./api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, staff: form.elements.staff.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "暫時無法報到。");
    show(data.message);
    input.select();
  } catch (error) { show(error.message, true); }
  finally { submit.disabled = false; }
};
