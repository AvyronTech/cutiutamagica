import {
  calculateDisplayedTotals,
  MAX_ITEM_QUANTITY,
  PRODUCT_BASE_PRICE_BANI,
} from "@/lib/pricing";

const fairy = "/media/media_fairy_hero";
const hpAlways = "/media/media_hp_always_hero";
const lotrRing = "/media/media_lotr_rings_hero";
const pirates = "/media/media_pirates_hero";
const starwarsDad = "/media/media_starwars_dad_hero";

export type ProductGalleryImage = {
  src: string;
  label: string;
  position?: string;
};

export type Product = {
  id: string;
  sku: string;
  updatedAt: string;
  name: string;
  tagline: string;
  melody?: string;
  category: string;
  image: string;
  gallery: ProductGalleryImage[];
  description: string;
  story: string;
  details: string[];
  searchTerms: string[];
  price?: number;
  /** „available” se poate comanda; „coming_soon” apare în catalog, dar nu intră în coș. */
  availability: ProductAvailability;
  /** Anunțul de pe platforma externă din care au fost preluate titlul, pozele și descrierea. */
  source?: { platform: "vinted"; url: string };
};

export type ProductAvailability = "available" | "coming_soon";

export const PRICE = PRODUCT_BASE_PRICE_BANI / 100;
export const MAX_QTY = MAX_ITEM_QUANTITY;

export const calcTotals = calculateDisplayedTotals;

export const products: Product[] = [
  {
    id: "hp-keeper",
    sku: "CM-HP-KEEPER",
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10090709545" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală Harry Potter cu Manivelă – Cadou de Colecție 14+",
    tagline: "Un mic obiect de colecție pentru cei care vor să păstreze puțină magie aproape.",
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
      { src: "/media/media_hp_keeper_hero", label: "Fotografia din magazin", position: "center" },
    ],
    description:
      "Cutiuța muzicală inspirată din universul Harry Potter combină lemnul închis la culoare, detaliile tematice și mecanismul metalic vizibil într-un obiect compact și memorabil. Ridici capacul, descoperi grafica interioară, apoi rotești ușor manivela pentru a pune mecanismul muzical în mișcare — fără baterii și fără încărcare. Redă o parte din piesa legendară a seriei de filme, creând o atmosferă magică și fidelă, care trezește emoții unice fanilor și colecționarilor.",
    story:
      "Este potrivită pentru fani, colecționari, adolescenți 14+, cadouri de aniversare, Crăciun, Secret Santa, dar și ca decor pentru birou, bibliotecă, raft sau vitrină. Mică la dimensiuni. Mare la capitolul magie. Imaginile sunt orientative și pot include elemente decorative care nu fac parte din produs.",
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
    sku: "CM-GOT-WINTER",
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039606794" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală Game of Thrones „Winter Is Coming” cu Manivelă – Cadou de Colecție 14+",
    tagline: "Iarna vine… dar de data aceasta aduce și muzică.",
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
      "O cutiuță muzicală cu atmosferă medieval-fantasy, creată pentru fanii Game of Thrones, colecționari și cei care caută un cadou mic, dar memorabil. Designul negru cu lupul direwolf, mesajul „Winter Is Coming” și mecanismul metalic vizibil îi oferă un aspect aparte, potrivit atât pentru colecție, cât și pentru decor.",
    story:
      "Rotește ușor manivela metalică, iar mecanismul clasic pune melodia în mișcare — manual, fără baterii și fără încărcare. Poate fi oferită la aniversări, Crăciun, Secret Santa sau altor pasionați de universuri fantasy și poate completa perfect un birou, o bibliotecă, un raft sau o vitrină de colecție. Mică la dimensiuni. Legendară prin atmosferă. Imaginile sunt orientative și pot include elemente de decor care nu fac parte din produs.",
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
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039491875" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală cu Pisicuță și Lună – Manivelă, Cadou de Colecție 14+",
    tagline: "O cutiuță mică, o scenă de poveste și o melodie care face momentul mai cald.",
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
      { src: "/media/media_kitten_hero", label: "Fotografia din magazin", position: "center" },
    ],
    description:
      "Cutiuța muzicală cu pisicuță, lună strălucitoare și fluturi este un obiect decorativ și de colecție cu un farmec aparte. Ridici capacul, descoperi ilustrația, apoi rotești ușor manivela pentru a pune în mișcare mecanismul muzical metalic — fără baterii și fără încărcare.",
    story:
      "Realizată din lemn deschis la culoare, cu modele decorative gravate și mecanism vizibil, este potrivită pentru iubitorii de pisici, colecționari, familie, cupluri sau persoane dragi. Poate fi oferită la aniversări, zile de naștere, Crăciun sau pur și simplu ca un mic dar-surpriză și poate fi păstrată ca decor pe birou, raft, bibliotecă ori într-o vitrină. Un dar mic, pentru bucurii mari. Imaginile sunt orientative și pot include elemente decorative care nu fac parte din produs.",
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
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039375629" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală Halloween cu Manivelă – Cadou Misterios & Decor Tematic",
    tagline: "O cutiuță mică, o melodie misterioasă și puțină magie de Halloween.",
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
      { src: "/media/media_halloween_hero", label: "Fotografia din magazin", position: "center" },
    ],
    description:
      "Ridică capacul, rotește manivela și lasă mecanismul muzical să dea viață atmosferei. Designul tematic, detaliile de Halloween și mecanismul vizibil transformă această cutiuță într-un cadou aparte și într-un decor memorabil.",
    story:
      "Potrivită pentru cadouri, colecționari, petreceri și evenimente tematice, decoruri de Halloween sau adolescenți 12+. Funcționează mecanic, prin rotirea manivelei, fără baterii. Mică la dimensiuni. Mare la atmosferă. Imaginile sunt orientative și pot include elemente decorative care nu fac parte din produs.",
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
    availability: "available",
    source: { platform: "vinted", url: "https://www.vinted.ro/items/10039368670" },
    updatedAt: "2026-09-22",
    name: "Cutiuță Muzicală „You Are My Sunshine” cu Manivelă – Cadou de Colecție 14+",
    tagline: "Uneori, cele mai frumoase amintiri încap într-o cutiuță.",
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
      "Cutiuța muzicală „You Are My Sunshine” este un mic obiect de colecție creat pentru a transforma un gest simplu într-un moment special. Designul din lemn, detaliile decorative și mesajul ascuns sub capac o fac potrivită atât pentru cupluri și familie, cât și pentru cei care iubesc obiectele cu poveste. Rotești ușor manivela metalică, cilindrul mecanismului pune în mișcare pieptenele muzical, iar melodia începe să se audă — fără baterii și fără încărcare.",
    story:
      "Mecanismul rămâne vizibil atunci când capacul este deschis, ceea ce îi oferă un farmec aparte și o transformă într-un obiect interesant de păstrat și expus. Este o alegere potrivită pentru aniversări, zile de naștere, Valentine’s Day, Crăciun, cadouri pentru partener, părinți sau persoane apropiate, dar și ca decor pentru birou, bibliotecă, vitrină, dormitor sau o colecție personală. Mică la dimensiuni, dar făcută să păstreze momente mari. Imaginile de prezentare sunt orientative; decorurile și accesoriile din fotografii nu sunt incluse.",
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
      "119 lei / 1 buc · 150 lei / 2 buc",
      "Preț promoțional de la 2 bucăți",
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
      "Preț standard: 119 lei",
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
      "2 bucăți = 150 lei",
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
