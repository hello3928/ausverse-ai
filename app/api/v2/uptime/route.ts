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
      const status =
        d.down > 0 ? "down" : d.degraded > 0 ? "degraded" : "operational";
      return { day, status: status as "operational" | "degraded" | "down", uptime: pct };
    });

    const uptimePct =
      totalChecks > 0
        ? Math.round((totalOp / totalChecks) * 10000) / 100
        : null;

    return {
      service: s.service,
      uptimePct,
      currentStatus: history.at(-1)?.status ?? "no_data",
      history,
    };
  });

  return NextResponse.json({ days, generated: now.toISOString(), uptime });
}
