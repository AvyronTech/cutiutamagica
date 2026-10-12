import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { seoHead } from "./seo-head";
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
      legal_name: "DIGITAL ECOTECH SOLUTIONS S.R.L.",
      tax_id: "55055976",
      registered_address: null,
      registration_number: null,
      public_email: "contact@cutiutamagica.eu",
      public_phone: null,
    }
  );
});

export function legalHead(title: string, description: string, path: string) {
  return seoHead({
    title: `${title} | Cutiuța Magică`,
    description,
    path,
    image: "/scenes/footer-atelier.webp",
    imageAlt: `${title} — informații oficiale Cutiuța Magică`,
    // Paginile rămân publice și accesibile din footer, dar nu concurează în Search
    // cu paginile comerciale și ghidurile editoriale.
    robots: "noindex, follow",
  });
}
