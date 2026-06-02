
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/data/products";


type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  ctaLabel?: string;
  ctaTo?: string;
  secondaryCta?: { label: string; to: string };
};

const arrowClasses =
  "h-12 w-12 md:h-14 md:w-14 rounded-full bg-[color:var(--cream)] backdrop-blur border-2 border-[color:var(--gold)]/60 text-[color:var(--wood-dark)] shadow-warm hover:bg-[color:var(--gold)] hover:text-[color:var(--wood-dark)] hover:scale-110 active:scale-95 transition-all [&_svg]:size-6";

export function ProductCarouselSection({
  eyebrow,
  title,
  description,
  products,
  ctaLabel = "Descoperă și alte obiecte magice",
  ctaTo = "/produse",
  secondaryCta,
}: Props) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8 md:py-10">
      <div className="text-center mb-6 md:mb-8">
        {eyebrow && (
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">{eyebrow}</div>
        )}
        <h2 className="font-display text-3xl md:text-5xl mt-1">{title}</h2>
        {description && (
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">{description}</p>
        )}
        {secondaryCta && (
          <div className="mt-5">
            <Link
              to={secondaryCta.to}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium wood-grain text-[color:var(--cream)] shadow-warm hover:opacity-95 transition"
            >
              <Sparkles className="w-4 h-4 text-[color:var(--gold)]" />
              {secondaryCta.label}
            </Link>
          </div>
        )}
      </div>

      <Carousel
        opts={{ align: "start", loop: true, dragFree: true }}
        plugins={[
          AutoScroll({
            speed: 0.8,
            startDelay: 600,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
          }),
        ]}
        className="relative px-2 md:px-16"
      >

        <CarouselContent className="-ml-3 md:-ml-5">
          {products.map((p, i) => (
            <CarouselItem
              key={p.id}
              className="pl-3 md:pl-5 basis-[82%] sm:basis-[60%] md:basis-[46%] lg:basis-[32%]"
            >
              <ProductCard product={p} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className={`hidden md:flex -left-1 ${arrowClasses}`} />
        <CarouselNext className={`hidden md:flex -right-1 ${arrowClasses}`} />
        <div className="md:hidden mt-5 flex items-center justify-center gap-8">
          <CarouselPrevious className={`static translate-y-0 ${arrowClasses}`} />
          <CarouselNext className={`static translate-y-0 ${arrowClasses}`} />
        </div>
      </Carousel>

      <div className="mt-7 flex justify-center">
        <Link
          to={ctaTo}
          className="group inline-flex items-center gap-1.5 text-sm text-[color:var(--wood-dark)]/75 hover:text-[color:var(--wood-dark)] border-b border-[color:var(--gold)]/40 hover:border-[color:var(--gold)] pb-0.5 transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
