import { z } from "zod";
export const sceneKeys = [
  "library",
  "winter",
  "sunshine",
  "garden",
  "autumn",
  "forest",
  "starlight",
  "ocean",
  "galaxy",
] as const;
export const productSceneSchema = z.object({
  scene: z.enum(sceneKeys),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  occasion: z.string().trim().max(180),
});
export type ProductScene = z.infer<typeof productSceneSchema>;
const defaults: Record<string, ProductScene> = {
  "hp-keeper": {
    scene: "library",
    accent: "#d9b571",
    occasion: "Pentru cel care păstrează magia în lucrurile mici.",
  },
  "hp-always": {
    scene: "starlight",
    accent: "#b9a4e8",
    occasion: "Pentru o promisiune care rămâne. Mereu.",
  },
  "got-winter": {
    scene: "winter",
    accent: "#a5cbdc",
    occasion: "O melodie pentru poveștile care ne țin aproape.",
  },
  sunshine: {
    scene: "sunshine",
    accent: "#ecc26c",
    occasion: "Pentru omul care îți luminează ziua.",
  },
  kitten: {
    scene: "garden",
    accent: "#ddb1b8",
    occasion: "Un gest mic, pentru o afecțiune cât o lume.",
  },
  halloween: {
    scene: "autumn",
    accent: "#e6a36d",
    occasion: "Un dar pentru sufletele cu imaginație jucăușă.",
  },
  "lotr-rings": {
    scene: "forest",
    accent: "#b9cb8f",
    occasion: "Pentru prietenul cu care ai porni în orice aventură.",
  },
  fairy: {
    scene: "garden",
    accent: "#c2b3e2",
    occasion: "Pentru cine încă se oprește să vadă frumusețea.",
  },
  pirates: {
    scene: "ocean",
    accent: "#86c5cc",
    occasion: "Pentru aventurierul care își urmează propria melodie.",
  },
  "starwars-dad": {
    scene: "galaxy",
    accent: "#9faeeb",
    occasion: "Pentru tata. Un univers de amintiri, într-o cutiuță.",
  },
};
export function productScene(slug: string, override?: unknown): ProductScene {
  const parsed = productSceneSchema.safeParse(override);
  return parsed.success ? parsed.data : (defaults[slug] ?? defaults["hp-keeper"]);
}
