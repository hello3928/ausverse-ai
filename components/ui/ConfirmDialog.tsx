"use client";

import { useRef, useEffect, useCallback } from "react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm, onCancel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // Focus the cancel button on open
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Mouse-tracking glow for buttons
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={panelRef}
        className="scale-in"
        style={{
          width: "min(360px, calc(100vw - 32px))",
          background: "var(--glass-strong)",
          border: "1px solid var(--glass-border)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--shadow-lg), 0 0 40px rgba(0,0,0,0.4)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Content */}
        <div style={{ padding: "24px 24px 20px" }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, marginBottom: 16,
            background: variant === "danger" ? "rgba(239, 68, 68, 0.1)" : "var(--glass)",
            border: `1px solid ${variant === "danger" ? "rgba(239, 68, 68, 0.2)" : "var(--glass-border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {variant === "danger" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>

          <h3 style={{
            fontSize: 15, fontWeight: 600, color: "var(--text-primary)",
            letterSpacing: -0.3, marginBottom: description ? 6 : 0,
          }}>
            {title}
          </h3>

          {description && (
            <p style={{
              fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5,
            }}>
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: "flex", gap: 8, padding: "0 24px 20px",
          justifyContent: "flex-end",
        }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            onMouseMove={handleMouseMove}
            className="btn-glow-white active:scale-95"
            style={{
              fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit",
              background: "var(--glass)", border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
              transition: "all var(--dur-normal) var(--ease-out)",
              minHeight: 36,
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            onMouseMove={handleMouseMove}
            className="btn-glow active:scale-95"
            style={{
              fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit",
              background: variant === "danger" ? "var(--accent)" : "var(--glass-strong)",
              border: variant === "danger" ? "1px solid var(--accent-border)" : "1px solid var(--glass-border)",
              color: variant === "danger" ? "white" : "var(--text-primary)",
              transition: "all var(--dur-normal) var(--ease-out)",
              minHeight: 36,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
