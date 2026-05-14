"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleBtnMouseMove = useCallback((e: React.MouseEvent) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/v1/session/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">

      <div className="card-glass fade-up" style={{
        width: "100%", maxWidth: 400,
        display: "flex", flexDirection: "column", gap: 32,
        padding: "40px 32px",
      }}>
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-4">
          <div className="pulse-glow" style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
          }}>Av</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.3, marginBottom: 6 }}>
              Sign in
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Access requires an approved account
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            autoFocus
            className="input-glass focus:outline-none"
            style={{
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit",
            }}
          />
          <div style={{ position: "relative" }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              required
              className="input-glass focus:outline-none"
              style={{
                borderRadius: 8, padding: "10px 14px", paddingRight: 44,
                fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit",
                width: "100%",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="transition-colors"
              style={{
                position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: 8,
                minWidth: 36, minHeight: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6,
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}>
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M6.5 6.5a2 2 0 002.8 2.8M3.5 5.2C2.4 6.1 1.5 7.3 1.5 8c0 1.5 3 5 6.5 5 1 0 2-.3 2.8-.7M8 3c3.5 0 6.5 3.5 6.5 5 0 .7-.5 1.5-1.2 2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.5 8c0-1.5 3-5 6.5-5s6.5 3.5 6.5 5-3 5-6.5 5-6.5-3.5-6.5-5z" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="fade-in" style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>{error}</p>
          )}

          <button
            ref={btnRef}
            type="submit"
            disabled={loading}
            onMouseMove={handleBtnMouseMove}
            className="btn-glow disabled:opacity-40"
            style={{
              marginTop: 4,
              background: "var(--accent)", color: "white",
              border: "1px solid var(--accent-border)", borderRadius: 8,
              padding: "10px 0", fontSize: 13,
              fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit",
              boxShadow: "0 0 12px rgba(220, 38, 38, 0.15)",
            }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg className="spinner" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                  <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Signing in…
              </span>
            ) : "Continue"}
          </button>
        </form>

        {/* Links */}
        <div className="flex justify-center gap-6">
          <Link href="/signup" className="transition-colors hover:text-[var(--accent-light)]" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
            Request access
          </Link>
          <Link href="/" className="transition-colors hover:text-[var(--text-secondary)]" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
