import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useCallback } from "react";

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
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-review-card]");
    const step = card ? card.offsetWidth + 12 : 280;
    el.scrollBy({ left: dir * step * 1.5, behavior: "smooth" });
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-4 pt-6 pb-2" aria-labelledby="reviews-heading">
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-1.5 text-[color:var(--gold)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-current" />
          ))}
        </div>
        <h2 id="reviews-heading" className="font-display text-lg md:text-xl mt-1">Spuse de cei care le-au primit</h2>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Recenzii anterioare"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-9 h-9 rounded-full border border-[color:var(--gold)]/40 bg-card/90 backdrop-blur-sm shadow-soft hover:bg-card text-[color:var(--gold)] transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Recenzii următoare"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-9 h-9 rounded-full border border-[color:var(--gold)]/40 bg-card/90 backdrop-blur-sm shadow-soft hover:bg-card text-[color:var(--gold)] transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div
          ref={trackRef}
          className="overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth mask-fade reviews-track"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-3 w-max py-1 px-1 md:px-10">
            {reviews.map((r, i) => (
              <article
                key={i}
                data-review-card
                className="w-[260px] md:w-[300px] shrink-0 snap-start rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-soft"
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
      </div>

      <p className="md:hidden text-center text-[11px] text-muted-foreground mt-2">Glisează ←→ pentru a vedea mai multe</p>
    </section>
  );
}
