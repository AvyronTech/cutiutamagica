export function matchesSocialDraftDestination(
  account: { provider: string; accountType: string } | null,
  platform: string,
): boolean {
  return Boolean(
    account &&
    account.accountType !== "profile" &&
    ["facebook", "instagram", "tiktok"].includes(account.provider) &&
    account.provider === platform,
  );
}
