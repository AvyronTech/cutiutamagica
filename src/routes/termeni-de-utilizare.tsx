import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicSeller, legalHead } from "@/lib/legal.functions";
import { LegalPage, LegalSection, SellerIdentity } from "@/components/site/LegalPage";
export const Route = createFileRoute("/termeni-de-utilizare")({
  loader: () => getPublicSeller(),
  head: () =>
    legalHead(
      "Termeni de utilizare",
      "Informații despre comerciant, comenzi, plăți, livrare și drepturile cumpărătorilor Cutiuța Magică.",
      "/termeni-de-utilizare",
    ),
  component: Terms,
});
function Terms() {
  const seller = Route.useLoaderData();
  return (
    <LegalPage
      title="Termeni de utilizare"
      intro="O poveste frumoasă începe cu informații clare. Aici găsești regulile magazinului și pașii unei comenzi."
    >
      <LegalSection title="1. Cine administrează magazinul">
        <SellerIdentity seller={seller} />
        <p>
          Acești termeni se aplică utilizării cutiutamagica.eu și comenzilor plasate direct în
          magazin. Achizițiile prin eMAG, OLX sau alte platforme urmează și condițiile comunicate pe
          platforma respectivă.
        </p>
      </LegalSection>
      <LegalSection title="2. Produsele și prezentarea lor">
        <p>
          Comercializăm cutiuțe muzicale cu mecanism manual. Consultă dimensiunile, melodia,
          materialele, disponibilitatea și instrucțiunile fiecărui model. Decorurile promoționale nu
          fac parte din produs decât dacă sunt enumerate în ofertă. Nuanțele pot varia în funcție de
          ecran; caracteristicile contractuale rămân cele confirmate pentru comandă.
        </p>
        <p>
          Denumirile tematice nu indică automat o afiliere sau o licență oficială. Informațiile
          despre producător, origine și eventuale licențe sunt cele comunicate pentru produsul
          concret. Nu reproduce materialele audio sau vizuale fără drepturile necesare.
        </p>
      </LegalSection>
      <LegalSection title="3. Comanda și confirmarea">
        <p>
          Verifică modelele, cantitățile, datele de contact și adresa înainte de trimitere. Mesajul
          automat de primire confirmă înregistrarea solicitării. Acceptarea comenzii și detaliile
          livrării sunt comunicate separat; dacă disponibilitatea ori costul transportului necesită
          clarificări, îți cerem acordul înainte de finalizare.
        </p>
        <p>
          Poți cere corectarea sau anularea unei comenzi contactându-ne cu numărul ei. Dacă
          expedierea a început deja, rămân aplicabile drepturile de retragere. O eroare evidentă de
          afișare se clarifică împreună cu tine; nu modificăm unilateral o comandă acceptată.
        </p>
      </LegalSection>
      <LegalSection title="4. Prețuri, promoții și plată">
        <p>
          Moneda și suma datorată sunt afișate la finalizarea comenzii. Societatea este neplătitoare
          de TVA. Transportul și orice servicii suplimentare se afișează separat. Pentru ofertele de
          volum contează numărul de produse eligibile; condițiile și perioada sunt prezentate
          împreună cu oferta.
        </p>
        <p>
          Sunt disponibile numai metodele de plată afișate și active în checkout. Pentru plata cu
          cardul, introduci datele în interfața procesatorului; magazinul nu solicită prin e-mail
          codul PIN, parola bancară sau codul de autorizare. Un cont în EUR nu înseamnă automat că
          toate comenzile pot fi plătite în EUR.
        </p>
      </LegalSection>
      <LegalSection title="5. Livrare">
        <p>
          Serviciile, destinațiile și costurile disponibile sunt confirmate la comandă. Pentru
          lockere se aplică limitele curierului și disponibilitatea punctului selectat. Primești
          detaliile expedierii după predarea coletului. Dacă nu s-a convenit alt termen, livrarea se
          realizează fără întârziere nejustificată, cel târziu în 30 de zile de la încheierea
          contractului.
        </p>
        <p>
          Semnalează cât mai curând o deteriorare sau un colet lipsă. Fotografiile ajută
          soluționarea, fără a înlocui sau limita drepturile legale.
        </p>
      </LegalSection>
      <LegalSection title="6. Retur și garanție">
        <p>
          Pentru cumpărături online, consumatorii au în mod obișnuit 14 zile de la primirea
          bunurilor pentru a comunica retragerea, fără justificare. Excepțiile legale, inclusiv
          produsele realizate după specificații sau clar personalizate, se aplică numai când sunt
          îndeplinite condițiile legale.
        </p>
        <p>
          Garanția legală de conformitate este de doi ani pentru bunurile noi. Remediile se acordă
          potrivit OUG 140/2021, fără costuri când neconformitatea intră în răspunderea
          vânzătorului.{" "}
          <Link to="/retur">Consultă politica și formularul de retur și garanție</Link>. Formularul
          este o facilitate; poți comunica retragerea și printr-o declarație neechivocă trimisă prin
          e-mail.
        </p>
      </LegalSection>
      <LegalSection title="7. Utilizare responsabilă și date personale">
        <p>
          Folosește date reale pentru comandă și protejează accesul la conturile tale. Nu încerca
          accesarea neautorizată, perturbarea serviciului ori copierea datelor altor persoane.
          Restricționarea utilizării abuzive nu afectează drepturile asociate comenzilor deja
          încheiate.
        </p>
        <p>
          <Link to="/politica-de-confidentialitate">Politica de confidențialitate</Link> explică
          modul de prelucrare a datelor. O comandă nu reprezintă, prin ea însăși, abonare la mesaje
          promoționale.
        </p>
      </LegalSection>
      <LegalSection title="8. Sesizări și soluționarea litigiilor">
        <p>
          Scrie-ne la adresa de contact de mai sus pentru a căuta o soluție. Consumatorii pot
          utiliza{" "}
          <a href="https://reclamatiisal.anpc.ro" target="_blank" rel="noopener noreferrer">
            platforma SAL a ANPC
          </a>{" "}
          sau se pot adresa instanțelor competente. Drepturile obligatorii ale consumatorilor,
          inclusiv cele aplicabile în țara lor când legea o prevede, rămân protejate.
        </p>
        <p>
          Platforma europeană SOL a fost închisă la 20 iulie 2025. Pentru asistență transfrontalieră
          poți consulta{" "}
          <a href="https://eccromania.ro" target="_blank" rel="noopener noreferrer">
            Centrul European al Consumatorilor România
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="9. Versiuni și surse">
        <p>
          Actualizările se aplică pentru viitor; comenzile încheiate păstrează condițiile acceptate.
          Poți păstra această pagină prin funcția de imprimare a browserului.
        </p>
        <p>
          Repere: <a href="https://legislatie.just.ro/Public/DetaliiDocument/257047">OUG 34/2014</a>
          , <a href="https://legislatie.just.ro/Public/DetaliiDocumentAfis/250044">OUG 140/2021</a>,{" "}
          <a href="https://legislatie.just.ro/Public/DetaliiDocument/310590">
            Ordinul ANPC 270/2026
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
