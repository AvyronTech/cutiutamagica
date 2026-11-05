import type { ReactNode } from "react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";

export function PreviousPageLink({
  fallbackTo,
  fallbackLabel,
  ariaLabel,
  className,
  children,
}: {
  fallbackTo: string;
  fallbackLabel?: string;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const content = (
    <>
      {children}
      {fallbackLabel && (canGoBack ? "Înapoi" : fallbackLabel)}
    </>
  );

  if (canGoBack)
    return (
      <button
        type="button"
        onClick={() => router.history.back()}
        aria-label={ariaLabel}
        className={className}
      >
        {content}
      </button>
    );

  return (
    <Link to={fallbackTo} aria-label={ariaLabel} className={className}>
      {content}
    </Link>
  );
}
