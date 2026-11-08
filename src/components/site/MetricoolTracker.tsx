import { useEffect, useRef } from "react";
import { analyticsAllowed, subscribeConsent } from "@/lib/cookie-consent";
import { metricoolPageviewUrl } from "@/lib/metricool-pageview";

export function MetricoolTracker({ pathname }: { pathname: string }) {
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    let pixel: HTMLImageElement | null = null;
    const update = () => {
      if (!analyticsAllowed()) {
        lastPath.current = null;
        if (pixel) {
          pixel.src = "";
          pixel = null;
        }
        return;
      }
      if (lastPath.current === pathname) return;
      const url = metricoolPageviewUrl(
        window.location.href,
        document.referrer,
        window.innerWidth,
        window.innerHeight,
      );
      if (!url) return;
      lastPath.current = pathname;
      pixel = new Image(1, 1);
      pixel.referrerPolicy = "no-referrer";
      pixel.src = url;
    };
    update();
    const unsubscribe = subscribeConsent(update);
    return () => {
      unsubscribe();
      if (pixel) pixel.src = "";
    };
  }, [pathname]);
  return null;
}
