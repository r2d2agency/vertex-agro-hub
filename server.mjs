import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import serverEntry from "./dist/server/server.js";

const clientDir = resolve(process.cwd(), "dist/client");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const apiProxyTarget = (process.env.API_PROXY_TARGET || process.env.BACKEND_URL || "").replace(/\/$/, "");
const fetchHandler = typeof serverEntry === "function" ? serverEntry : serverEntry.fetch.bind(serverEntry);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function toSafeStaticPath(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const normalizedPath = normalize(decodedPath).replace(/^([/\\])+/, "");
  const filePath = resolve(join(clientDir, normalizedPath));
  return filePath.startsWith(clientDir) ? filePath : null;
}

async function serveStatic(request, response, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (pathname === "/") return false;

  const filePath = toSafeStaticPath(pathname);
  if (!filePath) return false;

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return false;
  }

  if (!fileStat.isFile()) return false;

  const headers = {
    "content-length": String(fileStat.size),
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
  };

  if (pathname.startsWith("/assets/")) {
    headers["cache-control"] = "public, max-age=31536000, immutable";
  }

  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  createReadStream(filePath).pipe(response);
  return true;
}

function nodeHeadersToWebHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  return headers;
}

async function readRequestBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return undefined;

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyApiRequest(request, response, pathname) {
  if (!pathname.startsWith("/api/")) return false;

  if (!apiProxyTarget) {
    response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ message: "Configure API_PROXY_TARGET no frontend apontando para o backend." }));
    return true;
  }

  const targetUrl = new URL(`${pathname.replace(/^\/api/, "")}${request.url?.includes("?") ? `?${request.url.split("?")[1]}` : ""}`, apiProxyTarget);
  const headers = nodeHeadersToWebHeaders(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");

  const proxyResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: await readRequestBody(request),
    duplex: "half",
  });

  const body = request.method === "HEAD" ? undefined : Buffer.from(await proxyResponse.arrayBuffer());
  writeWebResponse(response, proxyResponse, body);
  return true;
}

function writeWebResponse(nodeResponse, webResponse, body) {
  for (const [key, value] of webResponse.headers.entries()) {
    if (key.toLowerCase() !== "set-cookie") nodeResponse.setHeader(key, value);
  }

  const cookies = webResponse.headers.getSetCookie?.();
  if (cookies?.length) nodeResponse.setHeader("set-cookie", cookies);

  nodeResponse.writeHead(webResponse.status, webResponse.statusText);
  nodeResponse.end(body);
}

createServer(async (request, response) => {
  try {
    const origin = `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host || `localhost:${port}`}`;
    const url = new URL(request.url || "/", origin);

    if (await serveStatic(request, response, url.pathname)) return;
    if (await proxyApiRequest(request, response, url.pathname)) return;

    const webRequest = new Request(url, {
      method: request.method,
      headers: nodeHeadersToWebHeaders(request.headers),
      body: await readRequestBody(request),
      duplex: "half",
    });

    const webResponse = await fetchHandler(webRequest, process.env, {});
    const body = request.method === "HEAD" ? undefined : Buffer.from(await webResponse.arrayBuffer());
    writeWebResponse(response, webResponse, body);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><html><body><h1>Erro interno</h1></body></html>");
  }
}).listen(port, host, () => {
  console.log(`Vertex Agro frontend running on http://${host}:${port}`);
});