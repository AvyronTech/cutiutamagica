import { createFileRoute } from "@tanstack/react-router";
import { getPublicSeller, legalHead } from "@/lib/legal.functions";
import { LegalPage, LegalSection, SellerIdentity } from "@/components/site/LegalPage";
export const Route = createFileRoute("/politica-de-confidentialitate")({
  loader: () => getPublicSeller(),
  head: () =>
    legalHead(
      "Politica de confidențialitate",
      "Cine administrează datele tale, scopurile prelucrării, serviciile folosite și drepturile tale în magazinul Cutiuța Magică.",
      "/politica-de-confidentialitate",
    ),
  component: Privacy,
});
function Privacy() {
  const seller = Route.useLoaderData();
  return (
    <LegalPage
      title="Politica de confidențialitate"
      intro="Datele tale ne ajută să pregătim și să livrăm comanda. Le folosim pentru scopuri explicate aici și îți oferim un punct de contact pentru întrebări."
    >
      <LegalSection title="Operatorul datelor">
        <SellerIdentity seller={seller} />
        <p>
          Societatea administrează magazinul Cutiuța Magică și stabilește scopurile prelucrării.
          Pentru solicitări privind datele personale, scrie la e-mailul de mai sus cu subiectul
          „Date personale”.
        </p>
      </LegalSection>
      <LegalSection title="Date și scopuri">
        <p>
          Pentru comenzi și retururi prelucrăm numele, e-mailul, telefonul, adresa, produsele alese,
          datele de facturare și corespondența necesară executării contractului. Datele obligatorii
          sunt marcate în formular; fără ele poate fi imposibil să livrăm sau să soluționăm
          solicitarea.
        </p>
        <p>
          Păstrăm documentele fiscale pentru obligațiile legale. Folosim în interes legitim jurnale
          tehnice, identificatori de comandă și semnale de securitate pentru prevenirea abuzurilor
          și diagnosticarea problemelor. Marketingul opțional se bazează pe consimțământ separat,
          care poate fi retras fără afectarea comenzilor.
        </p>
      </LegalSection>
      <LegalSection title="Serviciile care pot primi date">
        <p>
          Cloudflare asigură infrastructura și protecția magazinului. În funcție de serviciul activ
          și ales pentru comandă, datele necesare pot fi transmise procesatorului de plăți Stripe,
          serviciului de curierat prin SmartShip, furnizorului de facturare FGO și serviciului de
          e-mail Resend. Contabilitatea și autoritățile pot primi documentele impuse de lege.
          Furnizorii au acces în limita rolului lor.
        </p>
        <p>
          Introducerea unui conector în dashboard nu activează automat transferul. Integrarea
          Revolut Business și conectările la platforme sociale necesită configurare și autorizare.
          Transferurile în afara SEE necesită o bază legală adecvată, precum o decizie de adecvare
          sau clauze contractuale standard și garanțiile aplicabile; detaliile pot fi solicitate la
          contact.
        </p>
      </LegalSection>
      <LegalSection title="Stocare în browser și statistici">
        <p>
          Coșul și favoritele folosesc stocarea locală a browserului pentru a păstra alegerile tale
          între vizite. Le poți elimina din magazin sau din setările browserului. Funcțiile de
          securitate și autentificare pot utiliza identificatori strict necesari.
        </p>
        <p>
          Setările de import Google Analytics și Search Console din administrare citesc rapoarte ale
          proprietăților autorizate. Ele nu instalează singure urmărire în browser. Dacă vor fi
          activate instrumente opționale de analiză sau publicitate pentru vizitatori, alegerea și
          retragerea consimțământului vor fi disponibile înaintea utilizării acestora.
        </p>
      </LegalSection>
      <LegalSection title="Păstrare și acces">
        <p>
          Comenzile și conversațiile se păstrează pe durata necesară livrării, garanțiilor,
          soluționării solicitărilor și apărării drepturilor, ținând cont de termenele de
          prescripție. Documentele contabile urmează termenele legale aplicabile categoriei lor.
          Datele care nu mai sunt necesare trebuie șterse sau anonimizate; nu păstrăm toate datele
          pe termen nelimitat.
        </p>
        <p>
          Accesul administrativ este limitat prin roluri și autentificare. Cheile de integrare
          introduse în dashboard sunt criptate. Rapoartele lunare către proprietarii autorizați
          conțin agregate operaționale și evită datele de identificare ale clienților.
        </p>
      </LegalSection>
      <LegalSection title="Drepturile tale">
        <p>
          Poți solicita acces, corectare, ștergere, restricționare sau portabilitate, în condițiile
          legii, și te poți opune prelucrării bazate pe interes legitim. Retragerea consimțământului
          operează pentru viitor. Răspundem de regulă în cel mult o lună; eventualele prelungiri
          legale sunt explicate. Putem cere informații proporționale pentru verificarea identității.
        </p>
        <p>
          Poți depune plângere la{" "}
          <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">
            ANSPDCP
          </a>{" "}
          sau apela la instanță. Ștergerea datelor nu poate elimina documente pe care legea ne
          obligă să le păstrăm.
        </p>
      </LegalSection>
      <LegalSection title="Automatizări și actualizări">
        <p>
          Asistenții de cercetare a furnizorilor folosesc informații despre produse și surse
          publice, fără a avea nevoie de datele cumpărătorilor. O semnalare automată de risc poate
          duce la verificarea umană a unei comenzi. Poți solicita clarificări și reevaluare la
          contact.
        </p>
        <p>
          Această pagină se actualizează la schimbarea serviciilor sau practicilor. Referință:{" "}
          <a href="https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=celex%3A32016R0679">
            Regulamentul (UE) 2016/679
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
