// 填入核定資料後，將 published 設為 true。報名另由正式環境設定控制。
export const event = {
  published: false,
  title: "中醫醫學研討會",
  organizer: "",
  contactEmail: "",
  date: "",
  venue: { name: "", address: "", transit: "", embedUrl: "" },
  appsScriptUrl: "",
  registrationOpen: false,
  checkInOpen: false,
  privacy: {
    version: "",
    retention: "",
    region: "",
    contact: ""
  },
  speakers: [
    { mark: "辨", name: "中醫辨證與臨床", bio: "示意主題｜以臨床案例交流辨證與處置思路。" },
    { mark: "證", name: "中醫實證研究", bio: "示意主題｜從研究問題、資料到臨床應用。" },
    { mark: "合", name: "跨科整合照護", bio: "示意主題｜探討跨專業轉介與照護協作。" }
  ],
  agenda: [
    { period: "am", time: "08:30–09:00", title: "現場報到", detail: "請備妥 Email 確認信中的 QR Code。", type: "報到" },
    { period: "am", time: "09:00–09:20", title: "開幕致詞", detail: "主辦單位介紹與活動說明。", type: "開幕" },
    { period: "am", time: "09:20–10:30", title: "辨證思維與臨床決策", detail: "以臨床案例呈現辨證、評估與追蹤的思路。", type: "專題演講" },
    { period: "am", time: "10:50–12:00", title: "中醫實證與臨床研究", detail: "從臨床問題出發，探討如何理解及運用研究結果。", type: "專題演講" },
    { period: "pm", time: "13:30–14:40", title: "跨科合作與整合照護", detail: "交流不同專業在轉介與照護協作的分工。", type: "專題演講" },
    { period: "pm", time: "15:00–16:10", title: "臨床案例討論與交流", detail: "由與會講師回應案例提問。", type: "綜合討論" }
  ],
  news: [
    { date: "", label: "籌備中", title: "正式會議資訊將於本頁公告", detail: "目前為網站預覽。正式日期、會場、講師名單與報名資訊將在主辦單位核定後公布。" },
    { date: "", label: "流程預覽", title: "活動當天使用 QR Code 報到", detail: "完成正式報名後，系統會寄送含個人 QR Code 的確認信。報到時請出示信件或事先截圖。" }
  ]
};

export const hasPrivacyNotice = Boolean(event.organizer && event.privacy?.version && event.privacy?.retention && event.privacy?.region && event.privacy?.contact);
export const googleWebApp = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(event.appsScriptUrl || "") ? event.appsScriptUrl : "";
