type Provider = "stripe" | "oblio" | "smartship";

const guides: Record<
  Provider,
  { title: string; steps: string[]; docs: Array<{ label: string; url: string }> }
> = {
  stripe: {
    title: "Configurare Stripe · Cutiuța Magică",
    steps: [
      "Verifică în Stripe că firma și contul sunt ale Cutiuța Magică; salvează Account ID în Conexiuni financiare. Cheile AVYRON nu trebuie folosite.",
      "Salvează cheia secretă a mediului ales în câmpul Stripe și secretul de semnare în Stripe · webhook. Valorile nu apar în pagina publică.",
      "În Stripe creează endpointul https://cutiutamagica.eu/api/v1/webhooks/stripe pentru checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed și checkout.session.expired.",
      "Testează o comandă cu card, revenirea în magazin și evenimentul semnat. Notează referința testului, apoi activează metoda în Încasări cu cardul.",
    ],
    docs: [
      { label: "Stripe Checkout", url: "https://docs.stripe.com/payments/checkout" },
      { label: "Webhookuri Stripe", url: "https://docs.stripe.com/webhooks" },
    ],
  },
  oblio: {
    title: "Configurare Oblio · facturi CM",
    steps: [
      "Verifică în Oblio firma cu CUI-ul din profilul juridic al magazinului și regimul neplătitor de TVA.",
      "Creează în Oblio seria de facturi CM cu începutul 0001. Dacă seria are deja documente, reconciliază numărul următor cu registrul din magazin înainte de emitere.",
      "Introdu e-mailul contului Oblio în Conexiunea Oblio și secretul API în câmpul Oblio · secret API. Cota neplătitor de TVA trebuie să existe în nomenclatorul firmei.",
      "Activează seria CM în magazin după verificare. La emitere, magazinul verifică firma, seria, numărul următor și cota în Oblio, apoi păstrează numărul și PDF-ul facturii.",
    ],
    docs: [{ label: "API Oblio", url: "https://www.oblio.eu/api/" }],
  },
  smartship: {
    title: "Configurare SmartShip · livrări",
    steps: [
      "Verifică în SmartShip că profilul expeditorului și cheia API aparțin Cutiuța Magică.",
      "Salvează cheia API, iar pentru ramburs IBAN-ul firmei în câmpul separat criptat. Completează expeditorul, localitatea numerică, greutatea și dimensiunile reale ale coletului.",
      "Activează cotațiile live și Easybox după verificarea contului. Clientul vede până la trei curieri distincți la adresă și opțiunea Easybox separată, dacă furnizorul le oferă pentru rută.",
      "Testează costul, data estimată, suma ramburs și un AWB controlat. Emiterea AWB se confirmă explicit în Comenzi; verifică după numărul comenzii dacă răspunsul este incert.",
    ],
    docs: [{ label: "API SmartShip", url: "https://smartship.ro/api-docs" }],
  },
};

export function ProviderSetupGuide({ provider }: { provider: Provider }) {
  const guide = guides[provider];
  return (
    <details className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm text-slate-300">
      <summary className="cursor-pointer font-semibold text-white">
        {guide.title} · instrucțiuni
      </summary>
      <ol className="mt-4 list-decimal space-y-2 pl-5 leading-6">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-4">
        {guide.docs.map((doc) => (
          <a
            key={doc.url}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-200 underline underline-offset-4"
          >
            {doc.label}
          </a>
        ))}
      </div>
    </details>
  );
}
