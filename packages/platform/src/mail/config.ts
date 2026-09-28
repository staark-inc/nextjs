export type MailEnvironment = Readonly<Record<string, string | undefined>>;

export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailConfigurationError";
  }
}

export type DisabledMailConfig = {
  transport: "disabled";
};

export type SmtpMailConfig = {
  transport: "smtp";
  host: string;
  port: number;
  secure: boolean;
  from: string;
  replyTo?: string;
  auth?: {
    user: string;
    password: string;
  };
  tls: {
    rejectUnauthorized: boolean;
  };
  connectionTimeoutMs: number;
};

export type MailConfig = DisabledMailConfig | SmtpMailConfig;

export type MailConfigSummary =
  | {
      transport: "disabled";
      configured: false;
    }
  | {
      transport: "smtp";
      configured: true;
      host: string;
      port: number;
      secure: boolean;
      from: string;
      replyTo?: string;
      authConfigured: boolean;
      tlsRejectUnauthorized: boolean;
      connectionTimeoutMs: number;
    };

function value(env: MailEnvironment, key: string): string | undefined {
  const raw = env[key];
  return raw?.trim() || undefined;
}

function booleanValue(
  env: MailEnvironment,
  key: string,
  fallback: boolean,
): boolean {
  const raw = value(env, key);
  if (raw === undefined) return fallback;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new MailConfigurationError(`${key} must be true/false or 1/0.`);
}

function integerValue(
  env: MailEnvironment,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = value(env, key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new MailConfigurationError(
      `${key} must be an integer between ${min} and ${max}.`,
    );
  }
  return parsed;
}

/**
 * Resolve server-side email transport configuration.
 *
 * Default is intentionally disabled. A client deployment only starts sending
 * mail after SMTP is explicitly configured.
 *
 * SMTP_USER / SMTP_PASSWORD are optional as a pair so trusted SMTP relays can
 * use IP/network authentication without application credentials.
 */
export function resolveMailConfig(
  env: MailEnvironment = process.env,
): MailConfig {
  const transport = value(env, "STAARK_MAIL_TRANSPORT") ?? "disabled";

  if (transport === "disabled") {
    return { transport: "disabled" };
  }

  if (transport !== "smtp") {
    throw new MailConfigurationError(
      "STAARK_MAIL_TRANSPORT must be either disabled or smtp.",
    );
  }

  const host = value(env, "SMTP_HOST");
  const from = value(env, "SMTP_FROM");
  const user = value(env, "SMTP_USER");
  const password = value(env, "SMTP_PASSWORD");

  if (!host) {
    throw new MailConfigurationError(
      "SMTP_HOST is required when STAARK_MAIL_TRANSPORT=smtp.",
    );
  }

  if (!from) {
    throw new MailConfigurationError(
      "SMTP_FROM is required when STAARK_MAIL_TRANSPORT=smtp.",
    );
  }

  if (Boolean(user) !== Boolean(password)) {
    throw new MailConfigurationError(
      "SMTP_USER and SMTP_PASSWORD must be configured together.",
    );
  }

  const port = integerValue(env, "SMTP_PORT", 587, 1, 65535);
  const secure = booleanValue(env, "SMTP_SECURE", port === 465);
  const rejectUnauthorized = booleanValue(
    env,
    "SMTP_TLS_REJECT_UNAUTHORIZED",
    true,
  );
  const connectionTimeoutMs = integerValue(
    env,
    "SMTP_CONNECTION_TIMEOUT_MS",
    10_000,
    1_000,
    120_000,
  );

  return {
    transport: "smtp",
    host,
    port,
    secure,
    from,
    ...(value(env, "SMTP_REPLY_TO")
      ? { replyTo: value(env, "SMTP_REPLY_TO") }
      : {}),
    ...(user && password ? { auth: { user, password } } : {}),
    tls: { rejectUnauthorized },
    connectionTimeoutMs,
  };
}

export function summarizeMailConfig(
  env: MailEnvironment = process.env,
): MailConfigSummary {
  const config = resolveMailConfig(env);

  if (config.transport === "disabled") {
    return {
      transport: "disabled",
      configured: false,
    };
  }

  return {
    transport: "smtp",
    configured: true,
    host: config.host,
    port: config.port,
    secure: config.secure,
    from: config.from,
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    authConfigured: Boolean(config.auth),
    tlsRejectUnauthorized: config.tls.rejectUnauthorized,
    connectionTimeoutMs: config.connectionTimeoutMs,
  };
}
