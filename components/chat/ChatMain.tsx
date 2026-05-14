"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import type { Message } from "@/hooks/useChatSessions";
import ArchivePreviewInline from "@/components/archive/ArchivePreviewInline";
import { AVATARS } from "@/lib/avatars";

const ARCHIVE_RE = /\[ARCHIVE:([a-f0-9-]+)\]/g;

function parseContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match;
  ARCHIVE_RE.lastIndex = 0;
  while ((match = ARCHIVE_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<MarkdownBlock key={`md-${match.index}`} content={text.slice(last, match.index)} />);
    }
    parts.push(<ArchivePreviewInline key={match[1]} archiveId={match[1]} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<MarkdownBlock key={`md-end`} content={text.slice(last)} />);
  return parts;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      aria-label={copied ? "Copied" : "Copy code"}
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: copied ? "var(--success)" : "var(--text-muted)",
        padding: 4, borderRadius: 4, lineHeight: 0,
        transition: "color 0.15s ease",
      }}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors"
            style={{ color: "var(--accent-light)" }}>
            {children}
          </a>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          return isInline
            ? <code style={{ background: "var(--bg-elevated)", padding: "1px 5px", borderRadius: 4, fontSize: "0.88em", border: "1px solid var(--border)" }} {...props}>{children}</code>
            : <code className={className} {...props}>{children}</code>;
        },
        pre: ({ children }) => {
          const text = extractText(children);
          // Extract language from <code className="language-xxx">
          let lang = "";
          const child = Array.isArray(children) ? children[0] : children;
          if (child && typeof child === "object" && "props" in (child as Record<string, unknown>)) {
            const props = (child as { props?: { className?: string } }).props;
            const cls = props?.className ?? "";
            const match = cls.match(/language-(\w+)/);
            if (match) lang = match[1];
          }
          const LANG_LABELS: Record<string, string> = {
            js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", typescript: "TypeScript",
            jsx: "JSX", tsx: "TSX", py: "Python", python: "Python",
            rb: "Ruby", ruby: "Ruby", rs: "Rust", rust: "Rust", go: "Go",
            java: "Java", cpp: "C++", c: "C", cs: "C#", csharp: "C#",
            html: "HTML", css: "CSS", scss: "SCSS", json: "JSON", yaml: "YAML", yml: "YAML",
            xml: "XML", sql: "SQL", sh: "Shell", bash: "Bash", zsh: "Shell",
            php: "PHP", swift: "Swift", kt: "Kotlin", kotlin: "Kotlin",
            lua: "Lua", md: "Markdown", toml: "TOML", ini: "INI",
            dockerfile: "Dockerfile", makefile: "Makefile",
          };
          const label = LANG_LABELS[lang] ?? (lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "Code");
          return (
            <div style={{ margin: "8px 0" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--glass)", border: "1px solid var(--glass-border)",
                borderBottom: "none",
                borderRadius: "10px 10px 0 0", padding: "4px 8px 4px 14px",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: 0.3 }}>{label}</span>
                <CopyButton text={text} />
              </div>
              <pre style={{
                background: "var(--glass)", border: "1px solid var(--glass-border)",
                borderRadius: "0 0 10px 10px", padding: "14px 16px", overflow: "auto",
                fontSize: "0.85em", margin: 0, lineHeight: 1.65,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}>
                {children}
              </pre>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

function GlowButton({ onClick, disabled, children, className = "", isIOS }: {
  onClick: () => void; disabled: boolean; children: React.ReactNode; className?: string; isIOS: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    btn.style.setProperty("--mouse-x", `${x}%`);
    btn.style.setProperty("--mouse-y", `${y}%`);
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      className={`btn-glow shrink-0 disabled:opacity-20 ${className}`}
      style={{
        background: "var(--accent)", color: "white",
        border: "1px solid var(--accent-border)",
        cursor: disabled ? "default" : "pointer",
        padding: isIOS ? "10px 16px" : "8px 14px",
        borderRadius: 8,
        fontFamily: "inherit",
        fontSize: 12, fontWeight: 600,
        minHeight: isIOS ? 44 : undefined,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 12px rgba(220, 38, 38, 0.2)",
      }}>
      {children}
    </button>
  );
}

interface Attachment {
  name: string;
  dataUrl: string;
  mimeType: string;
  isText: boolean;
  textContent?: string;
}

interface Props {
  messages: Message[];
  loading: boolean;
  responding: boolean;
  searching: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  attachment: Attachment | null;
  onAttach: (a: Attachment | null) => void;
  onMenuOpen: () => void;
  isIOS: boolean;
  userAvatar: string | null;
}

export default function ChatMain({ messages, loading, responding, searching, input, onInputChange, onSend, attachment, onAttach, onMenuOpen, isIOS, userAvatar }: Props) {
  const avatarSrc = userAvatar ? AVATARS.find((a) => a.id === userAvatar)?.src : null;
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);

  useEffect(() => {
    setShowTimestamps(localStorage.getItem("aia-timestamps") === "true");
    // Listen for changes from settings page
    const onStorage = (e: StorageEvent) => {
      if (e.key === "aia-timestamps") setShowTimestamps(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const autoScroll = localStorage.getItem("aia-autoscroll") !== "false";
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/v1/status");
        const data = await res.json();
        const aiCheck = data.checks?.find((c: { name: string; status: string }) => c.name === "AI Engine");
        setAiOnline(aiCheck?.status === "operational");
      } catch {
        setAiOnline(false);
      }
    }
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const isText = file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".csv") || file.name.endsWith(".json") || file.name.endsWith(".md");
    const reader = new FileReader();
    if (isText) {
      reader.onload = () => {
        onAttach({ name: file.name, dataUrl: "", mimeType: file.type, isText: true, textContent: reader.result as string });
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        onAttach({ name: file.name, dataUrl: reader.result as string, mimeType: file.type, isText: false });
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ height: "100%" }}>

      {/* Header */}
      <div data-titlebar className={`shrink-0 flex items-center gap-3 px-5 titlebar-pad ${isIOS ? "ios-safe-top" : ""}`}
        style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass)", backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))", height: 48 }}>
        <button
          onClick={onMenuOpen}
          className="md:hidden shrink-0 flex flex-col gap-[5px] justify-center items-center transition-colors active:scale-95"
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 8, margin: -4, borderRadius: 8,
            minWidth: 36, minHeight: 36,
          }}
          aria-label="Open menu">
          <span style={{ display: "block", width: 16, height: 1.5, background: "var(--text-tertiary)", borderRadius: 1, transition: "background var(--dur-fast) var(--ease-out)" }} />
          <span style={{ display: "block", width: 12, height: 1.5, background: "var(--text-tertiary)", borderRadius: 1, transition: "background var(--dur-fast) var(--ease-out)" }} />
          <span style={{ display: "block", width: 16, height: 1.5, background: "var(--text-tertiary)", borderRadius: 1, transition: "background var(--dur-fast) var(--ease-out)" }} />
        </button>

        <div className="flex items-center gap-2.5 flex-1">
          <div className="relative" style={{ width: 8, height: 8, flexShrink: 0 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: aiOnline === false ? "var(--text-muted)" : aiOnline ? "var(--success)" : "var(--text-muted)",
              transition: "background 0.3s",
            }} />
            {aiOnline && (
              <div style={{
                position: "absolute", inset: -2, borderRadius: "50%",
                background: "var(--success)", opacity: 0.3,
                animation: "pulse-subtle 2s ease-in-out infinite",
              }} />
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: -0.2 }}>Ausverse AI</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", transition: "color 0.3s" }}>
            {aiOnline === null ? "connecting..." : aiOnline ? "online" : "offline"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-8 ios-scroll" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col px-5 md:px-10 max-w-[720px] mx-auto w-full" style={{ gap: "var(--chat-gap, 16px)" }}>

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-6 py-20 fade-in">
              <div className="pulse-glow" style={{
                width: 52, height: 52, borderRadius: 14,
                background: "var(--glass-strong)", border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              }}>
                Av
              </div>
              <div className="text-center">
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, letterSpacing: -0.3 }}>
                  How can I help?
                </p>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 320, lineHeight: 1.5 }}>
                  Ask anything. I have access to intelligence on all known subjects.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2" style={{ maxWidth: 420 }}>
                {["Explain the Nasties", "Who is Dylan V"].map((s) => (
                  <button key={s} onClick={() => { onInputChange(s); }}
                    className="btn-glow-white active:scale-95"
                    style={{
                      fontSize: 12, color: "var(--text-tertiary)", padding: "7px 14px",
                      borderRadius: 20, border: "1px solid var(--glass-border)",
                      background: "var(--glass)", cursor: "pointer", fontFamily: "inherit",
                      transition: "all var(--dur-normal) var(--ease-out)",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            // Hide empty assistant message while loading/searching to avoid double avatar
            if (m.role === "assistant" && !m.content && !m.imageUrl && (loading || searching || responding)) return null;
            return (
            <div key={i} className="msg-row group flex gap-3" style={{ flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
              {/* Avatar */}
              {m.role === "user" ? (
                avatarSrc ? (
                  <img src={avatarSrc} alt="" style={{
                    width: 28, height: 28, borderRadius: 8, objectFit: "cover", flexShrink: 0, marginTop: 2,
                    border: "1px solid var(--border)",
                  }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: "var(--glass-strong)", border: "1px solid var(--glass-border)",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  }} />
                )
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
                }}>Av</div>
              )}
              <div className="flex flex-col" style={{ maxWidth: "calc(80% - 40px)", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="attachment" className="max-h-64 object-contain"
                    style={{ borderRadius: 10, border: "1px solid var(--glass-border)" }} />
                )}
                {m.content && (
                  <div className="markdown-content" style={{
                    padding: "10px 14px", borderRadius: 12, fontSize: "var(--chat-fs, 13px)",
                    lineHeight: 1.6,
                    whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
                    ...(m.role === "user" ? {
                      background: "var(--glass-strong)",
                      border: "1px solid var(--glass-border)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    } : {
                      background: "var(--glass)",
                      border: "1px solid var(--glass-border)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }),
                    color: "var(--text-primary)",
                  }}>
                    {m.content
                      ? <>
                          {parseContent(m.content)}
                          {m.role === "assistant" && i === messages.length - 1 && responding && (
                            <span className="cursor-blink ml-0.5" style={{ color: "var(--accent-light)" }}>|</span>
                          )}
                        </>
                      : <span className="cursor-blink" style={{ color: "var(--accent-light)" }}>|</span>
                    }
                  </div>
                )}
                {m.timestamp && (
                  <span className={showTimestamps ? "" : "opacity-0 group-hover:opacity-100"} style={{
                    fontSize: 10, color: "var(--text-muted)",
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    transition: "opacity var(--dur-fast) var(--ease-out)",
                    paddingLeft: m.role === "assistant" ? 2 : 0,
                    paddingRight: m.role === "user" ? 2 : 0,
                  }}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          );
          })}

          {(loading || searching) && (
            <div className="flex gap-3 items-start fade-in">
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: "var(--accent-light)", letterSpacing: 0.5,
              }}>Av</div>
              <div style={{
                padding: "10px 14px", fontSize: 13, color: "var(--text-tertiary)",
                background: "var(--glass)", border: "1px solid var(--glass-border)",
                borderRadius: 12, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}>
                {searching
                  ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg className="spinner" width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="8" cy="8" r="6" stroke="var(--glass-border)" strokeWidth="2"/>
                        <path d="M14 8a6 6 0 00-6-6" stroke="var(--accent-light)" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Searching the web…
                    </span>
                  : <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="typing-dots" style={{ display: "flex", gap: 3 }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-light)", animation: "pulse-subtle 1.2s ease-in-out infinite", animationDelay: "0s" }} />
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-light)", animation: "pulse-subtle 1.2s ease-in-out infinite", animationDelay: "0.15s" }} />
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-light)", animation: "pulse-subtle 1.2s ease-in-out infinite", animationDelay: "0.3s" }} />
                      </span>
                    </span>
                }
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div className="shrink-0 px-5 md:px-10 pb-2 fade-up">
          <div className="max-w-[720px] mx-auto flex items-center gap-3">
            {!attachment.isText && attachment.dataUrl && (
              <img src={attachment.dataUrl} alt={attachment.name} className="h-12 object-cover"
                style={{ borderRadius: 8, border: "1px solid var(--glass-border)" }} />
            )}
            <div className="flex items-center gap-2 px-3 py-2 flex-1"
              style={{
                background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 8,
                fontSize: 12, color: "var(--text-secondary)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M11 5l-3-3-3 3M8 2v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
              <span className="flex-1 truncate">{attachment.name}</span>
              <button onClick={() => onAttach(null)}
                className="transition-colors hover:text-[var(--accent-light)]"
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`shrink-0 px-3 md:px-6 py-4 ${isIOS ? "ios-safe-bottom" : ""}`}
        style={{ borderTop: "1px solid var(--glass-border)" }}>
        <div className="max-w-[820px] mx-auto flex items-end gap-2 input-glass"
          style={{
            borderRadius: 12,
            padding: "6px 6px 6px 16px",
          }}>
          <input type="file" ref={fileRef} className="hidden" accept="image/*,text/*,.txt,.csv,.json,.md" onChange={handleFile} />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
            }}
            onKeyDown={(e) => {
              const enterToSend = localStorage.getItem("aia-enter-to-send") !== "false";
              if (e.key === "Enter" && (enterToSend ? !e.shiftKey : e.shiftKey) && !loading && !responding) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Message Ausverse AI..."
            rows={1}
            className={`flex-1 bg-transparent focus:outline-none resize-none ${isIOS ? "ios-input" : ""}`}
            style={{
              fontSize: isIOS ? 16 : 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              maxHeight: 200,
              lineHeight: 1.5,
              paddingTop: 6,
              paddingBottom: 6,
            }}
          />
          <button onClick={() => fileRef.current?.click()}
            className="shrink-0 transition-all hover:text-[var(--text-secondary)]"
            style={{
              background: "none", border: "none",
              color: "var(--text-muted)", cursor: "pointer",
              padding: isIOS ? "10px" : "8px",
              minWidth: isIOS ? 44 : undefined,
              minHeight: isIOS ? 44 : undefined,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title="Attach file">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <GlowButton
            onClick={onSend}
            disabled={(!input.trim() && !attachment) || loading || responding}
            isIOS={isIOS}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L7 9M14 2l-5 12-2-5-5-2 12-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </GlowButton>
        </div>
      </div>

    </div>
  );
}
