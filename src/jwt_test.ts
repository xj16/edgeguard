import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mintHS256, verifyHS256 } from "./jwt.ts";

Deno.test("mint + verify HS256 roundtrip", async () => {
  const secret = "test-secret";
  const token = await mintHS256({
    sub: "u1",
    exp: Math.floor(Date.now() / 1000) + 60,
  }, secret);
  const res = await verifyHS256(token, secret);
  assert(res.ok);
  assertEquals(res.payload.sub, "u1");
});

Deno.test("verify rejects wrong secret", async () => {
  const token = await mintHS256({ sub: "u1" }, "a");
  const res = await verifyHS256(token, "b");
  assert(!res.ok);
});
