import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Check } from "lucide-react";
import { useShop } from "@/store/shop";
import { calcTotals } from "@/data/products";
import { toast } from "sonner";

export const Route = createFileRoute("/comanda")({
  component: OrderPage,
  head: () => ({ meta: [{ title: "Comandă online — Cutiuța Magică" }, { name: "description", content: "Finalizează comanda online. Transport 25 lei pentru 1-2 produse și gratuit de la 3 bucăți." }] }),
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
        <h1 className="font-display text-4xl mt-6">Mulțumim, {form.name.split(" ")[0] || "magician"}!</h1>
        <p className="mt-3 text-muted-foreground">Comanda ta online a fost trimisă. Următorul pas este confirmarea și plata securizată.</p>
        <Link to="/produse" className="mt-8 inline-block bg-primary text-primary-foreground rounded-md px-6 py-3 text-sm">Continuă cumpărăturile</Link>
      </div>
    );
  }
...
      <aside className="lg:sticky lg:top-24 h-fit bg-card border border-border rounded-xl p-6">
        <h3 className="font-display text-2xl">Sumar</h3>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal ({totalQty} buc)</span><span>{totals.subtotal} lei</span></div>
          <div className="flex justify-between">
            <span>Transport</span>
            <span className={totals.shipping === 0 ? "text-[color:var(--gold)] font-medium" : ""}>{totals.shipping === 0 ? "Gratuit" : `${totals.shipping} lei`}</span>
          </div>
          <div className="flex justify-between"><span>Plată</span><span>Online</span></div>
          <div className="border-t border-border pt-3 flex justify-between font-display text-xl">
            <span>Total</span><span>{totals.total} lei</span>
          </div>
        </div>
        <div className="mt-5 p-3 bg-[color:var(--gold)]/10 rounded-md text-xs">
          {totalQty === 0 && "🎁 Adaugă primul produs."}
          {totalQty === 1 && "✨ 1 produs: 89 lei + 25 lei transport."}
          {totalQty === 2 && "✨ 2 produse: 150 lei + 25 lei transport."}
          {totalQty >= 3 && "💫 75 lei/buc și transport gratuit de la 3 bucăți."}
        </div>
      </aside>
    </div>
  );
}
