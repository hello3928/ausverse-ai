"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArchiveItem } from "@/lib/data";
import SmartImage from "@/components/ui/SmartImage";

export default function ArchiveGrid({ items }: { items: ArchiveItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.tags.some((t) => t.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or tag…"
          className="w-full focus:outline-none"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 8, padding: "10px 40px 10px 14px",
            fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
            ✕
          </button>
        )}
      </div>

      <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 0.5 }}>
        {filtered.length} item{filtered.length !== 1 ? "s" : ""} on file
      </p>

      {filtered.length === 0 ? (
        <p className="text-center py-16" style={{ fontSize: 12, color: "var(--text-muted)" }}>No items found.</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {filtered.map((item) => (
              <Link key={item.id} href={`/archive/${item.id}`} style={{ textDecoration: "none" }}>
                <div className="group flex flex-col overflow-hidden transition-all hover:brightness-110"
                  style={{
                    background: "var(--bg-card)",
                    border: item.pinned ? "1px solid rgba(234,179,8,0.3)" : "1px solid var(--border)",
                    borderRadius: 10,
                  }}>
                  <div className="relative" style={{ aspectRatio: "16/9", background: "var(--bg)", borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
                    {item.type === "image" && (
                      <SmartImage src={`/api/archive/file/${item.filename}`} alt={item.title}
                        className="w-full h-full object-cover" style={{ opacity: 0.8 }} />
                    )}
                    {item.type === "video" && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span style={{ fontSize: 28, opacity: 0.25 }}>▶</span>
                      </div>
                    )}
                    {item.type === "file" && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                          {item.filename.split(".").pop()?.toUpperCase() ?? "FILE"}
                        </span>
                      </div>
                    )}
                    {item.pinned && (
                      <span style={{
                        position: "absolute", top: 8, right: 8,
                        fontSize: 10, color: "#eab308",
                      }}>▲</span>
                    )}
                  </div>

                  <div style={{ padding: "12px 14px" }} className="flex flex-col gap-2">
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }} className="truncate">
                      {item.title}
                    </p>
                    {item.description && (
                      <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                        {item.description.slice(0, 65)}{item.description.length > 65 ? "…" : ""}
                      </p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{
                            fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
                            color: "var(--text-muted)",
                            padding: "2px 6px", borderRadius: 3,
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
