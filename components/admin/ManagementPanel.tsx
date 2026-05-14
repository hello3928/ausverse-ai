"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { AVATARS } from "@/lib/avatars";
import PageShell from "@/components/layout/PageShell";

type Section = "home" | "users" | "archive" | "announcements" | "logs";

interface User {
  id: string; username: string; role: string;
  approved: boolean; createdAt: string; lastLogin: string | null;
  loginCount: number; lastActive: string | null;
}
interface Stats { totalUsers: number; activeNow: number; }
interface ArchiveItem { id: string; title: string; type: string; filename: string; createdAt: string; pinned?: boolean; }
interface ManagementData { users: User[]; stats: Stats; }

const INPUT_CLS = "input-glass text-white placeholder-zinc-600 focus:outline-none px-3 py-2.5 text-sm w-full rounded-md";

const NAV: { key: Section; label: string }[] = [
  { key: "home",          label: "Overview" },
  { key: "users",         label: "Users" },
  { key: "archive",       label: "Archive" },
  { key: "announcements", label: "Announcements" },
  { key: "logs",          label: "Logs" },
];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" });
}

export default function ManagementPanel({ username }: { username: string }) {
  const [section, setSection] = useState<Section>("home");
  const [data, setData] = useState<ManagementData | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [archiveForm, setArchiveForm] = useState({ title: "", description: "", tags: "", type: "image" });
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [archiveMsg, setArchiveMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const archiveFileRef = useRef<HTMLInputElement>(null);

  const [announcement, setAnnouncement] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [annMsg, setAnnMsg] = useState("");

  const [logs, setLogs] = useState<{ out: string; error: string } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const logsOutRef = useRef<HTMLPreElement>(null);
  const logsErrRef = useRef<HTMLPreElement>(null);

  const uploadBtnRef = useRef<HTMLButtonElement>(null);
  const handleUploadBtnMouse = useCallback((e: React.MouseEvent) => {
    const btn = uploadBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    btn.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  async function load() {
    const res = await fetch("/api/v1/management");
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/v1/archive").then(r => r.json()).then(setArchiveItems);
    fetch("/api/v1/announcement").then(r => r.json()).then(d => { setAnnouncement(d.text ?? ""); setLiveAnnouncement(d.text ?? ""); });
    fetch("/api/v1/session/auth").then(r => r.json()).then(d => setAvatar(d.avatar ?? null));
  }, []);

  async function fetchLogs() {
    setLogsLoading(true);
    const res = await fetch("/api/v1/management/logs");
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
      setTimeout(() => {
        logsOutRef.current?.scrollTo(0, logsOutRef.current.scrollHeight);
        logsErrRef.current?.scrollTo(0, logsErrRef.current.scrollHeight);
      }, 50);
    }
    setLogsLoading(false);
  }

  useEffect(() => {
    if (section === "logs") fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  async function logout() {
    await fetch("/api/v1/session/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    window.location.href = "/";
  }

  async function patchUser(uname: string, fields: Record<string, unknown>) {
    await fetch("/api/v1/management", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: uname, ...fields }) });
    load();
  }

  async function deleteUser(uname: string) {
    if (!confirm(`Delete user "${uname}"?`)) return;
    await fetch("/api/v1/management", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: uname }) });
    load();
  }

  async function uploadArchive(e: React.FormEvent) {
    e.preventDefault();
    if (!archiveFile || !archiveForm.title) return;
    setUploading(true); setUploadProgress(0);
    const fd = new FormData();
    fd.append("file", archiveFile);
    fd.append("title", archiveForm.title);
    fd.append("description", archiveForm.description);
    fd.append("tags", JSON.stringify(archiveForm.tags.split(",").map(t => t.trim()).filter(Boolean)));
    fd.append("type", archiveForm.type);

    const ok = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.withCredentials = true;
      xhr.open("POST", "/api/v1/archive");
      xhr.send(fd);
    });

    setUploading(false); setUploadProgress(0);
    if (ok) {
      setArchiveForm({ title: "", description: "", tags: "", type: "image" });
      setArchiveFile(null);
      if (archiveFileRef.current) archiveFileRef.current.value = "";
      setArchiveMsg("Uploaded."); setTimeout(() => setArchiveMsg(""), 2500);
      fetch("/api/v1/archive").then(r => r.json()).then(setArchiveItems);
    }
  }

  async function deleteArchive(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/v1/archive/${id}`, { method: "DELETE" });
    fetch("/api/v1/archive").then(r => r.json()).then(setArchiveItems);
  }

  async function togglePin(id: string) {
    await fetch(`/api/v1/archive/${id}`, { method: "PATCH" });
    fetch("/api/v1/archive").then(r => r.json()).then(setArchiveItems);
  }

  async function publishAnn() {
    await fetch("/api/v1/announcement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: announcement }) });
    setLiveAnnouncement(announcement); setAnnMsg("Published."); setTimeout(() => setAnnMsg(""), 2500);
  }

  async function clearAnn() {
    await fetch("/api/v1/announcement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "" }) });
    setAnnouncement(""); setLiveAnnouncement(""); setAnnMsg("Removed."); setTimeout(() => setAnnMsg(""), 2500);
  }

  const avatarSrc = avatar ? AVATARS.find(a => a.id === avatar)?.src : null;

  return (
    <PageShell title="Management" fullHeight>
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar nav */}
        <div className="hidden md:flex shrink-0 flex-col py-3"
          style={{
            width: 180, borderRight: "1px solid var(--glass-border)", overflowY: "auto",
            background: "var(--glass)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          }}>
          {NAV.map((item) => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className="w-full flex items-center text-left transition-all"
              style={{
                padding: "8px 16px",
                background: section === item.key ? "var(--accent-soft)" : "transparent",
                borderTop: "none", borderRight: "none", borderBottom: "none",
                borderLeft: section === item.key ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer", fontFamily: "inherit",
                color: section === item.key ? "var(--accent-light)" : "var(--text-tertiary)",
                fontSize: 12, fontWeight: section === item.key ? 500 : 400,
                transition: "all var(--dur-normal) var(--ease-out)",
                minHeight: 36,
              }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile: horizontal tabs */}
        <div className="md:hidden shrink-0 flex overflow-x-auto w-full"
          style={{
            borderBottom: "1px solid var(--glass-border)",
            background: "var(--glass)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            scrollbarWidth: "none",
          }}>
          {NAV.map((item) => (
            <button key={item.key} onClick={() => setSection(item.key)} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px 16px", whiteSpace: "nowrap",
              background: "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: section === item.key ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: section === item.key ? 500 : 400,
              color: section === item.key ? "var(--accent-light)" : "var(--text-tertiary)",
              transition: "all var(--dur-normal) var(--ease-out)",
              minHeight: 44,
            }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto px-6 py-8" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>

        {section === "home" && (
          <div className="flex flex-col gap-6 max-w-4xl fade-up">
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.3 }}>Overview</h1>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Total users", value: data?.stats.totalUsers ?? "—" },
                { label: "Active now", value: data?.stats.activeNow ?? "—" },
                { label: "Pending", value: data?.users.filter(u => u.approved === false).length ?? "—" },
              ].map((card) => (
                <div key={card.label} className="card-glass p-4 flex flex-col gap-2">
                  <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>{card.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 600, color: "var(--accent-light)" }}>{String(card.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "users" && (
          <div className="flex flex-col gap-6 max-w-5xl fade-up">
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.3 }}>Users ({data?.users.length ?? 0})</h1>

            {(data?.users ?? []).filter(u => u.approved === false).length > 0 && (
              <div className="card-glass" style={{ overflow: "hidden" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-light)" }}>Pending approval</p>
                </div>
                {(data?.users ?? []).filter(u => u.approved === false).map((user) => (
                  <div key={user.id} className="px-4 py-3 flex items-center gap-4 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{user.username}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(user.createdAt)}</span>
                    <button onClick={() => patchUser(user.username, { approved: true })}
                      className="transition-all"
                      style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "var(--success)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
                      Approve
                    </button>
                    <button onClick={() => deleteUser(user.username)}
                      className="transition-colors hover:text-[var(--danger)]"
                      style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Deny</button>
                  </div>
                ))}
              </div>
            )}

            <div className="card-glass" style={{ overflow: "hidden" }}>
              <div className="grid gap-2 px-4 py-2" style={{ gridTemplateColumns: "160px 80px 130px 60px 100px", borderBottom: "1px solid var(--border)" }}>
                {["Username","Role","Last Login","Logins",""].map((h) => (
                  <span key={h} style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 0.3, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {(data?.users ?? []).filter(u => u.approved !== false).map((user) => (
                <div key={user.id} className="grid gap-2 px-4 py-2.5 items-center transition-colors"
                  style={{ gridTemplateColumns: "160px 80px 130px 60px 100px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }} className="truncate">{user.username}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{user.role}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(user.lastLogin)}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.loginCount ?? 0}</span>
                  <div className="flex gap-2 items-center">
                    <select value={user.role}
                      onChange={(e) => patchUser(user.username, { role: e.target.value })}
                      style={{ fontSize: 11, background: "var(--glass)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", borderRadius: 4, padding: "2px 6px", fontFamily: "inherit" }}>
                      <option value="user">user</option>
                      <option value="operator">operator</option>
                      <option value="admin">admin</option>
                    </select>
                    <button onClick={() => deleteUser(user.username)}
                      className="transition-colors hover:text-[var(--danger)]"
                      style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Del</button>
                  </div>
                </div>
              ))}
              {(!data || data.users.filter(u => u.approved !== false).length === 0) && (
                <p className="px-4 py-4" style={{ fontSize: 12, color: "var(--text-muted)" }}>No approved users.</p>
              )}
            </div>
          </div>
        )}

        {section === "archive" && (
          <div className="flex flex-col gap-6 max-w-3xl fade-up">
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.3 }}>Archive</h1>

            <div className="card-glass" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12 }}>Upload item</p>
              <form onSubmit={uploadArchive} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <input required value={archiveForm.title} onChange={(e) => setArchiveForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className={INPUT_CLS} />
                  <input value={archiveForm.tags} onChange={(e) => setArchiveForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma separated)" className={INPUT_CLS} />
                </div>
                <textarea value={archiveForm.description} onChange={(e) => setArchiveForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description..." className={`${INPUT_CLS} resize-none`} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={archiveForm.type} onChange={(e) => setArchiveForm(f => ({ ...f, type: e.target.value }))} className={INPUT_CLS}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="file">File</option>
                  </select>
                  <button type="button" onClick={() => archiveFileRef.current?.click()}
                    className="btn-glow-white transition-all"
                    style={{ fontSize: 12, padding: "8px 12px", textAlign: "left", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 6, color: archiveFile ? "var(--text-secondary)" : "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                    {archiveFile ? archiveFile.name : "Choose file..."}
                  </button>
                  <input ref={archiveFileRef} type="file" className="hidden" onChange={(e) => setArchiveFile(e.target.files?.[0] ?? null)} />
                </div>
                {uploading && (
                  <div className="flex flex-col gap-1">
                    <div style={{ height: 3, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        width: `${uploadProgress}%`, height: "100%",
                        background: uploadProgress === 100 ? "var(--success)" : "var(--accent)",
                        transition: "width 0.15s",
                        boxShadow: "0 0 8px rgba(220, 38, 38, 0.3)",
                      }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{uploadProgress < 100 ? `${uploadProgress}%` : "Processing..."}</p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button ref={uploadBtnRef} type="submit" disabled={uploading || !archiveFile}
                    onMouseMove={handleUploadBtnMouse}
                    className="btn-glow"
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "8px 16px",
                      background: "var(--accent)", color: "white",
                      borderRadius: 6, border: "1px solid var(--accent-border)",
                      fontFamily: "inherit", cursor: "pointer",
                      opacity: (uploading || !archiveFile) ? 0.3 : 1,
                    }}>
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                  {archiveMsg && <p className="fade-in" style={{ fontSize: 12, color: "var(--success)" }}>{archiveMsg}</p>}
                </div>
              </form>
            </div>

            <div className="card-glass" style={{ overflow: "hidden" }}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Items ({archiveItems.length})</p>
              </div>
              {archiveItems.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center gap-4 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.pinned && <span style={{ fontSize: 10, color: "var(--warning)", fontWeight: 500 }}>Pinned</span>}
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }} className="truncate">{item.title}</p>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{item.type} &middot; {fmt(item.createdAt)}</p>
                  </div>
                  <button onClick={() => togglePin(item.id)} className="transition-colors hover:text-[var(--accent-light)]" style={{ fontSize: 11, color: item.pinned ? "var(--warning)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    {item.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => deleteArchive(item.id, item.title)} className="transition-colors hover:text-[var(--danger)]" style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                </div>
              ))}
              {archiveItems.length === 0 && <p className="px-5 py-4" style={{ fontSize: 12, color: "var(--text-muted)" }}>No items.</p>}
            </div>
          </div>
        )}

        {section === "announcements" && (
          <div className="flex flex-col gap-6 max-w-3xl fade-up">
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.3 }}>Announcements</h1>
            <div className="card-glass" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12 }}>Sitewide banner</p>
              {liveAnnouncement && (
                <div className="mb-4 px-4 py-2.5 flex items-center justify-between gap-4 fade-in" style={{
                  background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
                  borderRadius: 6, fontSize: 13, color: "var(--text-primary)",
                }}>
                  <span>{liveAnnouncement}</span>
                  <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 500 }}>Live</span>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} rows={3} placeholder="Announcement text..." className={`${INPUT_CLS} resize-none`} />
                <div className="flex gap-3 items-center">
                  <button onClick={publishAnn} disabled={!announcement.trim()}
                    className="btn-glow"
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "8px 16px",
                      background: "var(--accent)", color: "white",
                      borderRadius: 6, border: "1px solid var(--accent-border)",
                      fontFamily: "inherit", cursor: "pointer",
                      opacity: !announcement.trim() ? 0.3 : 1,
                    }}>
                    Publish
                  </button>
                  {liveAnnouncement && (
                    <button onClick={clearAnn}
                      className="btn-glow-white"
                      style={{ fontSize: 12, padding: "8px 16px", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)", borderRadius: 6, background: "var(--glass)", fontFamily: "inherit", cursor: "pointer" }}>
                      Remove
                    </button>
                  )}
                  {annMsg && <p className="fade-in" style={{ fontSize: 12, color: "var(--success)" }}>{annMsg}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "logs" && (
          <div className="flex flex-col gap-6 max-w-5xl fade-up">
            <div className="flex items-center justify-between">
              <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.3 }}>Server Logs</h1>
              <button onClick={fetchLogs} disabled={logsLoading}
                className="btn-glow-white"
                style={{ fontSize: 12, padding: "6px 14px", background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)", borderRadius: 6, fontFamily: "inherit", cursor: "pointer", opacity: logsLoading ? 0.4 : 1 }}>
                {logsLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div className="card-glass" style={{ overflow: "hidden" }}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>stdout</p>
              </div>
              <pre ref={logsOutRef} className="px-5 py-4 overflow-y-auto" style={{
                fontFamily: "var(--font-jetbrains), monospace", fontSize: 11, lineHeight: 1.6,
                color: "var(--text-tertiary)", maxHeight: 400, whiteSpace: "pre-wrap", wordBreak: "break-all",
                scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
              }}>
                {logs?.out || (logsLoading ? "Loading..." : "No output.")}
              </pre>
            </div>

            <div className="card-glass" style={{ overflow: "hidden" }}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-light)" }}>stderr</p>
              </div>
              <pre ref={logsErrRef} className="px-5 py-4 overflow-y-auto" style={{
                fontFamily: "var(--font-jetbrains), monospace", fontSize: 11, lineHeight: 1.6,
                color: logs?.error ? "var(--danger)" : "var(--text-muted)", maxHeight: 300,
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent",
              }}>
                {logs?.error || (logsLoading ? "Loading..." : "No errors.")}
              </pre>
            </div>
          </div>
        )}

      </div>
      </div>
    </PageShell>
  );
}
