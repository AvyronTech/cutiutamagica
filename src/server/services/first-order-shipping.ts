export async function firstOrderShippingEligible(
  db: D1Database,
  accountId: string | undefined,
  checkoutEmail?: string,
): Promise<boolean> {
  if (!accountId) return false;
  const row = await db
    .prepare(
      `
    SELECT a.id FROM review_accounts a
    WHERE a.id=?1 AND a.status='active'
      AND (?2 IS NULL OR lower(a.email)=?2)
      AND NOT EXISTS (SELECT 1 FROM first_order_shipping_redemptions r WHERE r.account_id=a.id)
      AND NOT EXISTS (
        SELECT 1 FROM orders o LEFT JOIN customers c ON c.id=o.customer_id
        WHERE lower(o.customer_email)=lower(a.email) OR c.account_subject=a.id OR c.id=a.customer_id
      )
  `,
    )
    .bind(accountId, checkoutEmail?.trim().toLowerCase() ?? null)
    .first();
  return Boolean(row);
}
