import { describe, expect, it } from "vitest";
import {
  getMarketingOrdersAgentBuild,
  getMarketingOrdersSkillPackage,
} from "./marketing-orders-manifest";

describe("marketing orders agent build", () => {
  it("bundles the governed skill and its operational references", async () => {
    const manifest = await getMarketingOrdersAgentBuild();
    const bundle = await getMarketingOrdersSkillPackage();

    expect(manifest.agentCode).toBe("marketing-orders");
    expect(manifest.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.byteSize).toBeGreaterThan(10_000);
    expect(bundle.documents).toHaveLength(9);
    expect(bundle.documents[0].content).toContain("Cutiuța Magică");
    expect(
      bundle.documents.find((document) => document.path.endsWith("approval-orchestration.md"))
        ?.content,
    ).toContain("minimum două aprobări");
    expect(
      bundle.documents.find((document) => document.path.endsWith("content-conversion-playbook.md"))
        ?.content,
    ).toContain("Story complet");
    expect(
      bundle.documents.find((document) => document.path.endsWith("marketplace-operations.md"))
        ?.content,
    ).toContain("Vinted Pro nu este disponibil în România");
    expect(
      bundle.documents.find((document) => document.path.endsWith("platform-native-production.md"))
        ?.content,
    ).toContain("maximum 20 de publicări efective");
    expect(bundle.controlPlane).toBe("cutiuta_magic_platform");
    expect(bundle.externalEffects).toBe("approval_required");
  });
});
