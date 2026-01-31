[![ci](https://github.com/xj16/edgeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/xj16/edgeguard/actions/workflows/ci.yml)

# edgeguard 🛡️⚡️ (Deno TypeScript)

A minimal **edge-friendly API gateway** built on **Deno**:

- JWT (HS256) auth middleware
- in-memory token-bucket rate limiting
- `/healthz` and `/metrics` (Prometheus text format)
- request-id + structured JSON logs
- fast CI (fmt/lint/check/test)

> Designed to look and feel like a production service, while staying tiny.

## Quickstart

```bash
deno task dev
```

### Example calls

Health:

```bash
curl -i http://localhost:8080/healthz
```

Metrics:

```bash
curl -s http://localhost:8080/metrics | head
```

Protected route (requires JWT):

```bash
curl -i http://localhost:8080/api/hello
```

Create a token (local helper):

```bash
JWT_SECRET=dev-secret deno task token
```

Then:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8080/api/hello
```

## Config (env)

| Env               | Default       | Notes                         |
| ----------------- | ------------: | ----------------------------- |
| `PORT`            |        `8080` | Listen port                   |
| `LOG_LEVEL`       |        `info` | `debug`/`info`/`warn`/`error` |
| `JWT_SECRET`      |  `dev-secret` | HS256 secret                  |
| `RATE_LIMIT_RPS`  |          `10` | Requests per second per IP    |
| `RATE_LIMIT_BURST`|          `20` | Burst tokens per IP           |

## Docker

```bash
docker build -t edgeguard .
docker run --rm -p 8080:8080 -e JWT_SECRET=dev-secret edgeguard
```

## License

MIT — see [LICENSE](LICENSE).
