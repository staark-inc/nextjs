import nodemailer, {
  type SendMailOptions,
  type Transporter,
} from "nodemailer";
import {
  MailConfigurationError,
  resolveMailConfig,
  type MailConfig,
  type SmtpMailConfig,
} from "./config.ts";

export type StaarkMailMessage = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export type StaarkMailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

type CachedTransport = {
  key: string;
  transporter: Transporter;
};

let cachedTransport: CachedTransport | null = null;

function smtpKey(config: SmtpMailConfig): string {
  // Never logged or returned. Including credentials makes a changed secret
  // automatically replace the cached transporter after a process restart/test.
  return JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth?.user ?? "",
    password: config.auth?.password ?? "",
    tls: config.tls.rejectUnauthorized,
    timeout: config.connectionTimeoutMs,
  });
}

function ensureMessage(message: StaarkMailMessage): void {
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  if (!recipients.length || recipients.some((item) => !item.trim())) {
    throw new MailConfigurationError("Email requires at least one recipient.");
  }
  if (!message.subject.trim()) {
    throw new MailConfigurationError("Email subject cannot be empty.");
  }
  if (/[\r\n]/.test(message.subject)) {
    throw new MailConfigurationError("Email subject cannot contain line breaks.");
  }
  if (!message.text?.trim() && !message.html?.trim()) {
    throw new MailConfigurationError("Email requires text or html content.");
  }
}

function createSmtpTransport(config: SmtpMailConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.auth ? { auth: config.auth } : {}),
    tls: {
      rejectUnauthorized: config.tls.rejectUnauthorized,
    },
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.connectionTimeoutMs,
    socketTimeout: Math.max(config.connectionTimeoutMs, 30_000),
  });
}

export function getMailTransport(
  env: NodeJS.ProcessEnv = process.env,
): { config: SmtpMailConfig; transporter: Transporter } {
  const config: MailConfig = resolveMailConfig(env);

  if (config.transport === "disabled") {
    throw new MailConfigurationError(
      "Email transport is disabled. Set STAARK_MAIL_TRANSPORT=smtp and configure SMTP.",
    );
  }

  const key = smtpKey(config);
  if (!cachedTransport || cachedTransport.key !== key) {
    cachedTransport = {
      key,
      transporter: createSmtpTransport(config),
    };
  }

  return { config, transporter: cachedTransport.transporter };
}

export async function verifyMailTransport(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const { transporter } = getMailTransport(env);
  await transporter.verify();
}

export async function sendMail(
  message: StaarkMailMessage,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StaarkMailResult> {
  ensureMessage(message);

  const { config, transporter } = getMailTransport(env);

  const payload: SendMailOptions = {
    from: config.from,
    to: message.to,
    subject: message.subject,
    ...(message.text ? { text: message.text } : {}),
    ...(message.html ? { html: message.html } : {}),
    replyTo: message.replyTo ?? config.replyTo,
  };

  const result = await transporter.sendMail(payload);

  return {
    messageId: String(result.messageId ?? ""),
    accepted: Array.isArray(result.accepted)
      ? result.accepted.map((item: unknown) => String(item))
      : [],
    rejected: Array.isArray(result.rejected)
      ? result.rejected.map((item: unknown) => String(item))
      : [],
  };
}

/** Test helper; not part of the public product API. */
export function resetMailTransportForTests(): void {
  cachedTransport = null;
}
