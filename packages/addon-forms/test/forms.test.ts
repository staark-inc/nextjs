import assert from "node:assert/strict";
import test from "node:test";
import { createFormsService, createFormsAddon, FormsError } from "../src/index.ts";
import { smtpSettings, type EmailMessage } from "../src/smtp.ts";
import { FormsConfigSchema } from "../src/config.ts";
import { loadCustomProject, resolveCustomExtensions } from "@staark/custom";
const env = { CUSTOM_FORMS_SECRET: "0123456789abcdef0123456789abcdef", CUSTOM_SMTP_HOST: "localhost", CUSTOM_SMTP_PORT: "1025", CUSTOM_SMTP_REQUIRE_TLS: "false", CUSTOM_SMTP_FROM: "sender@example.com", CONTACT_TO: "owner@example.com" };
const config = { forms: [{ key: "contact", recipientEnv: "CONTACT_TO", subject: "New contact" }] };
function fixture(send: (message: EmailMessage) => Promise<void> = async () => {}, projectKey = "demo") {
  let now = 100000;
  const service = createFormsService({ projectKey, config, env, now: () => now, send });
  const token = service.publicForm("contact").token;
  return { service, token, advance(ms: number) { now += ms; }, body: { name: "Visitor Name", email: "visitor@example.com", message: "I would like a website.", phone: "+46 123456", website: "", token } };
}
const status = (code: number) => (error: unknown) => error instanceof FormsError && error.status === code;
test("successful mail uses server-owned sender/recipient and visitor Reply-To", async () => {
  const sent: EmailMessage[] = [];
  const f = fixture(async message => { sent.push(message); });f.advance(2500);
  assert.deepEqual(await f.service.submit("contact", f.body), { ok: true });
  assert.equal(sent[0]?.to, "owner@example.com");assert.equal(sent[0]?.from, "sender@example.com");assert.equal(sent[0]?.replyTo, "visitor@example.com");
  assert.equal(sent[0]?.subject, "New contact");assert.match(sent[0]!.text, /Project: demo/);assert.match(sent[0]!.text, /Phone: \+46/);
  assert.equal(Object.hasOwn(sent[0]!, "html"), false);
});
test("public metadata never reveals SMTP, secret or recipient", () => {
  const f = fixture();const metadata = f.service.publicForm("contact");
  assert.deepEqual(Object.keys(metadata).sort(), ["key", "phone", "token"]);
  const serialized = JSON.stringify(metadata);assert.ok(!serialized.includes(env.CUSTOM_FORMS_SECRET));assert.ok(!serialized.includes(env.CONTACT_TO));
});
test("invalid payload, injected headers, extra mail options and honeypot never send", async () => {
  let sent = 0;const f = fixture(async () => { sent++; });f.advance(2500);
  for (const body of [{ ...f.body, email: "x@example.com\r\nBcc: bad@example.com" }, { ...f.body, name: "A\nB" }, { ...f.body, message: "short" }, { ...f.body, message: "x".repeat(5001) }, { ...f.body, to: "bad@example.com" }, { ...f.body, website: "bot" }]) await assert.rejects(f.service.submit("contact", body), status(400));
  assert.equal(sent, 0);
});
test("tokens reject fast, expired, forged and cross-project submissions", async () => {
  const f = fixture();await assert.rejects(f.service.submit("contact", f.body), status(400));f.advance(2500);
  await assert.rejects(f.service.submit("contact", { ...f.body, token: f.token + "bad" }), status(400));
  const other = fixture(undefined, "other");other.advance(2500);await assert.rejects(other.service.submit("contact", f.body), status(400));
  f.advance(3600000);await assert.rejects(f.service.submit("contact", f.body), status(400));
});
test("missing settings and transport errors are safe failures, not success", async () => {
  const service = createFormsService({ projectKey: "demo", config, env: {} });
  assert.throws(() => service.publicForm("contact"), status(503));
  assert.throws(() => service.publicForm("unknown"), status(404));
  const f = fixture(async () => { throw new Error("secret SMTP password"); });f.advance(2500);
  await assert.rejects(f.service.submit("contact", f.body), error => status(502)(error) && !(error as Error).message.includes("password"));
});
test("SMTP defaults require TLS, reject malformed settings and allow explicit local sink", () => {
  assert.equal(smtpSettings({ CUSTOM_SMTP_HOST: "smtp.example.com" }).requireTLS, true);
  assert.equal(smtpSettings({ CUSTOM_SMTP_HOST: "smtp.example.com", CUSTOM_SMTP_PORT: "465" }).secure, true);
  assert.equal(smtpSettings(env).requireTLS, false);
  assert.throws(() => smtpSettings({ ...env, CUSTOM_SMTP_PORT: "NaN" }));
  assert.throws(() => smtpSettings({ ...env, CUSTOM_SMTP_USER: "user" }));
  assert.throws(() => smtpSettings({ ...env, CUSTOM_SMTP_SECURE: "yes" }));
});
test("form registry rejects duplicates/public recipient variables and respects addon enablement", () => {
  assert.throws(() => FormsConfigSchema.parse({ forms: [config.forms[0], config.forms[0]] }));
  assert.throws(() => FormsConfigSchema.parse({ forms: [{ key: "contact", recipientEnv: "NEXT_PUBLIC_TO" }] }));
  const input = { schema: "staark-custom/v1", project: { key: "demo", name: "Demo", version: "1" }, runtime: { theme: { family: "custom-base" }, addons: [{ key: "forms", config, enabled: false }] } };
  assert.equal(resolveCustomExtensions(loadCustomProject(input), [createFormsAddon()]).services.size, 0);
  input.runtime.addons[0]!.enabled = true;
  assert.ok(resolveCustomExtensions(loadCustomProject(input), [createFormsAddon()]).services.has("forms"));
});
