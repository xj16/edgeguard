function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function withRequestId(
  req: Request,
): { req: Request; requestId: string } {
  const fromHeader = req.headers.get("x-request-id");
  const rid = (fromHeader && fromHeader.trim())
    ? fromHeader.trim()
    : randomHex(16);

  const headers = new Headers(req.headers);
  headers.set("x-request-id", rid);

  const wrapped = new Request(req, { headers });
  return { req: wrapped, requestId: rid };
}
