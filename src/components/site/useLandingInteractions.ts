import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { isIntentionalPress } from "@/lib/landing-motion";

export function useLandingInteractions(root: RefObject<HTMLDivElement | null>) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = root.current;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (!node || reduced || saveData) return;
    const revealNodes = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.remove("reveal-pending");
            entry.target.classList.add("reveal-arrived");
            reveal.unobserve(entry.target);
          }
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    revealNodes.forEach((item) => {
      // Keep initially visible content available immediately, including on a restored scroll position.
      if (item.getBoundingClientRect().top > innerHeight * 0.9) {
        item.classList.add("reveal-pending");
        reveal.observe(item);
      }
    });
    const hero = node.querySelector(".magic-hero");
    let heroVisible = false;
    const sunlight = () => node.classList.toggle("hero-sunlit", heroVisible && !document.hidden);
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      sunlight();
    });
    if (hero) heroObserver.observe(hero);
    document.addEventListener("visibilitychange", sunlight);

    let card: HTMLElement | null = null,
      frame = 0,
      x = 0,
      y = 0;
    let down: { x: number; y: number } | null = null;
    const effects = new Set<HTMLElement>();
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const clearCard = () => {
      card?.classList.remove("magic-hover");
      card = null;
    };
    const move = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType !== "mouse") return;
      const target = (event.target as Element).closest<HTMLElement>("[data-magic-card]");
      if (target !== card) {
        clearCard();
        card = target;
        card?.classList.add("magic-hover");
      }
      if (!card) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!card || document.hidden) return;
          const bounds = card.getBoundingClientRect();
          card.style.setProperty(
            "--magic-x",
            `${Math.max(0, Math.min(100, ((x - bounds.left) / bounds.width) * 100))}%`,
          );
          card.style.setProperty(
            "--magic-y",
            `${Math.max(0, Math.min(100, ((y - bounds.top) / bounds.height) * 100))}%`,
          );
        });
    };
    const press = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const cancel = () => {
      down = null;
      clearCard();
    };
    const click = (event: MouseEvent) => {
      if (
        document.hidden ||
        event.defaultPrevented ||
        event.button !== 0 ||
        !isIntentionalPress(down, { x: event.clientX, y: event.clientY }, event.detail === 0)
      )
        return;
      const target = (event.target as Element).closest<HTMLElement>("button,a[href],summary");
      if (
        !target ||
        !node.contains(target) ||
        target.matches(":disabled,[aria-disabled='true']") ||
        target.closest("[inert]")
      )
        return;
      if (effects.size >= 4) return;
      const bounds = target.getBoundingClientRect();
      const region = target.closest<HTMLElement>("[data-world]")?.dataset.world ?? "story";
      const effect = document.createElement("span");
      effect.className = "magic-click-bloom";
      effect.dataset.theme = region;
      effect.setAttribute("aria-hidden", "true");
      effect.style.left = `${event.detail === 0 ? bounds.left + bounds.width / 2 : event.clientX}px`;
      effect.style.top = `${event.detail === 0 ? bounds.top + bounds.height / 2 : event.clientY}px`;
      effect.style.setProperty(
        "--magic-tint",
        getComputedStyle(target).getPropertyValue("--magic-tint") || "225 189 126",
      );
      document.body.appendChild(effect);
      effects.add(effect);
      const animation = effect.animate(
        [
          { transform: "translate(-50%,-50%) scale(.45) rotate(-8deg)", opacity: 0.7 },
          { transform: "translate(-50%,-50%) scale(1.5) rotate(12deg)", opacity: 0 },
        ],
        { duration: region === "emotion" ? 560 : 420, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      void animation.finished
        .catch(() => {})
        .finally(() => {
          effects.delete(effect);
          effect.remove();
        });
      down = null;
    };
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", clearCard);
    node.addEventListener("pointerdown", press, { passive: true });
    node.addEventListener("pointercancel", cancel);
    node.addEventListener("click", click);
    return () => {
      reveal.disconnect();
      heroObserver.disconnect();
      cancelAnimationFrame(frame);
      clearCard();
      document.removeEventListener("visibilitychange", sunlight);
      node.classList.remove("hero-sunlit");
      revealNodes.forEach((item) => item.classList.remove("reveal-pending", "reveal-arrived"));
      effects.forEach((effect) => {
        effect.getAnimations().forEach((a) => a.cancel());
        effect.remove();
      });
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", clearCard);
      node.removeEventListener("pointerdown", press);
      node.removeEventListener("pointercancel", cancel);
      node.removeEventListener("click", click);
    };
  }, [root, reduced]);
}
