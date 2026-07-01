import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Check, CreditCard } from "lucide-react";
import { useShop } from "@/store/shop";
import { calcTotals, MAX_QTY } from "@/data/products";

import { toast } from "sonner";

export const Route = createFileRoute("/comanda")({
  component: OrderPage,
  head: () => ({
    meta: [
      { title: "Comandă online — Cutiuța Magică" },
      { name: "description", content: "Finalizează comanda online. Transport 25 lei pentru 1-2 produse și gratuit de la 3 bucăți." },
      { property: "og:title", content: "Comandă online — Cutiuța Magică" },
      { property: "og:description", content: "Finalizează comanda online. Transport gratuit de la 3 bucăți." },
      { property: "og:url", content: "https://cutiutamagica.eu/comanda" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/comanda" }],
  }),
});

function OrderPage() {
  const { itemsDetailed, setQty, removeFromCart, totalQty, clearCart } = useShop();
  const totals = calcTotals(totalQty);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", notes: "" });

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 mx-auto rounded-full wood-grain text-[color:var(--gold)] flex items-center justify-center">
          <Check className="w-8 h-8" />
        </div>
        <h1 className="font-display text-4xl mt-6">Mulțumim, {form.name.split(" ")[0] || "prieten"}!</h1>
        <p className="mt-3 text-muted-foreground">Comanda ta online a fost trimisă. Te contactăm pentru confirmare și pasul de plată.</p>
        <Link to="/produse" className="mt-8 inline-block bg-primary text-primary-foreground rounded-md px-6 py-3 text-sm">Continuă cumpărăturile</Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) {
      toast.error("Completează nume, telefon și adresă.");
      return;
    }
    if (totalQty === 0) {
      toast.error("Coșul este gol.");
      return;
    }
    setDone(true);
    clearCart();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-14">

      <div className="grid lg:grid-cols-[1fr_400px] gap-10">
      <div>
        <h1 className="font-display text-5xl text-center lg:text-left">Comandă online</h1>
        <p className="mt-2 text-muted-foreground text-center lg:text-left">{totalQty} produs{totalQty === 1 ? "" : "e"} în coș.</p>

        {itemsDetailed.length === 0 ? (
          <div className="mt-12 p-10 border border-dashed border-border rounded-xl text-center">
            <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Coșul este gol.</p>
            <Link to="/produse" className="mt-5 inline-block bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm">Vezi cutiuțele</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {itemsDetailed.map((it) => (
              <div key={it.id} className="flex gap-4 p-3 bg-card rounded-xl border border-border items-center">
                <img src={it.product.image} alt={it.product.name} className="w-24 h-24 rounded-lg object-contain bg-muted/40 p-2" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg leading-tight">{it.product.name}</div>
                  <div className="text-xs text-muted-foreground">{it.product.melody}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => setQty(it.id, Math.max(1, it.qty - 1))} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"><Minus className="w-3 h-3" /></button>
                    <span className="w-8 text-center text-sm">{it.qty}</span>
                    <button onClick={() => setQty(it.id, Math.min(MAX_QTY, it.qty + 1))} className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                <button aria-label={`Elimină ${it.product.name} din coș`} onClick={() => removeFromCart(it.id)} className="p-2 text-muted-foreground hover:text-destructive self-start"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display text-2xl mt-12 text-center lg:text-left">Date livrare</h2>
        <form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-3">
          <input aria-label="Nume complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nume complet" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm sm:col-span-2" />
          <input aria-label="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm" />
          <input aria-label="Localitate" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Localitate" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm" />
          <input aria-label="Adresă" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Adresă (stradă, nr, bl, ap)" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm sm:col-span-2" />
          <textarea aria-label="Mesaj cadou sau observații" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Mesaj cadou sau observații (opțional)" rows={3} className="bg-card border border-border rounded-md px-3 py-2.5 text-sm sm:col-span-2" />
          <button type="submit" className="sm:col-span-2 mt-2 wood-grain text-[color:var(--cream)] rounded-md py-3.5 font-medium shadow-warm hover:opacity-95">
            Trimite comanda · {totals.total} lei
          </button>
          <p className="sm:col-span-2 text-xs text-muted-foreground text-center inline-flex items-center justify-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Metodă de plată: doar online.</p>
        </form>
      </div>

      <aside className="lg:sticky lg:top-24 h-fit bg-card border border-border rounded-xl p-6">
        <h3 className="font-display text-2xl">Sumar</h3>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal ({totalQty} buc)</span><span>{totals.subtotal} lei</span></div>
          <div className="flex justify-between"><span>Transport</span><span className={totals.shipping === 0 ? "text-[color:var(--gold)] font-medium" : ""}>{totals.shipping === 0 ? "Gratuit" : `${totals.shipping} lei`}</span></div>
          <div className="flex justify-between"><span>Plată</span><span>Online</span></div>
          <div className="border-t border-border pt-3 flex justify-between font-display text-xl"><span>Total</span><span>{totals.total} lei</span></div>
        </div>
        <div className="mt-5 p-3 bg-[color:var(--gold)]/10 rounded-md text-xs">
          {totalQty === 0 && "🎁 Adaugă primul produs."}
          {totalQty === 1 && "✨ 1 produs: 119 lei + 25 lei transport."}
          {totalQty === 2 && "✨ 2 produse: 150 lei + 25 lei transport."}
          {totalQty >= 3 && "💫 75 lei/buc și transport gratuit de la 3 bucăți."}
        </div>
      </aside>
      </div>
    </div>
  );
}
