import { reviewSources, type PublicReview } from "@/lib/reviews";
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
        <strong>{review.displayName}</strong>
        <ReviewStars rating={review.rating} />
      </div>
      <p className="review-product-name">{review.productName}</p>
      <blockquote>{review.body}</blockquote>
      <footer>
        {review.sourceUrl && !compact ? (
          <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer">
            Preluată din {reviewSources[review.source]} ↗
          </a>
        ) : (
          <span>
            {review.sourceUrl ? "Preluată din" : "Publicată pe"} {reviewSources[review.source]}
          </span>
        )}
        <span>{review.language.toUpperCase()}</span>
      </footer>
    </article>
  );
}
