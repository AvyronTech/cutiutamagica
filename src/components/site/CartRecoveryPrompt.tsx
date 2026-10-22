import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, ShoppingBag, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/site/ProductImage";
import { useShop } from "@/store/shop";

export function CartRecoveryPrompt({ pathname }: { pathname: string }) {
  const { hydrated, itemsDetailed, recoveryStage, dismissCartRecovery, saveForGiftList } =
    useShop();
  const [heroStatus, setHeroStatus] = useState({ pathname, past: pathname !== "/" });
  const [interacting, setInteracting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setHeroStatus({ pathname, past: true });
      return;
    }
    const hero = document.getElementById("inceput");
    if (!hero) {
      setHeroStatus({ pathname, past: false });
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setHeroStatus({
        pathname,
        past: !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      });
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  const visible =
    hydrated &&
    recoveryStage !== null &&
    (pathname !== "/" || (heroStatus.pathname === pathname && heroStatus.past)) &&
    pathname !== "/comanda" &&
    pathname !== "/auth" &&
    !pathname.startsWith("/admin");

  useEffect(() => {
    if (!visible || !recoveryStage || interacting || leaving) return;
    const timeout = window.setTimeout(() => setLeaving(true), 4300);
    return () => window.clearTimeout(timeout);
  }, [visible, recoveryStage, interacting, leaving]);

  useEffect(() => {
    if (!visible || !recoveryStage || !leaving) return;
    const timeout = window.setTimeout(() => {
      dismissCartRecovery(recoveryStage);
      setLeaving(false);
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [visible, recoveryStage, leaving, dismissCartRecovery]);

  if (!visible) return null;

  const item = [...itemsDetailed].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))[0];
  if (!item) return null;

  const isGiftPrompt = recoveryStage === "gift-list";

  return (
    <aside
      className={`cart-recovery${leaving ? " cart-recovery--leaving" : ""}`}
      aria-live="polite"
      aria-label="Poveste salvată în coș"
      onMouseEnter={() => {
        setInteracting(true);
        setLeaving(false);
      }}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => {
        setInteracting(true);
        setLeaving(false);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
    >
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
        </div>
      </div>
      <button
        type="button"
        className="cart-recovery__close"
        aria-label="Închide mesajul"
        onClick={() => setLeaving(true)}
      >
        <X size={15} />
      </button>
    </aside>
  );
}
