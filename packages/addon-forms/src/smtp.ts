import nodemailer from "nodemailer";
import { EmailSchema } from "./config.ts";
export type EmailMessage = { from: string; to: string; replyTo: string; subject: string; text: string };
export type MailSender = (message: EmailMessage) => Promise<void>;
function boolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  if (value !== "true" && value !== "false") throw new Error("Invalid SMTP boolean");
  return value === "true";
}
export function smtpSettings(env: NodeJS.ProcessEnv) {
  const host = env.CUSTOM_SMTP_HOST?.trim();
  if (!host || /[\s\u0000]/.test(host)) throw new Error("SMTP host missing");
  const port = Number(env.CUSTOM_SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP port");
  const user = env.CUSTOM_SMTP_USER;
  const pass = env.CUSTOM_SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(pass)) throw new Error("Incomplete SMTP credentials");
  return {
    host, port, secure: boolean(env.CUSTOM_SMTP_SECURE, port === 465),
    requireTLS: boolean(env.CUSTOM_SMTP_REQUIRE_TLS, true),
    ...(user && pass ? { auth: { user, pass } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true,
  };
}
export function createSmtpSender(env: NodeJS.ProcessEnv): MailSender {
  const transporter = nodemailer.createTransport(smtpSettings(env));
  return async message => {
    // Constructed by trusted code; never pass request JSON to sendMail.
    const result = await transporter.sendMail(message);
    if (!result.accepted?.length || result.rejected?.length) throw new Error("SMTP recipient rejected");
  };
}
export function emailAddress(value: string | undefined) { return EmailSchema.parse(value?.trim()); }
