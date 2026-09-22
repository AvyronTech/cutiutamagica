import {
  allowedTemplateVariables,
  emailSettingsSchema,
  type EmailSettings,
  type EmailTemplateCode,
} from "@/lib/email-contracts";
import { readSetting } from "./growth-settings";

export type StoredEmailTemplate = {
  code: EmailTemplateCode;
  name: string;
  audience: "customer" | "partner" | "internal";
  enabled: boolean;
  subjectTemplate: string;
  textTemplate: string;
  updatedAt: string;
};

const templateVariablePattern = /{{\s*([a-z_]+)\s*}}/g;

export function assertTemplateVariables(
  code: EmailTemplateCode,
  subjectTemplate: string,
  textTemplate: string,
): void {
  const allowed = new Set(allowedTemplateVariables[code]);
  const variables = [
    ...`${subjectTemplate}\n${textTemplate}`.matchAll(templateVariablePattern),
  ].map((match) => match[1]);
  const invalid = variables.filter((variable) => !allowed.has(variable));
  if (invalid.length) throw new Error(`Variabile nepermise: ${[...new Set(invalid)].join(", ")}.`);
}

export function renderEmailTemplate(
  template: Pick<StoredEmailTemplate, "subjectTemplate" | "textTemplate">,
  values: Record<string, string>,
): { subject: string; text: string } {
  const replace = (source: string) =>
    source.replace(templateVariablePattern, (_token, variable: string) => values[variable] ?? "");
  return {
    subject: replace(template.subjectTemplate),
    text: replace(template.textTemplate),
  };
}

export function emailTextToHtml(text: string): string {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p style="margin:0 0 16px">${escape(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("");
  return `<div style="font-family:Inter,system-ui,sans-serif;color:#3c2d24;max-width:600px;margin:auto;line-height:1.6"><div style="border-top:4px solid #c89545;padding:28px 8px">${paragraphs}</div></div>`;
}

export async function getEmailSettings(db: D1Database): Promise<EmailSettings> {
  return readSetting(db, "email", emailSettingsSchema);
}

export async function getEmailTemplate(
  db: D1Database,
  code: EmailTemplateCode,
): Promise<StoredEmailTemplate | null> {
  const row = await db
    .prepare(
      `SELECT code,name,audience,enabled,subject_template,text_template,updated_at
       FROM email_templates WHERE code=?1`,
    )
    .bind(code)
    .first<{
      code: EmailTemplateCode;
      name: string;
      audience: "customer" | "partner" | "internal";
      enabled: number;
      subject_template: string;
      text_template: string;
      updated_at: string;
    }>();
  return row
    ? {
        code: row.code,
        name: row.name,
        audience: row.audience,
        enabled: row.enabled === 1,
        subjectTemplate: row.subject_template,
        textTemplate: row.text_template,
        updatedAt: row.updated_at,
      }
    : null;
}

export function fromAddress(settings: EmailSettings, channel: string): string {
  if (channel === "orders") return settings.ordersFromEmail;
  if (channel === "returns") return settings.returnsFromEmail;
  if (channel === "partners") return settings.partnersFromEmail;
  return settings.defaultFromEmail;
}
