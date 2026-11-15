import { event, googleWebApp, hasPrivacyNotice, sampleSpeakers } from "./event.js?v=speaker-profiles";
import { githubPages } from "./site-mode.js";

const byId = (id) => document.getElementById(id);
const make = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
};
const form = byId("registration");
const status = byId("registration-status");
const submit = form.querySelector('[type="submit"]');
const fields = form.elements;
let mode = "closed";
let submitting = false;

function setStatus(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}
const menu = document.querySelector(".menu");
const nav = byId("navigation");
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  nav.dataset.open = String(open);
});
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    menu.setAttribute("aria-expanded", "false");
    nav.dataset.open = "false";
  }
});

if (event.date) byId("event-date").textContent = event.date;
if (event.published) {
  byId("footer-caption").textContent = event.organizer;
  byId("privacy-draft").hidden = hasPrivacyNotice;
}

if (event.venue.name && event.venue.address) {
  byId("venue-short").textContent = event.venue.name;
  byId("venue-address").textContent = event.venue.address;
  const transit = byId("venue-transit");
  for (const { label, detail } of event.venue.transit ?? []) {
    const item = make("li");
    item.append(make("strong", label), document.createTextNode("　" + detail));
    transit.append(item);
  }
  transit.hidden = !transit.childElementCount;
  const directions = byId("directions");
  directions.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(event.venue.name + " " + event.venue.address);
  directions.hidden = false;
  if (event.venue.transitUrl) {
    const transitLink = byId("venue-transit-source");
    transitLink.href = event.venue.transitUrl;
    transitLink.hidden = false;
  }
  byId("map-title").textContent = event.venue.name;
  byId("map-note").textContent = event.venue.address;
  if (event.venue.embedUrl) {
    const mapButton = byId("load-map");
    mapButton.hidden = false;
    mapButton.onclick = () => {
      const iframe = make("iframe");
      iframe.src = event.venue.embedUrl;
      iframe.title = "研討會會場 Google 地圖";
      iframe.referrerPolicy = "no-referrer";
      byId("map-card").replaceChildren(iframe);
    };
  }
}

const speakerList = byId("speaker-list");
const showSamples = !event.published && !event.speakers.length;
const speakers = showSamples ? sampleSpeakers : event.speakers;
const speakerNote = byId("speaker-note");
speakerList.hidden = !speakers.length;
speakerNote.hidden = !showSamples && speakers.length > 0;
if (showSamples) speakerNote.textContent = "以下為虛構講師樣本，姓名、單位與照片皆為示意。正式名單待公告。";
for (const speaker of speakers) {
  const card = make("article", "", "speaker");
  const portrait = make("div", speaker.photo ? "" : speaker.mark, "portrait");
  if (speaker.photo) {
    const img = make("img");
    img.src = speaker.photo;
    img.alt = "";
    img.width = 464;
    img.height = 464;
    img.loading = "lazy";
    portrait.append(img);
  } else portrait.setAttribute("aria-hidden", "true");
  const body = make("div", "", "speaker-text");
  body.append(make("h3", speaker.name));
  if (speaker.title) body.append(make("p", speaker.title, "speaker-title"));
  if (speaker.organization) body.append(make("p", speaker.organization));
  if (speaker.specialty) {
    const specialty = make("p", "", "speaker-specialty");
    specialty.append(make("strong", "專長"), document.createTextNode("　" + speaker.specialty));
    body.append(specialty);
  }
  const profile = make("dl", "", "speaker-profile");
  for (const [label, content] of [["個人簡介", speaker.bio], ["相關經歷", speaker.experience], ["演講主題", speaker.topic]]) {
    if (content) profile.append(make("dt", label), make("dd", content));
  }
  if (profile.childElementCount) {
    const details = make("details", "", "speaker-details");
    const summary = make("summary", "詳細介紹");
    summary.setAttribute("aria-label", speaker.name + "的詳細介紹");
    details.append(summary, profile);
    body.append(details);
  }
  card.append(portrait, body);
  speakerList.append(card);
}

function showAgenda(filter) {
  const list = byId("agenda-list");
  list.replaceChildren();
  for (const session of event.agenda.filter((entry) => filter === "all" || entry.day === filter)) {
    const article = make("article", "", "session");
    const body = make("div");
    body.append(make("h3", session.title), make("p", session.detail));
    const time = make("time", session.time);
    if (session.date) time.dateTime = session.date;
    article.append(time, body, make("span", session.type, "tag"));
    list.append(article);
  }
  if (!list.childElementCount) list.append(make("p", "此時段暫無議程。", "caption"));
}
showAgenda("all");
document.querySelectorAll("[data-filter]").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    showAgenda(button.dataset.filter);
  };
});

for (const [index, announcement] of event.news.entries()) {
  const details = make("details");
  details.open = index === 0;
  const summary = make("summary");
  summary.append(make(announcement.date ? "time" : "small", announcement.date || announcement.label), make("span", announcement.title));
  details.append(summary, make("p", announcement.detail));
  byId("news-list").append(details);
}

const notice = event.privacy;
const privacyItems = [
  ["蒐集單位", event.organizer || "主辦單位待公告"],
  ["蒐集目的", "辦理本次研討會報名、確認信與會議通知、名額管理及現場報到。選填的 LINE ID 僅供必要的會務聯繫。"],
  ["個人資料類別", "姓名、電子郵件、服務單位與 LINE ID（後兩項選填），以及系統產生的票券與報到紀錄。"],
  ["利用期間及地區", [notice.retention || "保存期限待主辦單位確認", notice.region || "資料處理地區待主辦單位確認"].join("。") + "。"],
  ["利用對象及方式", "由主辦單位及受託執行報名的工作人員處理。透過 Google 試算表管理名冊、以電子郵件確認報名，並於會場驗證 QR Code。"],
  ["當事人權利與行使方式", "可聯絡 " + (notice.contact || "主辦單位聯絡窗口（待公告）") + "，依個資法請求查詢或閱覽、製給複製本、補充或更正、停止蒐集處理或利用，或刪除。"],
  ["不提供資料的影響", "姓名或電子郵件未提供時，無法完成線上報名及收取確認信。服務單位及 LINE ID 留空均可完成報名。"]
];
for (const [label, description] of privacyItems) byId("privacy-copy").append(make("dt", label), make("dd", description));
byId("notice-version").value = notice.version;
const privacy = byId("privacy");
const privacyScroll = byId("privacy-scroll");
const privacyProgress = byId("privacy-progress");
const consent = fields.consent;
const privacyInstruction = privacyProgress.textContent;
let noticeRead = false;

function updateRegistrationControls() {
  consent.disabled = !noticeRead || mode === "closed";
  submit.disabled = consent.disabled || !consent.checked || submitting;
}

function checkPrivacyScroll() {
  if (noticeRead || !privacy.open || !privacyScroll.clientHeight) return;
  if (privacyScroll.scrollTop + privacyScroll.clientHeight < privacyScroll.scrollHeight - 2) return;
  noticeRead = true;
  privacyProgress.textContent = "已到告知事項底部，可以勾選同意。";
  updateRegistrationControls();
}

function resetRegistration() {
  form.reset();
  noticeRead = false;
  privacyScroll.scrollTop = 0;
  privacy.open = false;
  privacyProgress.textContent = privacyInstruction;
  updateRegistrationControls();
}

privacy.addEventListener("toggle", checkPrivacyScroll);
privacyScroll.addEventListener("scroll", checkPrivacyScroll, { passive: true });
window.addEventListener("resize", checkPrivacyScroll);
consent.addEventListener("change", updateRegistrationControls);

new IntersectionObserver(([entry]) => {
  byId("floating-register").hidden = entry.isIntersecting;
}, { threshold: 0.08 }).observe(byId("register"));

const fillDemo = byId("fill-demo");
fillDemo.onclick = () => {
  fields.name.value = "測試與會者";
  fields.email.value = "attendee@example.invalid";
  fields.organization.value = "研討會測試";
  fields.lineId.value = "tcm-demo";
};

function setMode(data) {
  mode = data.mode;
  byId("mode-note").textContent = {
    demo: "流程預覽。請點「填入測試資料」體驗報名與掃碼。",
    live: "請填寫可收信的電子郵件。送出後，Google 將顯示報名結果。",
    closed: "正式報名尚未開放。"
  }[mode];
  fillDemo.hidden = mode !== "demo";
  updateRegistrationControls();
  byId("line-section").hidden = !data.lineEnabled;
}
if (githubPages) {
  const live = event.published && event.registrationOpen && hasPrivacyNotice && googleWebApp;
  if (live) form.action = googleWebApp;
  setMode({ mode: live ? "live" : event.published ? "closed" : "demo", lineEnabled: false });
} else {
  fetch("./api/status").then((response) => {
    if (!response.ok) throw new Error("status");
    return response.json();
  }).then(setMode).catch(() => {
    byId("mode-note").textContent = "暫時無法確認報名狀態。請稍後重新整理。";
  });
}

form.onsubmit = async (e) => {
  const canSubmit = mode !== "closed" && noticeRead && consent.checked && !submitting;
  if (canSubmit && githubPages && mode === "live") return;
  e.preventDefault();
  if (!canSubmit) return;
  const data = Object.fromEntries(new FormData(form));
  data.consent = consent.checked;
  if (mode === "demo" && data.email.toLowerCase() !== "attendee@example.invalid") {
    setStatus("預覽只接受測試資料，請先點「填入測試資料」。", true);
    return;
  }
  if (mode === "demo") delete data.lineId;
  submitting = true;
  updateRegistrationControls();
  setStatus(mode === "demo" ? "正在建立預覽票券…" : "正在處理報名與確認信…");
  try {
    let result;
    if (githubPages) {
      result = { code: "TCM-DEMO-000000000001", qr: "./preview-ticket.gif" };
    } else {
      const response = await fetch("./api/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
      });
      result = await response.json();
      if (!response.ok) throw new Error(result.message || "暫時無法處理，請稍後重試。");
    }
    if (mode === "demo") {
      try { localStorage.setItem("tcm-demo-ticket", result.code); } catch {}
      byId("ticket-qr").src = result.qr;
      byId("ticket-code").textContent = result.code;
      byId("ticket").hidden = false;
      form.hidden = true;
      setStatus("");
    } else {
      setStatus(result.message);
      if (result.emailSent) resetRegistration();
    }
  } catch (error) {
    setStatus(error.message || "連線中斷，請稍後重試。", true);
  } finally {
    submitting = false;
    updateRegistrationControls();
  }
};

byId("register-again").onclick = () => {
  byId("ticket").hidden = true;
  form.hidden = false;
  resetRegistration();
  fields.name.focus();
};
