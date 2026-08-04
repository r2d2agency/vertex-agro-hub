import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import serverEntry from "./dist/server/server.js";

const clientDir = resolve(process.cwd(), "dist/client");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
// Aceita uma lista separada por vírgula: tenta os alvos em ordem
// (ex.: host interno do EasyPanel primeiro, domínio público como fallback).
const configuredTargets = (process.env.API_PROXY_TARGET || process.env.BACKEND_URL || "")
  .split(",")
  .map((t) => t.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Deriva possíveis hosts internos do EasyPanel a partir de um domínio público:
// https://projeto-servico.xxxx.easypanel.host -> http://projeto_servico:3000, http://servico:3000
function deriveInternalTargets(targets) {
  const derived = [];
  for (const target of targets) {
    let host;
    try {
      host = new URL(target).hostname;
    } catch {
      continue;
    }
    if (!host.endsWith(".easypanel.host")) continue;
    const slug = host.split(".")[0];
    const parts = slug.split("-");
    for (let i = 1; i < parts.length; i += 1) {
      const project = parts.slice(0, i).join("-");
      const service = parts.slice(i).join("-");
      derived.push(`http://${project}_${service}:3000`);
      derived.push(`http://${service}:3000`);
    }
    derived.push(`http://${slug}:3000`);
  }
  return derived;
}

const apiProxyTargets = [...new Set([...configuredTargets, ...deriveInternalTargets(configuredTargets)])];
const apiProxyTarget = apiProxyTargets[0] || "";
const deadTargets = new Map();
const DEAD_TTL_MS = 30_000;
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
    if (key.toLowerCase() === "host") continue; // Undici/fetch handles host
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
  const suffix = `${pathname.replace(/^\/api/, "")}${request.url?.includes("?") ? `?${request.url.split("?")[1]}` : ""}`;
  const headers = nodeHeadersToWebHeaders(request.headers);
  const requestBody = await readRequestBody(request);

  const now = Date.now();
  const ordered = [
    ...apiProxyTargets.filter((t) => !deadTargets.has(t) || now - deadTargets.get(t) > DEAD_TTL_MS),
    ...apiProxyTargets.filter((t) => deadTargets.has(t) && now - deadTargets.get(t) <= DEAD_TTL_MS),
  ];

  let lastError = null;
  for (const target of ordered) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const proxyResponse = await fetch(new URL(suffix, target), {
        method: request.method,
        headers,
        body: requestBody,
        duplex: "half",
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      deadTargets.delete(target);
      const body = request.method === "HEAD" ? undefined : Buffer.from(await proxyResponse.arrayBuffer());
      writeWebResponse(response, proxyResponse, body);
      return true;
    } catch (error) {
      lastError = error;
      deadTargets.set(target, Date.now());
      const cause = error?.cause?.code || error?.code || "";
      const isAbort = error.name === "AbortError";
      console.error(`[proxy] falha ao chamar ${target}${suffix} (${isAbort ? "TIMEOUT" : (cause || error?.message)})`);
      
      // Se for um erro de DNS ou conexão recusada, tenta o próximo imediatamente.
      // Se for erro de aplicação (5xx), o fetch não lança erro, então o loop continua.
    }
  }


  const cause = lastError?.cause?.code || lastError?.code || "";
  const dns = cause === "EAI_AGAIN" || cause === "ENOTFOUND";
  response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({
    message: dns
      ? "Backend inacessível: o nome configurado em API_PROXY_TARGET não resolve de dentro do container. Use o host interno do serviço (ex.: http://vertex-backend:3000)."
      : "Backend inacessível. Verifique se o serviço está rodando e se API_PROXY_TARGET está correto.",
    code: cause || "PROXY_ERROR",
    target: apiProxyTargets.join(", "),
  }));
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
  console.log(`[proxy] alvos de API (em ordem): ${apiProxyTargets.join(", ") || "(nenhum)"}`);

});