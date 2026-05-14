"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ArchiveItem } from "@/lib/data";

export default function ArchivePreviewInline({ archiveId }: { archiveId: string }) {
  const [item, setItem] = useState<ArchiveItem | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/archive/${archiveId}`)
      .then((r) => {
        if (!r.ok) { setError(true); return null; }
        return r.json();
      })
      .then((data) => data && setItem(data))
      .catch(() => setError(true));
  }, [archiveId]);

  if (error) {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        Archive item unavailable.
      </span>
    );
  }

  if (!item) {
    return (
      <span className="inline-block text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        Loading archive item…
      </span>
    );
  }

  return (
    <Link href={`/archive/${item.id}`} className="block my-2 no-underline group"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 8 }}>
      <div className="flex gap-3 p-3">
        {item.type === "image" && (
          <img src={`/api/v1/archive/file/${item.filename}`} alt={item.title}
            className="w-16 h-16 object-cover shrink-0" style={{ opacity: 0.85, borderRadius: 4 }} />
        )}
        {item.type === "video" && (
          <div className="w-16 h-16 shrink-0 flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4 }}>
            <span style={{ fontSize: 20, opacity: 0.5 }}>▶</span>
          </div>
        )}
        {item.type === "file" && (
          <div className="w-16 h-16 shrink-0 flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4 }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>FILE</span>
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
            {item.title}
          </span>
          {item.description && (
            <span className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              {item.description.slice(0, 80)}{item.description.length > 80 ? "…" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
