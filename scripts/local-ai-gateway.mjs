import http from "node:http";

const port = Number(process.env.KLIYU_GATEWAY_PORT || 8791);
const token = process.env.KLIYU_GATEWAY_TOKEN || "";
const allowed = [
  /^\/api\/(generate|tags)$/,
  /^\/inference$/,
  /^\/(import|render|thumbnail|transcribe-url)$/,
  /^\/progress\/[A-Za-z0-9_-]+$/,
  /^\/health$/,
];
let active = 0;

function targetFor(pathname) {
  if (pathname.startsWith("/api/")) return "http://127.0.0.1:11434";
  if (pathname === "/inference") return "http://127.0.0.1:8080";
  return "http://127.0.0.1:8789";
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  if (!allowed.some((pattern) => pattern.test(url.pathname))) {
    response.writeHead(404).end("Not found");
    return;
  }
  if (url.pathname === "/health" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "kliyu-local-ai" }));
    return;
  }
  if (!token || request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401).end("Unauthorized");
    return;
  }
  if (active >= 2) {
    response.writeHead(429, { "retry-after": "10" }).end("AI sedang sibuk");
    return;
  }
  const length = Number(request.headers["content-length"] || 0);
  if (length > 600 * 1024 * 1024) {
    response.writeHead(413).end("Payload terlalu besar");
    return;
  }
  active++;
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (
        value &&
        !["host", "authorization", "connection", "content-length"].includes(
          name.toLowerCase(),
        )
      )
        headers.set(name, Array.isArray(value) ? value.join(",") : value);
    }
    const upstream = await fetch(
      `${targetFor(url.pathname)}${url.pathname}${url.search}`,
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method || "GET")
          ? undefined
          : request,
        duplex: "half",
      },
    );
    response.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
    if (!upstream.body) response.end();
    else {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!response.write(value))
          await new Promise((resolve) => response.once("drain", resolve));
      }
      response.end();
    }
  } catch (error) {
    response.writeHead(502, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Gateway gagal",
      }),
    );
  } finally {
    active--;
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`KLIYU local AI gateway aktif di http://127.0.0.1:${port}`);
});
