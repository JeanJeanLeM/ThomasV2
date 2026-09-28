// Sert la page des motions sur http://localhost:8080
// Depuis la racine du dépôt : npm run motion

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".ttf": "font/ttf",
};

function contentType(path) {
  return TYPES[extname(path).toLowerCase()] || "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/videos.html";
    const path = normalize(join(ROOT, rel));
    if (!path.startsWith(normalize(ROOT))) {
      res.writeHead(403);
      res.end();
      return;
    }

    const file = await stat(path);
    const type = contentType(path);
    const range = req.headers.range;

    if (range && file.isFile()) {
      const [startText, endText] = range.replace(/bytes=/, "").split("-");
      const start = Number(startText);
      const end = endText ? Number(endText) : file.size - 1;
      if (Number.isNaN(start) || start < 0 || end >= file.size || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${file.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${file.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": type,
      });
      createReadStream(path, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": file.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Introuvable");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Motions : http://localhost:${PORT}`);
});
