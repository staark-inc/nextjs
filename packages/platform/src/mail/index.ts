export {
  MailConfigurationError,
  resolveMailConfig,
  summarizeMailConfig,
  type MailConfig,
  type MailConfigSummary,
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

export {
  renderEmailTemplate,
  type EmailTemplateInput,
  type EmailTemplateRow,
  type EmailTemplateAction,
  type RenderedEmailTemplate,
} from "./template.ts";

export {
  renderSubmissionNotification,
  sendSubmissionNotification,
  type SubmissionNotificationInput,
} from "./notifications.ts";
