import { createFileRoute } from "@tanstack/react-router";
import { getPublicSeller, legalHead } from "@/lib/legal.functions";
import { LegalPage, LegalSection, SellerIdentity } from "@/components/site/LegalPage";
import { openConsentSettings } from "@/lib/cookie-consent";

const contents = [
  { id: "date-si-scopuri", title: "Date, scopuri și temeiuri" },
  { id: "sursele-datelor", title: "De unde provin datele" },
  { id: "destinatari", title: "Plăți și furnizori" },
  { id: "cookie-uri", title: "Cookie-uri și preferințe" },
  { id: "pastrarea-datelor", title: "Cât păstrăm datele" },
  { id: "drepturile-tale", title: "Drepturile tale" },
  { id: "protectia-datelor", title: "Cum protejăm datele" },
  { id: "asistenta-si-personalizare", title: "Asistență și personalizare" },
  { id: "transferuri", title: "Transferuri internaționale" },
  { id: "operatorul-datelor", title: "Operator și contact" },
  { id: "legislatie", title: "Legislație și actualizări" },
] as const;

const processing = [
  {
    title: "Comenzi, livrare și retururi",
    data: "Nume, e-mail, telefon, adresă de livrare, produse, opțiuni de transport, valoarea comenzii și corespondența aferentă.",
    basis:
      "Executarea contractului și demersuri la cererea ta înainte de cumpărare — art. 6 alin. (1) lit. b) GDPR. Obligațiile privind garanțiile și drepturile consumatorilor — lit. c).",
  },
  {
    title: "Plată, facturare și contabilitate",
    data: "Date de facturare, identificatori de tranzacție, sumă, monedă și starea plății; datele firmei, când ceri factură pe persoană juridică.",
    basis:
      "Executarea contractului — art. 6 alin. (1) lit. b); obligații fiscale și contabile — lit. c).",
  },
  {
    title: "Contul și beneficiile alese",
    data: "Nume afișat, e-mail, date de autentificare, telefon dacă îl adaugi, comenzi asociate și opțiunile salvate. Magic Rewards folosește activitățile eligibile, stelele și beneficiile; pentru aniversare, doar ziua și luna.",
    basis:
      "Furnizarea contului și a programului solicitat — art. 6 alin. (1) lit. b); prevenirea folosirii abuzive a beneficiilor — lit. f).",
  },
  {
    title: "Întrebări și solicitări",
    data: "Datele de contact și informațiile pe care le trimiți prin e-mail, chat sau alte canale ale magazinului, inclusiv referința comenzii, când este relevantă.",
    basis:
      "Demersuri precontractuale sau asistență pentru comandă — art. 6 alin. (1) lit. b); interesul legitim de a răspunde altor solicitări — lit. f).",
  },
  {
    title: "Recenzii",
    data: "Nume ales, e-mail, evaluare, text și eventuale fotografii. Recenzia aprobată, numele afișat și fotografiile acceptate pot fi publice; e-mailul și notele interne de moderare rămân private.",
    basis:
      "Interesul legitim de a publica opinii relevante și de a verifica autenticitatea lor — art. 6 alin. (1) lit. f). Poți cere corectarea sau retragerea recenziei.",
  },
  {
    title: "Mesaje opționale și statistici",
    data: "E-mailul, preferințele de comunicare, dovada acordului și datele limitate de navigare pentru analiza opțională acceptată.",
    basis:
      "Consimțământ — art. 6 alin. (1) lit. a), împreună cu regulile Legii nr. 506/2004. Îl poți retrage oricând; mesajele necesare unei comenzi nu sunt newslettere.",
  },
  {
    title: "Securitate și apărarea drepturilor",
    data: "Adresă IP, informații tehnice despre browser și cereri, autentificări, identificatori de sesiune, erori și operațiuni relevante pentru prevenirea fraudei ori soluționarea unui litigiu.",
    basis:
      "Interesele legitime de a proteja magazinul, conturile și tranzacțiile și de a constata, exercita sau apăra drepturi — art. 6 alin. (1) lit. f); obligații legale, când se aplică — lit. c).",
  },
];

export const Route = createFileRoute("/politica-de-confidentialitate")({
  loader: () => getPublicSeller(),
  head: () =>
    legalHead(
      "Politica de confidențialitate",
      "Cum folosește Cutiuța Magică datele personale: comenzi, plăți, cont, cookie-uri, păstrarea datelor și exercitarea drepturilor GDPR.",
      "/politica-de-confidentialitate",
    ),
  component: Privacy,
});

function Privacy() {
  const seller = Route.useLoaderData();
  const email = seller.public_email || "contact@cutiutamagica.eu";
  return (
    <LegalPage
      title="Politica de confidențialitate"
      intro="Aici afli ce date folosim când vizitezi Cutiuța Magică, faci o comandă sau ne scrii, de ce avem nevoie de ele și cum îți exerciți drepturile."
      updatedAt="11 noiembrie 2026"
      contents={contents}
    >
      <div className="privacy-policy__summary">
        <p>
          <strong>Pe scurt.</strong> Folosim datele pentru serviciile pe care le alegi, obligațiile
          legale și siguranța magazinului. Tu controlezi comunicările și statisticile opționale.
        </p>
        <a href="#drepturile-tale">
          Exercită-ți drepturile <span aria-hidden="true">↗</span>
        </a>
      </div>

      <LegalSection id="date-si-scopuri" title="1. Ce date folosim și de ce">
        <p>
          Datele personale sunt informații care te identifică direct sau indirect. Prelucrăm numai
          datele relevante pentru fiecare scop; un acord pentru marketing nu condiționează
          cumpărarea unui produs. Datele obligatorii sunt indicate în formulare. Fără datele
          necesare unei comenzi, este posibil să nu putem procesa plata, emite factura sau livra
          coletul.
        </p>
        <dl className="privacy-policy__processing">
          {processing.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>
                <p>{item.data}</p>
                <p className="privacy-policy__basis">{item.basis}</p>
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Contul este opțional. Dacă alegi autentificarea printr-un furnizor precum Google, primim
          identificatorul contului, numele și e-mailul comunicat de acesta; nu primim parola
          contului tău Google. Pentru parola creată direct în magazin păstrăm o reprezentare
          criptografică, nu parola în clar.
        </p>
      </LegalSection>

      <LegalSection id="sursele-datelor" title="2. De unde provin datele">
        <p>
          Cele mai multe informații vin direct de la tine, din formulare, comenzi, cont și mesaje.
          Date tehnice limitate se generează când folosești site-ul. Furnizorii de autentificare,
          plată și livrare pot comunica datele necesare conectării, confirmării tranzacției sau
          urmăririi coletului.
        </p>
        <p>
          Dacă ai cumpărat de la Cutiuța Magică printr-o platformă marketplace, putem primi de la
          acea platformă informațiile comenzii necesare livrării, facturării și asistenței.
          Platforma își aplică propria politică pentru activitățile pe care le gestionează. Dacă
          alegi un cadou livrat altei persoane, folosește doar datele necesare destinatarului și
          informează-l despre livrare și această politică.
        </p>
      </LegalSection>

      <LegalSection id="destinatari" title="3. Plăți și furnizori care pot primi date">
        <p>Accesul este limitat la rolul fiecărui destinatar și la serviciul efectiv folosit:</p>
        <ul>
          <li>
            <strong>Infrastructură și protecție:</strong> Cloudflare găzduiește aplicația, bazele de
            date și fișierele și asigură servicii de securitate.
          </li>
          <li>
            <strong>Plăți:</strong> Stripe sau Revolut, dacă procesatorul este disponibil și
            selectat în checkout. Datele complete de card și codul de securitate sunt introduse în
            interfața procesatorului, nu sunt stocate de magazin. Putem păstra referințe de plată și
            date mascate pentru un card salvat la cererea ta.
          </li>
          <li>
            <strong>Livrare:</strong> curierul, operatorul punctului de ridicare și intermediarul de
            transport, precum SmartShip, primesc datele necesare expedierii și urmăririi coletului.
          </li>
          <li>
            <strong>E-mail și autentificare:</strong> furnizorul folosit pentru livrarea mesajelor,
            precum Resend sau Cloudflare, respectiv furnizorul de conectare ales de tine.
          </li>
          <li>
            <strong>Facturare și obligații legale:</strong> serviciul de facturare, când este
            utilizat, contabilitatea, consultanții autorizați și autoritățile competente, în
            limitele necesare.
          </li>
          <li>
            <strong>Analiză opțională:</strong> Metricool, numai după acceptarea categoriei
            „Experiență”, în condițiile de mai jos.
          </li>
        </ul>
        <p>
          Furnizorii pot acționa ca persoane împuternicite sau ca operatori independenți, în funcție
          de serviciu și de obligațiile proprii. Poți cere detalii despre destinatarii datelor
          aferente comenzii tale folosind contactul din această pagină.
        </p>
      </LegalSection>

      <LegalSection id="cookie-uri" title="4. Cookie-uri, stocare și preferințe">
        <p>
          Funcțiile strict necesare păstrează coșul, alegerea de consimțământ și autentificarea.
          Coșul și preferințele sunt salvate în stocarea locală a browserului, până le ștergi sau le
          înlocuiești. Le poți gestiona din magazin și din setările browserului.
        </p>
        <p>
          Cookie-ul securizat al sesiunii de client este HttpOnly și are o durată de o zi sau până
          la 30 de zile dacă alegi păstrarea conectării. Deconectarea revocă sesiunea folosită;
          cookie-urile temporare ale conectării externe expiră în aproximativ 10 minute. Blocarea
          stocării strict necesare poate afecta coșul sau conectarea. Chatul poate păstra un
          identificator de vizitator și preferințe în stocarea locală, iar accesul conversației în
          stocarea sesiunii browserului, pentru continuitatea asistenței.
        </p>
        <p>
          Categoria opțională <strong>„Experiență”</strong> permite măsurarea navigării și a
          interacțiunilor pentru îmbunătățirea magazinului. Pixelul Metricool transmite calea
          paginii publice, dimensiunea ferestrei și, când există, originea site-ului anterior;
          cererea dezvăluie furnizorului și datele tehnice obișnuite ale conexiunii. Nu transmite
          parametrii URL, fragmentele sau paginile Cont, Checkout și Administrare. Identificatorii
          proprii de analiză din sesiune sunt eliminați la retragerea acordului.
        </p>
        <p>
          Categoria <strong>„Marketing”</strong> este o alegere separată pentru funcții opționale de
          promovare, când sunt folosite. O alegere în banner nu te abonează automat la newsletter.
          Poți refuza opționalele și folosi magazinul; retragerea acordului oprește colectarea
          viitoare bazată pe acesta, fără să anuleze prelucrarea anterioară legală.
        </p>
        <button className="privacy-policy__button" type="button" onClick={openConsentSettings}>
          Gestionează preferințele cookie
        </button>
      </LegalSection>

      <LegalSection id="pastrarea-datelor" title="5. Cât timp păstrăm datele">
        <p>
          Durata depinde de scop și de obligațiile aferente, nu este aceeași pentru toate datele:
        </p>
        <ul>
          <li>
            <strong>Comenzi și asistență:</strong> cât este necesar pentru executarea comenzii,
            retur, garanție și soluționarea reclamațiilor, apoi în limitele termenelor legale de
            prescripție aplicabile.
          </li>
          <li>
            <strong>Documente financiar-contabile:</strong> documentele vizate de art. 25 din Legea
            contabilității nr. 82/1991 se păstrează 5 ani, calculați de la 1 iulie a anului următor
            exercițiului financiar în care au fost întocmite. Alte obligații legale sau un litigiu
            pot impune o păstrare distinctă.
          </li>
          <li>
            <strong>Cont și beneficii:</strong> pe durata utilizării contului și a administrării
            beneficiilor; închiderea contului nu elimină documentele sau evidențele care trebuie
            păstrate pe alt temei legal.
          </li>
          <li>
            <strong>Recenzii:</strong> cât timp sunt publicate și relevante, cu posibilitatea de a
            cere retragerea lor. Dovezile necesare moderării sau unui litigiu se evaluează separat.
          </li>
          <li>
            <strong>Marketing și acorduri:</strong> până la retragerea acordului ori dezabonare; o
            evidență minimă a alegerii poate rămâne pentru respectarea acesteia și demonstrarea
            legalității.
          </li>
          <li>
            <strong>Jurnale, conversații și fișiere:</strong> în funcție de incidentul ori
            solicitarea pentru care sunt necesare și de politica aplicabilă furnizorului. Poți cere
            perioada sau criteriile concrete pentru datele tale.
          </li>
        </ul>
        <p>
          La încetarea scopului și a obligațiilor de păstrare, datele se șterg sau se anonimizează.
          Copiile de siguranță sunt tratate potrivit ciclului lor de înlocuire și măsurilor de acces
          aplicabile; nu promitem ștergerea instantanee a tuturor copiilor.
        </p>
      </LegalSection>

      <LegalSection id="drepturile-tale" title="6. Drepturile tale și cum ne scrii">
        <p>În condițiile art. 15–22 GDPR, poți solicita:</p>
        <ul>
          <li>
            <strong>Acces</strong> la datele tale și o copie a acestora.
          </li>
          <li>
            <strong>Rectificare</strong> a informațiilor incorecte sau incomplete.
          </li>
          <li>
            <strong>Ștergere</strong> sau <strong>restricționare</strong>, când sunt îndeplinite
            condițiile legale.
          </li>
          <li>
            <strong>Portabilitate</strong> pentru datele furnizate de tine, prelucrate automat pe
            baza consimțământului sau a contractului.
          </li>
          <li>
            <strong>Opoziție</strong> față de prelucrarea întemeiată pe interes legitim, potrivit
            situației tale; pentru marketing direct, te poți opune oricând.
          </li>
          <li>
            <strong>Retragerea consimțământului</strong> la fel de simplu cum l-ai acordat, fără
            efect retroactiv asupra prelucrării legale.
          </li>
        </ul>
        <p>
          Trimite solicitarea la <a href={`mailto:${email}?subject=Date%20personale`}>{email}</a>,
          cu subiectul „Date personale”, și descrie ce dorești să verificăm. Pentru dezabonare poți
          folosi și linkul din mesajele promoționale. Nu trimite parole sau date complete de card.
          Dacă avem îndoieli rezonabile asupra identității, putem cere numai informații suplimentare
          proporționale cu verificarea necesară.
        </p>
        <p>
          Răspundem fără întârzieri nejustificate, în cel mult o lună de la primirea cererii. Pentru
          cereri complexe sau numeroase, termenul poate fi prelungit cu încă două luni; te informăm
          în prima lună despre prelungire și motive. Cererile sunt în principiu gratuite; excepțiile
          pentru cele vădit nefondate sau excesive sunt cele din art. 12 GDPR.
        </p>
        <p>
          Ai dreptul să depui o plângere la{" "}
          <a
            href="https://www.dataprotection.ro/?page=Plangeri_pagina_principala"
            target="_blank"
            rel="noopener noreferrer"
          >
            Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
            (ANSPDCP)
          </a>{" "}
          și să te adresezi instanței competente. Ștergerea nu poate înlătura obligațiile legale de
          arhivare; când o cerere nu poate fi admisă integral, îți explicăm motivul și căile
          disponibile.
        </p>
      </LegalSection>

      <LegalSection id="protectia-datelor" title="7. Cum protejăm informațiile">
        <p>
          Folosim conexiuni HTTPS, sesiuni protejate, verificarea permisiunilor pe server și acces
          limitat pentru personalul autorizat. Fișierele private ale clienților nu sunt destinate
          catalogului public. Nicio măsură nu elimină integral riscul; dacă observi un acces
          neobișnuit, contactează-ne pentru verificare.
        </p>
        <p>
          Evită să trimiți date de sănătate, acte de identitate sau alte informații sensibile care
          nu sunt necesare solicitării. Magazinul nu urmărește colectarea datelor copiilor; dacă
          identifici date trimise de un copil fără autorizarea necesară, scrie-ne pentru evaluare.
        </p>
      </LegalSection>

      <LegalSection
        id="asistenta-si-personalizare"
        title="8. Asistență, automatizări și personalizare"
      >
        <p>
          Când chatul și asistentul virtual sunt active, mesajele pot fi analizate de Cloudflare
          Workers AI pentru răspunsuri despre magazin. Aplicăm mascarea automată a unor date de
          contact și șiruri asemănătoare numerelor de card înaintea analizei; aceasta nu este o
          garanție că orice informație personală din text este eliminată. Mesajele sunt accesibile
          echipei autorizate. Poți cere continuarea conversației cu o persoană.
        </p>
        <p>
          Automatizările pot organiza comenzi, trimite notificările alese și semnala erori ori
          abuzuri. Asistentul nu solicită date complete de card și nu plasează comenzi în numele
          tău. Nu folosim aceste funcții pentru decizii exclusiv automate cu efect juridic sau efect
          similar semnificativ asupra ta; poți cere clarificări și verificare umană.
        </p>
        <p>
          Atelierul public de personalizare este în pregătire. Pentru solicitările existente sau
          detaliile convenite direct cu echipa, folosim datele de contact, opțiunile și eventualele
          imagini numai pentru evaluarea și executarea cererii — art. 6 alin. (1) lit. b) GDPR.
          Imaginile de personalizare se păstrează privat, cu acces autorizat; nu sunt publicate
          automat în catalog. Trimite numai materiale pe care ai dreptul să le folosești.
        </p>
      </LegalSection>

      <LegalSection id="transferuri" title="9. Transferuri în afara Spațiului Economic European">
        <p>
          Unele servicii internaționale pot implica prelucrare sau acces din afara SEE. În aceste
          situații, transferul trebuie să respecte capitolul V GDPR: decizie de adecvare, inclusiv
          un cadru aplicabil destinatarului, ori clauze contractuale standard și garanții
          suplimentare, după caz. Nu presupunem că simpla folosire a unui furnizor garantează
          legalitatea oricărui transfer.
        </p>
        <p>
          Poți solicita informații despre destinatarii, țările și garanțiile aplicabile datelor
          tale, precum și despre obținerea unei copii a garanțiilor, cu protejarea informațiilor
          confidențiale.
        </p>
      </LegalSection>

      <LegalSection id="operatorul-datelor" title="10. Operatorul datelor și contact">
        <p>
          Magazinul Cutiuța Magică este administrat de societatea de mai jos, care stabilește
          scopurile și mijloacele prelucrării datelor descrise în această politică.
        </p>
        <div className="privacy-policy__operator">
          <SellerIdentity seller={seller} />
        </div>
        <p>
          Pentru întrebări sau exercitarea drepturilor, folosește e-mailul de contact cu subiectul
          „Date personale”. Această adresă este punctul de contact al operatorului pentru
          confidențialitate.
        </p>
      </LegalSection>

      <LegalSection id="legislatie" title="11. Legislație de referință și actualizări">
        <ul className="privacy-policy__references">
          <li>
            <a
              href="https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX%3A32016R0679"
              target="_blank"
              rel="noopener noreferrer"
            >
              Regulamentul (UE) 2016/679 (GDPR)
            </a>{" "}
            — în special art. 5–6, 12–22, 32 și 44–49: principii, temeiuri, transparență, drepturi,
            securitate și transferuri.
          </li>
          <li>
            <a
              href="https://legislatie.just.ro/Public/DetaliiDocumentAfis/203151"
              target="_blank"
              rel="noopener noreferrer"
            >
              Legea nr. 190/2018
            </a>{" "}
            — măsuri naționale de punere în aplicare a GDPR, unde sunt incidente.
          </li>
          <li>
            <a
              href="https://legislatie.just.ro/Public/DetaliiDocument/56973"
              target="_blank"
              rel="noopener noreferrer"
            >
              Legea nr. 506/2004
            </a>{" "}
            — art. 4 și 12, privind accesul la informațiile din terminal și comunicările comerciale
            electronice.
          </li>
          <li>
            <a
              href="https://legislatie.just.ro/Public/DetaliiDocumentAfis/269533"
              target="_blank"
              rel="noopener noreferrer"
            >
              Legea contabilității nr. 82/1991
            </a>{" "}
            — art. 25, pentru arhivarea documentelor financiar-contabile.
          </li>
        </ul>
        <p>
          Politica se actualizează când se schimbă serviciile, practicile sau cerințele aplicabile.
          Data de la începutul paginii indică ultima revizuire. Pentru un scop nou incompatibil cu
          cel inițial, te informăm înaintea prelucrării și solicităm consimțământul când este
          necesar.
        </p>
        <p>
          Informațiile despre cumpărare, livrare și retur sunt în{" "}
          <a href="/termeni-de-utilizare">Termenii de utilizare</a>, <a href="/livrare">Livrare</a>{" "}
          și <a href="/retur">Retur și garanție</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
