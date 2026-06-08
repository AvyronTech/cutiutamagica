// Brand contact helpers — centralized so messages stay consistent.
export const WA_PHONE = "40734605742"; // RO prefix, no leading 0
export const PHONE_TEL = "+40734605742";
export const PHONE_DISPLAY = "+40 734 605 742";

export function waLink(message: string) {
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(message)}`;
}

/** Pre-written, context-aware WhatsApp opener based on the current route. */
export function messageForPath(pathname: string): string {
  if (pathname.startsWith("/produs/"))
    return "Bună! Sunt interesat(ă) de cutiuța muzicală pe care tocmai o privesc pe site. Îmi puteți spune dacă e disponibilă și în cât timp ajunge?";
  if (pathname.startsWith("/produse"))
    return "Bună! Vreau să comand o cutiuță muzicală și aș avea nevoie de o recomandare. Mă puteți ghida prin modele?";
  if (pathname.startsWith("/comanda"))
    return "Bună! Am o întrebare legată de comanda mea în curs. Mă puteți ajuta, vă rog?";
  if (pathname.startsWith("/poveste"))
    return "Bună! Mi-a plăcut povestea atelierului și aș vrea să aflu mai multe despre cutiuțele voastre.";
  if (pathname.startsWith("/favorite"))
    return "Bună! Am câteva cutiuțe salvate la favorite. Mai sunt disponibile și pot comanda mai multe deodată?";
  return "Bună! Aș vrea mai multe detalii despre cutiuțele muzicale de la voi. Mulțumesc!";
}

export const B2B_MESSAGE =
  "Bună! Reprezint o firmă / brand și sunt interesat(ă) de o colaborare B2B cu Cutiuța Magică (cadouri corporate, comenzi în volum, personalizări). Putem discuta opțiunile?";
