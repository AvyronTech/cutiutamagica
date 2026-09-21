import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
export const getPublicSeller = createServerFn({ method: "GET" }).handler(async () => {
  const row = await env.DB.prepare(
    "SELECT legal_name,tax_id,registered_address,registration_number,public_email,public_phone FROM legal_entities WHERE id='legal_entity_main'",
  ).first<{
    legal_name: string;
    tax_id: string;
    registered_address: string | null;
    registration_number: string | null;
    public_email: string | null;
    public_phone: string | null;
  }>();
  return (
    row ?? {
      legal_name: "DIGITAL ECO TECH SOLUTION SRL",
      tax_id: "55055976",
      registered_address: null,
      registration_number: null,
      public_email: "cutiutamagica@gmail.com",
      public_phone: null,
    }
  );
});

export function legalHead(title: string, description: string, path: string) {
  return {
    meta: [
      { title: `${title} | Cutiuța Magică` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | Cutiuța Magică` },
      { property: "og:description", content: description },
      { property: "og:url", content: `https://cutiutamagica.eu${path}` },
    ],
    links: [{ rel: "canonical", href: `https://cutiutamagica.eu${path}` }],
  };
}
