export type EmailTemplateRow = {
  label: string;
  value: string;
};

export type EmailTemplateAction = {
  label: string;
  href: string;
};

export type EmailTemplateInput = {
  siteName: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  rows?: EmailTemplateRow[];
  message?: string;
  action?: EmailTemplateAction;
  footer?: string;
};

export type RenderedEmailTemplate = {
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderEmailTemplate(input: EmailTemplateInput): RenderedEmailTemplate {
  const rows = (input.rows ?? []).filter((row) => row.value.trim());
  const actionHref = input.action ? safeHref(input.action.href) : null;

  const text = [
    input.eyebrow?.trim(),
    input.title.trim(),
    input.intro?.trim(),
    ...rows.flatMap((row) => [`${row.label}: ${row.value}`, ""]),
    input.message?.trim(),
    actionHref && input.action ? `${input.action.label}: ${actionHref}` : undefined,
    input.footer?.trim(),
  ]
    .filter((item): item is string => Boolean(item))
    .join("\n\n");

  const rowHtml = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:12px;vertical-align:top;width:130px;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:14px;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");

  const actionHtml =
    actionHref && input.action
      ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionHref)}" style="display:inline-block;padding:11px 16px;border-radius:8px;background:#1677ff;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;">${escapeHtml(input.action.label)}</a></p>`
      : "";

  const footer = input.footer ?? `${input.siteName} - Sent by Staark`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px;">
                ${
                  input.eyebrow
                    ? `<div style="margin-bottom:8px;color:#1677ff;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</div>`
                    : ""
                }
                <h1 style="margin:0;color:#0f172a;font-size:24px;line-height:1.25;">${escapeHtml(input.title)}</h1>
                ${
                  input.intro
                    ? `<p style="margin:10px 0 0;color:#64748b;font-size:14px;line-height:1.6;">${escapeHtml(input.intro)}</p>`
                    : ""
                }
                ${
                  rowHtml
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-top:1px solid #e6ebf2;border-bottom:1px solid #e6ebf2;">${rowHtml}</table>`
                    : ""
                }
                ${
                  input.message
                    ? `<div style="margin-top:22px;padding:16px;border-radius:8px;background:#f8fafc;color:#334155;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(input.message)}</div>`
                    : ""
                }
                ${actionHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px;border-top:1px solid #e6ebf2;color:#94a3b8;font-size:11px;line-height:1.5;">
                ${escapeHtml(footer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}
