import type { CSSProperties, ReactNode } from "react";
import { productScene } from "@/lib/product-themes";
import type { Product } from "@/data/products";

const sceneLabel = {
  library: "Arhivă fermecată",
  winter: "Regat de iarnă",
  sunshine: "Lumină aurie",
  garden: "Grădină de poveste",
  autumn: "Noapte de toamnă",
  forest: "Pădure ancestrală",
  starlight: "Hartă stelară",
  ocean: "Orizont marin",
  galaxy: "Orbită îndepărtată",
} as const;

export function ProductWorld({ product, children }: { product: Product; children: ReactNode }) {
  const theme = productScene(product.id, product.scene);
  return (
    <div
      className={`product-world product-world--${theme.scene}`}
      data-product-slug={product.id}
      style={{ "--world-accent": theme.accent } as CSSProperties}
    >
      <div className="product-world-scenery" aria-hidden>
        <div className="product-world-backdrop" />
        <div className="product-world-depth">
          <i className="product-world-depth__rear" />
          <i className="product-world-depth__middle" />
          <i className="product-world-depth__front" />
        </div>
        <div className="product-world-orbit" />
        <div className="product-world-horizon" />
        <div className="product-world-grid" />
      </div>
      <div className="relative">
        <div className="product-world-intro">
          <span>{sceneLabel[theme.scene]}</span>
          <p>{theme.occasion}</p>
          <small>
            {product.category}
            {product.melody ? ` · ${product.melody}` : " · mecanism manual"}
          </small>
        </div>
        {children}
      </div>
    </div>
  );
}
