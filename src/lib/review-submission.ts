import { reviewApi } from "./reviews";
import { storefrontRequest } from "./storefront-request";
export type SavedReview = { id: string; productSlug: string };

/** Keep the acknowledged review ID before starting the separately retryable photo upload. */
export async function saveReviewWithPhoto({
  draft,
  photo,
  saved,
  onSaved,
}: {
  draft: Record<string, unknown> & { productSlug: string };
  photo?: File;
  saved: SavedReview | null;
  onSaved: (review: SavedReview) => void;
}): Promise<SavedReview> {
  if (
    photo &&
    photo.size > 0 &&
    (photo.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type))
  )
    throw new Error("Alege o fotografie JPG, PNG sau WebP de maximum 5 MB.");
  const review = saved ?? {
    ...(await reviewApi<{ id: string }>("/api/v1/reviews", {
      method: "POST",
      body: JSON.stringify(draft),
    })),
    productSlug: draft.productSlug,
  };
  onSaved(review);
  if (photo && photo.size > 0) {
    const upload = new FormData();
    upload.set("photo", photo);
    const response = await storefrontRequest(`/api/v1/reviews/${review.id}/photo`, {
      method: "POST",
      credentials: "same-origin",
      body: upload,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(
        payload?.error?.message ||
          "Recenzia a fost salvată, dar fotografia nu a putut fi încărcată.",
      );
    }
  }
  return review;
}
