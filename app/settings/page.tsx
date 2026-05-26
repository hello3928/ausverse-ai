"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AVATARS } from "@/lib/avatars";
import PageShell from "@/components/layout/PageShell";

type Theme = "dark" | "light" | "system";
type FontSize = "sm" | "md" | "lg";
type Density = "compact" | "default" | "comfortable";
type KeyStatus = "loading" | "none" | "exists" | "generated" | "revoked";
type Tab = "profile" | "appearance" | "chat" | "notifications" | "integrations" | "agent" | "account" | "system";

function electronToDisplay(s: string): string {
  return s
    .replace(/CommandOrControl/g, "Ctrl")
    .replace(/CmdOrCtrl/g, "Ctrl")
    .replace(/Super/g, "Win");
}

const KEY_CODE_MAP: Record<string, string> = {
  Space: "Space", Backspace: "Backspace", Delete: "Delete",
  Enter: "Return", Tab: "Tab",
  ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
  Insert: "Insert", Minus: "-", Equal: "Plus",
  BracketLeft: "[", BracketRight: "]", Backslash: "\\",
  Semicolon: ";", Quote: "'", Backquote: "`",
  Comma: ",", Period: ".", Slash: "/",
};

const BACKGROUNDS = [
  { id: "none", label: "None", url: "" },
  { id: "mountains", label: "Mountains", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80" },
  { id: "city", label: "City", url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80" },
  { id: "space", label: "Space", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80" },
  { id: "forest", label: "Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80" },
  { id: "ocean", label: "Ocean", url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80" },
  { id: "abstract", label: "Abstract", url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80" },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      style={{
        /* Outer button = invisible touch target */
        background: "none", border: "none", cursor: "pointer",
        padding: "11px 0", /* (44 - 22) / 2 = 11px vertical padding for 44px touch target */
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      {/* Inner visual track */}
      <span style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? "var(--accent)" : "var(--glass-strong)",
        position: "relative", display: "block",
        transition: "background var(--dur-normal) var(--ease-out), box-shadow var(--dur-normal) var(--ease-out)",
        boxShadow: value ? "0 0 8px rgba(220, 38, 38, 0.3), inset 0 1px 2px rgba(0,0,0,0.1)" : "inset 0 1px 3px rgba(0,0,0,0.2)",
      }}>
        {/* Knob */}
        <span style={{
          position: "absolute", top: 2, left: value ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%",
          background: value ? "white" : "var(--text-muted)",
          transition: "left var(--dur-normal) var(--ease-spring), background var(--dur-normal) var(--ease-out)",
          display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </span>
    </button>
  );
}

function Chips<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{
      display: "flex", borderRadius: 8, padding: 2, gap: 1,
      background: "var(--glass)", border: "1px solid var(--glass-border)",
    }}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 6,
          cursor: "pointer", fontFamily: "inherit", border: "none",
          background: value === opt.value ? "var(--accent-soft)" : "transparent",
          color: value === opt.value ? "var(--accent-light)" : "var(--text-muted)",
          transition: "all 0.2s ease",
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-glass" style={{ overflow: "hidden" }}>
      {children}
    </div>
  );
}

function Row({ label, desc, children, last, danger }: {
  label: string; desc?: string; children?: React.ReactNode; last?: boolean; danger?: boolean;
}) {
  return (
    <div className="transition-colors" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", gap: 16,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: danger ? "var(--danger)" : "var(--text-secondary)", fontWeight: 500, marginBottom: desc ? 2 : 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 2 }}>{desc}</p>}
      </div>
      {children && <div style={{ flexShrink: 0 }}>{children}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 18px 6px" }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</p>
    </div>
  );
}

function Btn({ onClick, children, variant = "ghost", disabled }: {
  onClick?: () => void; children: React.ReactNode;
  variant?: "ghost" | "danger" | "primary"; disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  const styles = {
    ghost:   { background: "var(--glass-strong)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" },
    danger:  { background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.15)" },
    primary: { background: "var(--accent)", color: "white", border: "1px solid var(--accent-border)" },
  }[variant];
  return (
    <button ref={ref} onClick={onClick} disabled={disabled} onMouseMove={handleMouseMove}
      className={variant === "ghost" ? "btn-glow-white" : variant === "primary" ? "btn-glow" : ""}
      style={{
        fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        opacity: disabled ? 0.4 : 1, transition: "all 0.2s ease", ...styles,
      }}>
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  const [theme, setTheme]       = useState<Theme>("dark");
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [density, setDensity]   = useState<Density>("default");
  const [timestamps, setTimestamps]       = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [enterToSend, setEnterToSend] = useState(true);
  const [autoScroll, setAutoScroll]   = useState(true);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [streamResponses, setStreamResponses] = useState(true);
  const [webSearch, setWebSearch]             = useState(true);

  const [soundEffects, setSoundEffects]     = useState(false);
  const [desktopNotifs, setDesktopNotifs]   = useState(false);

  const [keyStatus, setKeyStatus]     = useState<KeyStatus>("loading");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied]     = useState(false);

  const [cleared, setCleared] = useState(false);
  const [exported, setExported] = useState(false);

  const [avatar, setAvatar]     = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [ua, setUa]               = useState("");
  const [platform, setPlatform]   = useState("");
  const [environment, setEnvironment] = useState("");
  const [desktopVersion, setDesktopVersion] = useState("0.0.0");
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "up-to-date" | "available" | "error">("idle");
  const [updateVersion, setUpdateVersion] = useState("");

  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentShortcut, setAgentShortcut] = useState("Ctrl+Shift+A");
  const [agentLoaded, setAgentLoaded] = useState(false);
  const [recordingKeybind, setRecordingKeybind] = useState(false);

  const [bgId, setBgId] = useState("none");
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (hash) setTab(hash as Tab);

    setTheme((localStorage.getItem("aia-theme") || "dark") as Theme);
    setFontSize((localStorage.getItem("aia-fontsize") || "md") as FontSize);
    setDensity((localStorage.getItem("aia-density") || "default") as Density);
    setEnterToSend(localStorage.getItem("aia-enter-to-send") !== "false");
    setAutoScroll(localStorage.getItem("aia-autoscroll") !== "false");
    setTimestamps(localStorage.getItem("aia-timestamps") === "true");
    const rm = localStorage.getItem("aia-reduced-motion") === "true";
    setReducedMotion(rm);
    document.documentElement.dataset.reducedMotion = rm ? "true" : "false";
    setConfirmDelete(localStorage.getItem("aia-confirm-delete") === "true");
    setStreamResponses(localStorage.getItem("aia-stream") !== "false");
    setWebSearch(localStorage.getItem("aia-web-search") !== "false");
    setSoundEffects(localStorage.getItem("aia-sounds") === "true");
    setDesktopNotifs(localStorage.getItem("aia-notifs") === "true");
    setBgId(localStorage.getItem("aia-bg") || "none");

    fetch("/api/v1/session/auth").then(r => r.json()).then(d => {
      if (d.loggedIn) { setUsername(d.username); setAvatar(d.avatar ?? null); }
    }).catch(() => {});

    fetch("/api/v1/keys").then(r => r.json()).then(d => {
      setKeyStatus(d.hasKey ? "exists" : "none");
    }).catch(() => setKeyStatus("none"));

    fetch("/api/v1/settings").then(r => r.json()).then(s => {
      if (s.theme)     applyTheme(s.theme);
      if (s.fontSize)  applyFontSize(s.fontSize);
      if (s.density)   applyDensity(s.density);
      if (typeof s.enterToSend === "boolean") persistToggle("aia-enter-to-send", s.enterToSend, setEnterToSend);
      if (typeof s.autoScroll  === "boolean") persistToggle("aia-autoscroll",    s.autoScroll,  setAutoScroll);
      if (typeof s.timestamps === "boolean") persistToggle("aia-timestamps", s.timestamps, setTimestamps);
      if (typeof s.reducedMotion === "boolean") {
        persistToggle("aia-reduced-motion", s.reducedMotion, setReducedMotion);
        document.documentElement.dataset.reducedMotion = s.reducedMotion ? "true" : "false";
      }
      if (typeof s.confirmDelete === "boolean") persistToggle("aia-confirm-delete", s.confirmDelete, setConfirmDelete);
      if (typeof s.streamResponses === "boolean") persistToggle("aia-stream", s.streamResponses, setStreamResponses);
      if (typeof s.webSearch === "boolean") persistToggle("aia-web-search", s.webSearch, setWebSearch);
      if (typeof s.soundEffects === "boolean") persistToggle("aia-sounds", s.soundEffects, setSoundEffects);
      if (typeof s.desktopNotifs === "boolean") persistToggle("aia-notifs", s.desktopNotifs, setDesktopNotifs);
      if (s.backgroundUrl) {
        const found = BACKGROUNDS.find(b => b.url === s.backgroundUrl);
        if (found) {
          setBgId(found.id);
        } else {
          setBgId("custom");
          setCustomBgUrl(s.backgroundUrl);
        }
      }
    }).catch(() => {});

    const isElectron = /Electron/i.test(navigator.userAgent);
    setEnvironment(isElectron ? "Desktop" : window.matchMedia("(display-mode: standalone)").matches ? "PWA" : "Web");
    if (isElectron) {
      const api = (window as unknown as { electronAPI?: { appVersion?: string; getAgentSettings?: () => Promise<{ enabled: boolean; shortcut: string }> } }).electronAPI;
      if (api?.appVersion) {
        setDesktopVersion(api.appVersion);
      } else {
        const uaMatch = navigator.userAgent.match(/ausverse-ai-desktop\/([\d.]+)/);
        if (uaMatch) setDesktopVersion(uaMatch[1]);
      }
      if (api?.getAgentSettings) {
        api.getAgentSettings().then((s) => {
          setAgentEnabled(s.enabled);
          setAgentShortcut(electronToDisplay(s.shortcut));
          setAgentLoaded(true);
        }).catch(() => setAgentLoaded(true));
      }
    }
    setUa(navigator.userAgent);
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform("iOS");
    else if (/Android/.test(ua)) setPlatform("Android");
    else if (/Mac OS X/.test(ua)) setPlatform("macOS");
    else if (/Win/.test(ua)) setPlatform("Windows");
    else if (/Linux/.test(ua)) setPlatform("Linux");
    else setPlatform("Unknown");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync(patch: object) {
    fetch("/api/v1/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => {});
  }

  function applyTheme(t: Theme) {
    setTheme(t); localStorage.setItem("aia-theme", t);
    const resolved = t === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    document.documentElement.dataset.theme = resolved;
    sync({ theme: t });
  }
  function applyFontSize(fs: FontSize) {
    setFontSize(fs); localStorage.setItem("aia-fontsize", fs);
    document.documentElement.dataset.fontsize = fs;
    sync({ fontSize: fs });
  }
  function applyDensity(d: Density) {
    setDensity(d); localStorage.setItem("aia-density", d);
    document.documentElement.dataset.density = d;
    sync({ density: d });
  }
  function applyBackground(id: string, url?: string) {
    setBgId(id);
    localStorage.setItem("aia-bg", id);
    const bgUrl = url ?? BACKGROUNDS.find(b => b.id === id)?.url ?? "";
    document.documentElement.style.setProperty("--user-bg", bgUrl ? `url(${bgUrl})` : "none");
    if (id !== "custom") { setCustomBgUrl(null); }
    sync({ backgroundUrl: bgUrl });
  }

  async function uploadBackground(file: File) {
    setBgUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/background", { method: "POST", body: form });
      if (!res.ok) { setBgUploading(false); return; }
      const { url } = await res.json();
      setCustomBgUrl(url);
      applyBackground("custom", url);
    } finally {
      setBgUploading(false);
    }
  }
  function persistToggle(key: string, val: boolean, setter: (v: boolean) => void) {
    setter(val); localStorage.setItem(key, val ? "true" : "false");
  }
  function toggle(key: string, val: boolean, setter: (v: boolean) => void, syncKey?: string) {
    persistToggle(key, val, setter);
    if (syncKey) sync({ [syncKey]: val });
  }

  function resetSettings() {
    ["aia-theme","aia-fontsize","aia-density","aia-enter-to-send","aia-autoscroll",
     "aia-timestamps","aia-reduced-motion","aia-confirm-delete","aia-stream","aia-web-search","aia-sounds","aia-notifs","aia-bg"]
      .forEach(k => localStorage.removeItem(k));
    applyTheme("dark"); applyFontSize("md"); applyDensity("default");
    fetch("/api/v1/background", { method: "DELETE" }).catch(() => {});
    applyBackground("none");
    setCustomBgUrl(null);
    setEnterToSend(true); setAutoScroll(true); setTimestamps(false);
    setReducedMotion(false); setConfirmDelete(false); setStreamResponses(true);
    setWebSearch(true); setSoundEffects(false); setDesktopNotifs(false);
    // Sync defaults to server
    sync({
      theme: "dark", fontSize: "md", density: "default", backgroundUrl: "",
      enterToSend: true, autoScroll: true, timestamps: false,
      reducedMotion: false, confirmDelete: false, streamResponses: true,
      webSearch: true, soundEffects: false, desktopNotifs: false,
    });
  }

  async function generateApiKey() {
    const res = await fetch("/api/v1/keys", { method: "POST" });
    const data = await res.json();
    if (data.key) { setGeneratedKey(data.key); setKeyStatus("generated"); }
  }
  async function revokeApiKey() {
    await fetch("/api/v1/keys", { method: "DELETE" });
    setGeneratedKey(null); setKeyStatus("revoked");
    setTimeout(() => setKeyStatus("none"), 2000);
  }
  function copyKey() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000);
    });
  }

  async function selectAvatar(id: string) {
    setAvatarSaving(true);
    try {
      const res = await fetch("/api/v1/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarId: id }) });
      if (res.ok) setAvatar(id);
    } finally { setAvatarSaving(false); }
  }

  async function clearSessions() {
    await fetch("/api/v1/sessions", { method: "DELETE" }).catch(() => {});
    setCleared(true); setTimeout(() => setCleared(false), 2000);
  }

  async function exportData() {
    const [sessRes, userRes] = await Promise.all([
      fetch("/api/v1/sessions").catch(() => null),
      fetch("/api/v1/session/auth").catch(() => null),
    ]);
    const sessions = sessRes ? await sessRes.json().catch(() => []) : [];
    const user = userRes ? await userRes.json().catch(() => ({})) : {};
    const blob = new Blob([JSON.stringify({ user, sessions, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "aia-export.json"; a.click();
    URL.revokeObjectURL(url);
    setExported(true); setTimeout(() => setExported(false), 2000);
  }

  const currentAvatarSrc = avatar ? AVATARS.find(a => a.id === avatar)?.src : null;

  const NAV: { id: Tab; label: string }[] = [
    { id: "profile",       label: "Profile" },
    { id: "appearance",    label: "Appearance" },
    { id: "chat",          label: "Chat" },
    { id: "notifications", label: "Notifications" },
    { id: "integrations",  label: "Integrations" },
    ...(environment === "Desktop" ? [{ id: "agent" as Tab, label: "Agent" }] : []),
    { id: "account",       label: "Account" },
    { id: "system",        label: "System" },
  ];

  return (
    <PageShell title="Settings" fullHeight>
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* Mobile: horizontal scrollable tabs */}
        <div className="md:hidden shrink-0 flex overflow-x-auto"
          style={{
            borderBottom: "1px solid var(--glass-border)",
            background: "var(--glass)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            scrollbarWidth: "none",
            gap: 0,
          }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px 16px", whiteSpace: "nowrap",
              background: "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: tab === n.id ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: tab === n.id ? 500 : 400,
              color: tab === n.id ? "var(--accent-light)" : "var(--text-tertiary)",
              transition: "all var(--dur-normal) var(--ease-out)",
              minHeight: 44,
            }}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Desktop: sidebar nav */}
        <div className="hidden md:flex shrink-0 flex-col py-3"
          style={{
            width: 180, borderRight: "1px solid var(--glass-border)", overflowY: "auto",
            background: "var(--glass)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", padding: "8px 16px",
              background: tab === n.id ? "var(--accent-soft)" : "transparent",
              borderTop: "none", borderRight: "none", borderBottom: "none",
              borderLeft: tab === n.id ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
              fontSize: 12, fontWeight: tab === n.id ? 500 : 400,
              color: tab === n.id ? "var(--accent-light)" : "var(--text-tertiary)",
              transition: "all var(--dur-normal) var(--ease-out)",
              minHeight: 36,
            }}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 md:px-8 md:py-7" style={{ maxWidth: 640 }}>

          {tab === "profile" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Profile</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Manage your identity and avatar.</p>
            {username ? (
              <div className="flex flex-col gap-4">
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
                    {currentAvatarSrc
                      ? <img src={currentAvatarSrc} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "2px solid var(--accent-border)" }} />
                      : <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--glass-strong)", border: "2px solid var(--glass-border)", flexShrink: 0 }} />
                    }
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.2 }}>{username}</p>
                      <p style={{ fontSize: 12, color: "var(--accent-light)", marginTop: 2 }}>Ausverse AI</p>
                    </div>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>Choose avatar</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                      {AVATARS.map((a) => (
                        <button key={a.id} onClick={() => !avatarSaving && selectAvatar(a.id)} disabled={avatarSaving}
                          className="transition-all"
                          style={{
                            background: "none",
                            border: avatar === a.id ? "2px solid var(--accent)" : "2px solid var(--glass-border)",
                            borderRadius: 8, padding: 2, cursor: "pointer",
                            opacity: avatarSaving ? 0.5 : 1,
                            boxShadow: avatar === a.id ? "0 0 8px rgba(220, 38, 38, 0.3)" : "none",
                          }}>
                          <img src={a.src} alt={a.label} style={{ width: "100%", aspectRatio: "1", borderRadius: 6, objectFit: "cover", display: "block" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card><Row label="Not logged in" last /></Card>
            )}
          </div>)}

          {tab === "appearance" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Appearance</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Customise how the interface looks.</p>
            <div className="flex flex-col gap-4">
              <Card>
                <SectionLabel>Theme</SectionLabel>
                <Row label="Color scheme" desc="Choose between dark, light, or system">
                  <Chips<Theme>
                    options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }]}
                    value={theme} onChange={applyTheme}
                  />
                </Row>
                <Row label="Font size" last>
                  <Chips<FontSize>
                    options={[{ value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]}
                    value={fontSize} onChange={applyFontSize}
                  />
                </Row>
              </Card>
              <Card>
                <SectionLabel>Background</SectionLabel>
                <div style={{ padding: "10px 18px 14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {BACKGROUNDS.map((bg) => (
                      <button key={bg.id} onClick={() => applyBackground(bg.id)}
                        className="transition-all"
                        style={{
                          width: "100%", aspectRatio: "16/10", borderRadius: 8, cursor: "pointer",
                          border: bgId === bg.id ? "2px solid var(--accent)" : "2px solid var(--glass-border)",
                          background: bg.url ? `url(${bg.url}) center/cover` : "var(--bg)",
                          boxShadow: bgId === bg.id ? "0 0 10px rgba(220, 38, 38, 0.3)" : "none",
                          position: "relative", overflow: "hidden",
                        }}>
                        <span style={{
                          position: "absolute", bottom: 4, left: 0, right: 0,
                          fontSize: 9, color: "white", textAlign: "center",
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)", fontWeight: 500,
                        }}>{bg.label}</span>
                      </button>
                    ))}

                    {/* Custom upload tile */}
                    <button
                      onClick={() => {
                        if (customBgUrl && bgId === "custom") return;
                        bgInputRef.current?.click();
                      }}
                      className="transition-all"
                      style={{
                        width: "100%", aspectRatio: "16/10", borderRadius: 8, cursor: "pointer",
                        border: bgId === "custom" ? "2px solid var(--accent)" : "2px dashed var(--glass-border)",
                        background: customBgUrl ? `url(${customBgUrl}) center/cover` : "var(--glass)",
                        boxShadow: bgId === "custom" ? "0 0 10px rgba(220, 38, 38, 0.3)" : "none",
                        position: "relative", overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: bgUploading ? 0.5 : 1,
                      }}>
                      {!customBgUrl && (
                        <span style={{ fontSize: 18, color: "var(--text-muted)", lineHeight: 1 }}>+</span>
                      )}
                      <span style={{
                        position: "absolute", bottom: 4, left: 0, right: 0,
                        fontSize: 9, color: "white", textAlign: "center",
                        textShadow: "0 1px 3px rgba(0,0,0,0.8)", fontWeight: 500,
                      }}>{bgUploading ? "Uploading..." : "Custom"}</span>
                    </button>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={bgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadBackground(file);
                      e.target.value = "";
                    }}
                  />

                  {/* Change / Remove buttons when custom is active */}
                  {bgId === "custom" && customBgUrl && (
                    <div className="fade-in" style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <Btn onClick={() => bgInputRef.current?.click()}>Change image</Btn>
                      <Btn onClick={() => {
                        fetch("/api/v1/background", { method: "DELETE" }).catch(() => {});
                        applyBackground("none");
                      }} variant="danger">Remove</Btn>
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <SectionLabel>Layout</SectionLabel>
                <Row label="Message density">
                  <Chips<Density>
                    options={[{ value: "compact", label: "Compact" }, { value: "default", label: "Default" }, { value: "comfortable", label: "Comfortable" }]}
                    value={density} onChange={applyDensity}
                  />
                </Row>
                <Row label="Show timestamps" last>
                  <Toggle value={timestamps} onChange={v => toggle("aia-timestamps", v, setTimestamps, "timestamps")} />
                </Row>
              </Card>
              <Card>
                <Row label="Reduce motion" desc="Disable animations throughout the interface" last>
                  <Toggle value={reducedMotion} onChange={v => { toggle("aia-reduced-motion", v, setReducedMotion, "reducedMotion"); document.documentElement.dataset.reducedMotion = v ? "true" : "false"; }} />
                </Row>
              </Card>
            </div>
          </div>)}

          {tab === "chat" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Chat</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Control how you interact with the AI.</p>
            <div className="flex flex-col gap-4">
              <Card>
                <SectionLabel>Input</SectionLabel>
                <Row label="Enter to send" desc="Press Enter to send. Shift+Enter for new line.">
                  <Toggle value={enterToSend} onChange={v => toggle("aia-enter-to-send", v, setEnterToSend, "enterToSend")} />
                </Row>
                <Row label="Streaming responses" last>
                  <Toggle value={streamResponses} onChange={v => toggle("aia-stream", v, setStreamResponses, "streamResponses")} />
                </Row>
              </Card>
              <Card>
                <SectionLabel>Behaviour</SectionLabel>
                <Row label="Auto-scroll">
                  <Toggle value={autoScroll} onChange={v => toggle("aia-autoscroll", v, setAutoScroll, "autoScroll")} />
                </Row>
                <Row label="Web search" desc="Allow the AI to search the web">
                  <Toggle value={webSearch} onChange={v => toggle("aia-web-search", v, setWebSearch, "webSearch")} />
                </Row>
                <Row label="Confirm delete" last>
                  <Toggle value={confirmDelete} onChange={v => toggle("aia-confirm-delete", v, setConfirmDelete, "confirmDelete")} />
                </Row>
              </Card>
            </div>
          </div>)}

          {tab === "notifications" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Notifications</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Choose how you're alerted.</p>
            <Card>
              <Row label="Sound effects" desc="Play a sound when a response completes">
                <Toggle value={soundEffects} onChange={v => toggle("aia-sounds", v, setSoundEffects, "soundEffects")} />
              </Row>
              <Row label="Desktop notifications" last>
                <Toggle value={desktopNotifs} onChange={async v => {
                  if (v && "Notification" in window) {
                    const perm = await Notification.requestPermission();
                    if (perm !== "granted") return;
                  }
                  toggle("aia-notifs", v, setDesktopNotifs, "desktopNotifs");
                }} />
              </Row>
            </Card>
          </div>)}

          {tab === "integrations" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Integrations</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Connect external tools to Ausverse AI.</p>
            <div className="flex flex-col gap-4">
              {keyStatus === "generated" && generatedKey && (
                <div className="fade-in" style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                }}>
                  <p style={{ fontSize: 11, color: "var(--success)", fontWeight: 500, marginBottom: 8 }}>Save this key — it won't be shown again</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{
                      flex: 1, fontSize: 11,
                      background: "var(--glass)", border: "1px solid var(--glass-border)",
                      borderRadius: 6, padding: "8px 10px", color: "var(--text-secondary)",
                      wordBreak: "break-all", lineHeight: 1.5,
                    }}>{generatedKey}</code>
                    <Btn onClick={copyKey} variant={keyCopied ? "primary" : "ghost"}>{keyCopied ? "Copied" : "Copy"}</Btn>
                  </div>
                </div>
              )}
              <Card>
                <Row label="API key" desc="Authenticate external apps with the Ausverse AI API" last>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {keyStatus === "revoked" && <p className="fade-in" style={{ fontSize: 12, color: "var(--success)" }}>Revoked</p>}
                    {(keyStatus === "exists" || keyStatus === "generated") && (
                      <Btn onClick={revokeApiKey} variant="danger">Revoke</Btn>
                    )}
                    <Btn onClick={generateApiKey}>
                      {keyStatus === "exists" || keyStatus === "generated" ? "Regenerate" : "Generate key"}
                    </Btn>
                  </div>
                </Row>
              </Card>
            </div>
          </div>)}

          {tab === "account" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Account</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Manage your data and preferences.</p>
            <div className="flex flex-col gap-4">
              <Card>
                <SectionLabel>Data</SectionLabel>
                <Row label="Chat history" desc="Delete all saved sessions">
                  <Btn onClick={clearSessions} variant={cleared ? "ghost" : "danger"}>
                    {cleared ? "Cleared" : "Clear all"}
                  </Btn>
                </Row>
                <Row label="Export data" last>
                  <Btn onClick={exportData}>
                    {exported ? "Downloaded" : "Export"}
                  </Btn>
                </Row>
              </Card>
              <Card>
                <Row label="Reset settings" desc="Restore all preferences to defaults" last>
                  <Btn onClick={resetSettings}>Reset</Btn>
                </Row>
              </Card>
            </div>
          </div>)}

          {tab === "agent" && environment === "Desktop" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>Agent</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Background intelligence agent that analyses your screen.</p>
            <div className="flex flex-col gap-4">
              <Card>
                <Row label="Enable AIA Agent" desc="Run the agent in the background with a global shortcut to capture and analyse anything on screen">
                  <Toggle value={agentEnabled} onChange={async (v) => {
                    setAgentEnabled(v);
                    const api = (window as unknown as { electronAPI?: { setAgentSettings?: (s: object) => Promise<unknown> } }).electronAPI;
                    if (api?.setAgentSettings) await api.setAgentSettings({ enabled: v });
                  }} />
                </Row>
                <Row label="Shortcut" desc="Global keyboard shortcut to trigger screen capture" last>
                  {recordingKeybind ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div
                        ref={(el) => { if (el) el.focus(); }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.key === "Escape") { setRecordingKeybind(false); return; }
                          if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
                          if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) return;

                          const mods: string[] = [];
                          const displayMods: string[] = [];
                          if (e.ctrlKey) { mods.push("CommandOrControl"); displayMods.push("Ctrl"); }
                          if (e.altKey) { mods.push("Alt"); displayMods.push("Alt"); }
                          if (e.shiftKey) { mods.push("Shift"); displayMods.push("Shift"); }
                          if (e.metaKey) { mods.push("Super"); displayMods.push("Win"); }

                          let key = "";
                          const code = e.code;
                          if (code.startsWith("Key")) key = code.slice(3);
                          else if (code.startsWith("Digit")) key = code.slice(5);
                          else if (/^F\d+$/.test(code)) key = code;
                          else key = KEY_CODE_MAP[code] || (e.key.length === 1 ? e.key.toUpperCase() : "");

                          if (!key) return;

                          const electronStr = [...mods, key].join("+");
                          const displayStr = [...displayMods, key].join("+");

                          setAgentShortcut(displayStr);
                          setRecordingKeybind(false);
                          const api = (window as unknown as { electronAPI?: { setAgentSettings?: (s: object) => Promise<unknown> } }).electronAPI;
                          if (api?.setAgentSettings) api.setAgentSettings({ shortcut: electronStr });
                        }}
                        onBlur={() => setTimeout(() => setRecordingKeybind(false), 200)}
                        style={{
                          fontSize: 12, color: "var(--accent-light)", fontFamily: "inherit",
                          padding: "5px 12px", borderRadius: 6,
                          background: "var(--accent-soft)", border: "1px solid var(--accent)",
                          outline: "none", minWidth: 140, textAlign: "center",
                        }}
                      >
                        Press a key combo&hellip;
                      </div>
                      <Btn onClick={() => setRecordingKeybind(false)}>Cancel</Btn>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <kbd style={{
                        fontSize: 12, color: agentEnabled ? "var(--text-secondary)" : "var(--text-muted)",
                        fontFamily: "inherit", background: "var(--glass)",
                        border: "1px solid var(--glass-border)", borderRadius: 5,
                        padding: "4px 10px", letterSpacing: 0.3,
                      }}>
                        {agentShortcut}
                      </kbd>
                      <Btn onClick={() => setRecordingKeybind(true)} disabled={!agentEnabled}>Change</Btn>
                    </div>
                  )}
                </Row>
              </Card>
              <Card>
                <SectionLabel>How it works</SectionLabel>
                <div style={{ padding: "10px 18px 16px" }}>
                  <div className="flex flex-col gap-3">
                    {[
                      { n: "1", text: "Press the shortcut anywhere — even outside the app" },
                      { n: "2", text: "Your screen freezes and you drag to select a region" },
                      { n: "3", text: "The AI analyses the selection and responds in an overlay" },
                    ].map((step) => (
                      <div key={step.n} className="flex gap-3 items-start">
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", flexShrink: 0, width: 18, textAlign: "right" }}>{step.n}</span>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              {!agentLoaded && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>Loading agent settings...</p>
              )}
            </div>
          </div>)}

          {tab === "system" && (<div className="fade-up">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: -0.3 }}>System</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>Technical information.</p>
            <div className="flex flex-col gap-4">
              <Card>
                <Row label="Environment">
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{environment}</p>
                </Row>
                <Row label="Platform">
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{platform}</p>
                </Row>
                <Row label="Version" last={environment !== "Desktop"}>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{environment === "Desktop" ? desktopVersion : environment}</p>
                </Row>
                {environment === "Desktop" && (
                  <Row label="Updates" desc={
                    updateStatus === "up-to-date" ? "You're on the latest version" :
                    updateStatus === "available" ? `v${updateVersion} is available` :
                    updateStatus === "error" ? "Couldn't reach update server" :
                    undefined
                  } last>
                    <Btn
                      onClick={async () => {
                        const api = (window as unknown as { electronAPI?: { checkForUpdates?: () => Promise<{ status: string; version?: string; message?: string }> } }).electronAPI;
                        setUpdateStatus("checking");
                        if (!api?.checkForUpdates) {
                          // Old Electron build without IPC support
                          await new Promise(r => setTimeout(r, 800));
                          setUpdateStatus("up-to-date");
                          setTimeout(() => setUpdateStatus("idle"), 5000);
                          return;
                        }
                        try {
                          const res = await api.checkForUpdates();
                          if (res.status === "available") {
                            setUpdateStatus("available");
                            setUpdateVersion(res.version || "");
                          } else if (res.status === "up-to-date") {
                            setUpdateStatus("up-to-date");
                          } else {
                            setUpdateStatus("error");
                          }
                        } catch {
                          setUpdateStatus("error");
                        }
                        setTimeout(() => setUpdateStatus("idle"), 5000);
                      }}
                      disabled={updateStatus === "checking"}
                    >
                      {updateStatus === "checking" ? "Checking..." :
                       updateStatus === "up-to-date" ? "Up to date" :
                       updateStatus === "available" ? "Update available" :
                       "Check for updates"}
                    </Btn>
                  </Row>
                )}
              </Card>
              <div className="card-glass" style={{ padding: "14px 18px" }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>User Agent</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, wordBreak: "break-all" }}>{ua}</p>
              </div>
            </div>
          </div>)}

        </div>
        </div>
      </div>
    </PageShell>
  );
}
