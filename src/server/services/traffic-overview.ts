type ImportedTrafficMetric = {
  source: string;
  property_id: string;
  metric: string;
  value: number;
  updated_at: string;
  first_day: string;
  last_day: string;
};

const storefrontActivity = `path NOT LIKE '/admin%' AND path NOT LIKE '/api/%'
  AND path != '/auth'`;

/** Observed storefront events and provider imports measure different things. */
export async function readTrafficOverview(db: D1Database, now = new Date()) {
  const endDay = now.toISOString().slice(0, 10);
  const startDay = new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const [imported, events, pages] = await Promise.all([
    db
      .prepare(
        `SELECT source,property_id,metric,SUM(value) AS value,MAX(imported_at) AS updated_at,
         MIN(day) AS first_day,MAX(day) AS last_day FROM traffic_daily_metrics
       WHERE day BETWEEN ?1 AND ?2 GROUP BY source,property_id,metric`,
      )
      .bind(startDay, endDay)
      .all<ImportedTrafficMetric>(),
    db
      .prepare(
        `SELECT event_name AS event,SUM(event_count) AS count,MAX(updated_at) AS lastEventAt
       FROM growth_event_daily WHERE event_day BETWEEN ?1 AND ?2 AND ${storefrontActivity}
         AND event_name IN ('page_view','product_view','add_to_cart','checkout_start')
       GROUP BY event_name`,
      )
      .bind(startDay, endDay)
      .all<{ event: string; count: number; lastEventAt: string }>(),
    db
      .prepare(
        `SELECT path,SUM(event_count) AS views FROM growth_event_daily
       WHERE event_day BETWEEN ?1 AND ?2 AND ${storefrontActivity} AND event_name='page_view'
       GROUP BY path ORDER BY views DESC,path LIMIT 5`,
      )
      .bind(startDay, endDay)
      .all<{ path: string; views: number }>(),
  ]);
  return {
    startDay,
    endDay,
    imported: imported.results,
    events: events.results,
    pages: pages.results,
  };
}
