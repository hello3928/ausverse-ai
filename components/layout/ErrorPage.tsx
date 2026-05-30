"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const ERRORS: Record<number, { title: string; message: string; severity: "info" | "warning" | "critical" }> = {
  400: { title: "Malformed Request", message: "The request could not be processed due to invalid syntax or parameters.", severity: "warning" },
  401: { title: "Authorisation Required", message: "Valid credentials are required to access this resource. Your session may have expired.", severity: "warning" },
  403: { title: "Access Denied", message: "Your clearance level is insufficient for this resource. Contact an administrator if you believe this is an error.", severity: "warning" },
  404: { title: "Not Found", message: "The requested resource does not exist, has been moved, or has been permanently removed from the system.", severity: "info" },
  408: { title: "Request Timeout", message: "The server did not receive a complete request within the allocated time window.", severity: "warning" },
  429: { title: "Rate Limited", message: "Request throttling is active. Too many requests were received in a short period.", severity: "warning" },
  500: { title: "Internal Server Error", message: "An unexpected condition was encountered during request processing. This incident has been automatically logged.", severity: "critical" },
  502: { title: "Bad Gateway", message: "The upstream service returned an invalid or malformed response. The backend may be restarting.", severity: "critical" },
  503: { title: "Service Unavailable", message: "The system is temporarily offline for maintenance or is experiencing capacity issues.", severity: "critical" },
  504: { title: "Gateway Timeout", message: "The upstream service did not respond within the expected time frame.", severity: "critical" },
};

const FALLBACK = { title: "Unknown Error", message: "An unclassified error occurred during request processing.", severity: "warning" as const };

function generateIncidentId(): string {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INC-${now.toString(36).toUpperCase()}-${rand}`;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "var(--danger, #ff4444)";
    case "warning": return "var(--warning, #ffaa00)";
    default: return "var(--text-muted, #888)";
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "critical": return "CRITICAL";
    case "warning": return "WARNING";
    default: return "INFO";
  }
}

export default function ErrorPage({ code, reset, error }: { code: number; reset?: () => void; error?: Error }) {
  const { title, message, severity } = ERRORS[code] ?? FALLBACK;
  const [incidentId] = useState(() => generateIncidentId());
  const [timestamp] = useState(() => new Date().toISOString());
  const [copied, setCopied] = useState(false);
  const [userAgent, setUserAgent] = useState("");
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setUserAgent(navigator.userAgent);
    setPathname(window.location.pathname + window.location.search);
  }, []);

  const severityColor = getSeverityColor(severity);

  const copyIncident = () => {
    const report = [
      `Incident: ${incidentId}`,
      `Code: ${code} ${title}`,
      `Time: ${timestamp}`,
      `Path: ${pathname}`,
      `UA: ${userAgent}`,
      error?.message ? `Error: ${error.message}` : null,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}>

      <div style={{ maxWidth: 520, width: "100%" }}>
        {/* Error code + title */}
        <div className="flex items-end gap-4" style={{ marginBottom: 12 }}>
          <p style={{
            fontSize: 72, fontWeight: 700, color: "var(--text-primary)",
            lineHeight: 1, letterSpacing: -3, fontVariantNumeric: "tabular-nums",
          }}>
            {code}
          </p>
          <div style={{ paddingBottom: 8 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: severityColor,
                boxShadow: severity === "critical" ? `0 0 8px ${severityColor}` : "none",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                color: severityColor, textTransform: "uppercase",
              }}>
                {getSeverityLabel(severity)}
              </span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)" }}>
              {title}
            </p>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.7,
          marginBottom: 20,
        }}>
          {message}
        </p>

        {/* Technical details card */}
        <div style={{
          background: "var(--glass, rgba(255,255,255,0.03))",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          borderRadius: 8, padding: "14px 16px",
          marginBottom: 20,
          fontFamily: "var(--font-jetbrains, monospace)",
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
              Incident Details
            </span>
            <button onClick={copyIncident} style={{
              fontSize: 11, color: copied ? "var(--success, #4ade80)" : "var(--text-muted)",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "inherit", padding: "2px 6px",
              transition: "color 0.2s",
            }}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>incident</span>
              <span style={{ fontSize: 11, color: severityColor, fontWeight: 500 }}>{incidentId}</span>
            </div>
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>status</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{code} {title}</span>
            </div>
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>time</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{timestamp}</span>
            </div>
            {pathname && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>path</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", wordBreak: "break-all" }}>{pathname}</span>
              </div>
            )}
            {error?.message && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70, flexShrink: 0 }}>error</span>
                <span style={{ fontSize: 11, color: "var(--danger, #ff4444)", wordBreak: "break-all" }}>{error.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {reset && (
            <button onClick={reset} style={{
              fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
              padding: "8px 18px", border: "1px solid var(--border)",
              borderRadius: 8, background: "var(--glass, rgba(255,255,255,0.03))",
              cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}>
              Retry
            </button>
          )}
          <Link href="/" style={{
            fontSize: 13, color: "var(--text-tertiary)",
            padding: "8px 18px", border: "1px solid var(--border)",
            borderRadius: 8, textDecoration: "none",
            transition: "border-color 0.2s",
          }}>
            Back to Terminal
          </Link>
          <Link href="/status" style={{
            fontSize: 13, color: "var(--text-muted)",
            padding: "8px 18px", textDecoration: "none",
          }}>
            System Status
          </Link>
        </div>
      </div>
    </div>
  );
}
