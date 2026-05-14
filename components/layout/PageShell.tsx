"use client";

import Link from "next/link";

interface Props {
  title: string;
  children: React.ReactNode;
  /** Extra elements rendered before the Back button (e.g. Refresh) */
  actions?: React.ReactNode;
  /** Where the Back button goes — defaults to "/" */
  backHref?: string;
  /** Full-height layout with no scroll on the shell itself (for pages with their own internal scroll like settings/management) */
  fullHeight?: boolean;
}

export default function PageShell({ title, children, actions, backHref = "/", fullHeight }: Props) {
  return (
    <div className={fullHeight ? "flex flex-col" : ""} style={fullHeight ? { height: "100dvh", overflow: "hidden" } : { minHeight: "100vh" }}>
      {/* Unified top bar */}
      <div data-titlebar className="shrink-0 flex items-center justify-between px-5 titlebar-pad"
        style={{
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--glass)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          height: 48,
        }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
          }}>Av</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.2 }}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Link href={backHref} style={{
            fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none",
            padding: "6px 12px", border: "1px solid var(--glass-border)", borderRadius: 6,
            background: "var(--glass)", transition: "color 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}>
            Back
          </Link>
        </div>
      </div>

      {/* Page content */}
      {fullHeight ? (
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
