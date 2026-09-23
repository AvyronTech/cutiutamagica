import type { CSSProperties, ReactNode } from "react";
import { productScene } from "@/lib/product-themes";
import type { Product } from "@/data/products";
import { SceneAtmosphere } from "./SceneAtmosphere";
export function ProductWorld({ product, children }: { product: Product; children: ReactNode }) {
  const theme = productScene(product.id, product.scene);
  return (
    <div
      className={`product-world product-world--${theme.scene}`}
      style={{ "--world-accent": theme.accent } as CSSProperties}
    >
      <div className="product-world-scenery" aria-hidden>
        <div className="product-world-orbit" />
        <div className="product-world-horizon" />
        <SceneAtmosphere />
      </div>
      <div className="relative">
        <div className="product-world-intro">
          <span>O cutiuță. O lume a ei.</span>
          <p>{theme.occasion}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
