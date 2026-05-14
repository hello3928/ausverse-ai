"use client";

import { useState, useRef, useEffect } from "react";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useIsIOS } from "@/hooks/useIsIOS";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMain from "@/components/chat/ChatMain";

interface UserInfo {
  loggedIn: boolean;
  username: string | null;
  clearance: string | null;
  role: string | null;
  approved: boolean;
  avatar: string | null;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({ loggedIn: false, username: null, clearance: null, role: null, approved: false, avatar: null });
  const [userInfoLoaded, setUserInfoLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isIOS = useIsIOS();
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string; mimeType: string; isText: boolean; textContent?: string } | null>(null);

  const {
    sessions, currentId, currentSession,
    setCurrentId, createSession, appendMessage,
    updateLastAssistantMessage, deleteSession,
  } = useChatSessions(userInfoLoaded ? userInfo.username : undefined);

  const activeSessionId = useRef<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    fetch("/api/v1/session/auth")
      .then((r) => r.json())
      .then((info) => { setUserInfo(info); setUserInfoLoaded(true); })
      .catch(() => { setUserInfoLoaded(true); });
    fetch("/api/v1/announcement")
      .then((r) => r.json())
      .then((d) => setAnnouncement(d.text ?? ""))
      .catch(() => {});
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.theme) {
          localStorage.setItem("aia-theme", s.theme);
          const resolved = s.theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : s.theme;
          document.documentElement.dataset.theme = resolved;
        }
        if (s.fontSize) { localStorage.setItem("aia-fontsize", s.fontSize); document.documentElement.dataset.fontsize = s.fontSize; }
        if (s.density)  { localStorage.setItem("aia-density", s.density);   document.documentElement.dataset.density = s.density; }
        if (typeof s.enterToSend === "boolean")    localStorage.setItem("aia-enter-to-send",   s.enterToSend   ? "true" : "false");
        if (typeof s.autoScroll === "boolean")     localStorage.setItem("aia-autoscroll",      s.autoScroll    ? "true" : "false");
        if (typeof s.timestamps === "boolean")     localStorage.setItem("aia-timestamps",      s.timestamps    ? "true" : "false");
        if (typeof s.reducedMotion === "boolean") {
          localStorage.setItem("aia-reduced-motion", s.reducedMotion ? "true" : "false");
          if (s.reducedMotion) document.documentElement.dataset.reducedMotion = "true";
          else delete document.documentElement.dataset.reducedMotion;
        } else if (localStorage.getItem("aia-reduced-motion") === "true") {
          document.documentElement.dataset.reducedMotion = "true";
        }
        if (typeof s.confirmDelete === "boolean")  localStorage.setItem("aia-confirm-delete",  s.confirmDelete ? "true" : "false");
        if (typeof s.streamResponses === "boolean") localStorage.setItem("aia-stream",         s.streamResponses ? "true" : "false");
        if (typeof s.webSearch === "boolean")      localStorage.setItem("aia-web-search",      s.webSearch     ? "true" : "false");
        if (typeof s.soundEffects === "boolean")   localStorage.setItem("aia-sounds",          s.soundEffects  ? "true" : "false");
        if (typeof s.desktopNotifs === "boolean")   localStorage.setItem("aia-notifs",          s.desktopNotifs ? "true" : "false");
        if (s.backgroundUrl) {
          document.documentElement.style.setProperty("--user-bg", `url(${s.backgroundUrl})`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isIOS || !window.visualViewport) return;
    const update = () => {
      document.documentElement.style.setProperty("--app-height", `${window.visualViewport!.height}px`);
    };
    update();
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
    return () => {
      window.visualViewport!.removeEventListener("resize", update);
      window.visualViewport!.removeEventListener("scroll", update);
    };
  }, [isIOS]);

  useEffect(() => {
    if (!userInfo.username) return;
    const ping = () =>
      fetch("/api/v1/ping", { method: "POST" }).catch(() => {});
    ping();
    const interval = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userInfo.username]);

  async function send() {
    const text = input.trim();
    if ((!text && !attachment) || loading || responding) return;

    let sessionId = currentId;
    if (!sessionId) sessionId = createSession();
    activeSessionId.current = sessionId;

    const history = currentSession?.messages ?? [];
    const userMsg = { role: "user" as const, content: text, imageUrl: (!attachment?.isText && attachment?.dataUrl) ? attachment.dataUrl : undefined };
    appendMessage(sessionId, userMsg);
    setInput("");
    const currentAttachment = attachment;
    setAttachment(null);
    setLoading(true);

    let apiContent: string | { type: string; [k: string]: unknown }[] = text;
    if (currentAttachment) {
      const parts: { type: string; [k: string]: unknown }[] = [];
      if (text) parts.push({ type: "text", text });
      if (currentAttachment.isText && currentAttachment.textContent) {
        parts.push({ type: "text", text: `[File: ${currentAttachment.name}]\n\`\`\`\n${currentAttachment.textContent.slice(0, 8000)}\n\`\`\`` });
      } else if (!currentAttachment.isText && currentAttachment.dataUrl) {
        if (!text) parts.push({ type: "text", text: "Analyse this file." });
        parts.push({ type: "image_url", image_url: { url: currentAttachment.dataUrl } });
      }
      apiContent = parts;
    }

    const apiMsg = { role: "user" as const, content: apiContent };
    const webSearchEnabled = localStorage.getItem("aia-web-search") !== "false";
    const res = await fetch("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...history.map(m => ({ role: m.role, content: m.content })), apiMsg],
        sessionId: sessionId ?? undefined,
        webSearch: webSearchEnabled,
      }),
    });

    if (!res.ok || !res.body) {
      appendMessage(sessionId, { role: "assistant", content: "[System offline]" });
      setLoading(false);
      return;
    }

    appendMessage(sessionId, { role: "assistant", content: "" });
    setLoading(false);
    setResponding(true);

    // Character-by-character typewriter effect
    let displayed = "";
    let charBuffer = "";
    let typing = true;
    let streamDone = false;
    const CHAR_DELAY = 18; // ms per character

    // Typewriter loop: pull characters from charBuffer and display one at a time
    async function typewriterLoop() {
      while (typing) {
        if (charBuffer.length > 0) {
          // Type out a character (or a small burst for speed)
          const charsToType = Math.min(charBuffer.length, charBuffer.length > 50 ? 3 : 1);
          displayed += charBuffer.slice(0, charsToType);
          charBuffer = charBuffer.slice(charsToType);
          const sid = activeSessionId.current;
          if (sid && isMounted.current) updateLastAssistantMessage(sid, displayed);
          await new Promise(r => setTimeout(r, CHAR_DELAY));
        } else if (streamDone) {
          break;
        } else {
          // Wait for more data
          await new Promise(r => setTimeout(r, 10));
        }
      }
      // Flush any remaining buffer
      if (charBuffer.length > 0) {
        displayed += charBuffer;
        charBuffer = "";
        const sid = activeSessionId.current;
        if (sid && isMounted.current) updateLastAssistantMessage(sid, displayed);
      }
    }

    const typePromise = typewriterLoop();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value);
      if (buffer.includes("[[SEARCHING]]")) {
        setSearching(true);
        buffer = buffer.replace("[[SEARCHING]]", "");
      }
      if (buffer) {
        setSearching(false);
        charBuffer += buffer;
        buffer = "";
      }
    }
    streamDone = true;
    await typePromise;
    setSearching(false);
    setResponding(false);

    // Sound effect
    if (localStorage.getItem("aia-sounds") === "true") {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }

    // Desktop notification
    if (localStorage.getItem("aia-notifs") === "true" && document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("Ausverse AI", { body: "Response complete.", icon: "/icon-192.png" }); } catch {}
    }
  }

  const messages = currentSession?.messages ?? [];

  if (!userInfoLoaded) {
    return <div style={{ height: "100dvh" }} />;
  }

  if (userInfoLoaded && userInfo.loggedIn && !userInfo.approved) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 fade-in" style={{ height: "100dvh" }}>
        <div className="card-glass flex flex-col items-center gap-5 text-center px-8 py-10" style={{ maxWidth: 400 }}>
          <div className="pulse-glow" style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
          }}>Av</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, letterSpacing: -0.3 }}>Pending approval</h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
              Your account <span style={{ color: "var(--accent-light)", fontWeight: 500 }}>{userInfo.username}</span> is awaiting administrator approval.
            </p>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/v1/session/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
              window.location.href = "/login";
            }}
            className="transition-colors hover:text-[var(--accent-light)]"
            style={{
              fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              marginTop: 4,
            }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (userInfoLoaded && !userInfo.loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 fade-in" style={{ height: "100dvh" }}>
        <div className="card-glass flex flex-col items-center gap-5 text-center px-8 py-10" style={{ maxWidth: 400 }}>
          <div className="pulse-glow" style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
          }}>Av</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, letterSpacing: -0.3 }}>Ausverse AI</h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
              Sign in to access the terminal.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <a href="/login" className="btn-red" style={{
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              padding: "9px 20px", borderRadius: 8,
            }}>Sign in</a>
            <a href="/signup" className="btn-glow-white" style={{
              fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)", textDecoration: "none",
              padding: "9px 20px", borderRadius: 8,
              background: "var(--glass)", border: "1px solid var(--glass-border)",
            }}>Request access</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: isIOS ? "var(--app-height, 100dvh)" : "100dvh", overflow: "hidden" }}>
      {announcement && (
        <div className="shrink-0 px-4 py-2 text-center fade-down"
          style={{
            background: "var(--accent-soft)", borderBottom: "1px solid var(--accent-border)",
            fontSize: 12, fontWeight: 500, color: "var(--accent-light)",
          }}>
          {announcement}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      <ChatSidebar
        sessions={sessions}
        currentId={currentId}
        onSelect={(id) => { setCurrentId(id); setInput(""); }}
        onNew={() => { createSession(); setInput(""); }}
        onDelete={deleteSession}
        username={userInfo.username}
        clearance={userInfo.clearance}
        role={userInfo.role}
        avatar={userInfo.avatar}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isIOS={isIOS}
      />
      <ChatMain
        messages={messages}
        loading={loading}
        responding={responding}
        searching={searching}
        input={input}
        onInputChange={setInput}
        onSend={send}
        attachment={attachment}
        onAttach={setAttachment}
        onMenuOpen={() => setSidebarOpen(true)}
        isIOS={isIOS}
        userAvatar={userInfo.avatar}
      />
      </div>
    </div>
  );
}
