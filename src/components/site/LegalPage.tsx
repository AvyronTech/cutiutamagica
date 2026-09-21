import type { ReactNode } from "react";
import type { getPublicSeller } from "@/lib/legal.functions";
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header className="border-b border-border pb-8">
        <p className="mb-3 text-sm text-muted-foreground">Cutiuța Magică · Informații utile</p>
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{intro}</p>
        <p className="mt-4 text-xs text-muted-foreground">Actualizat la 15 septembrie 2026</p>
      </header>
      <div className="space-y-8 pt-8 text-sm leading-7 [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </article>
  );
}
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-2xl">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
export function SellerIdentity({
  seller,
}: {
  seller: Awaited<ReturnType<typeof getPublicSeller>>;
}) {
  return (
    <address className="not-italic">
      <strong>{seller.legal_name}</strong>
      <br />
      CUI {seller.tax_id} · neplătitor de TVA
      <br />
      {seller.registered_address && (
        <>
          Sediu social: {seller.registered_address}
          <br />
        </>
      )}
      {seller.registration_number && (
        <>
          Registrul Comerțului: {seller.registration_number}
          <br />
        </>
      )}
      <a href={`mailto:${seller.public_email || "cutiutamagica@gmail.com"}`}>
        {seller.public_email || "cutiutamagica@gmail.com"}
      </a>
      {seller.public_phone && (
        <>
          <br />
          Telefon: {seller.public_phone}
        </>
      )}
    </address>
  );
}
