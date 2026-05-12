import lotrRing from "@/assets/box-lotr-ring.jpg";
import got from "@/assets/box-got.jpg";
import gotWinter from "@/assets/box-got-winter.jpg";
import hpAlways from "@/assets/box-hp-always.jpg";
import hpKeeper from "@/assets/box-hp-keeper.jpg";
import love from "@/assets/box-love.jpg";
import halloween from "@/assets/box-halloween.jpg";
import fairy from "@/assets/box-fairy.jpg";
import pirates from "@/assets/box-pirates.jpg";
import starwarsDad from "@/assets/box-starwars-dad.jpg";
import kitten from "@/assets/box-kitten.jpg";

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
export const MAX_QTY = 5;

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
    id: "lotr-rings",
    name: "Stăpânul Inelelor — One Ring",
    tagline: "Un inel le stăpânește pe toate",
    melody: "In Dreams",
    category: "Stăpânul Inelelor",
    image: lotrRing,
    description: "Cadoul ideal pentru fanul Tolkien care a citit trilogia de mai multe ori.",
    story: "Inscripția elfică pe fundal de flăcări, gravură fină pe lemn natural. Un obiect de colecție pentru biroul oricărui pasionat de fantasy.",
    details: ["Lemn natural gravat laser", "Mecanism manual durabil", "Dimensiuni: 6.5 × 5 × 4 cm", "Melodie: In Dreams"],
  },
  {
    id: "hp-always",
    name: "Harry Potter — I Solemnly Swear",
    tagline: "…that I am up to no good",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpAlways,
    description: "Pentru Potterhead-ul cu Harta Hoinarului pe perete și bagheta pe noptieră.",
    story: "Lemn vopsit albastru profund cu gravură aurie — Deathly Hallows și jurământul familiar oricărui fan.",
    details: ["Vopsit albastru, accente aurii", "Mecanism manual silențios", "Compactă: 6.5 × 5 × 4 cm", "Melodie: Hedwig's Theme"],
  },
  {
    id: "hp-keeper",
    name: "Harry Potter — I'm a Keeper",
    tagline: "Pentru păstrătorii magiei",
    melody: "Hedwig's Theme",
    category: "Harry Potter",
    image: hpKeeper,
    description: "Cadou aniversar pentru cineva care încă așteaptă scrisoarea de la Hogwarts.",
    story: "Capac cu logo Harry Potter și Hogwarts pe fundal înstelat. Lemn afumat cu gravură «I'm a Keeper».",
    details: ["Lemn ebonizat, gravură aurie", "Manivelă alamă", "Cadou aniversar / Crăciun", "Melodie: Hedwig's Theme"],
  },
  {
    id: "got-thrones",
    name: "Game of Thrones — Casa Stark",
    tagline: "Iarna se apropie",
    melody: "Main Theme",
    category: "Game of Thrones",
    image: got,
    description: "Pentru fanul care a urmărit toate sezoanele și încă speră la un final mai bun.",
    story: "Sigiliul lupului străvechi, gravat în lemn. Cadou de neuitat pentru loialii casei Stark.",
    details: ["Sigiliu Stark gravat", "Finisaj cald, accente aurii", "Mecanism manual silențios", "Melodie: GoT Main Theme"],
  },
  {
    id: "got-winter",
    name: "Game of Thrones — Winter is Coming",
    tagline: "Cuvintele Casei Stark",
    melody: "Main Theme",
    category: "Game of Thrones",
    image: gotWinter,
    description: "Trei cuvinte care îi vor da fiori oricărui fan GoT. Cadou ideal de aniversare sau Crăciun.",
    story: "Pentru cel care îți recită replici din serial pe de rost. Aduce Nordul direct pe raftul lui.",
    details: ["Gravare adâncă, accent auriu", "Finisaj mat", "Manivelă din alamă", "Melodie: GoT Main Theme"],
  },
  {
    id: "halloween",
    name: "Halloween — Castelul Bântuit",
    tagline: "Trick or treat?",
    melody: "This Is Halloween",
    category: "Halloween",
    image: halloween,
    description: "Cadou perfect pentru fanii Tim Burton sau pentru petrecerea de Halloween.",
    story: "Castel întunecat, dovleci rânjind și lilieci sub lună plină. Atmosferă spooky garantată.",
    details: ["Capac ilustrat color", "Lemn natural gravat", "Mecanism manual", "Melodie: This Is Halloween"],
  },
  {
    id: "fairy",
    name: "Zâna Pădurii Fermecate",
    tagline: "Magie pură în palme",
    melody: "A Thousand Years",
    category: "Fantasy",
    image: fairy,
    description: "Cadou magic pentru fetițe, adolescente sau oricine crede încă în zâne.",
    story: "Zână cu aripi de sticlă într-o pădure de stele. Visare cu ochii deschiși la fiecare învârtire.",
    details: ["Capac ilustrat detaliat", "Lemn fin lustruit", "Mecanism delicat", "Melodie: A Thousand Years"],
  },
  {
    id: "pirates",
    name: "Pirații Caraibilor — Furtuna",
    tagline: "Yo ho, yo ho",
    melody: "He's a Pirate",
    category: "Aventură",
    image: pirates,
    description: "Pentru aventurierul care visează la mările deschise și la corăbii fantomă.",
    story: "Corabia înfruntă valuri uriașe sub un cer apocaliptic. Cadou cu impact pentru fanii Jack Sparrow.",
    details: ["Ilustrație dramatică pe capac", "Gravură ornamentală pe lemn", "Manivelă alamă", "Melodie: He's a Pirate"],
  },
  {
    id: "starwars-dad",
    name: "Star Wars — Best Dad in the Galaxy",
    tagline: "Cadoul perfect pentru tata",
    melody: "Imperial March",
    category: "Cadouri Speciale",
    image: starwarsDad,
    description: "Pentru tata fan Star Wars — de ziua lui, de Crăciun sau «doar pentru că».",
    story: "Galaxia într-o cutiuță. May the Force be with him.",
    details: ["Capac ilustrat", "Lemn natural gravat", "Mecanism durabil", "Melodie: Imperial March"],
  },
  {
    id: "kitten",
    name: "Pisicuța cu Stele",
    tagline: "Tandrețe cu manivelă",
    melody: "La Vie en Rose",
    category: "Cadouri Speciale",
    image: kitten,
    description: "Pentru iubitoarele de pisici — un cadou drăgălaș pentru zile aniversare sau «mulțumesc».",
    story: "O pisicuță aurie ce se joacă printre fluturi și stele. Topește orice inimă.",
    details: ["Capac ilustrat color", "Lemn fin gravat", "Mecanism manual", "Melodie: La Vie en Rose"],
  },
  {
    id: "love",
    name: "Can't Help Falling in Love",
    tagline: "Cadoul perfect pentru ea",
    melody: "Can't Help Falling in Love",
    category: "Romantic",
    image: love,
    description: "Pentru aniversare, cerere în căsătorie sau un «te iubesc» care nu se uită.",
    story: "Doi îndrăgostiți gravați pe capac și melodia lui Elvis sub degetele tale. Cadou cu impact garantat.",
    details: ["Gravură romantică", "Lemn fin lustruit", "Sunet cristalin", "Melodie: Can't Help Falling in Love"],
  },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
