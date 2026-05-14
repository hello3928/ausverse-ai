"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

function localKey(username: string) {
  return `aia_sessions_${username}_local`;
}

function loadLocal(username: string): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(localKey(username)) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocal(username: string, sessions: ChatSession[]) {
  localStorage.setItem(localKey(username), JSON.stringify(sessions));
}

// username: undefined = still loading, null = guest, string = logged in
export function useChatSessions(username: string | null | undefined) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sessions on mount
  useEffect(() => {
    if (username === undefined) return;

    if (!username) {
      // Guest: use sessionStorage-scoped local store
      try {
        let bsid = sessionStorage.getItem("aia_bsid");
        if (!bsid) { bsid = crypto.randomUUID().slice(0, 8); sessionStorage.setItem("aia_bsid", bsid); }
        const key = `aia_sessions_guest_${bsid}`;
        const s = JSON.parse(localStorage.getItem(key) ?? "[]") as ChatSession[];
        setSessions(s);
        setCurrentId(s[0]?.id ?? null);
      } catch {}
      return;
    }

    // Logged in: fetch from server, fall back to local cache
    fetch("/api/v1/sessions")
      .then((r) => r.json())
      .then((data) => {
        const serverSessions: ChatSession[] = data.sessions ?? [];
        if (serverSessions.length > 0) {
          setSessions(serverSessions);
          setCurrentId(serverSessions[0].id);
          saveLocal(username, serverSessions);
        } else {
          // No server sessions yet — use local cache if any
          const local = loadLocal(username);
          setSessions(local);
          setCurrentId(local[0]?.id ?? null);
          if (local.length > 0) syncToServer(local);
        }
      })
      .catch(() => {
        const local = loadLocal(username);
        setSessions(local);
        setCurrentId(local[0]?.id ?? null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function syncToServer(updated: ChatSession[]) {
    if (!username) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: updated }),
      }).catch(() => {});
    }, 1500);
  }

  function persist(updated: ChatSession[]) {
    if (username) {
      saveLocal(username, updated);
      syncToServer(updated);
    } else {
      try {
        let bsid = sessionStorage.getItem("aia_bsid");
        if (!bsid) { bsid = crypto.randomUUID().slice(0, 8); sessionStorage.setItem("aia_bsid", bsid); }
        localStorage.setItem(`aia_sessions_guest_${bsid}`, JSON.stringify(updated));
      } catch {}
    }
  }

  const createSession = useCallback((): string => {
    const id = crypto.randomUUID();
    const session: ChatSession = { id, title: "New session", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions((prev) => {
      const updated = [session, ...prev];
      persist(updated);
      return updated;
    });
    setCurrentId(id);
    return id;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const appendMessage = useCallback((sessionId: string, message: Message) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;
        const msg = { ...message, timestamp: message.timestamp ?? Date.now() };
        const messages = [...s.messages, msg];
        const title = s.messages.length === 0 && message.role === "user"
          ? (message.content || "📎 File").slice(0, 40)
          : s.title;
        return { ...s, messages, title, updatedAt: Date.now() };
      });
      persist(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const updateLastAssistantMessage = useCallback((sessionId: string, content: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;
        const messages = [...s.messages];
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = { ...last, role: "assistant", content };
        return { ...s, messages, updatedAt: Date.now() };
      });
      persist(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      persist(updated);
      if (currentId === sessionId) setCurrentId(updated[0]?.id ?? null);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, currentId]);

  const currentSession = sessions.find((s) => s.id === currentId) ?? null;

  return { sessions, currentId, currentSession, setCurrentId, createSession, appendMessage, updateLastAssistantMessage, deleteSession };
}
