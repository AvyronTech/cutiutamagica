import {
  calculateDisplayedTotals,
  MAX_ITEM_QUANTITY,
  PRODUCT_BASE_PRICE_BANI,
} from "@/lib/pricing";

const fairy = "/produse/archive/fairy.webp";
const hpAlways = "/produse/archive/hp-always.webp";
const lotrRing = "/produse/archive/lotr-rings.webp";
const pirates = "/produse/archive/pirates.webp";
const starwarsDad = "/produse/archive/starwars-dad.webp";

export type ProductGalleryImage = {
  src: string;
  label: string;
  position?: string;
};

export type ProductLimitedEdition = {
  /** Numărul total al pieselor din serie; nu reprezintă stocul rămas. */
  totalUnits: number;
};

const limitedEditions: Readonly<Record<string, ProductLimitedEdition>> = {
  "hp-keeper": { totalUnits: 120 },
  "got-winter": { totalUnits: 120 },
};

export function productLimitedEdition(productId: string) {
  return limitedEditions[productId];
}

export type Product = {
  discovery?: import("@/lib/product-discovery").ProductDiscovery | null;
  scene?: import("@/lib/product-themes").ProductScene;
  id: string;
  shortName?: string;
  collection?: "story" | "emotion" | "dedicated";
  sortOrder?: number;
  featured?: boolean;
  preorderEnabled?: boolean;
  /** Suggest online prepayment for a made-to-order product; this does not change payment eligibility. */
  prepaymentRecommended?: boolean;
  releaseNote?: string;
  limitedEdition?: ProductLimitedEdition;
  seoTitle?: string;
  seoDescription?: string;
  sku: string;
  updatedAt: string;
  name: string;
  tagline: string;
  melody?: string;
  category: string;
  brand?: string;
  image: string;
  gallery: ProductGalleryImage[];
  description: string;
  story: string;
  details: string[];
  searchTerms: string[];
  price?: number;
  gtin?: string;
  mpn?: string;
  originalPrice?: number | null;
  /** „available” se poate comanda; „coming_soon” apare în catalog, dar nu intră în coș. */
  availability: ProductAvailability;
  /** Anunțul de pe platforma externă din care au fost preluate titlul, pozele și descrierea. */
  source?: { platform: "vinted"; url: string };
};

export type ProductAvailability = "available" | "coming_soon" | "out_of_stock";

export const PRICE = PRODUCT_BASE_PRICE_BANI / 100;
export const MAX_QTY = MAX_ITEM_QUANTITY;

export const calcTotals = calculateDisplayedTotals;

/** Prețul produsului în bani; produsele fără preț propriu folosesc prețul de bază. */
export const unitPriceBani = (product: Pick<Product, "price">) =>
  product.price != null ? Math.round(product.price * 100) : PRODUCT_BASE_PRICE_BANI;

export const products: Product[] = [
  {
    id: "hp-keeper",
    limitedEdition: productLimitedEdition("hp-keeper"),
    sku: "CM-HP-KEEPER",
    price: 149,
    originalPrice: 189,
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10090709545" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală Harry Potter cu Manivelă – Cadou de Colecție",
    tagline: "Un strop de magie pentru raftul cu povești preferate.",
    seoTitle: "Cutiuță muzicală Harry Potter cu manivelă | Cutiuța Magică",
    seoDescription:
      "Cutiuță muzicală Harry Potter din lemn închis, cu manivelă și mecanism vizibil. Un cadou tematic pentru fani și colecționari.",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: "/produse/hp-keeper/card.webp",
    gallery: [
      {
        src: "/produse/hp-keeper/1.webp",
        label: "Cutiuța la lumina lumânării",
        position: "center",
      },
      {
        src: "/produse/hp-keeper/2.webp",
        label: "Capacul cu Hogwarts în fundal",
        position: "center",
      },
      { src: "/produse/hp-keeper/3.webp", label: "Dimensiuni și mecanism", position: "center" },
      { src: "/produse/hp-keeper/card.webp", label: "Fotografia din magazin", position: "center" },
    ],
    description:
      "Pentru fanul care păstrează poveștile cu magie aproape: o cutiuță din lemn închis, cu detalii tematice și mecanism la vedere. Deschizi capacul și rotești manivela pentru a asculta melodia, fără baterii. Un dar compact care își găsește locul pe birou, în bibliotecă sau într-o colecție dragă.",
    story:
      "O alegere personală pentru aniversări, Secret Santa sau pentru cineva care zâmbește imediat când recunoaște universul preferat.",
    details: [
      "Dimensiuni aprox.: 6,5 × 5 × 4 cm",
      "Înălțime cu capacul deschis: aprox. 6,2 cm",
      "Funcționare: mecanică, prin rotirea manuală a manivelei",
      "Obiect decorativ / de colecție 14+; nu este jucărie",
    ],
    searchTerms: [
      "cutiuță muzicală Harry Potter",
      "cutiuță muzicală cu manivelă Harry Potter",
      "cadou fan Harry Potter",
      "cutiuță muzicală din lemn cadou",
    ],
  },
  {
    id: "got-winter",
    limitedEdition: productLimitedEdition("got-winter"),
    sku: "CM-GOT-WINTER",
    price: 149,
    originalPrice: 189,
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039606794" },
    updatedAt: "2026-09-22",
    name: "Cutiuță muzicală Game of Thrones „Winter Is Coming”",
    tagline: "Un mic dar cu aer de legendă, pentru cei care iubesc Nordul.",
    seoTitle: "Cutiuță muzicală Game of Thrones cu manivelă | Cutiuța Magică",
    seoDescription:
      "Cutiuță muzicală Game of Thrones din lemn negru, cu lup, mesaj Winter Is Coming și mecanism manual. Cadou pentru fanii fantasy.",
    melody: "Game of Thrones — Main Theme",
    category: "Fantasy",
    image: "/produse/got-winter/card.webp",
    gallery: [
      { src: "/produse/got-winter/1.webp", label: "Iarna începe cu magie", position: "center" },
      { src: "/produse/got-winter/2.webp", label: "Un dar cu poveste", position: "center" },
      {
        src: "/produse/got-winter/3.webp",
        label: "Capacul „Winter Is Coming”",
        position: "center",
      },
      { src: "/produse/got-winter/4.webp", label: "Dimensiuni compacte", position: "center" },
      {
        src: "/produse/got-winter/5.webp",
        label: "Pieptene, cilindru și manivelă",
        position: "center",
      },
      { src: "/produse/got-winter/6.webp", label: "Pentru seri cu farmec", position: "center" },
    ],
    description:
      "Lupul de pe capac, mesajul „Winter Is Coming” și lemnul negru dau acestei cutiuțe o prezență aparte. Când rotești manivela, mecanismul muzical vizibil pune melodia în mișcare, fără baterii. Este un cadou inspirat pentru un fan Game of Thrones sau un detaliu de păstrat într-o colecție fantasy.",
    story:
      "Se potrivește unui birou sau unei biblioteci cu povești epice și aduce un moment recognoscibil într-un dar de dimensiuni mici.",
    details: [
      "Dimensiuni aprox.: 6,5 × 4 × 5 cm / 2.55 × 1.57 × 1.96 in",
      "Funcționare: mecanică, prin rotirea manivelei",
      "Obiect decorativ / de colecție 14+; nu este jucărie",
    ],
    searchTerms: [
      "cutiuță muzicală Game of Thrones",
      "cutiuță muzicală Winter Is Coming",
      "cadou fan Game of Thrones",
      "cutiuță muzicală cu manivelă fantasy",
    ],
  },
  {
    id: "kitten",
    sku: "CM-KITTEN",
    price: 129,
    originalPrice: 159,
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039491875" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală cu Pisicuță și Lună – Manivelă, Cadou de Colecție",
    tagline: "Un gest mic și tandru pentru cineva care iubește pisicile.",
    seoTitle: "Cutiuță muzicală cu pisicuță și manivelă | Cutiuța Magică",
    seoDescription:
      "Cutiuță muzicală din lemn cu pisicuță și lună, manivelă și mecanism vizibil. Un cadou delicat pentru iubitorii de pisici.",
    melody: "La Vie en Rose",
    category: "Cadouri Speciale",
    image: "/produse/kitten/card.webp",
    gallery: [
      {
        src: "/produse/kitten/1.webp",
        label: "Pisicuța și luna, la lumina caldă",
        position: "center",
      },
      { src: "/produse/kitten/2.webp", label: "Ambalajul pentru cadou", position: "center" },
      {
        src: "/produse/kitten/3.webp",
        label: "Cutiuța închisă, cu decor gravat",
        position: "center",
      },
      { src: "/produse/kitten/4.webp", label: "Dimensiuni produs", position: "center" },
      { src: "/produse/kitten/5.webp", label: "Farmec clasic, fără baterii", position: "center" },
      { src: "/produse/kitten/6.webp", label: "Un dar plin de tandrețe", position: "center" },
      { src: "/produse/kitten/card.webp", label: "Fotografia din magazin", position: "center" },
    ],
    description:
      "Pentru iubitorii de pisici și de daruri cu poveste, această cutiuță aduce împreună ilustrația cu pisicuță și lună, lemnul deschis și o melodie caldă. Ridici capacul, apoi rotești manivela pentru a asculta mecanismul muzical, fără baterii. O surpriză delicată pentru o aniversare sau un simplu „m-am gândit la tine”.",
    story:
      "Mică și ușor de așezat pe birou ori pe raft, păstrează farmecul unui gest personal mult după momentul în care a fost oferită.",
    details: [
      "Dimensiuni aprox.: 6,4 × 3,6 × 5 cm",
      "Funcționare: mecanică, prin rotirea manuală a manivelei",
      "Lemn deschis la culoare, cu modele gravate",
      "Obiect decorativ / de colecție 14+; nu este jucărie",
    ],
    searchTerms: [
      "cutiuță muzicală cu pisică",
      "cutiuță muzicală pisicuță și lună",
      "cadou iubitori de pisici",
      "cutiuță muzicală cu manivelă cadou",
    ],
  },
  {
    id: "halloween",
    sku: "CM-HALLOWEEN",
    price: 139,
    originalPrice: 169,
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039375629" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală Halloween cu Manivelă – Cadou Misterios & Decor Tematic",
    tagline: "O mică poveste misterioasă, numai bună pentru sezonul dovlecilor.",
    seoTitle: "Cutiuță muzicală Halloween cu manivelă | Cutiuța Magică",
    seoDescription:
      "Cutiuță muzicală Halloween din lemn, cu ilustrație tematică și mecanism manual. Cadou sau decor de sezon cu poveste.",
    melody: "This Is Halloween",
    category: "Halloween",
    image: "/produse/halloween/card.webp",
    gallery: [
      {
        src: "/produse/halloween/1.webp",
        label: "Capacul ilustrat, între dovleci",
        position: "center",
      },
      {
        src: "/produse/halloween/2.webp",
        label: "Atmosferă de noapte de Halloween",
        position: "center",
      },
      { src: "/produse/halloween/3.webp", label: "Mecanismul în detaliu", position: "center" },
      { src: "/produse/halloween/4.webp", label: "Dimensiuni produs", position: "center" },
      { src: "/produse/halloween/5.webp", label: "Cadoul care vrăjește", position: "center" },
      {
        src: "/produse/halloween/6.webp",
        label: "Pornește magia de Halloween",
        position: "center",
      },
      { src: "/produse/halloween/7.webp", label: "Mică cutie, vrajă mare", position: "center" },
      { src: "/produse/halloween/card.webp", label: "Fotografia din magazin", position: "center" },
    ],
    description:
      "Un detaliu care schimbă atmosfera unui colț de raft: ilustrația de Halloween, lemnul și mecanismul muzical la vedere dau acestei cutiuțe un farmec misterios. Deschizi capacul și rotești manivela ca să pornești melodia, fără baterii. Se potrivește unui decor de sezon sau unui cadou pentru cineva care așteaptă cu drag serile de octombrie.",
    story:
      "O idee de dar pentru colecționari și gazde care preferă decorurile cu poveste, nu doar ornamentele obișnuite.",
    details: [
      "Dimensiuni: 6,4 × 3,8 × 5 cm / 2.51 × 1.49 × 1.96 in",
      "Funcționare: mecanică, prin rotirea manivelei, fără baterii",
      "Design tematic Halloween cu mecanism vizibil",
      "Recomandat 12+",
    ],
    searchTerms: [
      "cutiuță muzicală Halloween",
      "cadou Halloween",
      "cutiuță muzicală cu manivelă Halloween",
      "decor Halloween cutiuță",
    ],
  },
  {
    id: "sunshine",
    sku: "CM-SUNSHINE",
    price: 129,
    originalPrice: 149,
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039368670" },
    updatedAt: "2026-09-22",
    name: "Cutiuță muzicală „You Are My Sunshine”",
    tagline: "Pentru omul care îți face zilele mai luminoase.",
    seoTitle: "Cutiuță muzicală You Are My Sunshine | Cutiuța Magică",
    seoDescription:
      "Cutiuță muzicală You Are My Sunshine din lemn închis, cu mesaj sub capac și manivelă. Cadou personal pentru cuplu sau familie.",
    melody: "You Are My Sunshine",
    category: "Cadouri Speciale",
    image: "/produse/sunshine/card.webp",
    gallery: [
      { src: "/produse/sunshine/1.webp", label: "Un dar care cântă iubirea", position: "center" },
      { src: "/produse/sunshine/2.webp", label: "O amintire care rămâne", position: "center" },
      {
        src: "/produse/sunshine/3.webp",
        label: "Cutiuța închisă, cu decor gravat",
        position: "center",
      },
      { src: "/produse/sunshine/4.webp", label: "Dimensiuni produs", position: "center" },
      { src: "/produse/sunshine/5.webp", label: "Farmec clasic, fără baterii", position: "center" },
      { src: "/produse/sunshine/6.webp", label: "Melodia You Are My Sunshine", position: "center" },
    ],
    description:
      "Unele mesaje se simt mai bine decât se spun. Sub capacul acestei cutiuțe din lemn închis se află un mesaj afectuos; manivela pune în mișcare mecanismul muzical vizibil, fără baterii. Este un cadou mic și personal pentru partener, un membru al familiei sau cineva căruia vrei să-i amintești cât înseamnă pentru tine.",
    story:
      "Se oferă firesc la aniversare, de sărbători sau într-o zi obișnuită pe care vrei să o faci memorabilă.",
    details: [
      "Melodie: You Are My Sunshine",
      "Dimensiuni: aprox. 6,5 × 3,8 × 5 cm / 2.55 × 1.5 × 1.97 in",
      "Lemn închis la culoare, ornamente decorative și mecanism metalic vizibil",
      "Obiect de colecție 14+; nu este jucărie",
    ],
    searchTerms: [
      "cutiuță muzicală You Are My Sunshine",
      "cutiuță muzicală cadou cuplu",
      "cutiuță muzicală din lemn cu manivelă",
      "cadou Valentine's Day cutiuță",
    ],
  },
  {
    id: "lotr-rings",
    sku: "CM-LOTR-RINGS",
    availability: "coming_soon",
    updatedAt: "2026-09-05",
    name: "Stăpânul Inelelor — One Ring",
    tagline: "Un dar pentru cei care știu ce înseamnă prețioasa comoară.",
    melody: "In Dreams",
    category: "Stăpânul Inelelor",
    image: lotrRing,
    gallery: [
      { src: lotrRing, label: "Vedere completă", position: "center" },
      { src: lotrRing, label: "Capac în detaliu", position: "center top" },
      { src: lotrRing, label: "Mecanism & manivelă", position: "right center" },
    ],
    description:
      "O cutiuță care arată ca un mic artefact de colecție. Imaginea Inelului îl cucerește instant pe fanul Tolkien, iar lemnul cald îi dă acel aer de obiect păstrat cu grijă ani întregi. Este genul de cadou care impresionează un colecționar, un pasionat de fantasy sau pe cineva care încă retrăiește scenele din trilogie.",
    story:
      "Modelul One Ring are un impact imediat: foc, aur și simbolul cel mai recognoscibil din universul Stăpânul Inelelor. Pe pagina produsului am păstrat fotografia originală și am extras trei perspective din aceeași imagine ca să se vadă mai clar capacul, zona laterală și partea mecanică. Astfel, produsul rămâne autentic, dar este mai ușor de inspectat înainte de comandă.",
    details: [
      "Cutiuță din lemn cu decor ornamental",
      "Mecanism manual cu manivelă",
      "Cutie din lemn cu mecanism metalic vizibil",
    ],
    searchTerms: [
      "cutiuță piesă LOTR",
      "cutiuță muzicală Stăpânul Inelelor",
      "cutiuță cu manivelă fantasy",
      "cadou fan Tolkien",
    ],
  },
  {
    id: "hp-always",
    sku: "CM-HP-ALWAYS",
    availability: "coming_soon",
    updatedAt: "2026-09-05",
    name: "Harry Potter — I Solemnly Swear",
    tagline: "Pentru Potterhead-ul care zâmbește din prima la Harta Hoinarului.",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpAlways,
    gallery: [
      { src: hpAlways, label: "Vedere completă", position: "center" },
      { src: hpAlways, label: "Capac în detaliu", position: "center top" },
      { src: hpAlways, label: "Interior & mecanism", position: "right center" },
    ],
    description:
      "Nu este doar o cutiuță muzicală, ci un mic obiect care trimite direct la magia Hogwarts. Albastrul profund, scrisul auriu și tema vizuală o fac un cadou perfect pentru fanele și fanii Harry Potter care iubesc detaliile speciale, colecțiile tematice și obiectele cu personalitate. Este potrivită pentru aniversări, sărbători sau pentru acel cadou memorabil oferit fără o ocazie anume.",
    story:
      "Mesajul «I Solemnly Swear...» este recognoscibil dintr-o clipă pentru orice fan adevărat. Fotografia originală arată clar textura lemnului vopsit și poziția capacului, iar în galerie am evidențiat din aceeași imagine atât designul de pe capac, cât și zona mecanismului, pe cât permite cadrul real al pozei.",
    details: [
      "Finisaj albastru intens, accente aurii",
      "Mecanism manual cu manivelă",
      "Potrivită pentru un cadou tematic",
      "Mecanism clasic cu manivelă",
    ],
    searchTerms: [
      "cutiuță piesă Harry Potter",
      "cutiuță muzicală Harry Potter",
      "cadou Potterhead",
      "cutiuță mecanică cu manivelă",
    ],
  },
  {
    id: "fairy",
    sku: "CM-FAIRY",
    availability: "coming_soon",
    updatedAt: "2026-09-05",
    name: "Zâna Pădurii Fermecate",
    tagline: "Un cadou delicat pentru visătoare și iubitoare de magie.",
    melody: "A Thousand Years",
    category: "Fantasy",
    image: fairy,
    gallery: [
      { src: fairy, label: "Vedere completă", position: "center" },
      { src: fairy, label: "Capac în detaliu", position: "center top" },
      { src: fairy, label: "Mecanism & latura cutiei", position: "right center" },
    ],
    description:
      "Dacă vrei un cadou care să pară tandru, luminos și memorabil din prima clipă, modelul cu zână este alegerea potrivită. Îi va impresiona pe cei care iubesc poveștile fantasy, universurile delicate, cadourile poetice și obiectele care par desprinse dintr-o lume fermecată. Este potrivit atât pentru adolescente, cât și pentru femei care încă păstrează ceva visător în ele.",
    story:
      "Capacul ilustrat are un efect aproape cinematografic, iar cutiuța din lemn păstrează acel contrast frumos dintre materialul natural și imaginea luminoasă. În galerie am folosit numai fotografia originală, din care am evidențiat separat capacul și zona interioară, astfel încât produsul să rămână fidel realității.",
    details: [
      "Capac ilustrat cu tematică fantasy",
      "Cutie din lemn cu decor gravat",
      "Mecanism vizibil parțial în fotografia originală",
      "Cadou potrivit pentru aniversare sau Crăciun",
    ],
    searchTerms: [
      "cutiuță muzicală cadou pentru ea",
      "cadou cutiuță muzicală",
      "cutiuță cu zână",
      "cutiuță cu manivelă romantică",
    ],
  },
  {
    id: "pirates",
    sku: "CM-PIRATES",
    availability: "coming_soon",
    updatedAt: "2026-09-05",
    name: "Pirații Caraibilor — Furtuna",
    tagline: "Pentru cei care aleg mereu aventura, nu varianta cuminte.",
    melody: "He's a Pirate",
    category: "Aventură",
    image: pirates,
    gallery: [
      { src: pirates, label: "Vedere completă", position: "center" },
      { src: pirates, label: "Capac în detaliu", position: "center top" },
      { src: pirates, label: "Interior & manivelă", position: "right center" },
    ],
    description:
      "Este unul dintre modelele cu cel mai mult dramatism vizual. Corabia din furtună și tonurile intense îl fac cadoul ideal pentru un fan al aventurii, al filmelor Pirates of the Caribbean sau pentru cineva care iubește obiectele decorative cu impact. Arată excelent ca surpriză pentru un iubitor de povești maritime, filme epice sau colecții tematice.",
    story:
      "Imaginea de pe capac transmite mișcare și tensiune, iar baza din lemn o echilibrează perfect. Pentru prezentarea produsului am păstrat cadrul original și am extras trei moduri de vizualizare din aceeași fotografie, ca să se vadă mai clar cutiuța, textura lemnului și partea mecanică.",
    details: [
      "Ilustrație marină dramatică",
      "Cutiuță din lemn cu ornament",
      "Mecanism cu manivelă laterală",
      "Ilustrație tematică pe capac",
    ],
    searchTerms: [
      "cutiuță muzicală Pirații din Caraibe",
      "cutiuță piesă pirați",
      "cadou aventură",
      "cutiuță mecanică cu manivelă",
    ],
  },
  {
    id: "starwars-dad",
    sku: "CM-STARWARS-DAD",
    availability: "coming_soon",
    updatedAt: "2026-09-05",
    name: "Star Wars — Best Dad in the Galaxy",
    tagline: "Genul de cadou care îl face pe tata să zâmbească imediat.",
    melody: "Imperial March",
    category: "Cadouri Speciale",
    image: starwarsDad,
    gallery: [
      { src: starwarsDad, label: "Vedere completă", position: "center" },
      { src: starwarsDad, label: "Capac în detaliu", position: "center top" },
      { src: starwarsDad, label: "Mecanism & latura cutiei", position: "right center" },
    ],
    description:
      "Pentru un tată pasionat de Star Wars, modelul acesta merge direct la țintă. Mesajul este clar, amuzant și potrivit ca idee de cadou pentru ziua lui, Crăciun, Ziua Tatălui sau pur și simplu ca gest memorabil. Este genul de obiect mic, dar cu mare efect emoțional, mai ales pentru cineva care iubește universul galactic și cadourile tematice.",
    story:
      "Textul de pe capac face produsul imediat recognoscibil, iar lemnul închis îi dă un aer matur și elegant. În loc să schimbăm cutiuța, am ales să păstrăm exact fotografia originală și să construim o galerie de detaliu din ea, pentru un plus de claritate și încredere la comandă.",
    details: [
      "Mesaj pentru un cadou dedicat",
      "Cutie din lemn cu finisaj închis",
      "Mecanism manual cu manivelă",
      "Fotografia modelului disponibil",
    ],
    searchTerms: [
      "cutiuță muzicală cadou tata",
      "cadou Star Wars tata",
      "cutiuță cu manivelă",
      "cadou cutiuță muzicală",
    ],
  },
];

export const isAvailable = (product: Pick<Product, "availability">) =>
  product.availability === "available";

export const availableProducts = () => products.filter(isAvailable);

export const getProduct = (id: string) => products.find((p) => p.id === id);
