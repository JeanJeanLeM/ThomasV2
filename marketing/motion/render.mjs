// Renders the Thomas motion films to exports/*.mp4.
// Needs Google Chrome and puppeteer-core (`npm install puppeteer-core`).
//   node render.mjs stills 1 "4,12,26"
//   node render.mjs film 2
//   node render.mjs all

import { createServer } from "node:http";
import { readFile, mkdir, rm } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire("/tmp/package.json");
const puppeteer = require("puppeteer-core");

const ROOT = new URL(".", import.meta.url).pathname;
const OUT = join(ROOT, "exports");
const FPS = 30;
const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

const FILMS = {
  1: { file: "01-presentation.mp4", duration: 60 },
  2: { file: "02-temps-de-travail.mp4", duration: 40 },
  3: { file: "03-parametrage.mp4", duration: 38 },
  4: { file: "04-suivi.mp4", duration: 42 },
  5: { file: "05-pour-qui.mp4", duration: 42 },
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname);
      if (rel === "/") rel = "/index.html";
      const path = normalize(join(ROOT, rel));
      if (!path.startsWith(ROOT)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(path);
      const type = TYPES[extname(path)] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function shoot(page, film, times, dir) {
  await page.goto(`http://127.0.0.1:${page.__port}/?film=${film}&play=0`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__ready === true);
  await mkdir(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < times.length; i++) {
    const ms = times[i] * 1000;
    await page.evaluate((t) => window.__seek(t), ms);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = join(dir, `film${film}-${String(i).padStart(2, "0")}-${times[i].toFixed(1)}s.jpg`);
    await page.screenshot({ type: "jpeg", quality: 90, path: file });
    files.push(file);
  }
  return files;
}

async function renderFilm(page, film) {
  const spec = FILMS[film];
  const frames = Math.round(spec.duration * FPS);
  const dir = join("/tmp/thomas-frames", String(film));
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await page.goto(`http://127.0.0.1:${page.__port}/?film=${film}&play=0`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__ready === true);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.__seek(t), (i / FPS) * 1000);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({
      type: "jpeg",
      quality: 92,
      path: join(dir, `frame-${String(i).padStart(5, "0")}.jpg`),
    });
    if (i % 60 === 0) process.stdout.write(`film ${film} ${i}/${frames}\n`);
  }
  await mkdir(OUT, { recursive: true });
  const out = join(OUT, spec.file);
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y",
      "-framerate", String(FPS),
      "-i", join(dir, "frame-%05d.jpg"),
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "17",
      "-preset", "medium",
      "-movflags", "+faststart",
      out,
    ], { stdio: "inherit" });
    ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });
  await rm(dir, { recursive: true, force: true });
  return out;
}

const server = await serve();
const port = server.address().port;
const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: "new",
  args: ["--hide-scrollbars", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});
const page = await browser.newPage();
page.__port = port;
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

const mode = process.argv[2] || "stills";
if (mode === "stills") {
  const film = Number(process.argv[3] || 1);
  const times = (process.argv[4] || "1,4,12,24,38,55").split(",").map(Number);
  const files = await shoot(page, film, times, join(OUT, "stills"));
  console.log(files.join("\n"));
} else if (mode === "film") {
  const out = await renderFilm(page, Number(process.argv[3]));
  console.log(out);
} else if (mode === "all") {
  for (const id of [1, 2, 3, 4, 5]) {
    const out = await renderFilm(page, id);
    console.log(out);
  }
}

await browser.close();
server.close();
