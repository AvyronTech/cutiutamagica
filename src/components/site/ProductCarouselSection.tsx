import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/data/products";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
};

export function ProductCarouselSection({ eyebrow, title, description, products }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14 md:py-20">
      <div className="text-center mb-8 md:mb-10">
        {eyebrow && (
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">{eyebrow}</div>
        )}
        <h2 className="font-display text-3xl md:text-5xl mt-1">{title}</h2>
        {description && (
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">{description}</p>
        )}
      </div>

      <Carousel
        opts={{ align: "start", loop: products.length > 3 }}
        className="relative px-2 md:px-12"
      >
        <CarouselContent className="-ml-3 md:-ml-5">
          {products.map((p, i) => (
            <CarouselItem
              key={p.id}
              className="pl-3 md:pl-5 basis-full md:basis-1/2 lg:basis-1/3"
            >
              <ProductCard product={p} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-2 md:-left-4 bg-card border-border shadow-soft" />
        <CarouselNext className="hidden md:flex -right-2 md:-right-4 bg-card border-border shadow-soft" />
        <div className="md:hidden mt-4 flex items-center justify-center gap-4">
          <CarouselPrevious className="static translate-y-0 bg-card border-border shadow-soft" />
          <CarouselNext className="static translate-y-0 bg-card border-border shadow-soft" />
        </div>
      </Carousel>
    </section>
  );
}
