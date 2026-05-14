"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IOSInstallButton() {
  const [show] = useState(() => {
    if (typeof window === "undefined") return false;
    const isPhone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isElectron = /Electron/i.test(navigator.userAgent);
    return !isPhone && !isElectron;
  });
  const router = useRouter();

  if (!show) return null;

  return (
    <button
      onClick={() => router.push("/install")}
      className="flex items-center gap-2.5 px-3 py-2 mb-0.5 w-full"
      style={{ background: "none", border: "none", cursor: "pointer", textDecoration: "none", color: "var(--text-tertiary)", fontSize: 12, fontFamily: "inherit", borderRadius: 6 }}>
      Install App
    </button>
  );
}
