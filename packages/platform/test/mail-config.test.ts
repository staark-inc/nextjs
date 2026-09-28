import assert from "node:assert/strict";
import test from "node:test";
import {
  MailConfigurationError,
  resolveMailConfig,
  summarizeMailConfig,
} from "../src/mail/config.ts";

test("mail transport is disabled by default", () => {
  assert.deepEqual(resolveMailConfig({}), { transport: "disabled" });
});

test("smtp resolves authenticated submission safely", () => {
  const config = resolveMailConfig({
    STAARK_MAIL_TRANSPORT: "smtp",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_USER: "mailer@example.com",
    SMTP_PASSWORD: "secret",
    SMTP_FROM: "Example <mailer@example.com>",
    SMTP_REPLY_TO: "support@example.com",
  });

  assert.equal(config.transport, "smtp");
  if (config.transport !== "smtp") return;

  assert.equal(config.host, "smtp.example.com");
  assert.equal(config.port, 587);
  assert.equal(config.secure, false);
  assert.deepEqual(config.auth, {
    user: "mailer@example.com",
    password: "secret",
  });
  assert.equal(config.replyTo, "support@example.com");
  assert.equal(config.tls.rejectUnauthorized, true);
});

test("smtp relay may run without username/password", () => {
  const config = resolveMailConfig({
    STAARK_MAIL_TRANSPORT: "smtp",
    SMTP_HOST: "smtp-relay.example.com",
    SMTP_PORT: "25",
    SMTP_FROM: "noreply@example.com",
  });

  assert.equal(config.transport, "smtp");
  if (config.transport !== "smtp") return;
  assert.equal(config.auth, undefined);
});

test("smtp username/password must be configured together", () => {
  assert.throws(
    () =>
      resolveMailConfig({
        STAARK_MAIL_TRANSPORT: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "noreply@example.com",
        SMTP_USER: "mailer@example.com",
      }),
    MailConfigurationError,
  );
});

test("invalid smtp booleans and ports are rejected", () => {
  assert.throws(
    () =>
      resolveMailConfig({
        STAARK_MAIL_TRANSPORT: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "noreply@example.com",
        SMTP_SECURE: "maybe",
      }),
    MailConfigurationError,
  );

  assert.throws(
    () =>
      resolveMailConfig({
        STAARK_MAIL_TRANSPORT: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "noreply@example.com",
        SMTP_PORT: "99999",
      }),
    MailConfigurationError,
  );
});

test("mail summary is safe for manager UI and never exposes credentials", () => {
  const summary = summarizeMailConfig({
    STAARK_MAIL_TRANSPORT: "smtp",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "mailer@example.com",
    SMTP_PASSWORD: "super-secret-password",
    SMTP_FROM: "Example <mailer@example.com>",
    SMTP_REPLY_TO: "support@example.com",
  });

  assert.deepEqual(summary, {
    transport: "smtp",
    configured: true,
    host: "smtp.example.com",
    port: 587,
    secure: false,
    from: "Example <mailer@example.com>",
    replyTo: "support@example.com",
    authConfigured: true,
    tlsRejectUnauthorized: true,
    connectionTimeoutMs: 10_000,
  });

  assert.equal("auth" in summary, false);
  assert.equal(JSON.stringify(summary).includes("super-secret-password"), false);
});
