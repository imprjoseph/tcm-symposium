# 中醫醫學研討會｜GitHub Pages ＋ Google 試算表

GitHub Pages 提供會議資訊、報名表及現場掃碼介面。正式送出後，Google Apps Script 寫入未公開的 Google 試算表、寄出含 QR Code 的確認信，以及核驗報到。確認信可附公司既有 LINE 群的網址。GitHub 原始碼和公開網站沒有報名名單、試算表 ID 或工作人員通行碼。

## 預覽與調整會議資訊

- 使用 Node.js 24，執行 npm ci 及 npm run build:pages。
- 從 dist/pages 開啟本機靜態網站伺服器。使用「填入測試資料」取得示範票券。預覽流程留在瀏覽器。
- web/event.js 編輯正式活動日期、主辦單位、講師、會場、議程與消息。公告由新到舊排列。會場地址可產生 Google 地圖連結，填入官方地圖嵌入網址可在頁內載入地圖。
- 同檔案的 privacy 設定正式告知版本、保存期限、資料處理地區與個資窗口。上線前由主辦單位確認告知文案及資料處理範圍。完成後再將 published 設為 true。
- 會場異動時先更新網站，再把異動摘要與網址貼到既有 LINE 群。

## 在 GitHub Pages 發布

1. 將專案提交到指定的 GitHub 儲存庫。與會者要公開瀏覽時，請確認 Pages 的網站存取設定與主辦單位需求一致。
2. 於儲存庫 Settings → Pages，將 Source 選為 GitHub Actions。
3. 專案內的 .github/workflows/pages.yml 在 main 分支推送時發布，也可以手動執行。網站輸出在 dist/pages，Apps Script 及其他原始碼不在網站發布檔案中。
4. 使用 Actions 部署結果提供的網址作為活動網站正式入口。 [GitHub Pages 官方設定](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 接上 Google 名冊與寄信

1. 由主辦單位指定的寄信 Google 帳號開啟私有報名名冊，選「擴充功能 → Apps Script」。分頁名稱應為「報名名冊」，A 至 I 欄依序為「報名時間、姓名、電子郵件、服務單位、報到代碼雜湊、確認信狀態、確認信寄出時間、報到時間、個資告知版本」。
2. 用 npm run build:pages 產生 dist/google。將該目錄中的 Code.gs、Pages.gs 和 QR.gs 分別放入同一 Apps Script 專案。專案與名冊時區設為 Asia/Taipei。
3. 在 Apps Script 專案設定的「指令碼屬性」設定下列值。

| 屬性 | 設定 |
| --- | --- |
| SPREADSHEET_ID | 私有 Google 名冊的 ID |
| CAPACITY | 本次名額上限，正整數 |
| TICKET_SECRET | 至少 32 字元的隨機值，活動期間保留原值 |
| STAFF_CODE | 另一組至少 16 字元的隨機值，只提供報到工作人員 |
| PAGES_EVENT_JSON | 會議資訊，格式見下方 |
| REGISTRATION_OPEN | 設為 1 開放報名 |
| CHECK_IN_OPEN | 設為 1 開放報到 |

PAGES_EVENT_JSON 範例。url 要填 GitHub Pages 活動網站，noticeVersion 要與 web/event.js 一致。line 為選填，僅用於報名確認信。replyTo 填主辦單位受理回覆的信箱。

    {"url":"https://organization.github.io/conference/","title":"活動正式名稱","date":"活動日期","venue":"場地名稱","address":"場地地址","noticeVersion":"v1","replyTo":"","line":""}

4. 選「部署 → 新增部署 → 網頁應用程式」，以部署者身分執行，授權讀寫名冊與寄信。站點要開放無 Google 帳號的與會者時，Apps Script 部署存取需允許未登入的使用者，依 Google Workspace 的組織政策設定。從部署複製 /exec 網址。 [Google Apps Script 網頁應用程式](https://developers.google.com/apps-script/guides/web)
5. 把 /exec 網址填入 web/event.js 的 appsScriptUrl。registrationOpen 及 checkInOpen 分別控制網站表單入口，啟用時也要開啟 Apps Script 對應屬性。再推送 GitHub 並確認部署網址。
6. 正式開放前，主辦單位以自己可讀取的信箱試報，檢查名冊寫入、確認信及 QR Code。用手機測試相機及權限，以工作人員通行碼確認報到，檢查重複掃碼結果，並核對寄信額度。

## 本機檢查

    npm ci
    npm run build:pages
    npm run build
    npm run validate
    node --test tests/flows.test.mjs
