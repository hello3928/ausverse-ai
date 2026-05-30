import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface DayRow {
  day: string;
  total: number;
  operational: number;
  degraded: number;
  down: number;
}

export async function GET(req: NextRequest) {
  const days = Math.min(
    Number(req.nextUrl.searchParams.get("days") ?? 90),
    90
  );

  const db = getDb();

  // Get all services that have been logged
  const services = db
    .prepare("SELECT DISTINCT service FROM uptime_log ORDER BY service")
    .all() as { service: string }[];

  // Get daily aggregation per service
  const rows = db
    .prepare(
      `SELECT
        service,
        date(checked_at) as day,
        count(*) as total,
        sum(case when status = 'operational' then 1 else 0 end) as operational,
        sum(case when status = 'degraded' then 1 else 0 end) as degraded,
        sum(case when status = 'down' then 1 else 0 end) as down
      FROM uptime_log
      WHERE checked_at >= datetime('now', ? || ' days')
      GROUP BY service, date(checked_at)
      ORDER BY service, day`
    )
    .all(`-${days}`) as (DayRow & { service: string })[];

  // Get most recent check per service for current status
  const latestChecks = db
    .prepare(
      `SELECT service, status FROM uptime_log
       WHERE rowid IN (
         SELECT MAX(rowid) FROM uptime_log GROUP BY service
       )`
    )
    .all() as { service: string; status: string }[];

  const latestStatusMap: Record<string, string> = {};
  for (const lc of latestChecks) {
    latestStatusMap[lc.service] = lc.status;
  }

  // Build lookup: service -> { day -> stats }
  const lookup: Record<string, Record<string, DayRow>> = {};
  for (const row of rows) {
    if (!lookup[row.service]) lookup[row.service] = {};
    lookup[row.service][row.day] = row;
  }

  // Generate all days in range
  const allDays: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    allDays.push(d.toISOString().split("T")[0]);
  }

  // Build response per service
  const uptime = services.map((s) => {
    const serviceDays = lookup[s.service] || {};
    let totalChecks = 0;
    let totalOp = 0;

    const history = allDays.map((day) => {
      const d = serviceDays[day];
      if (!d) return { day, status: "no_data" as const, uptime: null };

      totalChecks += d.total;
      totalOp += d.operational;

      const pct = Math.round((d.operational / d.total) * 10000) / 100;

      // Determine day status:
      // - all down = "down" (red)
      // - mix of down + operational = "partial" (amber — temporary downtime)
      // - all degraded or mix = "degraded" (amber)
      // - all operational = "operational" (green)
      let status: string;
      if (d.down > 0 && d.operational === 0) {
        status = "down";
      } else if (d.down > 0 && d.operational > 0) {
        status = "partial";
      } else if (d.degraded > 0) {
        status = "degraded";
      } else {
        status = "operational";
      }

      return { day, status, uptime: pct };
    });

    const uptimePct =
      totalChecks > 0
        ? Math.round((totalOp / totalChecks) * 10000) / 100
        : null;

    // Current status = most recent individual check, not today's aggregate
    const currentStatus = latestStatusMap[s.service] ?? "no_data";

    return {
      service: s.service,
      uptimePct,
      currentStatus,
      history,
    };
  });

  return NextResponse.json({ days, generated: now.toISOString(), uptime });
}
