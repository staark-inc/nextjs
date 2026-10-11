import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CustomExtensionDefinition } from "@staark/custom";
import { FormKeySchema, FormsConfigSchema, SubmissionSchema } from "./config.ts";
import { createSmtpSender, smtpSettings, emailAddress, type MailSender } from "./smtp.ts";
export class FormsError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function createFormsService(input: { projectKey: string; config: unknown; env?: NodeJS.ProcessEnv; send?: MailSender; now?: () => number }) {
  const config = FormsConfigSchema.parse(input.config);
  const env = input.env ?? process.env;
  const now = input.now ?? Date.now;
  function settings(key: string) {
    const form = config.forms.find(item => item.key === key);
    if (!form) throw new FormsError(404, "Form not found");
    try {
      const secret = env.CUSTOM_FORMS_SECRET;
      if (!secret || secret.length < 32) throw new Error("Missing secret");
      const from = emailAddress(env.CUSTOM_SMTP_FROM);
      const to = emailAddress(env[form.recipientEnv]);
      smtpSettings(env);
      return { form, secret, from, to };
    } catch { throw new FormsError(503, "Form is temporarily unavailable"); }
  }
  function sign(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }
  return {
    config,
    publicForm(key: string) {
      const { form, secret } = settings(key);
      const data = Buffer.from(JSON.stringify({ project: input.projectKey, form: key, time: now(), nonce: randomBytes(16).toString("hex") })).toString("base64url");
      return { key: form.key, phone: form.phone, token: `${data}.${sign(data, secret)}` };
    },
    async submit(key: string, value: unknown) {
      const { form, secret, from, to } = settings(key);
      const parsed = SubmissionSchema.safeParse(value);
      if (!parsed.success) throw new FormsError(400, "Check the form fields");
      const data = parsed.data;
      if (data.website) throw new FormsError(400, "Submission rejected");
      try {
        const [payload, signature, extra] = data.token.split(".");
        if (!payload || !signature || extra) throw new Error("Token format");
        const expected = Buffer.from(sign(payload, secret));
        const supplied = Buffer.from(signature);
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("Token signature");
        const token = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        const age = now() - token.time;
        if (token.project !== input.projectKey || token.form !== key || !Number.isFinite(age) || age < 2000 || age > 3600000) throw new Error("Token expired");
      } catch { throw new FormsError(400, "Reload the form and try again"); }
      const text = [`Project: ${input.projectKey}`, `Form: ${form.key}`, `Name: ${data.name}`, `Email: ${data.email}`, ...(form.phone && data.phone ? [`Phone: ${data.phone}`] : []), "", data.message].join("\n");
      try {
        await (input.send ?? createSmtpSender(env))({ from, to, replyTo: data.email, subject: form.subject, text });
      } catch { throw new FormsError(502, "Email could not be sent. Please try again later"); }
      return { ok: true as const };
    },
  };
}
export type FormsService = ReturnType<typeof createFormsService>;
export function createFormsAddon(): CustomExtensionDefinition {
  return { key: "forms", kind: "addon", create: ({ project, config }) => createFormsService({ projectKey: project.project.key, config }) };
}
export { FormKeySchema };
