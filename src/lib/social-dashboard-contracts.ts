import { z } from "zod";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    "Data nu este validă.",
  );
const count = z.number().int().nonnegative().safe().nullable();

export const socialSnapshotSchema = z
  .object({
    network: z.enum(["facebook", "instagram", "tiktok"]),
    periodStart: day,
    periodEnd: day,
    followersObservedOn: day.nullable(),
    followers: count,
    posts: count,
    views: count,
    interactions: count,
    reels: count,
  })
  .superRefine((value, context) => {
    const days =
      (Date.parse(`${value.periodEnd}T00:00:00Z`) - Date.parse(`${value.periodStart}T00:00:00Z`)) /
      86_400_000;
    if (days < 0 || days > 29) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Intervalul trebuie să aibă maximum 30 de zile.",
      });
    }
    if ((value.followers === null) !== (value.followersObservedOn === null)) {
      context.addIssue({
        code: "custom",
        path: ["followersObservedOn"],
        message: "Alege data la care a fost observat numărul de urmăritori.",
      });
    }
    if (
      value.followersObservedOn &&
      (value.followersObservedOn < value.periodStart || value.followersObservedOn > value.periodEnd)
    ) {
      context.addIssue({
        code: "custom",
        path: ["followersObservedOn"],
        message: "Data urmăritorilor trebuie să fie în intervalul raportului.",
      });
    }
    if (
      [value.followers, value.posts, value.views, value.interactions, value.reels].every(
        (metric) => metric === null,
      )
    ) {
      context.addIssue({ code: "custom", message: "Completează cel puțin o cifră din raport." });
    }
  });

export type SocialSnapshotInput = z.infer<typeof socialSnapshotSchema>;
