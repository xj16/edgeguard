import { mintHS256 } from "../src/jwt.ts";

const secret = Deno.env.get("JWT_SECRET") ?? "dev-secret";
const now = Math.floor(Date.now() / 1000);

const payload = {
  sub: "demo-user",
  iat: now,
  exp: now + 60 * 60, // 1h
};

const token = await mintHS256(payload, secret);
// deno-lint-ignore no-console
console.log(token);
