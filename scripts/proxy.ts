/**
 * Local dev proxy:
 * - /photos, /photos/*  -> Next app (NEXT_PORT, default 3001)
 * - /_next/*            -> Next app (assets and HMR)
 * - /api/*              -> Next app (photo canvas API)
 * - /uploads/*          -> Next app (uploaded images)
 * - everything else     -> Eleventy static site (STATIC_PORT, default 8080)
 *
 * Uses Node's http to forward to upstream (avoids fetch() strict parsing with Eleventy).
 */

import http from "node:http";

const PROXY_PORT = Number(process.env.PROXY_PORT) || 3000;
const STATIC_PORT = Number(process.env.STATIC_PORT) || 8080;
const NEXT_PORT = Number(process.env.NEXT_PORT) || 3001;

function getTarget(url: URL): { host: string; port: number; path: string } {
  const path = url.pathname;

  // Next app: /photos, /_next (assets), /api (photo canvas API), /uploads (uploaded images)
  if (
    path.startsWith("/photos") ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/uploads")
  ) {
    const targetPath = path.startsWith("/photos")
      ? path === "/photos"
        ? "/"
        : path.slice("/photos".length) || "/"
      : path;
    return {
      host: "127.0.0.1",
      port: NEXT_PORT,
      path: targetPath + url.search,
    };
  }

  return {
    host: "127.0.0.1",
    port: STATIC_PORT,
    path: url.pathname + url.search,
  };
}

function proxyRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  target: { host: string; port: number; path: string },
) {
  const headers = { ...req.headers, host: `${target.host}:${target.port}` };

  const proxy = http.request(
    {
      host: target.host,
      port: target.port,
      path: target.path,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxy.on("error", (err) => {
    console.error(
      `Proxy error to ${target.host}:${target.port}${target.path}:`,
      err.message,
    );
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(
      `Proxy error: upstream unreachable (is the app on ${target.host}:${target.port} running?)`,
    );
  });

  req.pipe(proxy, { end: true });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const target = getTarget(url);
  proxyRequest(req, res, target);
});

server.listen(PROXY_PORT, () => {
  const addr = server.address();
  const port =
    typeof addr === "object" && addr && "port" in addr ? addr.port : PROXY_PORT;
  console.log(`Proxy listening on http://localhost:${port}`);
  console.log(`  /photos     -> Next app (http://127.0.0.1:${NEXT_PORT})`);
  console.log(`  /_next/*    -> Next app`);
  console.log(`  /api/*      -> Next app`);
  console.log(`  /uploads/*  -> Next app`);
  console.log(
    `  everything else -> Static site (http://127.0.0.1:${STATIC_PORT})`,
  );
  console.log(
    "\nStart the static site and Next app in other terminals (from repo root):",
  );
  console.log(`  bun run dev:site        (port ${STATIC_PORT})`);
  console.log(`  bun run dev:photos:port (port ${NEXT_PORT})`);
});
