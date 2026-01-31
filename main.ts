import { createLogger, type LogLevel } from "./src/log.ts";
import { Metrics } from "./src/metrics.ts";
import { RateLimiter } from "./src/ratelimit.ts";
import { verifyHS256 } from "./src/jwt.ts";
import { withRequestId } from "./src/request_id.ts";

const PORT = Number(Deno.env.get("PORT") ?? "8080");
const LOG_LEVEL = (Deno.env.get("LOG_LEVEL") ?? "info") as LogLevel;
const JWT_SECRET = Deno.env.get("JWT_SECRET") ?? "dev-secret";
const RPS = Number(Deno.env.get("RATE_LIMIT_RPS") ?? "10");
const BURST = Number(Deno.env.get("RATE_LIMIT_BURST") ?? "20");

const log = createLogger(LOG_LEVEL);
const metrics = new Metrics();
const limiter = new RateLimiter({ rps: RPS, burst: BURST });

log.info("starting edgeguard", { port: PORT, rps: RPS, burst: BURST });

Deno.serve({ port: PORT }, async (req) => {
  const start = performance.now();
  const { req: r, requestId: rid } = withRequestId(req);

  const url = new URL(r.url);
  const path = url.pathname;

  if (path === "/healthz") {
    metrics.observeRequest(r.method, path, 200, performance.now() - start);
    return new Response("ok\n", {
      status: 200,
      headers: { "X-Request-Id": rid },
    });
  }

  if (path === "/metrics") {
    const body = metrics.renderPrometheus();
    metrics.observeRequest(r.method, path, 200, performance.now() - start);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
        "X-Request-Id": rid,
      },
    });
  }

  const ip = clientIp(r) ?? "unknown";
  const allowed = limiter.allow(ip);
  if (!allowed.ok) {
    metrics.observeRequest(r.method, path, 429, performance.now() - start);
    log.warn("rate_limited", { rid, method: r.method, path, ip });
    return new Response("rate limited\n", {
      status: 429,
      headers: {
        "X-Request-Id": rid,
        "Retry-After": String(Math.ceil(allowed.retryAfterSeconds)),
      },
    });
  }

  if (path.startsWith("/api/")) {
    const auth = r.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : "";

    if (!token) {
      metrics.observeRequest(r.method, path, 401, performance.now() - start);
      return new Response("missing bearer token\n", {
        status: 401,
        headers: { "X-Request-Id": rid },
      });
    }

    const ver = await verifyHS256(token, JWT_SECRET);
    if (!ver.ok) {
      metrics.observeRequest(r.method, path, 401, performance.now() - start);
      return new Response("invalid token\n", {
        status: 401,
        headers: { "X-Request-Id": rid },
      });
    }

    if (path === "/api/hello") {
      const body = JSON.stringify({
        ok: true,
        hello: "world",
        sub: ver.payload.sub ?? null,
      });

      metrics.observeRequest(r.method, path, 200, performance.now() - start);
      log.info("request", { rid, method: r.method, path, status: 200, ip });

      return new Response(body + "\n", {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "X-Request-Id": rid,
        },
      });
    }

    metrics.observeRequest(r.method, path, 404, performance.now() - start);
    return new Response("not found\n", {
      status: 404,
      headers: { "X-Request-Id": rid },
    });
  }

  metrics.observeRequest(r.method, path, 404, performance.now() - start);
  log.info("request", { rid, method: r.method, path, status: 404, ip });
  return new Response("not found\n", {
    status: 404,
    headers: { "X-Request-Id": rid },
  });
});

function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;

  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();

  return null;
}
