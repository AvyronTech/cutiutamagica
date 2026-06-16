import { Quote, Sparkles } from "lucide-react";

type Review = {
  name: string;
  city: string;
  country: string;
  text: string;
};

const reviews: Review[] = [
  { name: "Andreea P.", city: "Cluj-Napoca", country: "România", text: "Cutiuța a sosit împachetată impecabil. Melodia e exact ca în copilărie — soțul a rămas fără cuvinte." },
  { name: "Mihai D.", city: "București", country: "România", text: "Lemnul are un parfum cald, finisaj fără cusur. A meritat fiecare leu." },
  { name: "Ioana S.", city: "Timișoara", country: "România", text: "Am luat-o cadou de aniversare. Mama o ține pe noptieră și o învârte în fiecare seară." },
  { name: "Radu M.", city: "Iași", country: "România", text: "Mecanismul e silențios și clar. Calitate adevărată, nu plastic chinezesc." },
  { name: "Elena V.", city: "Brașov", country: "România", text: "M-au impresionat detaliile sculptate. Se vede mâna unui meșter, nu o fabrică." },
  { name: "Cristian L.", city: "Constanța", country: "România", text: "Livrare rapidă prin easybox, ambalaj de cadou. Recomand cu drag." },
  { name: "Diana T.", city: "Sibiu", country: "România", text: "Am plâns când am deschis-o. Melodia noastră, exact așa cum mi-o aminteam." },
  { name: "Stoyan I.", city: "Sofia", country: "Bulgaria", text: "Beautiful craftsmanship. The wood smells wonderful and the melody is delicate." },
  { name: "Petya G.", city: "Plovdiv", country: "Bulgaria", text: "A magical little gift for my sister. Arrived in perfect condition." },
  { name: "Bence K.", city: "Budapesta", country: "Ungaria", text: "Real wood, real charm. My grandmother loved it more than any other present." },
  { name: "Réka N.", city: "Szeged", country: "Ungaria", text: "Elegant și foarte bine făcut. Sunetul melodiei e curat, cald, de poveste." },
  { name: "Alexandra B.", city: "Oradea", country: "România", text: "Atenție la detalii, livrare promptă și un mesaj scris de mână. Magie pură." },
];

export function ReviewsStrip() {
  // Duplicate the list so the marquee can loop seamlessly.
  const loop = [...reviews, ...reviews];

  return (
    <section className="max-w-6xl mx-auto px-4 pt-6 pb-2" aria-labelledby="reviews-heading">
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-2 text-[color:var(--gold)]">
          <span aria-hidden className="h-px w-8 bg-[color:var(--gold)]/50" />
          <Sparkles className="w-3.5 h-3.5" />
          <span aria-hidden className="h-px w-8 bg-[color:var(--gold)]/50" />
        </div>
        <h2 id="reviews-heading" className="font-display text-lg md:text-xl mt-1">Spuse de cei care le-au primit</h2>
      </div>

      <div
        className="relative overflow-hidden mask-fade reviews-marquee"
        aria-label="Recenzii care se derulează"
      >
        <div className="reviews-marquee-track flex gap-3 py-1 will-change-transform">
          {loop.map((r, i) => (
            <article
              key={i}
              className="w-[260px] md:w-[300px] shrink-0 rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-soft"
            >
              <Quote className="w-3.5 h-3.5 text-[color:var(--gold)] mb-1.5" />
              <p className="text-xs md:text-[13px] leading-snug text-foreground/90 line-clamp-3">{r.text}</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground">{r.city}, {r.country}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
