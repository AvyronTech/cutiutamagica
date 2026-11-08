import { afterEach, describe, expect, it, vi } from "vitest";
import { saveReviewWithPhoto, type SavedReview } from "./review-submission";
afterEach(() => vi.unstubAllGlobals());
describe("review and photo recovery", () => {
  it("retries only the photo after an acknowledged review, keeping exactly one create request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { id: "review-test" } }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: { uploaded: true } }));
    vi.stubGlobal("fetch", fetcher);
    let saved: SavedReview | null = null;
    const input = {
      draft: { productSlug: "hp-keeper", body: "Test local review" },
      photo: new File(["test"], "test.jpg", { type: "image/jpeg" }),
      onSaved: (review: SavedReview) => {
        saved = review;
      },
    };
    await expect(saveReviewWithPhoto({ ...input, saved: null })).rejects.toThrow(
      "Recenzia a fost salvată",
    );
    expect(saved).toEqual({ id: "review-test", productSlug: "hp-keeper" });
    await expect(saveReviewWithPhoto({ ...input, saved })).resolves.toEqual(saved);
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      "/api/v1/reviews",
      "/api/v1/reviews/review-test/photo",
      "/api/v1/reviews/review-test/photo",
    ]);
  });
  it("validates an unsupported photo before creating a review", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      saveReviewWithPhoto({
        draft: { productSlug: "hp-keeper" },
        photo: new File(["test"], "test.txt", { type: "text/plain" }),
        saved: null,
        onSaved: vi.fn(),
      }),
    ).rejects.toThrow("JPG, PNG sau WebP");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("can finish without a photo when a review is already saved", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const saved = { id: "review-test", productSlug: "hp-keeper" };
    await expect(
      saveReviewWithPhoto({ draft: { productSlug: "hp-keeper" }, saved, onSaved: vi.fn() }),
    ).resolves.toEqual(saved);
    expect(fetch).not.toHaveBeenCalled();
  });
});
