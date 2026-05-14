"use client";

import { useEffect } from "react";

export default function ConsoleBanner() {
  useEffect(() => {
    console.log(
      "%c Av %c Ausverse AI ",
      "background:#fafafa;color:#09090b;font-weight:800;font-size:11px;padding:4px 8px;border-radius:3px 0 0 3px;",
      "background:#18181b;color:#71717a;font-size:11px;padding:4px 8px;border-radius:0 3px 3px 0;border:1px solid #27272a;"
    );
  }, []);
  return null;
}
