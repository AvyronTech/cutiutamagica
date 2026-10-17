import { Link } from "@tanstack/react-router";
import { Bookmark, ShoppingBag, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/site/ProductImage";
import { useShop } from "@/store/shop";

export function CartRecoveryPrompt({ pathname }: { pathname: string }) {
  const { hydrated, itemsDetailed, recoveryStage, dismissCartRecovery, saveForGiftList } =
    useShop();

  if (
    !hydrated ||
    !recoveryStage ||
    pathname === "/comanda" ||
    pathname === "/auth" ||
    pathname.startsWith("/admin")
  )
    return null;

  const item = [...itemsDetailed].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))[0];
  if (!item) return null;

  const isGiftPrompt = recoveryStage === "gift-list";

  return (
    <aside className="cart-recovery" aria-live="polite" aria-label="Poveste salvată în coș">
      <div className="cart-recovery__image">
        <ProductImage
          src={item.product.image}
          alt=""
          sizes="72px"
          className="h-full w-full object-cover"
        />
        <span aria-hidden>{isGiftPrompt ? <Bookmark size={13} /> : <Sparkles size={13} />}</span>
      </div>
      <div className="cart-recovery__copy">
        <p>{isGiftPrompt ? "Păstrăm magia aproape" : "Cutiuța aleasă de tine"}</p>
        <strong>
          {isGiftPrompt
            ? "Vrei să o păstrăm în lista ta de cadouri?"
            : "Povestea ta te mai așteaptă ✨"}
        </strong>
        <small>{item.product.name}</small>
        <div className="cart-recovery__actions">
          {isGiftPrompt ? (
            <button
              type="button"
              onClick={() => {
                saveForGiftList(item.id);
                toast.success("Cutiuța te așteaptă în lista de cadouri.", {
                  description: item.product.name,
                  duration: 3000,
                });
              }}
            >
              <Bookmark size={13} /> Păstrează în listă
            </button>
          ) : (
            <Link to="/comanda" onClick={() => dismissCartRecovery("story")}>
              <ShoppingBag size={13} /> Continuă povestea
            </Link>
          )}
          <button
            type="button"
            className="cart-recovery__later"
            onClick={() => dismissCartRecovery(recoveryStage)}
          >
            Mai târziu
          </button>
        </div>
      </div>
      <button
        type="button"
        className="cart-recovery__close"
        aria-label="Închide mesajul"
        onClick={() => dismissCartRecovery(recoveryStage)}
      >
        <X size={15} />
      </button>
    </aside>
  );
}
