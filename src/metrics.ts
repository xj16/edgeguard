type Key = string;

function k(method: string, path: string, status: number): Key {
  return `${method}|${path}|${status}`;
}

function hkey(method: string, path: string): Key {
  return `${method}|${path}`;
}

export class Metrics {
  private requests = new Map<Key, number>();
  private durations = new Map<Key, number[]>();
  private inFlight = 0;

  incInFlight() {
    this.inFlight++;
  }

  decInFlight() {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }

  observeRequest(method: string, path: string, status: number, durMs: number) {
    const key = k(method, path, status);
    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);

    const hk = hkey(method, path);
    const arr = this.durations.get(hk) ?? [];
    arr.push(durMs / 1000);
    if (arr.length > 200) arr.shift();
    this.durations.set(hk, arr);
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    lines.push(
      "# HELP edgeguard_requests_total Total number of HTTP requests.",
    );
    lines.push("# TYPE edgeguard_requests_total counter");
    lines.push("# HELP edgeguard_in_flight Number of requests in flight.");
    lines.push("# TYPE edgeguard_in_flight gauge");
    lines.push(
      "# HELP edgeguard_request_duration_seconds Request duration (seconds), simple quantiles over recent samples.",
    );
    lines.push("# TYPE edgeguard_request_duration_seconds summary");

    lines.push(`edgeguard_in_flight ${this.inFlight}`);

    const reqEntries = Array.from(this.requests.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [key, val] of reqEntries) {
      const [method, path, statusStr] = key.split("|");
      const status = Number(statusStr);
      lines.push(
        `edgeguard_requests_total{method="${esc(method)}",path="${
          esc(path)
        }",status="${status}"} ${val}`,
      );
    }

    const durEntries = Array.from(this.durations.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [key, samples] of durEntries) {
      const [method, path] = key.split("|");
      const sorted = [...samples].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((acc, x) => acc + x, 0);

      const p50 = quantile(sorted, 0.5);
      const p90 = quantile(sorted, 0.9);
      const p99 = quantile(sorted, 0.99);

      lines.push(
        `edgeguard_request_duration_seconds{method="${esc(method)}",path="${
          esc(path)
        }",quantile="0.5"} ${p50}`,
      );
      lines.push(
        `edgeguard_request_duration_seconds{method="${esc(method)}",path="${
          esc(path)
        }",quantile="0.9"} ${p90}`,
      );
      lines.push(
        `edgeguard_request_duration_seconds{method="${esc(method)}",path="${
          esc(path)
        }",quantile="0.99"} ${p99}`,
      );
      lines.push(
        `edgeguard_request_duration_seconds_sum{method="${esc(method)}",path="${
          esc(path)
        }"} ${sum}`,
      );
      lines.push(
        `edgeguard_request_duration_seconds_count{method="${
          esc(method)
        }",path="${esc(path)}"} ${count}`,
      );
    }

    return lines.join("\n") + "\n";
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function esc(s: string): string {
  return s.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(
    '"',
    '\\"',
  );
}
