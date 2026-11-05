/** Decorative only: cart state updates synchronously, independently of this animation. */
export function animateIntoCart(source: HTMLElement, image: string, quantity: number) {
  if (quantity <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden)
    return;
  const target =
    document.querySelector<HTMLElement>('[data-cart-target="floating"]') ??
    document.querySelector<HTMLElement>("[data-cart-target]");
  if (!target) return;
  const start = source.getBoundingClientRect(),
    end = target.getBoundingClientRect();
  const sprite = document.createElement("img");
  sprite.src = image;
  sprite.alt = "";
  sprite.setAttribute("aria-hidden", "true");
  sprite.className = "cart-flight";
  const x = start.left + start.width / 2 - 44,
    y = start.top + start.height / 2 - 44;
  Object.assign(sprite.style, { left: `${x}px`, top: `${y}px` });
  document.body.appendChild(sprite);
  const dx = end.left + end.width / 2 - x - 44,
    dy = end.top + end.height / 2 - y - 44;
  const animation = sprite.animate(
    [
      { transform: "perspective(650px) translate3d(0,0,0) rotateY(-18deg) scale(1)", opacity: 0.9 },
      {
        transform: `perspective(650px) translate3d(${dx * 0.4}px,${dy * 0.35 - 65}px,70px) rotateY(28deg) scale(.8)`,
        opacity: 1,
        offset: 0.4,
      },
      {
        transform: `perspective(650px) translate3d(${dx}px,${dy}px,0) rotateY(0) scale(.15)`,
        opacity: 0,
      },
    ],
    { duration: 700, easing: "cubic-bezier(.22,.61,.36,1)" },
  );
  void animation.finished.catch(() => {}).finally(() => sprite.remove());
  setTimeout(() => sprite.remove(), 1000);
}
