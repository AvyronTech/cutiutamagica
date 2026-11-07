export interface SocialRelationshipCandidate {
  username: string;
  profileUrl: string;
  followsBack: boolean;
  engagementRate: number | null;
  lastInteractionAt: string | null;
  protected: boolean;
}

export interface RankedSocialCandidate extends SocialRelationshipCandidate {
  score: number;
  reasons: string[];
}

export function rankUnfollowCandidates(
  accounts: SocialRelationshipCandidate[],
  now = Date.now(),
): RankedSocialCandidate[] {
  const unique = new Map<string, SocialRelationshipCandidate>();
  for (const account of accounts) {
    const key = account.username.trim().toLocaleLowerCase("ro-RO");
    if (key && !unique.has(key)) unique.set(key, account);
  }

  return [...unique.values()]
    .filter((account) => !account.followsBack && !account.protected)
    .map((account) => {
      const reasons = ["Nu urmărește contul înapoi"];
      let score = 60;
      if (account.engagementRate == null || account.engagementRate < 0.5) {
        score += 20;
        reasons.push("Interacțiune foarte redusă sau necunoscută");
      }
      const interactionTime = account.lastInteractionAt
        ? Date.parse(account.lastInteractionAt)
        : Number.NaN;
      if (!Number.isFinite(interactionTime) || now - interactionTime > 90 * 86_400_000) {
        score += 15;
        reasons.push("Fără interacțiuni recente");
      }
      return { ...account, score: Math.min(score, 100), reasons };
    })
    .sort((left, right) => right.score - left.score || left.username.localeCompare(right.username))
    .slice(0, 50);
}
