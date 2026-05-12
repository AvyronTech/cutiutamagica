import lotr from "@/assets/box-lotr.jpg";
import lotr2 from "@/assets/box-lotr-2.jpg";
import got from "@/assets/box-got.jpg";
import gotWinter from "@/assets/box-got-winter.jpg";
import hpHeart from "@/assets/box-hp-heart.jpg";
import hpQuidditch from "@/assets/box-hp-quidditch.jpg";
import hpPlatform from "@/assets/box-hp-platform.jpg";
import love from "@/assets/box-love.jpg";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  melody: string;
  category: string;
  image: string;
  description: string;
  story: string;
  details: string[];
};

export const PRICE = 89;
export const SHIPPING = 25;

export function calcTotals(qty: number) {
  let subtotal = qty * PRICE;
  if (qty === 2) subtotal = 150;
  if (qty >= 3) subtotal = 225 + (qty - 3) * 75;
  const shipping = qty >= 2 ? 0 : SHIPPING;
  return { subtotal, shipping, total: subtotal + shipping };
}

export const products: Product[] = [
  {
    id: "lotr-gandalf",
    name: "Stăpânul Inelelor — Gandalf & Frodo",
    tagline: "Călătoria începe aici",
    melody: "Concerning Hobbits",
    category: "Stăpânul Inelelor",
    image: lotr,
    description:
      "O cutiuță gravată cu silueta lui Gandalf și a lui Frodo, purtându-te înapoi în Ținutul de Mijloc cu fiecare învârtire de manivelă.",
    story:
      "Inspirată din călătoria celor mai îndrăgiți eroi ai Pământului de Mijloc, această cutiuță cântă tema Hobbiților — o melodie care îți va aminti că marile aventuri încep cu un singur pas în afara casei.",
    details: [
      "Lemn natural gravat cu laser",
      "Mecanism manual cu manivelă, fără baterii",
      "Dimensiuni: 6.5 × 5 × 4 cm",
      "Melodie: Concerning Hobbits (LOTR)",
      "Cadou ideal pentru fanii Tolkien",
    ],
  },
  {
    id: "lotr-rings",
    name: "Lord of the Rings — One Ring",
    tagline: "Un inel le stăpânește pe toate",
    melody: "In Dreams",
    category: "Stăpânul Inelelor",
    image: lotr2,
    description:
      "Capac gravat cu inscripția elfică a Inelului Suprem. O piesă de colecție pentru cei care păstrează încă ecoul Mordorului.",
    story:
      "Litere argintii curg pe capac ca runele inelului forjat în focul Muntelui Osândei. Învârte manivela și melodia 'In Dreams' va umple camera.",
    details: [
      "Gravare detaliată inscripție elfică",
      "Lemn de fag tratat, finisaj vintage",
      "Mecanism elvețian de calitate",
      "Melodie: In Dreams (LOTR)",
      "Greutate: 180 g",
    ],
  },
  {
    id: "got-thrones",
    name: "Game of Thrones — Casa Stark",
    tagline: "Iarna se apropie",
    melody: "Main Theme",
    category: "Game of Thrones",
    image: got,
    description:
      "Sigiliul lupului străvechi, gravat în lemn negru cu accente aurii. Tema iconică a Tronului de Fier prinde viață sub mâna ta.",
    story:
      "De la zidurile din Winterfell până la Tronul de Fier — această cutiuță poartă cu ea forța casei Stark și liniștea tăioasă a Nordului.",
    details: [
      "Sigiliu Stark gravat pe ambele fețe",
      "Lemn negru cu accente aurii",
      "Mecanism manual silențios",
      "Melodie: Game of Thrones Main Theme",
      "Cutie cadou inclusă",
    ],
  },
  {
    id: "got-winter",
    name: "Winter is Coming",
    tagline: "Cuvintele Casei Stark",
    melody: "Main Theme",
    category: "Game of Thrones",
    image: gotWinter,
    description:
      "Capac gravat cu deviza eternă: Winter is Coming. O cutiuță pentru cei loiali Nordului.",
    story:
      "Trei cuvinte care au schimbat regate. O melodie care îți va da fiori pe șira spinării de fiecare dată.",
    details: [
      "Gravare adâncă, vopsea aurie",
      "Finisaj mat negru",
      "Manivelă din alamă",
      "Melodie: GoT Main Theme",
      "Garanție 12 luni",
    ],
  },
  {
    id: "hp-heart",
    name: "Harry Potter — Always",
    tagline: "După atâția ani? Mereu.",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpHeart,
    description:
      "Inimă gravată cu simbolurile lumii vrăjitorești: peronul 9¾, ochelarii, fulgerul, talismanele morții.",
    story:
      "Pentru cei care încă mai cred în magie. Fiecare simbol gravat în lemn este o amintire dintr-o călătorie pe Hogwarts Express.",
    details: [
      "11 simboluri Harry Potter gravate",
      "Lemn ebonizat cu detalii aurii",
      "Mecanism manual de precizie",
      "Melodie: Hedwig's Theme",
      "Ambalaj cadou magic",
    ],
  },
  {
    id: "hp-quidditch",
    name: "Harry Potter — Quidditch",
    tagline: "Aripile Snitch-ului de Aur",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpQuidditch,
    description:
      "Capac dublu gravat — Harry Potter pe o față, stema Hogwarts și Quidditch pe celelalte.",
    story:
      "Inspirată din meciurile de Quidditch sub cerul aurit al Hogwarts-ului. Învârte manivela și retrăiește prima ta cursă cu Nimbus 2000.",
    details: [
      "Gravare pe 4 fețe",
      "Dimensiuni compacte: 6.5 × 5 × 4 cm",
      "Mecanism manual, fără baterii",
      "Melodie: Hedwig's Theme",
      "Perfect pentru colecționari",
    ],
  },
  {
    id: "hp-platform",
    name: "Peronul 9¾",
    tagline: "King's Cross — London",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpPlatform,
    description:
      "Cutiuță vintage cu peronul 9¾ și inscripția 'I'm a Keeper'. Pentru cei care încă așteaptă scrisoarea de la Hogwarts.",
    story:
      "O bucățică din magia primei sosiri la Hogwarts — gata să te transporte înapoi pe Hogwarts Express.",
    details: [
      "Stil vintage afumat",
      "Gravură 'I'm a Keeper' & 'Always'",
      "Lemn masiv, manivelă alamă",
      "Melodie: Hedwig's Theme",
      "Ediție limitată",
    ],
  },
  {
    id: "love",
    name: "Can't Help Falling in Love",
    tagline: "Cadoul perfect pentru ea",
    melody: "Can't Help Falling in Love",
    category: "Romantic",
    image: love,
    description:
      "Silueta a doi îndrăgostiți gravată pe capac — o declarație de dragoste pe care o poți auzi de fiecare dată.",
    story:
      "Pentru aniversări, cereri în căsătorie, Sf. Valentin sau pur și simplu pentru un 'te iubesc' nespus. Melodia lui Elvis prinde viață sub degetele tale.",
    details: [
      "Gravură romantică",
      "Lemn fin lustruit",
      "Sunet cristalin, vibrant",
      "Melodie: Can't Help Falling in Love",
      "Cadou ambalat magic",
    ],
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
