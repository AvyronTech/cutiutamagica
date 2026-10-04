import { z } from "zod";
import { boundedJson } from "./bounded-json";
import { currentReviewer, reviewJson } from "../review-accounts";
import {
  magicRewardsDashboard,
  redeemMagicStars,
  saveGiftProfile,
} from "../services/magic-rewards";

const profileSchema = z.object({
  recipients: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  occasions: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  themes: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
});
const eventSchema = z
  .object({
    occasion: z.enum([
      "birthday_partner",
      "relationship_anniversary",
      "child_day",
      "christmas",
      "secret_santa",
      "birthday",
      "other",
    ]),
    personName: z.string().trim().min(1).max(80),
    eventMonth: z.number().int().min(1).max(12),
    eventDay: z.number().int().min(1).max(31),
    reminderDays: z.array(z.number().int().min(0).max(90)).min(1).max(5).default([12, 3]),
    emailEnabled: z.boolean().default(true),
  })
  .refine(
    ({ eventMonth, eventDay }) => {
      const date = new Date(Date.UTC(2024, eventMonth - 1, eventDay));
      return date.getUTCMonth() === eventMonth - 1 && date.getUTCDate() === eventDay;
    },
    { message: "Data calendaristică nu este validă." },
  );

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new Error("Origine nepermisă.");
}

export async function handleCustomerLoyalty(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/v1/customer/")) return null;
  try {
    const account = await currentReviewer(request, env);
    if (!account) return reviewJson({ error: { message: "Autentificare necesară." } }, 401);
    if (url.pathname === "/api/v1/customer/rewards" && request.method === "GET")
      return reviewJson({ data: await magicRewardsDashboard(env.DB, account) });
    if (request.method !== "GET") sameOrigin(request);
    if (url.pathname === "/api/v1/customer/gift-profile" && request.method === "PUT") {
      const data = profileSchema.parse(await boundedJson(request, 12_000));
      await saveGiftProfile(env.DB, account.id, data);
      return reviewJson({ data: { saved: true } });
    }
    if (url.pathname === "/api/v1/customer/gift-calendar" && request.method === "POST") {
      const data = eventSchema.parse(await boundedJson(request, 12_000));
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO gift_calendar_events(
           id,review_account_id,occasion,person_name,event_month,event_day,reminder_days_json,email_enabled
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`,
      )
        .bind(
          id,
          account.id,
          data.occasion,
          data.personName,
          data.eventMonth,
          data.eventDay,
          JSON.stringify([...new Set(data.reminderDays)].sort((a, b) => b - a)),
          data.emailEnabled ? 1 : 0,
        )
        .run();
      return reviewJson({ data: { id } }, 201);
    }
    const eventMatch = url.pathname.match(/^\/api\/v1\/customer\/gift-calendar\/([a-f0-9-]{36})$/);
    if (eventMatch && request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM gift_calendar_events WHERE id=?1 AND review_account_id=?2")
        .bind(eventMatch[1], account.id)
        .run();
      return reviewJson({ data: { deleted: true } });
    }
    if (url.pathname === "/api/v1/customer/rewards/redeem" && request.method === "POST")
      return reviewJson({ data: await redeemMagicStars(env.DB, account.id) }, 201);
    return reviewJson({ error: { message: "Pagina nu există." } }, 404);
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 409;
    return reviewJson(
      { error: { message: error instanceof Error ? error.message : "Operația nu a reușit." } },
      status,
    );
  }
}
