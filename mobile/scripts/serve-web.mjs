import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist/web");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
};
http
  .createServer((req, res) => {
    const target = path.resolve(
      root,
      "." + decodeURIComponent((req.url ?? "/").split("?")[0]),
    );
    if (!target.startsWith(root + path.sep) && target !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    const file =
      fs.existsSync(target) && fs.statSync(target).isFile()
        ? target
        : path.join(root, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end("Run npm run export:web first.");
      return;
    }
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] ?? "application/octet-stream",
    );
    fs.createReadStream(file).pipe(res);
  })
  .listen(8081, "0.0.0.0", () =>
    console.log("Roleta QA: http://localhost:8081"),
  );
