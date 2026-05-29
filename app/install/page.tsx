"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Platform = "windows" | "macos" | "linux" | "ios" | "android" | "unknown";

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  size: number;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Win/.test(ua)) return "windows";
  if (/Mac OS X/.test(ua)) return "macos";
  if (/Linux/.test(ua)) return "linux";
  return "unknown";
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function InstallPage() {
  const [platform] = useState<Platform>(() => {
    if (typeof window === "undefined") return "unknown";
    return detectPlatform();
  });

  const [isElectron] = useState(() => {
    if (typeof window === "undefined") return false;
    return /Electron/i.test(navigator.userAgent);
  });

  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/repos/hello3928/ausverse-ai/releases/latest")
      .then(r => r.json())
      .then(data => {
        if (data.tag_name && data.assets) {
          const exe = data.assets.find((a: { name: string }) => a.name.endsWith(".exe") && !a.name.endsWith(".blockmap"));
          if (exe) {
            setRelease({
              version: data.tag_name.replace(/^v/, ""),
              downloadUrl: exe.browser_download_url,
              size: exe.size,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (isElectron) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>You&apos;re already using the desktop app.</p>
        <Link href="/" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>Back</Link>
      </div>
    );
  }

  const pwaSteps: Record<string, string[]> = {
    ios: [
      "Open this site in Safari",
      "Tap the Share button (square with arrow)",
      "Scroll down and tap \"Add to Home Screen\"",
      "Tap \"Add\" to confirm",
    ],
    android: [
      "Open this site in Chrome",
      "Tap the three-dot menu",
      "Tap \"Add to Home screen\" or \"Install app\"",
      "Tap \"Add\" to confirm",
    ],
    desktop: [
      "Open this site in Chrome or Edge",
      "Click the install icon in the address bar (or Menu → Install)",
      "Click \"Install\" to confirm",
    ],
  };

  const isMobile = platform === "ios" || platform === "android";
  const isDesktop = platform === "windows" || platform === "macos" || platform === "linux" || platform === "unknown";
  const currentPwaSteps = pwaSteps[isMobile ? platform : "desktop"];
  const platformLabel = platform === "ios" ? "iPhone / iPad" : platform === "android" ? "Android" : platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : platform === "linux" ? "Linux" : "Desktop";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "var(--bg)" }}>

      <div className="flex items-center gap-3 mb-10">
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: 0.5,
        }}>Av</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Ausverse AI</p>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 420 }} className="flex flex-col gap-4">

        {/* Desktop App — Windows */}
        {isDesktop && platform === "windows" && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "24px 24px",
          }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  Desktop App
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Native desktop experience with auto-updates. Detected: {platformLabel}.
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                color: "var(--accent-light)", background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)", padding: "4px 8px",
                borderRadius: 4, flexShrink: 0,
              }}>
                NEW
              </span>
            </div>

            {loading ? (
              <div style={{ padding: "12px 0" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading latest release...</p>
              </div>
            ) : release ? (
              <div className="flex flex-col gap-3">
                <a
                  href={release.downloadUrl}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 8,
                    background: "var(--accent)", color: "white",
                    fontSize: 13, fontWeight: 600, textDecoration: "none",
                    border: "1px solid var(--accent-border)",
                    transition: "opacity 0.15s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Download for Windows
                </a>
                <div className="flex items-center justify-between" style={{ padding: "0 2px" }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    v{release.version} · {formatSize(release.size)} · Windows 10+
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    .exe installer
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                No releases available yet.
              </p>
            )}
          </div>
        )}

        {/* Desktop App — macOS / Linux (coming soon) */}
        {isDesktop && (platform === "macos" || platform === "linux") && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "24px 24px",
          }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  Desktop App
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  The {platformLabel} desktop app is coming soon. Use the PWA install below for now.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PWA Install */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "24px 24px",
        }}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {isMobile ? "Install as App" : "Install as PWA"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {isMobile
                  ? `Install Ausverse AI on your ${platformLabel} for a native experience.`
                  : "Alternatively, install as a progressive web app directly from your browser."
                }
              </p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              color: "var(--text-tertiary)", background: "var(--bg-elevated)",
              border: "1px solid var(--border)", padding: "4px 8px",
              borderRadius: 4, flexShrink: 0,
            }}>
              PWA
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {currentPwaSteps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
                  flexShrink: 0, width: 18, textAlign: "right",
                }}>{i + 1}</span>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-platform hint */}
        {isDesktop && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "18px 20px",
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Mobile</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Visit this page on your phone to see platform-specific install instructions for iOS or Android.
            </p>
          </div>
        )}
      </div>

      <Link href="/" style={{
        marginTop: 28, fontSize: 12, color: "var(--text-tertiary)",
        textDecoration: "none", padding: "6px 12px",
        border: "1px solid var(--border)", borderRadius: 6,
      }}>
        Back
      </Link>
    </div>
  );
}
