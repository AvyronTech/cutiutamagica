import skill from "../../../skills/cutiuta-magica-dropshipping/SKILL.md?raw";
import operations from "../../../skills/cutiuta-magica-dropshipping/references/operations.md?raw";
import { digestHex } from "@/server/integrations/provider-runtime";
export async function getDropshippingSkillPackage() {
  const documents = [
    { path: "SKILL.md", content: skill },
    { path: "references/operations.md", content: operations },
  ];
  return {
    agentCode: "dropshipping",
    version: "2026.11.05.1",
    executor: "Codex · profilul Opera dedicat Cutiuța Magică",
    externalEffects: "exact_revision_approval",
    hash: await digestHex("SHA-256", JSON.stringify(documents)),
    documents,
  };
}
