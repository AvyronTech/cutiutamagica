import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { giftGuidesForProduct } from "@/data/gift-guides";

function firstSentence(text: string) {
  const end = text.search(/[.!?](?:\s|$)/);
  return end < 0 ? text : text.slice(0, end + 1);
}

function occasionLabel(text: string) {
  const colon = text.indexOf(":");
  return colon < 0 ? text : text.slice(0, colon);
}

export function ProductMakingNote() {
  return (
    <aside className="product-making-note" aria-label="Procesul de fabricare">
      <Link to="/despre-cutiuta" className="product-making-note__link">
        <span>
          <small>Dincolo de capac</small>
          <strong>Vezi cum prinde viață cutiuța</strong>
        </span>
        <span aria-hidden="true">↗</span>
      </Link>
    </aside>
  );
}

export function ProductDiscovery({ product }: { product: Product }) {
  const content = product.discovery;
  if (!content?.intro) return null;
  const guides = giftGuidesForProduct(product.id).slice(0, 8);
  return (
    <>
      <section className="product-discovery" aria-labelledby="discovery-title">
        <header className="product-discovery__heading">
          <h2 id="discovery-title">Idei de dăruit</h2>
        </header>
        <div className="product-discovery__grid">
          <article>
            <h3>Pentru cine</h3>
            <p>{firstSentence(content.audience)}</p>
          </article>
          <article>
            <h3>Ocazii</h3>
            <ul className="discovery-occasions">
              {content.occasions.map((text) => (
                <li key={text}>{occasionLabel(text)}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Unde își găsește locul</h3>
            <ul className="discovery-moments">
              {content.moments.map((text) => (
                <li key={text}>{firstSentence(text)}</li>
              ))}
            </ul>
          </article>
        </div>
        <details className="discovery-guides">
          <summary>Explorează ghidurile de cadouri</summary>
          <nav aria-label="Ghiduri de cadouri potrivite acestui produs" className="discovery-links">
            {guides.map((guide) => (
              <Link key={guide.slug} to="/cadouri/$ocazie" params={{ ocazie: guide.slug }}>
                {guide.label} ↗
              </Link>
            ))}
            <Link to="/cadouri">Toate ghidurile ↗</Link>
          </nav>
        </details>
      </section>
      <section className="product-faq" aria-labelledby="product-faq-title">
        <h2 id="product-faq-title">Întrebări frecvente</h2>
        <div className="discovery-questions">
          <details name="product-faq">
            <summary>Ce melodie redă acest model?</summary>
            <p>
              {product.melody
                ? `Melodia prezentată pentru acest model este ${product.melody}. Dacă fragmentul audio este disponibil în pagină, îl poți asculta înainte de a alege.`
                : "Consultă detaliile modelului și cere confirmarea melodiei înainte de comandă."}
            </p>
          </details>
          <details name="product-faq">
            <summary>Cum funcționează manivela?</summary>
            <p>
              Rotești ușor manivela pentru a acționa mecanismul muzical. Sunetul continuă cât timp
              rotești; nu sunt necesare baterii sau o aplicație. Păstrează lemnul ferit de umezeală.
            </p>
          </details>
          <details name="product-faq">
            <summary>Pot alege altă melodie sau alt capac?</summary>
            <p>
              Modelul vine cu melodia și ilustrația prezentate în această pagină. Compară celelalte
              cutiuțe pentru alte teme. O dedicație pe un bilețel poate face darul personal fără să
              modifice produsul.
            </p>
          </details>
          <details name="product-faq">
            <summary>Cât de mare este cutiuța?</summary>
            <p>
              Este un obiect compact, potrivit pentru birou, bibliotecă sau vitrină. Dimensiunile
              exacte ale acestui model sunt trecute în secțiunea „Detalii” de mai sus.
            </p>
          </details>
          <details name="product-faq">
            <summary>Primesc și decorurile din fotografii?</summary>
            <p>
              Nu. Comanda include numai cutiuța aleasă. Decorurile folosite pentru atmosferă în
              fotografii nu fac parte din produs.
            </p>
          </details>
          <details name="product-faq">
            <summary>Cum o păstrez frumoasă?</summary>
            <p>
              Păstreaz-o într-un loc uscat, departe de umezeală și soare puternic. Șterge lemnul cu
              o lavetă moale și rotește manivela fără să o forțezi.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
