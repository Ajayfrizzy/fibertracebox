import http from "node:http";

const port = Number(process.env.FIBER_RPC_PROXY_PORT ?? 8827);
const targetUrl = process.env.FIBER_RPC_PROXY_TARGET ?? "http://127.0.0.1:8227";
const apiKey = process.env.FIBER_RPC_PROXY_API_KEY;
const maxBodyBytes = Number(process.env.FIBER_RPC_PROXY_MAX_BODY_BYTES ?? 1_000_000);

if (!apiKey) {
  console.error("FIBER_RPC_PROXY_API_KEY is required.");
  process.exit(1);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        request.destroy();
        reject(Object.assign(new Error("Request body too large"), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function providedApiKey(request) {
  const headerKey = request.headers["x-api-key"];
  if (typeof headerKey === "string" && headerKey.trim()) {
    return headerKey.trim();
  }

  const authorization = request.headers.authorization;
  if (typeof authorization === "string" && authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return undefined;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, target: targetUrl }));
    return;
  }

  if (request.method !== "POST") {
    response.writeHead(405, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (providedApiKey(request) !== apiKey) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const body = await readBody(request);
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });

    const upstreamBody = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") ?? "application/json"
    });
    response.end(upstreamBody);
  } catch (error) {
    response.writeHead(error.status ?? 502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Fiber RPC proxy listening on http://127.0.0.1:${port}`);
  console.log(`Forwarding authenticated requests to ${targetUrl}`);
});
