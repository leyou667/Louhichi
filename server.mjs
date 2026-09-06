import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const root = process.cwd();
const port = Number(process.env.LOUHICHI_PORT || process.env.PORT || 3000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".avif": "image/avif",
  ".mp4": "video/mp4"
};

createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = normalize(join(root, relative));

  if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Page introuvable");
    return;
  }

  const stats = statSync(file);
  const contentType = types[extname(file)] || "application/octet-stream";
  const range = request.headers.range;

  // Local QA only: deterministic 150 ms latency, 4 Mbit/s per response.
  // GitHub Pages never runs this development server.
  if (requestUrl.searchParams.has('qa_slow') && pathname.startsWith('/assets/film-')) {
    await new Promise(resolve => setTimeout(resolve,150));
    if (response.destroyed) return;
    response.writeHead(200, {'Content-Type':contentType,'Content-Length':stats.size,'Cache-Control':'no-store'});
    const stream = createReadStream(file,{highWaterMark:16384});
    response.on('close',()=>stream.destroy());
    try { for await (const chunk of stream) {
      if(response.destroyed)break;
      response.write(chunk); await new Promise(resolve=>setTimeout(resolve,33));
    } if(!response.destroyed)response.end(); } catch { response.destroy(); }
    return;
  }

  if (range && extname(file) === ".mp4") {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
    if (!match || start > end || start >= stats.size) {
      response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
      response.end();
      return;
    }
    response.writeHead(206, {
      "Content-Type": contentType,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache"
    });
    createReadStream(file, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stats.size,
    "Accept-Ranges": extname(file) === ".mp4" ? "bytes" : "none",
    "Cache-Control": "no-cache"
  });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Louhichi disponible sur http://127.0.0.1:${port}`);
});
