type Provider = "stripe" | "oblio" | "smartship" | "revolut_business" | "revolut_merchant";

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
      "Activează cotațiile live și Easybox după verificarea contului. Clientul vede toți curierii distincți disponibili la adresă care nu cer imprimarea etichetei, plus opțiunea Easybox separată, dacă furnizorul le oferă pentru rută.",
      "Testează costul, data estimată, suma ramburs și un AWB controlat. Emiterea AWB se confirmă explicit în Comenzi; verifică după numărul comenzii dacă răspunsul este incert.",
    ],
    docs: [{ label: "API SmartShip", url: "https://smartship.ro/api-docs" }],
  },
  revolut_business: {
    title: "Revolut Business · flux bancar în Oblio",
    steps: [
      "Verifică firma DIGITAL ECOTECH SOLUTIONS în Revolut și Oblio, apoi contul RON dedicat Cutiuța Magică în Revolut. Conectarea bancară nu activează plata Revolut în magazin.",
      "În Oblio, verifică disponibilitatea planului Nelimitat și folosește un administrator cu drept de acces la conturi bancare. Deschide Rapoarte → Tranzacții bancare → Integrează cu Banca și selectează Revolut Business. În Revolut există și intrarea Setări → Integrări → Contabilitate → Oblio.",
      "La autorizare, selectează numai contul RON al magazinului. Fluxul transmite către Oblio datele contului, soldul și tranzacțiile selectate; nu sincronizează facturile, cheltuielile sau plățile din magazin.",
      "Verifică apariția contului în Oblio și, când există tranzacții, potrivirea lor cu extrasele Revolut. Asociază încasarea cu factura corectă și gestionează drepturile utilizatorilor și revocarea conexiunii din cele două aplicații.",
      "API-ul Business separat cere certificat X509 și OAuth. Nu introduce în magazin un token temporar ca substitut pentru un flux OAuth cu reînnoire; integrarea nativă Oblio nu are nevoie de cheia API a magazinului.",
    ],
    docs: [
      {
        label: "Ghid Revolut–Oblio",
        url: "https://help.revolut.com/en-RO/business/help/integrating-with-external-apps/using-the-oblio-integration/bank-feed/how-do-i-connect-my-revolut-business-account-with-oblio-oblio-bank-feed/",
      },
      {
        label: "Tranzacții bancare în Oblio",
        url: "https://www.oblio.eu/integrari/tranzactii-bancare",
      },
    ],
  },
  revolut_merchant: {
    title: "Revolut Merchant · plăți online",
    steps: [
      "Contul Business și fluxul bancar către Oblio nu activează automat Merchant. Finalizează verificarea firmei în Revolut, apoi activează API pentru comercianți în profilul Cutiuța Magică.",
      "Salvează separat cheia Merchant a mediului ales și secretul webhook în câmpurile criptate de mai sus. Nu folosi certificatul sau tokenul API Business pentru checkout.",
      "Configurează în Revolut webhookul https://cutiutamagica.eu/api/v1/webhooks/revolut pentru evenimentele comenzii și verifică semnătura, suma, moneda și mediul printr-o plată controlată.",
      "După un test complet de plată, revenire și confirmare prin webhook, notează referința testului și activează Revolut Pay. Până atunci cumpărătorii nu văd această metodă.",
    ],
    docs: [
      {
        label: "Activare Merchant",
        url: "https://developer.revolut.com/docs/guides/merchant/get-started",
      },
      {
        label: "Webhook Merchant",
        url: "https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature",
      },
    ],
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
