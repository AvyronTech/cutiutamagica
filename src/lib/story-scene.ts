import { z } from "zod";

export const storySceneSettingsBaseSchema = z.object({
  assetId: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  rightsConfirmed: z.boolean(),
  expectedVersion: z.number().int().positive(),
});
export const storySceneSettingsSchema = storySceneSettingsBaseSchema.refine(
  (v) => !v.enabled || (v.assetId && v.rightsConfirmed),
  {
    message: "Alege fragmentul și confirmă drepturile de difuzare înainte de activare.",
  },
);
export type StoryScenePublic = { audio: { url: string; title: string; duration: number } | null };
export type StorySceneAdmin = {
  developmentPreview?: boolean;
  settings: {
    assetId: string | null;
    title: string;
    enabled: boolean;
    rightsConfirmed: boolean;
    version: number;
  };
  assets: Array<{ id: string; duration: number; createdAt: string }>;
};
