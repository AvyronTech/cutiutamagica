import { z } from "zod";
import { credential } from "../services/growth-settings";
import {
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  type CommerceEnv,
} from "./provider-runtime";

const origin = "https://marketplace-api.emag.ro/api-3";
const credentialsSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1)
      .max(254)
      .refine(
        (value) => !value.includes(":") && [...value].every((char) => char.charCodeAt(0) >= 32),
      ),
    password: z.string().min(1).max(512),
  })
  .strict();
export type EmagCredentials = z.infer<typeof credentialsSchema>;
type Endpoint =
  | "order/read"
  | "order/attachments/read"
  | "order/attachments/save"
  | "courier_accounts/read"
  | "awb/read";

export async function emagCredentials(env: CommerceEnv): Promise<EmagCredentials> {
  const secret = await credential(env, "emag");
  try {
    return credentialsSchema.parse(JSON.parse(secret || "{}"));
  } catch {
    throw new ProviderError(
      "Configurează utilizatorul API eMAG și parola prin secretele integrării.",
      "EMAG_SETUP_REQUIRED",
      409,
    );
  }
}

const headers = (c: EmagCredentials) => ({
  Authorization: `Basic ${btoa(Array.from(new TextEncoder().encode(c.username + ":" + c.password), (n) => String.fromCharCode(n)).join(""))}`,
  "content-type": "application/json",
  accept: "application/json",
});

export async function emagRequest(c: EmagCredentials, endpoint: Endpoint, body: unknown) {
  const response = await fetchWithTimeout(`${origin}/${endpoint}`, {
    method: "POST",
    redirect: "manual",
    headers: headers(c),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProviderError(
      response.status === 401 || response.status === 403
        ? "eMAG a refuzat accesul. Verifică utilizatorul API și IP-ul autorizat."
        : "eMAG nu a confirmat cererea.",
      `EMAG_HTTP_${response.status}`,
      409,
    );
  }
  const envelope = z
    .object({ isError: z.literal(false), results: z.array(z.unknown()).nullish() })
    .safeParse(await readProviderJson(response, 1_500_000));
  if (!envelope.success)
    throw new ProviderError(
      "eMAG a respins cererea sau răspunsul nu a putut fi verificat.",
      "EMAG_API_REJECTED",
      409,
    );
  return envelope.data.results ?? [];
}

export const emagId = z
  .union([z.number(), z.string().regex(/^\d{1,10}$/)])
  .transform(Number)
  .pipe(z.number().int().min(1).max(4294967295));

export async function getEmagOrder(c: EmagCredentials, id: number) {
  const orders = await emagRequest(c, "order/read", {
    id,
    type: 3,
    currentPage: 1,
    itemsPerPage: 1,
  });
  const result = z
    .object({ id: emagId, type: z.coerce.number() })
    .passthrough()
    .safeParse(orders[0]);
  if (orders.length !== 1 || !result.success || result.data.id !== id || result.data.type !== 3)
    throw new ProviderError(
      "Comanda 3P nu a fost confirmată în contul eMAG RO.",
      "EMAG_ORDER_UNVERIFIED",
      409,
    );
  return result.data;
}

export async function emagAttachments(c: EmagCredentials, id: number) {
  const raw = await emagRequest(c, "order/attachments/read", { order_id: id, order_type: 3 });
  return z
    .array(
      z
        .object({
          type: z.coerce.number().int(),
          order_id: emagId.optional(),
          name: z.string().nullish(),
          url: z.string().nullish(),
        })
        .passthrough(),
    )
    .parse(raw)
    .filter((item) => item.order_id == null || item.order_id === id);
}

export async function emagAttachInvoice(c: EmagCredentials, id: number, name: string, url: URL) {
  return emagRequest(c, "order/attachments/save", {
    data: [
      {
        order_id: id,
        order_type: 3,
        name: name.slice(0, 60),
        type: 1,
        url: url.toString(),
      },
    ],
  });
}

export async function emagAwbPdf(c: EmagCredentials, id: number) {
  const url = new URL(`${origin}/awb/read_pdf`);
  url.search = new URLSearchParams({ emag_id: String(id), awb_format: "A4" }).toString();
  return fetchWithTimeout(url, {
    redirect: "manual",
    headers: { ...headers(c), accept: "application/pdf" },
  });
}
