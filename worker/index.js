import qrcode from "qrcode-generator";
import home from "../web/index.html";
import checkPage from "../web/check-in.html";
import style from "../web/style.css";
import app from "../web/app.js?raw";
import checkApp from "../web/check-in.js?raw";
import siteMode from "../web/site-mode.js?raw";
import eventSource from "../web/event.js?raw";
import hero from "../assets/herbal-pharmacy.jpg";
import speakerOne from "../assets/speaker-sample-1.jpg";
import speakerTwo from "../assets/speaker-sample-2.jpg";
import speakerThree from "../assets/speaker-sample-3.jpg";
import scanner from "../node_modules/html5-qrcode/html5-qrcode.min.js?raw";
import { event, hasPrivacyNotice } from "../web/event.js";

const demoCode = "TCM-DEMO-000000000001";
const codePattern = /^TCM-[A-Z0-9]{32}$/;
const mailPattern = /^[a-z0-9][a-z0-9._+'%-]*@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const textEncoder = new TextEncoder();
const assets = {
  "/": [home, "text/html; charset=utf-8"],
  "/check-in": [checkPage, "text/html; charset=utf-8"],
  "/check-in.html": [checkPage, "text/html; charset=utf-8"],
  "/style.css": [style, "text/css; charset=utf-8"],
  "/app.js": [app, "text/javascript; charset=utf-8"],
  "/check-in.js": [checkApp, "text/javascript; charset=utf-8"],
  "/site-mode.js": [siteMode, "text/javascript; charset=utf-8"],
  "/event.js": [eventSource, "text/javascript; charset=utf-8"],
  "/scanner.js": [scanner, "text/javascript; charset=utf-8"],
  "/hero.jpg": [hero, "image/jpeg"],
  "/speaker-sample-1.jpg": [speakerOne, "image/jpeg"],
  "/speaker-sample-2.jpg": [speakerTwo, "image/jpeg"],
  "/speaker-sample-3.jpg": [speakerThree, "image/jpeg"]
};
const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; frame-src https://www.google.com; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'"
};
const api = (data, status = 200) => Response.json(data, {
  status,
  headers: { ...securityHeaders, "cache-control": "no-store" }
});
const fail = (message, status = 400) => api({ message }, status);

function qrImage(code) {
  const qr = qrcode(0, "M");
  qr.addData(code);
  qr.make();
  return qr.createDataURL(6, 24);
}

async function hashText(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return bytesToHex(digest);
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function issueCode(email, key) {
  const hmac = await crypto.subtle.importKey("raw", textEncoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", hmac, textEncoder.encode(email));
  return "TCM-" + bytesToHex(signature).slice(0, 32).toUpperCase();
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 4096) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const payload = new TextDecoder().decode(new Uint8Array(chunks.flatMap((part) => Array.from(part))));
    const data = JSON.parse(payload);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function readAttendee(data) {
  const clean = (value) => typeof value === "string" ? value.trim() : "";
  const name = clean(data.name);
  const email = clean(data.email).toLowerCase();
  const organization = clean(data.organization);
  const lineId = clean(data.lineId);
  if (data.website || data.consent !== true || !name || name.length > 60 || email.length > 120 || !mailPattern.test(email) || organization.length > 100) return null;
  if (lineId.length > 40 || /[\r\n\t]/.test(lineId)) return null;
  return { name, email, organization, lineId };
}

function settings(env) {
  const endpoint = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.APPS_SCRIPT_URL || "");
  const configured = endpoint && env.APPS_SCRIPT_SECRET?.length >= 32 && env.TICKET_SECRET?.length >= 32 && env.STAFF_CODE?.length >= 16;
  const finalized = event.published && event.date && event.organizer && event.venue.name && event.venue.address && hasPrivacyNotice;
  const live = finalized && configured;
  return {
    mode: !event.published ? "demo" : live && env.REGISTRATION_OPEN === "1" ? "live" : "closed",
    checkMode: !event.published ? "demo" : live && env.CHECK_IN_OPEN === "1" ? "live" : "closed",
    lineEnabled: Boolean(finalized && env.LINE_INVITE_URL?.startsWith("https://"))
  };
}

async function callGoogle(env, body) {
  try {
    const response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, secret: env.APPS_SCRIPT_SECRET }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) return null;
    const result = await response.json();
    return typeof result?.status === "string" ? result : null;
  } catch {
    return null;
  }
}

async function register(env, data, mode, origin) {
  if (mode === "closed") return fail("正式報名尚未開放。", 403);
  const attendee = readAttendee(data);
  if (!attendee) return fail("請確認姓名、電子郵件及資料使用同意。");
  if (mode === "demo") {
    if (attendee.email !== "attendee@example.invalid") return fail("預覽只接受測試資料。");
    return api({ code: demoCode, qr: qrImage(demoCode) });
  }
  if (data.noticeVersion !== event.privacy.version) return fail("請重新整理頁面，閱讀最新版的個人資料告知事項。");
  const code = await issueCode(attendee.email, env.TICKET_SECRET);
  const result = await callGoogle(env, {
    action: "register", attendee, noticeVersion: event.privacy.version, ticketHash: await hashText(code), code, qr: qrImage(code).split(",")[1],
    event: { title: event.title, date: event.date, venue: event.venue.name, address: event.venue.address, url: env.PUBLIC_EVENT_URL || origin,
      replyTo: event.contactEmail, line: env.LINE_INVITE_URL || "" }
  });
  switch (result?.status) {
    case "sent": return api({ message: "報名已完成，確認信已寄出。請查收 Email 及垃圾郵件匣。", emailSent: true });
    case "duplicate": return api({ message: "若此信箱已完成報名，請查收先前的確認信；需要協助請聯絡主辦單位。", emailSent: false });
    case "mail_failed": return api({ message: "名冊已收到報名，但確認信尚未寄出。請稍後使用相同 Email 重試，或聯絡主辦單位。", emailSent: false });
    case "full": return fail("本場報名名額已滿。", 409);
    default: return fail("暫時無法確認報名結果。請稍後用同一 Email 重試。", 503);
  }
}

async function checkIn(env, data, mode) {
  if (mode === "closed") return fail("正式報到尚未開放。", 403);
  const code = typeof data.code === "string" ? data.code.trim() : "";
  if (mode === "demo") {
    return code === demoCode ? api({ message: "測試與會者已完成預覽報到。" }) : fail("找不到此預覽票券。", 404);
  }
  const staff = typeof data.staff === "string" ? data.staff : "";
  if (staff.length > 128 || await hashText(staff) !== await hashText(env.STAFF_CODE)) {
    return fail("工作人員通行碼有誤。", 403);
  }
  if (!codePattern.test(code)) return fail("報到代碼格式不正確。");
  const result = await callGoogle(env, { action: "check-in", ticketHash: await hashText(code) });
  switch (result?.status) {
    case "checked_in": return api({ message: result.name + " 已完成報到。" });
    case "already": return api({ message: result.name + " 已於 " + result.time + " 報到，無須重複操作。" });
    case "missing": return fail("名冊中找不到此報到憑證。", 404);
    default: return fail("暫時無法核驗報到，請稍後重試。", 503);
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const path = url.pathname;
    const asset = Object.hasOwn(assets, path) ? assets[path] : null;
    if (asset && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : asset[0], {
        headers: { ...securityHeaders, "content-type": asset[1], "cache-control": path === "/hero.jpg" || path === "/scanner.js" ? "public, max-age=3600" : "no-cache" }
      });
    }
    if (path === "/api/status" && request.method === "GET") return api(settings(env));
    if (!["/api/register", "/api/check-in"].includes(path) || request.method !== "POST") return fail("找不到此頁面。", 404);
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return fail("請從研討會網站送出。", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("資料格式不正確。", 415);
    const data = await readJson(request);
    if (!data) return fail("資料格式不正確。");
    const state = settings(env);
    return path === "/api/register" ? register(env, data, state.mode, url.origin) : checkIn(env, data, state.checkMode);
  }
};
