import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { giftGuide } from "@/data/gift-guides";
export function ProductDiscovery({ product }: { product: Product }) {
  const content = product.discovery;
  if (!content?.intro) return null;
  return (
    <section className="product-discovery" aria-labelledby="discovery-title">
      <span className="catalog-eyebrow">Un dar ales cu gândul la cineva</span>
      <h2 id="discovery-title">Cui i se potrivește această cutiuță?</h2>
      <p>{content.intro}</p>
      <p>{content.audience}</p>
      <h3>Ocazii în care o poți dărui</h3>
      <ul className="discovery-occasions">
        {content.occasions.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <h3>Un loc în viața de zi cu zi</h3>
      <ul>
        {content.moments.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <div className="discovery-questions">
        <h3>Înainte să alegi</h3>
        <details>
          <summary>Ce melodie redă acest model?</summary>
          <p>
            {product.melody
              ? `Melodia prezentată pentru acest model este ${product.melody}. Dacă fragmentul audio este disponibil în pagină, îl poți asculta înainte de a alege.`
              : "Consultă detaliile modelului și cere confirmarea melodiei înainte de comandă."}
          </p>
        </details>
        <details>
          <summary>Cum funcționează manivela?</summary>
          <p>
            Rotești ușor manivela pentru a acționa mecanismul muzical. Sunetul continuă cât timp
            rotești; nu sunt necesare baterii sau o aplicație. Păstrează lemnul ferit de umezeală.
          </p>
        </details>
        <details>
          <summary>Pot alege altă melodie sau alt capac?</summary>
          <p>
            Modelul vine cu melodia și ilustrația prezentate în această pagină. Compară celelalte
            cutiuțe pentru alte teme. O dedicație pe un bilețel poate face darul personal fără să
            modifice produsul.
          </p>
        </details>
      </div>
      <nav aria-label="Ghiduri de cadouri potrivite acestui produs" className="discovery-links">
        {content.guides.map((slug) => (
          <Link key={slug} to="/cadouri/$ocazie" params={{ ocazie: slug }}>
            {giftGuide(slug)?.label} · idei de cadouri ↗
          </Link>
        ))}
      </nav>
    </section>
  );
}
