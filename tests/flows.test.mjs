import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import worker from "../dist/server/index.js";

const site = "https://event.example";
const testAttendee = { name: "測試與會者", email: "attendee@example.invalid", organization: "", consent: true };
const send = (path, data, origin = site) => worker.fetch(new Request(site + path, {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(data)
}));
const digest = (value) => createHash("sha256").update(value).digest("hex");

test("private-review version accepts only demo data and supplies a real GIF QR ticket", async () => {
  const status = await worker.fetch(new Request(site + "/api/status"));
  assert.equal((await status.json()).mode, "demo");
  assert.equal((await send("/api/register", { ...testAttendee, email: "someone@example.com" })).status, 400);
  assert.equal((await send("/api/register", { ...testAttendee, consent: false })).status, 400);
  assert.equal((await send("/api/register", testAttendee, "https://elsewhere.example")).status, 403);
  const demo = await send("/api/register", testAttendee);
  assert.equal(demo.status, 200);
  const { code, qr } = await demo.json();
  assert.equal(Buffer.from(qr.split(",")[1], "base64").subarray(0, 6).toString(), "GIF87a");
  assert.equal((await send("/api/check-in", { code })).status, 200);
  assert.equal((await send("/api/check-in", { code: "invalid" })).status, 404);
  assert.equal((await worker.fetch(new Request(site + "/hero.jpg"))).headers.get("content-type"), "image/jpeg");
});

test("Google registration and mail retry preserve one roster row and allow one check-in", async () => {
  const header = ["報名時間", "姓名", "電子郵件", "服務單位", "報到代碼雜湊", "確認信狀態", "確認信寄出時間", "報到時間", "個資告知版本"];
  const rows = [header];
  const sent = [];
  let canSend = false;
  const sheet = {
    getLastRow: () => rows.length, getMaxRows: () => 1000,
    getRange: (row, col, height = 1, width = 1) => ({
      getValues: () => rows.slice(row - 1, row - 1 + height).map((entry) => entry.slice(col - 1, col - 1 + width)),
      setValues: (values) => values.forEach((value, index) => {
        const item = rows[row - 1 + index] ??= [];
        item.splice(col - 1, value.length, ...value);
      }),
      setValue: (value) => { rows[row - 1][col - 1] = value; },
      createTextFinder: (text) => {
        const finder = {
          matchEntireCell: () => finder, matchCase: () => finder,
          findNext: () => {
            const index = rows.slice(row - 1).findIndex((entry) => entry[col - 1] === text);
            return index < 0 ? null : { getRow: () => index + row };
          }
        };
        return finder;
      }
    })
  };
  const state = {
    SITE_SHARED_SECRET: "test-key", SPREADSHEET_ID: "sheet", CAPACITY: "1", REGISTRATION_OPEN: "1",
    CHECK_IN_OPEN: "1", TICKET_SECRET: "test-ticket-key".repeat(3), STAFF_CODE: "staff-test-code-1234",
    PAGES_EVENT_JSON: JSON.stringify({ url: "https://example.github.io/tcm/", title: "研討會", date: "日期", venue: "會場", address: "地址", noticeVersion: "v1" })
  };
  const context = vm.createContext({
    Date, console,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => state[key] }) },
    SpreadsheetApp: { openById: (id) => {
      assert.equal(id, "sheet");
      return { getSheetByName: (name) => { assert.equal(name, "報名名冊"); return sheet; } };
    }, flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ContentService: { createTextOutput: (json) => ({ setMimeType: () => JSON.parse(json) }), MimeType: { JSON: "json" } },
    MailApp: { getRemainingDailyQuota: () => canSend ? 1 : 0, sendEmail: (options) => sent.push(options) },
    HtmlService: { createHtmlOutput: (html) => {
      const page = { html, setTitle(title) { page.title = title; return page; }, addMetaTag: () => page };
      return page;
    } },
    Utilities: {
      computeHmacSha256Signature: (value, key) => [...createHmac("sha256", key).update(value).digest()],
      computeDigest: (_, value) => [...Buffer.from(digest(value), "hex")], DigestAlgorithm: { SHA_256: "sha" },
      Charset: { UTF_8: "utf8" }, newBlob: (bytes, type, name) => ({ bytes, type, name }),
      base64Decode: (value) => Buffer.from(value, "base64"), formatDate: () => "2027/01/01 09:00"
    }
  });
  vm.runInContext(await readFile(new URL("../google/Code.gs", import.meta.url), "utf8"), context);
  vm.runInContext(await readFile(new URL("../google/Pages.gs", import.meta.url), "utf8"), context);
  vm.runInContext(await readFile(new URL("../dist/google/QR.gs", import.meta.url), "utf8"), context);
  const postForm = (parameter) => context.doPost({ parameter, postData: { type: "application/x-www-form-urlencoded", length: 140 } });
  const call = (data) => context.doPost({ postData: { contents: JSON.stringify(data) } });
  const code = "TCM-" + "A".repeat(32);
  const payload = {
    secret: "test-key", action: "register", attendee: { ...testAttendee, name: "<測試>" },
    ticketHash: digest(code), code, qr: "R0lGODdh",
    event: { title: "測試研討會", date: "測試日期", venue: "測試會場", address: "測試地址", url: site }
  };
  assert.equal(call({ ...payload, secret: "bad" }).status, "denied");
  assert.equal(call({ ...payload, code: "TCM-" + "B".repeat(32) }).status, "invalid");
  assert.equal(call(payload).status, "mail_failed");
  assert.equal(rows.length, 2);
  assert.equal(rows[1][5], "待重試");
  canSend = true;
  assert.equal(call(payload).status, "sent");
  assert.equal(call(payload).status, "duplicate");
  assert.equal(rows.length, 2);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, testAttendee.email);
  assert.match(sent[0].htmlBody, /&lt;測試&gt;/);
  assert.match(sent[0].htmlBody, /cid:ticket/);
  assert.equal(call({ ...payload, attendee: { ...testAttendee, email: "other@example.invalid" } }).status, "full");
  const scan = { secret: "test-key", action: "check-in", ticketHash: digest(code) };
  assert.equal(call(scan).status, "checked_in");
  assert.equal(call(scan).status, "already");
  assert.equal(call({ ...scan, ticketHash: digest("missing") }).status, "missing");

  state.CAPACITY = "2";
  const newForm = { action: "register", name: "表單測試", email: "pages@example.invalid", consent: "yes", noticeVersion: "v1" };
  assert.equal(postForm({ ...newForm, noticeVersion: "old" }).title, "請重新閱讀個資告知");
  assert.equal(postForm({ ...newForm, consent: "" }).title, "請重新閱讀個資告知");
  assert.equal(rows.length, 2);
  assert.equal(postForm(newForm).title, "報名已完成");
  assert.equal(rows[2][8], "v1");
  assert.equal(sent.length, 2);
  assert.equal(sent[1].attachments[0].bytes.subarray(0, 6).toString(), "GIF87a");
  const pagesCode = "TCM-" + createHmac("sha256", state.TICKET_SECRET).update(newForm.email).digest("hex").slice(0, 32).toUpperCase();
  assert.equal(rows[2][4], digest(pagesCode));
  assert.equal(postForm({ action: "check-in", code: pagesCode, staff: "wrong" }).title, "通行碼有誤");
  assert.equal(postForm({ action: "check-in", code: pagesCode, staff: state.STAFF_CODE }).title, "報到完成");
  assert.equal(postForm({ action: "check-in", code: pagesCode, staff: state.STAFF_CODE }).title, "此票券已報到");
});
