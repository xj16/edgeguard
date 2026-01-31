export function b64urlDecode(input: string): Uint8Array {
  // base64url -> base64
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  // pad
  while (s.length % 4 !== 0) s += "=";

  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
