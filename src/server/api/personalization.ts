import {
  PERSONALIZATION_BASE_PRICE_BANI,
  PERSONALIZATION_GIFT_WRAP_BANI,
  PERSONALIZATION_MAX_IMAGE_BYTES,
  personalizationFieldsSchema,
  personalizationReference,
  personalizationTotalBani,
  type PersonalizationRequestSummary,
} from "@/lib/personalization";
import {
  currentReviewer,
  requestIP,
  reviewFailure,
  reviewJson,
  reviewRate,
  sameOrigin,
} from "@/server/review-accounts";

const API_PATH = "/api/v1/personalization/requests";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PersonalizationRow = {
  id: string;
  box_color: "black" | "yellow";
  melody: "melody-1" | "melody-2" | "melody-3";
  gift_wrap: number;
  total_bani: number;
  status: PersonalizationRequestSummary["status"];
  created_at: string;
};

function mapSummary(row: PersonalizationRow): PersonalizationRequestSummary {
  return {
    id: row.id,
    boxColor: row.box_color,
    melody: row.melody,
    giftWrap: row.gift_wrap === 1,
    totalBani: row.total_bani,
    status: row.status,
    createdAt: row.created_at,
  };
}

function extensionFor(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function safeFileName(name: string): string {
  const normalized = Array.from(name.normalize("NFKC"), (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 || character === "/" || character === "\\" ? "-" : character;
  })
    .join("")
    .trim();
  return (normalized || "imagine-capac").slice(0, 180);
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png")
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

async function listRequests(request: Request, env: Env): Promise<Response> {
  const account = await currentReviewer(request, env);
  if (!account) throw reviewFailure("Autentifică-te pentru a vedea cererile tale.", 401);
  const rows = await env.DB.prepare(
    `SELECT id, box_color, melody, gift_wrap, total_bani, status, created_at
     FROM personalization_requests
     WHERE account_id = ?1
     ORDER BY created_at DESC
     LIMIT 50`,
  )
    .bind(account.id)
    .all<PersonalizationRow>();
  return reviewJson({ data: rows.results.map(mapSummary) });
}

async function createRequest(request: Request, env: Env): Promise<Response> {
  sameOrigin(request);
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (
    !Number.isFinite(contentLength) ||
    contentLength > PERSONALIZATION_MAX_IMAGE_BYTES + 64 * 1024
  )
    throw reviewFailure("Imaginea este prea mare. Limita este 5 MB.", 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data"))
    throw reviewFailure("Formularul trebuie trimis împreună cu imaginea.", 415);

  const form = await request.formData();
  const parsed = personalizationFieldsSchema.safeParse({
    customerName: form.get("customerName"),
    email: form.get("email"),
    phone: form.get("phone"),
    boxColor: form.get("boxColor"),
    melody: form.get("melody"),
    giftWrap: form.get("giftWrap"),
    notes: form.get("notes"),
    consent: form.get("consent"),
    website: form.get("website"),
  });
  if (!parsed.success)
    throw reviewFailure("Verifică opțiunile și datele de contact înainte de trimitere.");

  const image = form.get("image");
  if (!(image instanceof File) || image.size < 1)
    throw reviewFailure("Adaugă imaginea pentru capacul cutiuței.");
  if (image.size > PERSONALIZATION_MAX_IMAGE_BYTES)
    throw reviewFailure("Imaginea este prea mare. Limita este 5 MB.", 413);
  if (!ALLOWED_IMAGE_TYPES.has(image.type) || !(await hasValidImageSignature(image)))
    throw reviewFailure("Folosește o imagine JPG, PNG sau WebP validă.", 415);

  await reviewRate(
    env,
    [`personalization-ip:${requestIP(request)}`, `personalization-email:${parsed.data.email}`],
    5,
  );
  const account = await currentReviewer(request, env);
  const id = crypto.randomUUID();
  const r2Key = `private/personalizations/${id}/lid.${extensionFor(image.type)}`;
  const imageBytes = await image.arrayBuffer();
  const checksum = await crypto.subtle.digest("SHA-256", imageBytes);
  const totalBani = personalizationTotalBani(parsed.data.giftWrap);

  await env.MEDIA.put(r2Key, imageBytes, {
    sha256: checksum,
    httpMetadata: {
      contentType: image.type,
      contentDisposition: "attachment",
      cacheControl: "private, no-store",
    },
    customMetadata: {
      purpose: "personalization-lid",
      requestId: id,
    },
  });

  try {
    await env.DB.prepare(
      `INSERT INTO personalization_requests (
        id, account_id, customer_name, email, phone, box_color, melody,
        lid_image_r2_key, lid_image_mime, lid_image_original_name,
        gift_wrap, base_price_bani, gift_wrap_bani, total_bani, notes, consent_processing
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1)`,
    )
      .bind(
        id,
        account?.id ?? null,
        parsed.data.customerName,
        parsed.data.email,
        parsed.data.phone,
        parsed.data.boxColor,
        parsed.data.melody,
        r2Key,
        image.type,
        safeFileName(image.name),
        parsed.data.giftWrap ? 1 : 0,
        PERSONALIZATION_BASE_PRICE_BANI,
        parsed.data.giftWrap ? PERSONALIZATION_GIFT_WRAP_BANI : 0,
        totalBani,
        parsed.data.notes,
      )
      .run();
  } catch (error) {
    try {
      await env.MEDIA.delete(r2Key);
    } catch (cleanupError) {
      console.error("personalization.r2_cleanup_failed", { id, cleanupError });
    }
    throw error;
  }

  return reviewJson(
    {
      data: {
        id,
        reference: personalizationReference(id),
        totalBani,
        status: "received",
      },
    },
    201,
  );
}

export async function handlePersonalization(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== API_PATH) return null;
  try {
    if (request.method === "GET") return await listRequests(request, env);
    if (request.method === "POST") return await createRequest(request, env);
    throw reviewFailure("Metodă nepermisă.", 405);
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
    if (status === 500) console.error("personalization.request_failed", error);
    return reviewJson(
      {
        error: {
          message:
            status === 500
              ? "Cererea nu a putut fi salvată. Reîncearcă."
              : (error as Error).message,
        },
      },
      status,
    );
  }
}
