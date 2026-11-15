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
  previewCheckInUrl: "https://script.google.com/macros/s/AKfycbzvb8F_C6127nCjYxXI4VeCCInm5VlEp5Lb_5H2B6KLxePQScPD5t165SMW8WE0uizs/exec",
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

export const sampleSpeakers = [
  {
    name: "林芷衡", title: "中醫內科主治醫師", organization: "松庭中醫門診部",
    specialty: "中醫內科、脾胃調理、臨床辨證",
    photo: "./speaker-sample-1.jpg",
    bio: "以慢性消化道不適的門診照護為主，著重辨證、療程追蹤與生活調整。",
    experience: "參與中醫內科住院醫師教學，帶領門診病例討論。",
    topic: "從主訴到追蹤：慢性消化不適的中醫辨證實務"
  },
  {
    name: "陳柏岳", title: "副教授", organization: "青禾中醫藥研究所",
    specialty: "中藥臨床研究、實證醫學、研究設計",
    photo: "./speaker-sample-2.jpg",
    bio: "以臨床療效與安全性評估為研究重點，協助醫療團隊把診間問題轉化為可檢驗的研究假設。",
    experience: "開設臨床研究方法與文獻評讀課程，參與跨院觀察性研究。",
    topic: "把門診問題變成研究題目：中藥實證的研究設計"
  },
  {
    name: "許宛寧", title: "中醫針灸科主治醫師", organization: "沐川整合照護中心",
    specialty: "針灸、疼痛管理、跨科整合照護",
    photo: "./speaker-sample-3.jpg",
    bio: "門診聚焦肌肉骨骼疼痛，與復健及護理團隊共同設定照護目標並追蹤功能變化。",
    experience: "參與跨科疼痛照護討論，協作建立轉介與回診追蹤流程。",
    topic: "疼痛照護中的針灸介入與跨專業協作"
  },
  {
    name: "周承遠", title: "中醫兒科主治醫師", organization: "和棠中醫診療中心",
    specialty: "中醫兒科、體質評估、親子衛教",
    photo: "./speaker-sample-4.jpg",
    bio: "從兒童日常飲食、睡眠與活動紀錄了解照護需求，和家長共同訂定回診追蹤重點。",
    experience: "參與中醫兒科病例討論，規劃門診親子衛教及照護紀錄。",
    topic: "兒童體質評估與家庭照護溝通"
  }
];

export const hasPrivacyNotice = Boolean(event.organizer && event.privacy?.version && event.privacy?.retention && event.privacy?.region && event.privacy?.contact);
const webAppUrl = (url) => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url || "") ? url : "";
export const googleWebApp = webAppUrl(event.appsScriptUrl);
export const previewCheckInApp = webAppUrl(event.previewCheckInUrl);
