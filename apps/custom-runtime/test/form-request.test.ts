import assert from "node:assert/strict";
import test from "node:test";
import { allowFormRequest, formClientKey, readFormJson } from "../lib/form-request.ts";
test("bounded request limits expire and stay isolated by project", () => {
  assert.equal(allowFormRequest("test:one", 1, 1000), true);
  assert.equal(allowFormRequest("test:one", 1, 1001), false);
  assert.equal(allowFormRequest("test:two", 1, 1001), true);
  assert.equal(allowFormRequest("test:one", 1, 601000), true);
});
test("proxy headers are ignored unless explicitly trusted", () => {
  const a = new Request("http://localhost", { headers: { "x-real-ip": "192.0.2.1" } });
  const b = new Request("http://localhost", { headers: { "x-real-ip": "192.0.2.2" } });
  assert.equal(formClientKey(a, false), formClientKey(b, false));
  assert.notEqual(formClientKey(a, true), formClientKey(b, true));
});
test("JSON reader limits actual streamed bytes, rejects wrong types and malformed JSON", async () => {
  const request = (body: string, type = "application/json") => new Request("http://localhost", { method: "POST", headers: { "content-type": type }, body });
  assert.deepEqual(await readFormJson(request('{"name":"Visitor"}')), { name: "Visitor" });
  await assert.rejects(readFormJson(request("x".repeat(100)), 20), /size/);
  await assert.rejects(readFormJson(request("{}", "text/plain")), /content-type/);
  await assert.rejects(readFormJson(request("{bad}")));
});
