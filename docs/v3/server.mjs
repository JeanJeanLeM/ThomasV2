import { createServer } from "node:http";
import { readFile, writeFile, rename } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const allowed = new Set([
  "index.html",
  "fondation.html",
  "temps.html",
  "observations.html",
  "contexte.html",
  "carte-ferme.html",
  "planification.html",
  "traitements.html",
  "commercial.html",
  "sol.html",
  "documents.html",
  "compte.html",
  "donnees.html",
  "tests.html"
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function safeFile(name) {
  const base = normalize(name).replaceAll("\\", "/");
  if (base.includes("/") || base.includes("..")) return null;
  return base;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);

    if (request.method === "POST" && url.pathname === "/api/save") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const file = safeFile(body.file || "");
      if (!file || !allowed.has(file) || typeof body.html !== "string" || !body.html.includes("<main")) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Fichier non autorisé");
        return;
      }
      const target = join(root, file);
      const temporary = `${target}.tmp`;
      await writeFile(temporary, body.html, "utf8");
      await rename(temporary, target);
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }

    const requested = safeFile(decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.slice(1)));
    if (!requested) {
      response.writeHead(403);
      response.end();
      return;
    }
    const filePath = join(root, requested);
    const contents = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(requested)] || "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.code === "ENOENT" ? "Introuvable" : "Erreur");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Thomas V3 — http://127.0.0.1:${port}`);
});
