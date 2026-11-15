import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import qrcode from "qrcode-generator";
import { event, lineInviteUrl } from "../web/event.js";

const pages = "dist/pages";
const google = "dist/google";
await Promise.all([mkdir(pages, { recursive: true }), mkdir(google, { recursive: true })]);

const siteFiles = ["index.html", "check-in.html", "app.js", "check-in.js", "style.css", "event.js"];
const portraits = ["speaker-sample-1.jpg", "speaker-sample-2.jpg", "speaker-sample-3.jpg", "speaker-sample-4.jpg"];
await Promise.all([
  ...siteFiles.map((name) => copyFile("web/" + name, pages + "/" + name)),
  ...portraits.map((name) => copyFile("assets/" + name, pages + "/" + name)),
  copyFile("assets/herbal-pharmacy.jpg", pages + "/hero.jpg"),
  copyFile("node_modules/html5-qrcode/html5-qrcode.min.js", pages + "/scanner.js"),
  copyFile("google/Code.gs", google + "/Code.gs"),
  copyFile("google/Pages.gs", google + "/Pages.gs"),
  writeFile(pages + "/site-mode.js", "export const githubPages = true;\n"),
  writeFile(pages + "/.nojekyll", "")
]);

async function writeQr(value, filename) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const encoded = qr.createDataURL(6, 24).split(",")[1];
  await writeFile(pages + "/" + filename, Buffer.from(encoded, "base64"));
}
await writeQr("TCM-DEMO-000000000001", "preview-ticket.gif");
if (event.lineInviteUrl && !lineInviteUrl) throw new Error("LINE invite must be a line.me group or lin.ee invitation URL.");
if (lineInviteUrl) {
  await writeQr(lineInviteUrl, "line-invite.gif");
} else {
  await rm(pages + "/line-invite.gif", { force: true });
}

const encoder = await build({
  stdin: {
    contents: 'import qr from "qrcode-generator"; export function ticketImage(code) { const image = qr(0, "M"); image.addData(code); image.make(); return image.createDataURL(6, 24); }',
    resolveDir: process.cwd()
  },
  write: false, bundle: true, format: "iife", globalName: "TcmQrEncoder", target: "es2020",
});
await writeFile(google + "/QR.gs", encoder.outputFiles[0].text);

const homepage = await readFile(pages + "/index.html", "utf8");
if (homepage.indexOf('id="news"') > homepage.indexOf('id="about"')) throw new Error("Conference news needs to precede About.");
if (!homepage.includes('class="privacy-notice"') || !homepage.includes('id="floating-register"')) throw new Error("Required registration entries are missing.");
