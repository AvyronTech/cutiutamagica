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

// 1 buc = 89 lei + 25 transport. 2 buc = 150 lei (75/buc) + 25 transport.
// 3+ buc = 75 lei/buc + transport GRATUIT.
export function calcTotals(qty: number) {
  let subtotal = qty * PRICE;
  if (qty === 2) subtotal = 150;
  if (qty >= 3) subtotal = qty * 75;
  const shipping = qty >= 3 ? 0 : qty > 0 ? SHIPPING : 0;
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
      "Cadoul perfect pentru fanul Tolkien care încă visează la Ținutul de Mijloc.",
    story:
      "O învârtire de manivelă și se aud primele note din «Concerning Hobbits». Pentru cel care a citit trilogia de trei ori și plânge la finalul filmului.",
    details: [
      "Lemn natural gravat cu laser",
      "Mecanism manual, fără baterii",
      "Dimensiuni: 6.5 × 5 × 4 cm",
      "Melodie: Concerning Hobbits",
    ],
  },
  {
    id: "lotr-rings",
    name: "Stăpânul Inelelor — One Ring",
    tagline: "Un inel le stăpânește pe toate",
    melody: "In Dreams",
    category: "Stăpânul Inelelor",
    image: lotr2,
    description:
      "Pentru colecționarul care își dorește inscripția elfică pe biroul lui.",
    story:
      "Litere argintii ce curg ca runele forjate în Muntele Osândei. Un cadou de impact pentru fani LOTR și pasionați de fantasy.",
    details: [
      "Gravare detaliată inscripție elfică",
      "Lemn de fag, finisaj vintage",
      "Mecanism durabil",
      "Melodie: In Dreams",
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
      "Pentru fanul care a urmărit toate sezoanele și încă speră la un final mai bun.",
    story:
      "Sigiliul lupului străvechi, gravat în lemn. Cadou de neuitat pentru iubitorii sagăi sau pentru cineva loial casei Stark.",
    details: [
      "Sigiliu Stark gravat",
      "Finisaj cald, accente aurii",
      "Mecanism manual silențios",
      "Melodie: GoT Main Theme",
    ],
  },
  {
    id: "got-winter",
    name: "Game of Thrones — Winter is Coming",
    tagline: "Cuvintele Casei Stark",
    melody: "Main Theme",
    category: "Game of Thrones",
    image: gotWinter,
    description:
      "Trei cuvinte care îi vor da fiori oricărui fan GoT. Cadou ideal de aniversare sau Crăciun.",
    story:
      "Pentru cel care îți recită replici din serial pe de rost. O cutiuță care aduce Nordul direct pe raftul lui.",
    details: [
      "Gravare adâncă, accent auriu",
      "Finisaj mat",
      "Manivelă din alamă",
      "Melodie: GoT Main Theme",
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
      "Cadou romantic pentru ea, dacă ea încă mai crede în magia Hogwarts-ului.",
    story:
      "O inimă plină de simboluri Harry Potter. Perfectă de Sf. Valentin, aniversare sau «doar pentru că».",
    details: [
      "Simboluri Harry Potter gravate",
      "Lemn ebonizat cu detalii aurii",
      "Mecanism de precizie",
      "Melodie: Hedwig's Theme",
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
      "Pentru Potterhead-ul din viața ta — cel cu eșarfă Gryffindor și baghetă pe noptieră.",
    story:
      "Capac dublu gravat cu Harry și stema Hogwarts. Un cadou care îi va aduce zâmbetul de la prima notă.",
    details: [
      "Gravare pe mai multe fețe",
      "Compactă: 6.5 × 5 × 4 cm",
      "Mecanism manual durabil",
      "Melodie: Hedwig's Theme",
    ],
  },
  {
    id: "hp-platform",
    name: "Harry Potter — Peronul 9¾",
    tagline: "King's Cross — London",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpPlatform,
    description:
      "Pentru cel care își amintește exact unde era când a citit prima carte.",
    story:
      "Stil vintage afumat cu peronul 9¾. Cadou ideal pentru aniversare sau pentru cineva care încă așteaptă scrisoarea de la Hogwarts.",
    details: [
      "Stil vintage",
      "Gravură «I'm a Keeper»",
      "Lemn masiv, manivelă alamă",
      "Melodie: Hedwig's Theme",
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
      "Pentru aniversare, cerere în căsătorie sau un «te iubesc» care nu se uită.",
    story:
      "Doi îndrăgostiți gravați pe capac și melodia lui Elvis sub degetele tale. Cadou cu impact garantat.",
    details: [
      "Gravură romantică",
      "Lemn fin lustruit",
      "Sunet cristalin",
      "Melodie: Can't Help Falling in Love",
    ],
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
