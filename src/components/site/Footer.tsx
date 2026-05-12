import { Instagram, Facebook, ShoppingBag } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 wood-grain text-[color:var(--cream)]">
      <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-10 text-center md:text-left">
        <div>
          <div className="font-display text-2xl">Cutiuța <span className="gold-text">Magică</span></div>
          <p className="mt-3 text-sm text-[color:var(--cream)]/70 max-w-sm mx-auto md:mx-0">Cutiuțe muzicale din lemn, păstrate doar în variantele cu fotografie reală și prezentare clară.</p>
        </div>
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Ne găsești pe</div>
          <div className="flex flex-col gap-2 text-sm">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-[color:var(--gold)]"><Instagram className="w-4 h-4" /> Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-[color:var(--gold)]"><Facebook className="w-4 h-4" /> Facebook</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-[color:var(--gold)]"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.84-.21Z"/></svg> TikTok</a>
            <a href="https://emag.ro" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-[color:var(--gold)]"><ShoppingBag className="w-4 h-4" /> eMAG</a>
          </div>
        </div>
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Oferta</div>
          <ul className="text-sm space-y-1 text-[color:var(--cream)]/80">
            <li>1 cutiuță — 89 lei</li>
            <li>2 cutiuțe — 150 lei <span className="text-[color:var(--gold)]">(+ 25 lei transport)</span></li>
            <li>3 cutiuțe — 225 lei <span className="text-[color:var(--gold)]">(75 lei/buc + transport gratuit)</span></li>
            <li>Plată: exclusiv online</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-[color:var(--cream)]/50">© {new Date().getFullYear()} Cutiuța Magică · Făcut cu drag în România</div>
    </footer>
  );
}
