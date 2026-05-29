"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface MenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: false;
}

interface Separator {
  separator: true;
}

type MenuEntry = MenuItem | Separator;

export default function ContextMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const [isInput, setIsInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleContext = (e: MouseEvent) => {
      e.preventDefault();

      const sel = window.getSelection();
      setHasSelection(!!(sel && sel.toString().trim()));

      const target = e.target as HTMLElement;
      const editable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      setIsInput(editable);

      // Position menu, keep within viewport
      const x = Math.min(e.clientX, window.innerWidth - 180);
      const y = Math.min(e.clientY, window.innerHeight - 200);
      setPos({ x, y });
      setOpen(true);
    };

    const handleClick = () => close();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("contextmenu", handleContext);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("contextmenu", handleContext);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [close]);

  if (!open) return null;

  const items: MenuEntry[] = [
    {
      label: "Cut",
      shortcut: "Ctrl+X",
      disabled: !hasSelection || !isInput,
      action: () => document.execCommand("cut"),
    },
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      disabled: !hasSelection,
      action: () => document.execCommand("copy"),
    },
    {
      label: "Paste",
      shortcut: "Ctrl+V",
      disabled: !isInput,
      action: () => document.execCommand("paste"),
    },
    { separator: true },
    {
      label: "Select All",
      shortcut: "Ctrl+A",
      action: () => document.execCommand("selectAll"),
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        zIndex: 99999,
        minWidth: 170,
        padding: "4px",
        borderRadius: 10,
        background: "rgba(18, 18, 24, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.3)",
        animation: "ctxIn 100ms ease-out",
      }}
    >
      {items.map((item, i) =>
        "separator" in item && item.separator ? (
          <div
            key={i}
            style={{
              height: 1,
              margin: "4px 8px",
              background: "rgba(255,255,255,0.07)",
            }}
          />
        ) : (
          <button
            key={i}
            onClick={() => {
              if (!("disabled" in item && item.disabled)) {
                item.action();
              }
              close();
            }}
            disabled={"disabled" in item ? item.disabled : false}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "7px 10px",
              border: "none",
              borderRadius: 6,
              background: "none",
              color:
                "disabled" in item && item.disabled
                  ? "var(--text-muted)"
                  : "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor:
                "disabled" in item && item.disabled
                  ? "default"
                  : "pointer",
              transition: "background 80ms ease",
            }}
            onMouseEnter={(e) => {
              if (!("disabled" in item && item.disabled)) {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color =
                "disabled" in item && item.disabled
                  ? "var(--text-muted)"
                  : "var(--text-secondary)";
            }}
          >
            <span>{item.label}</span>
            {"shortcut" in item && item.shortcut && (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginLeft: 16,
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}
