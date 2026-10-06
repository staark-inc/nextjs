import { z } from "zod";
const email = z.email().max(254).refine(value => !/[\r\n]/.test(value));
export const FormKeySchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64);
export const FormsConfigSchema = z.object({
  forms: z.array(z.object({
    key: FormKeySchema,
    recipientEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).refine(value => !value.startsWith("NEXT_PUBLIC_")),
    subject: z.string().trim().min(1).max(160).refine(value => !/[\r\n]/.test(value)).default("Ny kontaktförfrågan"),
    phone: z.boolean().default(true),
  })).min(1).max(20),
}).superRefine(({ forms }, ctx) => {
  if (new Set(forms.map(form => form.key)).size !== forms.length) ctx.addIssue({ code: "custom", message: "Duplicate form key" });
});
export const SubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120).refine(value => !/[\r\n\u0000]/.test(value)),
  email,
  phone: z.string().trim().max(40).regex(/^[+()\d\s.-]*$/).default(""),
  message: z.string().trim().min(10).max(5000).refine(value => !value.includes("\u0000")),
  website: z.string().max(200).default(""),
  token: z.string().min(1).max(512),
}).strict();
export type FormSubmission = z.infer<typeof SubmissionSchema>;
export type FormsConfig = z.infer<typeof FormsConfigSchema>;
export { email as EmailSchema };
