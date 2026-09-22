import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";
import {
  emailSettingsSchema,
  emailTemplateInputSchema,
  emailTestSchema,
  partnerContactInputSchema,
  partnerMessageSchema,
} from "./email-contracts";
import { activity, credentialStatuses, saveSetting } from "@/server/services/growth-settings";
import {
  assertTemplateVariables,
  emailTextToHtml,
  getEmailSettings,
  getEmailTemplate,
} from "@/server/services/email-center";
import { sendEmail } from "@/server/integrations/resend";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

function sameOrigin() {
  const request = getRequest();
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error("Cerere de administrare nepermisă.");
}

export const getEmailHub = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "integrations.read");
    const [settings, templates, contacts, operations, counts, credentials] = await Promise.all([
      getEmailSettings(env.DB),
      env.DB.prepare(
        `SELECT code,name,audience,enabled,subject_template AS subjectTemplate,
                  text_template AS textTemplate,updated_at AS updatedAt
           FROM email_templates ORDER BY name`,
      ).all<{
        code: string;
        name: string;
        audience: string;
        enabled: number;
        subjectTemplate: string;
        textTemplate: string;
        updatedAt: string;
      }>(),
      env.DB.prepare(
        `SELECT id,name,company,email,status,notes,updated_at AS updatedAt
           FROM email_contacts WHERE audience='partner' ORDER BY status,name LIMIT 100`,
      ).all<Record<string, string | null>>(),
      env.DB.prepare(
        `SELECT entity_type AS entityType,status,response_code AS responseCode,
                  error_message AS errorMessage,created_at AS createdAt
           FROM provider_operations
           WHERE provider='resend' AND operation_type='email.send'
           ORDER BY created_at DESC LIMIT 30`,
      ).all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT
             (SELECT COUNT(*) FROM customers WHERE email_normalized IS NOT NULL AND status!='anonymized') AS customers,
             (SELECT COUNT(*) FROM email_contacts WHERE audience='partner' AND status='active') AS partners,
             (SELECT COUNT(*) FROM newsletter_subscribers WHERE status='active') AS subscribers,
             (SELECT COUNT(*) FROM provider_operations WHERE provider='resend' AND operation_type='email.send' AND status='succeeded' AND created_at>=datetime('now','-30 days')) AS sent30d,
             (SELECT COUNT(*) FROM provider_operations WHERE provider='resend' AND operation_type='email.send' AND status='failed' AND created_at>=datetime('now','-30 days')) AS failed30d`,
      ).first<Record<string, number>>(),
      credentialStatuses(env as CommerceEnv),
    ]);
    return {
      settings,
      templates: templates.results.map((row) => ({ ...row, enabled: row.enabled === 1 })),
      contacts: contacts.results,
      operations: operations.results,
      counts: counts ?? { customers: 0, partners: 0, subscribers: 0, sent30d: 0, failed30d: 0 },
      resend: credentials.find((item) => item.provider === "resend") ?? null,
      secureStorageReady: Boolean((env as CommerceEnv).INTEGRATION_ENCRYPTION_KEY),
    };
  });

export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(emailSettingsSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    await saveSetting(env.DB, "email", data, context.admin.id);
    return { ok: true };
  });

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(emailTemplateInputSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    assertTemplateVariables(data.code, data.subjectTemplate, data.textTemplate);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE email_templates
           SET enabled=?2,subject_template=?3,text_template=?4,updated_by=?5,updated_at=?6
           WHERE code=?1`,
      ).bind(
        data.code,
        data.enabled ? 1 : 0,
        data.subjectTemplate,
        data.textTemplate,
        context.admin.id,
        now,
      ),
      activity(env.DB, context.admin.id, "email.template_saved", data.code, now),
    ]);
    return { ok: true };
  });

export const addPartnerContact = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(partnerContactInputSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "team.write");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO email_contacts(
               id,audience,name,company,email,email_normalized,status,notes,
               created_by,updated_by,created_at,updated_at
             ) VALUES(?1,'partner',?2,?3,?4,?4,'active',?5,?6,?6,?7,?7)`,
        ).bind(
          id,
          data.name,
          data.company || null,
          data.email,
          data.notes || null,
          context.admin.id,
          now,
        ),
        activity(env.DB, context.admin.id, "email.partner_added", id, now),
      ]);
    } catch (error) {
      if (error instanceof Error && /unique/i.test(error.message))
        throw new Error("Această adresă există deja în lista de parteneri.");
      throw error;
    }
    return { ok: true, id };
  });

export const setPartnerContactStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ contactId: z.string().uuid(), status: z.enum(["active", "archived"]) }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "team.write");
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE email_contacts SET status=?2,updated_by=?3,updated_at=?4
           WHERE id=?1 AND audience='partner'`,
      ).bind(data.contactId, data.status, context.admin.id, now),
      activity(env.DB, context.admin.id, "email.partner_status", data.contactId, now),
    ]);
    return { ok: true };
  });

export const sendEmailTest = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(emailTestSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    const id = crypto.randomUUID();
    await sendEmail(env as CommerceEnv, {
      to: context.admin.email,
      channel: data.channel,
      subject: `Test ${data.channel} · Cutiuța Magică`,
      text: `Acesta este un test al canalului ${data.channel}. Dacă mesajul a ajuns, expeditorul și integrarea Resend funcționează.`,
      html: emailTextToHtml(
        `Acesta este un test al canalului ${data.channel}.\n\nDacă mesajul a ajuns, expeditorul și integrarea Resend funcționează.`,
      ),
      idempotencyKey: `email-test/${context.admin.id}/${id}`,
      entityType: "email_test",
      entityId: id,
    });
    return { ok: true };
  });

export const sendPartnerMessage = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(partnerMessageSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    const settings = await getEmailSettings(env.DB);
    if (!settings.partnerEmailsEnabled)
      throw new Error("Activează mesajele către parteneri înainte de trimitere.");
    const contact = await env.DB.prepare(
      "SELECT email FROM email_contacts WHERE id=?1 AND audience='partner' AND status='active'",
    )
      .bind(data.contactId)
      .first<{ email: string }>();
    if (!contact) throw new Error("Partenerul nu este activ sau nu există.");
    const id = crypto.randomUUID();
    await sendEmail(env as CommerceEnv, {
      to: contact.email,
      channel: "partners",
      subject: data.subject,
      text: data.message,
      html: emailTextToHtml(data.message),
      idempotencyKey: `partner-message/${data.contactId}/${id}`,
      entityType: "partner",
      entityId: data.contactId,
    });
    return { ok: true };
  });

export const getEmailTemplatePreview = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(z.object({ code: z.enum(["order_confirmation", "return_acknowledgement"]) }))
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "integrations.read");
    const template = await getEmailTemplate(env.DB, data.code);
    return template;
  });
