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

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
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
      const res = await fetch("/api/v1/status");
      const json = await res.json();
      setData(json);
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
      <div className="max-w-xl mx-auto px-5 py-10 flex flex-col gap-6 fade-up">
        <div className="card-glass" style={{ padding: "16px 20px" }}>
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
          </div>
          {data && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, marginLeft: 22 }}>
              Last checked {new Date(data.timestamp).toLocaleTimeString("en-AU", { timeStyle: "short" })}
            </p>
          )}
        </div>

        {data && <div className="card-glass" style={{ overflow: "hidden" }}>
          {data.checks.map((check, i, arr) => (
            <div key={check.name}
              className="flex items-center justify-between px-5 py-3.5 transition-colors"
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
      </div>
    </PageShell>
  );
}
