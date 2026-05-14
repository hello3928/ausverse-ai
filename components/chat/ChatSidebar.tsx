"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ChatSession } from "@/hooks/useChatSessions";
import { AVATARS } from "@/lib/avatars";
import IOSInstallButton from "@/components/layout/InstallPrompt";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  sessions: ChatSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  username: string | null;
  clearance: string | null;
  role: string | null;
  avatar: string | null;
  open: boolean;
  onClose: () => void;
  isIOS?: boolean;
}

function AvatarImg({ id, size = 28 }: { id: string | null; size?: number }) {
  const src = id ? AVATARS.find((a) => a.id === id)?.src : null;
  if (src) {
    return <img src={src} alt="" style={{
      width: size, height: size, borderRadius: 7, objectFit: "cover", flexShrink: 0,
      border: "1px solid var(--glass-border)",
    }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 7, flexShrink: 0,
      background: "var(--glass-strong)", border: "1px solid var(--glass-border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, color: "var(--text-muted)",
    }}>?</div>
  );
}

function GlowNavItem({ href, label, sub, onClick }: {
  href: string; label: string; sub: string; onClick: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  return (
    <Link ref={ref} href={href} onClick={onClick} onMouseMove={handleMouseMove}
      className="btn-glow-white"
      style={{
        textDecoration: "none", display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderBottom: "1px solid var(--border)",
        border: "none", borderRadius: 0,
        background: "transparent",
      }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, transition: "color 0.2s" }}>{label}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sub}</p>
      </div>
    </Link>
  );
}

function AccountMenu({ role, onClose }: { role: string | null; onClose: () => void }) {
  const navItems = [
    { href: "/settings#profile", label: "Profile", sub: "Avatar & identity" },
    { href: "/settings",         label: "Settings", sub: "Preferences" },
    { href: "/status",           label: "Status", sub: "System health" },
    { href: "/archive",          label: "Archive", sub: "Files & media" },
  ];

  return (
    <div className="scale-in" style={{
      position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
      background: "rgba(16, 16, 24, 0.92)", border: "1px solid var(--glass-border)",
      borderRadius: 10, overflow: "hidden", zIndex: 60,
      boxShadow: "var(--shadow-lg)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    }}>
      {role === "admin" && (
        <GlowNavItem href="/management" label="Management" sub="Admin panel" onClick={onClose} />
      )}

      {navItems.map((item) => (
        <GlowNavItem key={item.href} href={item.href} label={item.label} sub={item.sub} onClick={onClose} />
      ))}

      <button
        onClick={async () => {
          await fetch("/api/v1/session/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
          window.location.reload();
        }}
        className="transition-colors"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", transition: "color 0.2s" }}>Sign out</p>
      </button>
    </div>
  );
}

export default function ChatSidebar({
  sessions, currentId, onSelect, onNew, onDelete,
  username, clearance, role, avatar,
  open, onClose, isIOS,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const newBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountOpen]);

  const handleNewBtnMouseMove = useCallback((e: React.MouseEvent) => {
    const btn = newBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden fade-in" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      )}

      <div
        className={`flex flex-col shrink-0 fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-200 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: 260,
          background: "var(--glass)",
          borderRight: "1px solid var(--glass-border)",
          height: "100%",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
        }}>

        {/* Logo + new chat */}
        <div className={`px-4 pt-4 pb-3 shrink-0 flex flex-col gap-3 ${isIOS ? "ios-safe-top" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
              }}>Av</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.2 }}>Ausverse AI</span>
            </div>
            <button onClick={onClose} className="md:hidden transition-colors hover:text-[var(--accent-light)]"
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>&times;</button>
          </div>

          <button
            ref={newBtnRef}
            onClick={() => { onNew(); onClose(); }}
            onMouseMove={handleNewBtnMouseMove}
            className="btn-glow w-full flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{
              padding: "8px 0", borderRadius: 8,
              background: "var(--glass-strong)", border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", cursor: "pointer",
            }}>
            <span style={{ fontSize: 14, lineHeight: 1, color: "var(--accent-light)" }}>+</span>
            New chat
          </button>
        </div>

        {/* Sessions label */}
        {sessions.length > 0 && (
          <div className="px-4 pb-1.5 pt-2 shrink-0">
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>Recent</p>
          </div>
        )}

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-2 ios-scroll" style={{ scrollbarWidth: "none" }}>
          {sessions.length === 0 && (
            <p className="text-center mt-8" style={{ fontSize: 12, color: "var(--text-muted)" }}>No conversations yet</p>
          )}
          {sessions.map((s) => (
            <div key={s.id}
              className="group flex items-center gap-2 px-3 py-2 mb-0.5 cursor-pointer"
              style={{
                borderRadius: 8,
                background: s.id === currentId ? "var(--accent-soft)" : "transparent",
                borderLeft: s.id === currentId ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
              }}
              onClick={() => { onSelect(s.id); onClose(); }}>
              <span className="flex-1 truncate" style={{
                fontSize: 12,
                color: s.id === currentId ? "var(--text-primary)" : "var(--text-tertiary)",
                fontWeight: s.id === currentId ? 500 : 400,
                transition: "color var(--dur-fast) var(--ease-out)",
              }}>
                {s.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const needsConfirm = localStorage.getItem("aia-confirm-delete") === "true";
                  if (needsConfirm) {
                    setDeleteTarget(s.id);
                  } else {
                    onDelete(s.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--accent-light)] hover:bg-[var(--glass-strong)] active:scale-90"
                style={{
                  background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                  padding: 0, borderRadius: 6,
                  minWidth: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "opacity var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring)",
                }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Bottom account */}
        <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
          <IOSInstallButton />
          <div ref={accountRef} style={{ position: "relative" }}>
            {accountOpen && username && (
              <AccountMenu role={role} onClose={() => setAccountOpen(false)} />
            )}

            {username ? (
              <button
                onClick={() => setAccountOpen(v => !v)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 transition-all rounded-lg"
                style={{
                  background: accountOpen ? "var(--glass-strong)" : "transparent",
                  border: accountOpen ? "1px solid var(--glass-border)" : "1px solid transparent",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                <AvatarImg id={avatar} size={28} />
                <div className="flex-1 text-left min-w-0">
                  <p className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{username}</p>
                  {(clearance || role === "admin" || role === "operator") && (
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, textTransform: "capitalize" }}>
                      {role === "admin" ? "Admin" : role === "operator" ? "Operator" : clearance?.replace("_", " ")}
                    </p>
                  )}
                </div>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{
                  flexShrink: 0, transform: accountOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease", color: "var(--text-muted)",
                }}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <Link href="/login" className="block px-3 py-2 rounded-lg transition-colors hover:bg-[var(--glass)]" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete session?"
        description="This conversation will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
