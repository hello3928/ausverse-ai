"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import PageShell from "@/components/layout/PageShell";

interface Check {
  name: string;
  status: "operational" | "degraded" | "down";
  detail: string;
  latency?: number;
}
interface StatusData {
  overall: "operational" | "degraded" | "down";
  checks: Check[];
  timestamp: string;
}

interface DayHistory {
  day: string;
  status: "operational" | "degraded" | "down" | "no_data";
  uptime: number | null;
}
interface ServiceUptime {
  service: string;
  uptimePct: number | null;
  currentStatus: string;
  history: DayHistory[];
}
interface UptimeData {
  days: number;
  uptime: ServiceUptime[];
}

const STATUS_COLOR: Record<string, string> = {
  operational: "var(--success)",
  degraded: "var(--warning)",
  down: "var(--danger)",
};

const STATUS_LABEL: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Offline",
};

const BAR_COLOR: Record<string, string> = {
  operational: "var(--success)",
  degraded: "var(--warning)",
  down: "var(--danger)",
  no_data: "var(--border)",
};

function UptimeBar({ service }: { service: ServiceUptime }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const statusLabel = STATUS_LABEL[service.currentStatus] ?? "No data";
  const statusColor = STATUS_COLOR[service.currentStatus] ?? "var(--text-muted)";

  return (
    <div style={{ padding: "16px 20px" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {service.service}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: statusColor,
          }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div
        ref={barRef}
        className="flex gap-px"
        style={{ height: 32, borderRadius: 4, overflow: "hidden", position: "relative" }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {service.history.map((day, i) => (
          <div
            key={day.day}
            onMouseEnter={() => setHoveredIdx(i)}
            style={{
              flex: 1,
              background: BAR_COLOR[day.status],
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1,
              transition: "opacity 0.15s",
              cursor: "pointer",
              borderRadius: i === 0 ? "3px 0 0 3px" : i === service.history.length - 1 ? "0 3px 3px 0" : 0,
            }}
          />
        ))}

        {hoveredIdx !== null && (() => {
          const day = service.history[hoveredIdx];
          const date = new Date(day.day + "T00:00:00");
          const label = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
          const pct = day.uptime !== null ? `${day.uptime}%` : "No data";

          return (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: `${(hoveredIdx / service.history.length) * 100}%`,
                transform: "translateX(-50%)",
                background: "var(--glass)",
                border: "1px solid var(--glass-border)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 11,
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 10,
                backdropFilter: "blur(12px)",
              }}
            >
              <span style={{ fontWeight: 600 }}>{label}</span>
              {" — "}
              <span style={{ color: BAR_COLOR[day.status] }}>{pct}</span>
            </div>
          );
        })()}
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {service.history.length} days ago
        </span>
        {service.uptimePct !== null && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {service.uptimePct}% uptime
          </span>
        )}
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Today</span>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const refreshBtnRef = useRef<HTMLButtonElement>(null);

  const handleBtnMouseMove = useCallback((e: React.MouseEvent) => {
    const btn = refreshBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, uptimeRes] = await Promise.all([
        fetch("/api/v1/status"),
        fetch("/api/v2/uptime?days=90"),
      ]);
      const statusJson = await statusRes.json();
      setData(statusJson);
      const uptimeJson = await uptimeRes.json();
      setUptimeData(uptimeJson);
    } catch {}
    setLoading(false);
    setCountdown(30);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { refresh(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const affected = data ? data.checks.filter((c) => c.status !== "operational").length : 0;
  const overallLabel = !data ? "Checking..."
    : data.overall === "operational" ? "All systems operational"
    : `${affected} service${affected !== 1 ? "s" : ""} ${data.overall === "down" ? "offline" : "degraded"}`;

  return (
    <PageShell title="Status" actions={
      <>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {loading ? "checking..." : `${countdown}s`}
        </span>
        <button ref={refreshBtnRef} onClick={refresh} disabled={loading} onMouseMove={handleBtnMouseMove}
          className="btn-glow-white"
          style={{
            fontSize: 12, color: "var(--text-tertiary)", padding: "6px 12px",
            border: "1px solid var(--glass-border)", borderRadius: 6,
            background: "var(--glass)", cursor: "pointer", fontFamily: "inherit",
            opacity: loading ? 0.4 : 1, transition: "opacity 0.2s",
          }}>
          Refresh
        </button>
      </>
    }>
      <div className="mx-auto px-5 py-10 fade-up" style={{ maxWidth: 1400 }}>
        {/* Overall status banner */}
        <div className="card-glass" style={{ padding: "12px 20px", marginBottom: 16 }}>
          <div className="flex items-center gap-3">
            <div className="relative" style={{ width: 10, height: 10 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: data ? STATUS_COLOR[data.overall] : "var(--text-muted)",
                transition: "background 0.3s",
              }} />
              {data?.overall === "operational" && (
                <div style={{
                  position: "absolute", inset: -2, borderRadius: "50%",
                  background: "var(--success)", opacity: 0.3,
                  animation: "pulse-subtle 2s ease-in-out infinite",
                }} />
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {overallLabel}
            </p>
            {data && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                Last checked {new Date(data.timestamp).toLocaleTimeString("en-AU", { timeStyle: "short" })}
              </span>
            )}
          </div>
        </div>

        {/* Main content: live checks LEFT, uptime bars RIGHT */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Left: Live checks */}
          {data && <div className="card-glass" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>System Checks</p>
            </div>
            {data.checks.map((check, i, arr) => (
              <div key={check.name}
                className="flex items-center justify-between px-5 py-3 transition-colors"
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: STATUS_COLOR[check.status],
                    boxShadow: check.status !== "operational" ? `0 0 6px ${STATUS_COLOR[check.status]}` : "none",
                  }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{check.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{check.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {check.latency !== undefined && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{check.latency}ms</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 500, color: STATUS_COLOR[check.status] }}>
                    {STATUS_LABEL[check.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>}

          {/* Right: Uptime history */}
          {uptimeData && uptimeData.uptime.length > 0 && (
            <div className="flex flex-col gap-3">
              <div style={{ padding: "0 4px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Uptime — past {uptimeData.days} days
                </p>
              </div>
              {uptimeData.uptime.map((service) => (
                <div key={service.service} className="card-glass">
                  <UptimeBar service={service} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
