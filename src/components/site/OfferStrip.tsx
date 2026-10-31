import { useShop } from "@/store/shop";
export function OfferStrip() {
  const { promotion } = useShop();
  if (!promotion) return null;
  return (
    <div className="wood-grain text-[color:var(--cream)] text-xs md:text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center">
        <span>
          <strong className="text-[color:var(--gold)]">
            De la {promotion.minQuantity} cutiuțe
          </strong>
        </span>
        <span>
          <strong className="text-[color:var(--gold)]">
            {promotion.unitPrice} lei/cutiuță sau prețul individual mai mic
          </strong>
        </span>
      </div>
    </div>
  );
}
