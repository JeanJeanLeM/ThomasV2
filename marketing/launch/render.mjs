// Rendu image par image du film de lancement Thomas.
// Nécessite Google Chrome et puppeteer-core (`npm install puppeteer-core`).
//   node render.mjs stills landscape 3,10,22      images fixes dans exports/stills
//   node render.mjs film landscape                exports/thomas-launch-16x9.mp4
//   node render.mjs film vertical                 exports/thomas-launch-9x16.mp4
//   node render.mjs all                           les deux formats
// Variables : FPS (60 par défaut), WORKERS (4), CHROME (chemin de Chrome).

import { createServer } from "node:http";
import { readFile, mkdir, rm } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = require("puppeteer-core");
} catch {
  puppeteer = createRequire("/tmp/package.json")("puppeteer-core");
}

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(ROOT, "exports");
const FPS = Number(process.env.FPS) || 60;
const WORKERS = Number(process.env.WORKERS) || 4;
const CHROME = process.env.CHROME || "/usr/local/bin/google-chrome";
const SIZE = { landscape: [1920, 1080], vertical: [1080, 1920] };
const FILE = { landscape: "thomas-launch-16x9.mp4", vertical: "thomas-launch-9x16.mp4" };
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".ttf": "font/ttf" };

function serve() {
  const server = createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      if (rel === "/") rel = "/index.html";
      const path = normalize(join(ROOT, rel));
      if (!path.startsWith(ROOT)) throw new Error("outside root");
      const body = await readFile(path);
      res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function openPage(browser, port, format) {
  const [width, height] = SIZE[format];
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/?format=${format}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__ready === true);
  return page;
}

async function frame(page, t, path) {
  await page.evaluate((time) => window.__render(time), t);
  await page.screenshot({ type: "jpeg", quality: 95, path, optimizeForSpeed: false });
}

async function stills(browser, port, format, times) {
  const dir = join(OUT, "stills");
  await mkdir(dir, { recursive: true });
  const page = await openPage(browser, port, format);
  for (const t of times) {
    const path = join(dir, `${format}-${t.toFixed(2)}s.jpg`);
    await frame(page, t, path);
    console.log(path);
  }
  await page.close();
}

const launch = () =>
  puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--hide-scrollbars", "--disable-dev-shm-usage", "--font-render-hinting=none", "--force-color-profile=srgb"],
  });

async function film(port, format) {
  const duration = 60;
  const total = Math.round(duration * FPS);
  const dir = join("/tmp/thomas-launch-frames", format);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // One browser per worker: background tabs of a shared browser stall on screenshots.
  const browsers = await Promise.all(Array.from({ length: WORKERS }, launch));
  const pages = await Promise.all(browsers.map((b) => openPage(b, port, format)));
  let next = 0;
  let done = 0;
  await Promise.all(
    pages.map(async (page) => {
      while (next < total) {
        const i = next++;
        await frame(page, i / FPS, join(dir, `f-${String(i).padStart(5, "0")}.jpg`));
        done++;
        if (done % (FPS * 5) === 0) console.log(`${format} ${done}/${total}`);
      }
    })
  );
  await Promise.all(browsers.map((b) => b.close()));
  await mkdir(OUT, { recursive: true });
  const out = join(OUT, FILE[format]);
  await new Promise((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      ["-y", "-v", "error", "-framerate", String(FPS), "-i", join(dir, "f-%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
      { stdio: "inherit" }
    );
    ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  await rm(dir, { recursive: true, force: true });
  console.log(out);
}

const [mode = "stills", formatArg = "landscape", timesArg = "2,4.5,10,17,23,30,38,46,55,59.5"] = process.argv.slice(2);
const server = await serve();
const port = server.address().port;
try {
  if (mode === "stills") {
    const browser = await launch();
    await stills(browser, port, formatArg, timesArg.split(",").map(Number));
    await browser.close();
  } else if (mode === "film") {
    await film(port, formatArg);
  } else if (mode === "all") {
    await film(port, "landscape");
    await film(port, "vertical");
  }
} finally {
  server.close();
}
