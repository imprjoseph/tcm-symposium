import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import qrcode from "qrcode-generator";

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

const ticket = qrcode(0, "M");
ticket.addData("TCM-DEMO-000000000001");
ticket.make();
const encoded = ticket.createDataURL(6, 24).split(",")[1];
await writeFile(pages + "/preview-ticket.gif", Buffer.from(encoded, "base64"));

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
