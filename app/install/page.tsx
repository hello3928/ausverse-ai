"use client";

import { useState } from "react";
import Link from "next/link";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
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

  if (isElectron) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>You&apos;re already using the desktop app.</p>
        <Link href="/" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>Back</Link>
      </div>
    );
  }

  const steps: Record<string, string[]> = {
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

  const currentSteps = steps[platform] ?? steps.desktop;
  const platformLabel = platform === "ios" ? "iPhone / iPad" : platform === "android" ? "Android" : "Desktop";

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

      <div style={{ width: "100%", maxWidth: 420 }} className="flex flex-col gap-6">
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "24px 24px",
        }}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                Install as App
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Ausverse AI can be installed as a progressive web app for a native experience. Detected: {platformLabel}.
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
            {currentSteps.map((step, i) => (
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

        {platform !== "ios" && platform !== "android" && (
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
