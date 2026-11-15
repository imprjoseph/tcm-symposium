// 填入核定資料後，將 published 設為 true。報名另由正式環境設定控制。
export const event = {
  published: false,
  title: "第97屆國醫節暨第19屆台北國際中醫藥學術論壇",
  organizer: "台北市中醫師公會",
  contactEmail: "",
  date: "2027 年 3 月 13 日（六）至 14 日（日）",
  venue: {
    name: "臺大醫院國際會議中心",
    address: "臺北市中正區徐州路 2 號",
    transit: [
      { label: "捷運", detail: "臺大醫院站 2 號出口步行約 6 分鐘，善導寺站 2 號出口約 7–10 分鐘。" },
      { label: "公車", detail: "臺大醫院站、台開南商工站或仁愛林森路口站下車，步行約 3–5 分鐘。" },
      { label: "開車", detail: "會館停車場在地下 2 至 3 樓，車位有限。" }
    ],
    transitUrl: "https://www.nthcc.com.tw/location1.htm",
    embedUrl: "https://www.google.com/maps/embed?pb=%211m14%211m8%211m3%211d7229.566193786378%212d121.519522%213d25.041434%213m2%211i1024%212i768%214f13.1%213m3%211m2%211s0x3442a976b82a6343%3A0xebdefa61d17726a4%212z5b6Q5bee6LevMuiZn-W6reWckuacg-mkqA%215e0%213m2%211szh-TW%212sus%214v1725946650179%215m2%211szh-TW%212sus"
  },
  appsScriptUrl: "",
  registrationOpen: false,
  checkInOpen: false,
  privacy: {
    version: "",
    retention: "",
    region: "",
    contact: ""
  },
  speakers: [],
  agenda: [
    { day: "mar13", date: "2027-03-13", time: "3 月 13 日（六）", title: "主會場", detail: "主會場規劃於 2 樓 201 會議廳。", type: "規劃" },
    { day: "mar14", date: "2027-03-14", time: "3 月 14 日（日）", title: "主會場與分場", detail: "規劃主會場與分場會議，並設置展覽與論文壁報區。", type: "規劃" }
  ],
  news: [
    { date: "", label: "會議資訊", title: "論壇將於 2027 年 3 月 13 至 14 日舉行", detail: "會場為臺大醫院國際會議中心。報到處規劃在 2 樓川堂，鄰近 201 主會議廳。詳細議程、講師名單與正式報名資訊將由主辦單位公告。" },
    { date: "", label: "流程預覽", title: "活動當天使用 QR Code 報到", detail: "完成正式報名後，系統會寄送含個人 QR Code 的確認信。報到時請出示信件或事先截圖。" }
  ]
};

export const hasPrivacyNotice = Boolean(event.organizer && event.privacy?.version && event.privacy?.retention && event.privacy?.region && event.privacy?.contact);
export const googleWebApp = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(event.appsScriptUrl || "") ? event.appsScriptUrl : "";
