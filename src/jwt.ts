import { b64urlDecode, b64urlEncode } from "./base64url.ts";

export type JwtVerifyOk = { ok: true; header: Record<string, unknown>; payload: Record<string, unknown> };
export type JwtVerifyErr = { ok: false; reason: string };
export type JwtVerifyResult = JwtVerifyOk | JwtVerifyErr;

export async function verifyHS256(token: string, secret: string): Promise<JwtVerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "bad_format" };

  const [h64, p64, sig64] = parts;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(h64)));
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p64)));
  } catch {
    return { ok: false, reason: "bad_json" };
  }

  if (header.alg !== "HS256") return { ok: false, reason: "unsupported_alg" };

  const data = new TextEncoder().encode(`${h64}.${p64}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify", "sign"],
  );

  const sig = b64urlDecode(sig64);
  const ok = await crypto.subtle.verify("HMAC", key, sig, data);
  if (!ok) return { ok: false, reason: "bad_sig" };

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now >= payload.exp) return { ok: false, reason: "expired" };
  if (typeof payload.nbf === "number" && now < payload.nbf) return { ok: false, reason: "not_before" };

  return { ok: true, header, payload };
}

export async function mintHS256(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };

  const h64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const p64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const data = new TextEncoder().encode(`${h64}.${p64}`);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  const s64 = b64urlEncode(sig);
  return `${h64}.${p64}.${s64}`;
}
