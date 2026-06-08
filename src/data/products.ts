import fairy from "@/assets/box-fairy.jpg";
import halloween from "@/assets/box-halloween.jpg";
import hpAlways from "@/assets/box-hp-always.jpg";
import hpKeeper from "@/assets/box-hp-keeper.jpg";
import kitten from "@/assets/box-kitten.jpg";
import lotrRing from "@/assets/box-lotr-ring.jpg";
import pirates from "@/assets/box-pirates.jpg";
import starwarsDad from "@/assets/box-starwars-dad.jpg";
import pillowBlack from "@/assets/extras/pillow-black-1.jpg";
import pillowBeige from "@/assets/extras/pillow-beige-2.jpg";
import thermos1 from "@/assets/extras/thermos-1.jpg";
import thermos2 from "@/assets/extras/thermos-2.jpg";
import thermos3 from "@/assets/extras/thermos-3.jpg";
import comb1 from "@/assets/extras/comb-1.jpg";
import comb2 from "@/assets/extras/comb-2.jpg";
import phonestand1 from "@/assets/extras/phonestand-1.jpg";
import phonestand2 from "@/assets/extras/phonestand-2.jpg";
import pocketwatch1 from "@/assets/extras/pocketwatch-1.jpg";

export type ProductGalleryImage = {
  src: string;
  label: string;
  position?: string;
};

export type Product = {
  id: string;
  name: string;
  tagline: string;
  melody?: string;
  category: string;
  image: string;
  gallery: ProductGalleryImage[];
  description: string;
  story: string;
  details: string[];
  price?: number;
};

export const PRICE = 119;
export const SHIPPING = 25;
export const MAX_QTY = 5;

export function calcTotals(qty: number) {
  let subtotal = qty * PRICE;
  if (qty === 2) subtotal = 150;
  if (qty >= 3) subtotal = qty * 75;
  const shipping = qty >= 3 ? 0 : qty > 0 ? SHIPPING : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

export const products: Product[] = [
  {
    id: "lotr-rings",
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
    description: "O cutiuță care arată ca un mic artefact de colecție. Imaginea Inelului îl cucerește instant pe fanul Tolkien, iar lemnul cald îi dă acel aer de obiect păstrat cu grijă ani întregi. Este genul de cadou care impresionează un colecționar, un pasionat de fantasy sau pe cineva care încă retrăiește scenele din trilogie.",
    story: "Modelul One Ring are un impact imediat: foc, aur și simbolul cel mai recognoscibil din universul Stăpânul Inelelor. Pe pagina produsului am păstrat fotografia originală și am extras trei perspective din aceeași imagine ca să se vadă mai clar capacul, zona laterală și partea mecanică. Astfel, produsul rămâne autentic, dar este mai ușor de inspectat înainte de comandă.",
    details: ["Lemn natural cu gravură ornamentală", "Mecanism manual cu manivelă", "89 lei / 1 buc · 150 lei / 2 buc", "Transport gratuit de la 3 bucăți"],
  },
  {
    id: "hp-always",
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
    description: "Nu este doar o cutiuță muzicală, ci un mic obiect care trimite direct la magia Hogwarts. Albastrul profund, scrisul auriu și tema vizuală o fac un cadou perfect pentru fanele și fanii Harry Potter care iubesc detaliile speciale, colecțiile tematice și obiectele cu personalitate. Este potrivită pentru aniversări, sărbători sau pentru acel cadou memorabil oferit fără o ocazie anume.",
    story: "Mesajul «I Solemnly Swear...» este recognoscibil dintr-o clipă pentru orice fan adevărat. Fotografia originală arată clar textura lemnului vopsit și poziția capacului, iar în galerie am evidențiat din aceeași imagine atât designul de pe capac, cât și zona mecanismului, pe cât permite cadrul real al pozei.",
    details: ["Finisaj albastru intens, accente aurii", "Mecanism manual durabil", "Ideală pentru cadou de colecție", "Transport 25 lei sub 3 bucăți"],
  },
  {
    id: "hp-keeper",
    name: "Harry Potter — I'm a Keeper",
    tagline: "Un cadou fermecător pentru cineva care încă își așteaptă scrisoarea.",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpKeeper,
    gallery: [
      { src: hpKeeper, label: "Vedere completă", position: "center" },
      { src: hpKeeper, label: "Capac în detaliu", position: "center top" },
      { src: hpKeeper, label: "Mecanism în cadru", position: "right center" },
    ],
    description: "Acest model are o energie jucăușă și nostalgică în același timp. Îi va impresiona pe fanii care iubesc universul Harry Potter, colecționează obiecte tematice sau caută un cadou diferit, cu poveste și emoție. Este o alegere foarte bună pentru adolescenți, prietene, surori sau pentru oricine încă se simte puțin elev la Hogwarts.",
    story: "Designul de pe capac și mesajul de pe laterala cutiuței îi dau personalitate imediată. Pentru că fotografia originală surprinde bine atât cutiuța, cât și interiorul, am construit galeria exclusiv din încadrări reale ale aceleiași imagini, fără să schimb produsul sau să inventăm alte unghiuri artificiale.",
    details: ["Lemn închis la culoare", "Capac ilustrat Harry Potter", "Mecanism vizibil în fotografia originală", "Preț promo: 75 lei/buc de la 3 bucăți"],
  },
  {
    id: "halloween",
    name: "Halloween — Castelul Bântuit",
    tagline: "Pentru cei care iubesc atmosfera spooky, nu doar sărbătoarea.",
    melody: "This Is Halloween",
    category: "Halloween",
    image: halloween,
    gallery: [
      { src: halloween, label: "Vedere completă", position: "center" },
      { src: halloween, label: "Capac în detaliu", position: "center top" },
      { src: halloween, label: "Mecanism & lateral", position: "right center" },
    ],
    description: "Modelul acesta are exact genul de prezență care atrage privirea imediat: contrast puternic, dovleci expresivi și un aer misterios care îl face perfect pentru un fan al Halloween-ului, al universurilor gotice sau al cadourilor cu personalitate. E genul de piesă care stă bine pe birou, într-o bibliotecă sau într-un colț decorativ cu tematică de toamnă.",
    story: "Ilustrația de pe capac spune instant povestea — castel, lună plină și acel vibe de film cult de Halloween. Din fotografia originală se vede foarte bine cutiuța reală, inclusiv porțiunea de mecanism, așa că galeria pune accent pe claritate și autenticitate, nu pe efecte artificiale.",
    details: ["Design tematic Halloween", "Lemn gravat cu motive decorative", "Melodie recognoscibilă pentru fanii genului", "Transport gratuit la comenzi de 3+ bucăți"],
  },
  {
    id: "fairy",
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
    description: "Dacă vrei un cadou care să pară tandru, luminos și memorabil din prima clipă, modelul cu zână este alegerea potrivită. Îi va impresiona pe cei care iubesc poveștile fantasy, universurile delicate, cadourile poetice și obiectele care par desprinse dintr-o lume fermecată. Este potrivit atât pentru adolescente, cât și pentru femei care încă păstrează ceva visător în ele.",
    story: "Capacul ilustrat are un efect aproape cinematografic, iar cutiuța din lemn păstrează acel contrast frumos dintre materialul natural și imaginea luminoasă. În galerie am folosit numai fotografia originală, din care am evidențiat separat capacul și zona interioară, astfel încât produsul să rămână fidel realității.",
    details: ["Capac ilustrat cu tematică fantasy", "Cutie din lemn cu decor gravat", "Mecanism vizibil parțial în fotografia originală", "Cadou potrivit pentru aniversare sau Crăciun"],
  },
  {
    id: "pirates",
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
    description: "Este unul dintre modelele cu cel mai mult dramatism vizual. Corabia din furtună și tonurile intense îl fac cadoul ideal pentru un fan al aventurii, al filmelor Pirates of the Caribbean sau pentru cineva care iubește obiectele decorative cu impact. Arată excelent ca surpriză pentru un iubitor de povești maritime, filme epice sau colecții tematice.",
    story: "Imaginea de pe capac transmite mișcare și tensiune, iar baza din lemn o echilibrează perfect. Pentru prezentarea produsului am păstrat cadrul original și am extras trei moduri de vizualizare din aceeași fotografie, ca să se vadă mai clar cutiuța, textura lemnului și partea mecanică.",
    details: ["Ilustrație marină dramatică", "Lemn natur cu ornament gravat", "Mecanism cu manivelă laterală", "2 bucăți = 150 lei + transport"],
  },
  {
    id: "starwars-dad",
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
    description: "Pentru un tată pasionat de Star Wars, modelul acesta merge direct la țintă. Mesajul este clar, amuzant și foarte ofertant ca idee de cadou pentru ziua lui, Crăciun, Ziua Tatălui sau pur și simplu ca gest memorabil. Este genul de obiect mic, dar cu mare efect emoțional, mai ales pentru cineva care iubește universul galactic și cadourile personalizate cu gust.",
    story: "Textul de pe capac face produsul imediat recognoscibil, iar lemnul închis îi dă un aer matur și elegant. În loc să schimbăm cutiuța, am ales să păstrăm exact fotografia originală și să construim o galerie de detaliu din ea, pentru un plus de claritate și încredere la comandă.",
    details: ["Mesaj ideal pentru cadou dedicat", "Cutie din lemn cu aspect premium", "Mecanism manual rezistent", "Plată exclusiv online la finalizare"],
  },
  {
    id: "kitten",
    name: "Pisicuța cu Stele",
    tagline: "O alegere dulce pentru cineva care adoră pisicile și gesturile fine.",
    melody: "La Vie en Rose",
    category: "Cadouri Speciale",
    image: kitten,
    gallery: [
      { src: kitten, label: "Vedere completă", position: "center" },
      { src: kitten, label: "Capac în detaliu", position: "center top" },
      { src: kitten, label: "Mecanism & lateral", position: "right center" },
    ],
    description: "Modelul cu pisicuță este cald, drăgălaș și foarte ușor de oferit în dar fără să pară banal. Îi va impresiona pe iubitorii de pisici, pe fanele cadourilor delicate sau pe cineva care apreciază obiectele mici, frumoase și cu atmosferă. Se potrivește minunat pentru aniversări, surprize romantice discrete sau un cadou de suflet oferit din senin.",
    story: "Pisicuța luminoasă de pe capac creează imediat o stare blândă și jucăușă. Pentru pagina produsului am folosit doar fotografia originală și am pus accent pe zonele relevante: ilustrația, interiorul vizibil și forma cutiuței. Așa rămâne clar că vezi produsul real, nu o reinterpretare.",
    details: ["Capac ilustrat cu tematică delicată", "Cutie din lemn natur", "Melodie cu ton romantic și blând", "Transport 25 lei pentru 1 sau 2 bucăți"],
  },
  {
    id: "pernuta-auto",
    name: "Pernuță auto pentru gât",
    tagline: "Confort instant pentru drumuri lungi — disponibilă în 2 culori.",
    category: "Obiecte unice",
    image: pillowBlack,
    gallery: [
      { src: pillowBlack, label: "Negru", position: "center" },
      { src: pillowBeige, label: "Bej", position: "center" },
    ],
    description: "Pernuță ergonomică pentru tetieră, cu material catifelat moale, perfect pentru drumurile zilnice sau călătoriile lungi. Sprijină gâtul în poziție naturală și reduce oboseala.",
    story: "Disponibilă în două culori — negru clasic și bej delicat — se potrivește în orice interior auto. Aceeași pernuță, două variante pentru a se asorta cu mașina ta.",
    details: ["Material catifelat premium", "Umplutură memory foam moale", "Curea elastică pentru tetieră", "2 variante de culoare disponibile"],
    price: 49,
  },
  {
    id: "set-termos",
    name: "Set termos vacuum 500ml + 2 căni",
    tagline: "Păstrează cald sau rece până la 12 ore — cadou perfect pentru pasionați.",
    category: "Obiecte unice",
    image: thermos1,
    gallery: [
      { src: thermos1, label: "Setul în cutia cadou", position: "center" },
      { src: thermos2, label: "Componente detaliate", position: "center" },
      { src: thermos3, label: "Hot & Cold 12h", position: "center" },
    ],
    description: "Set complet din oțel inoxidabil: termos de 500ml plus două căni asortate, livrat într-o cutie cadou elegantă. Izolație vacuum dublă care păstrează băuturile la temperatura ideală până la 12 ore.",
    story: "Trei imagini ale aceluiași set: ambalajul cadou, vederea pe componente cu dimensiuni reale și demonstrația de izolație termică. Ideal pentru excursii, birou sau cafeaua de dimineață.",
    details: ["Oțel inoxidabil 304", "500ml termos + 2 căni 160ml", "Păstrează cald 12h / rece 12h", "Ambalaj cadou inclus"],
    price: 129,
  },
  {
    id: "pieptene-barba",
    name: "Pieptene barbă „The Men Times”",
    tagline: "Accesoriu metalic premium pentru îngrijirea bărbii.",
    category: "Obiecte unice",
    image: comb1,
    gallery: [
      { src: comb1, label: "Detaliu mâner gravat", position: "center" },
      { src: comb2, label: "În uz la barber shop", position: "center" },
    ],
    description: "Pieptene din oțel inoxidabil cu mâner sculptat în relief — un detaliu vintage pentru orice frizerie sau colecție personală. Dinți fini și groși pe aceeași față.",
    story: "Două perspective ale aceluiași produs: detaliu macro pe mâner și demonstrație în context real, într-un salon de barber.",
    details: ["Oțel inoxidabil rezistent", "Design vintage tip cameo", "Dinți dubli — fini și groși", "Mărime de buzunar"],
    price: 39,
  },
  {
    id: "suport-telefon",
    name: "Suport telefon pliabil reglabil",
    tagline: "Unghi reglabil pe 110° — compact, ușor de transportat.",
    category: "Obiecte unice",
    image: phonestand1,
    gallery: [
      { src: phonestand1, label: "În uz cu telefonul", position: "center" },
      { src: phonestand2, label: "Mecanism reglare 110°", position: "center" },
    ],
    description: "Suport ultra-pliabil pentru telefon sau tabletă, cu sistem de reglare a unghiului pe 110°. Se pliază plat pentru transport în buzunar sau geantă.",
    story: "Aceeași piesă în două ipostaze: în uz pe birou și schema mecanismului de reglare.",
    details: ["Reglare unghi pe 110°", "Compatibil telefon și tabletă", "Plastic ABS rezistent", "Se pliază plat"],
    price: 29,
  },
  {
    id: "ceas-buzunar",
    name: "Ceas de buzunar vintage bronz",
    tagline: "Cifre romane, gravură ornamentală — un cadou cu suflet de epocă.",
    category: "Obiecte unice",
    image: pocketwatch1,
    gallery: [
      { src: pocketwatch1, label: "Vedere completă pe ziar", position: "center" },
    ],
    description: "Ceas de buzunar cu mecanism quartz, finisaj bronz patinat și capac gravat cu motive florale. Vine cu lanț metalic pentru atașare.",
    story: "Un obiect care arată ca scos dintr-un sertar de bunic — perfect ca dar pentru pasionați de vintage, steampunk sau colecții.",
    details: ["Mecanism quartz fiabil", "Cifre romane pe cadran", "Capac gravat ornamental", "Lanț metalic inclus"],
    price: 59,
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);

