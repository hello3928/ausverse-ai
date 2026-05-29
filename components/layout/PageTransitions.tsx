"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PageTransitions() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    // Skip the initial page load
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    // Every navigation (link click, back button, browser back):
    // snap to invisible, then fade in
    document.body.style.transition = "none";
    document.body.style.opacity = "0";

    requestAnimationFrame(() => {
      document.body.style.transition = "opacity 80ms ease-out";
      document.body.style.opacity = "1";
    });
  }, [pathname]);

  return null;
}
