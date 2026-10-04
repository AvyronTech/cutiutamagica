import { BadgeCheck, Quote } from "lucide-react";
import { reviewCountries, reviewSources, type PublicReview } from "@/lib/reviews";

function countryFlag(code: string) {
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
}
export function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" role="img" aria-label={`${rating} din 5 stele`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden className={i <= rating ? "filled" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}
export function ReviewCard({
  review,
  compact = false,
}: {
  review: PublicReview;
  compact?: boolean;
}) {
  return (
    <article
      className={`review-card ${compact ? "review-card-compact" : ""}`}
      lang={review.language}
    >
      <div className="review-card-top">
        <div>
          <strong>{review.displayName}</strong>
          {review.sourceUrl && (
            <span className="review-source-proof">
              <BadgeCheck aria-hidden /> Sursă verificabilă
            </span>
          )}
        </div>
        <ReviewStars rating={review.rating} />
      </div>
      <p className="review-product-name">{review.productName}</p>
      <blockquote>
        <Quote aria-hidden />
        {review.body}
      </blockquote>
      <footer>
        <div>
          {review.sourceUrl ? (
            <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer">
              Preluată din {reviewSources[review.source]} ↗
            </a>
          ) : (
            <span>
              {review.sourceUrl ? "Preluată din" : "Publicată pe"} {reviewSources[review.source]}
            </span>
          )}
        </div>
        <div className="review-origin">
          {review.countryCode && (
            <span title={reviewCountries[review.countryCode]}>
              {countryFlag(review.countryCode)} {review.countryCode}
            </span>
          )}
          <span>{review.language.toUpperCase()}</span>
        </div>
      </footer>
    </article>
  );
}
