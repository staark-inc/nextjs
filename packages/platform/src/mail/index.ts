export {
  MailConfigurationError,
  resolveMailConfig,
  type MailConfig,
  type DisabledMailConfig,
  type SmtpMailConfig,
} from "./config.ts";

export {
  getMailTransport,
  verifyMailTransport,
  sendMail,
  type StaarkMailMessage,
  type StaarkMailResult,
} from "./transport.ts";
