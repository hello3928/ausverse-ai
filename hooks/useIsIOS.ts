"use client";

import { useState } from "react";

export function useIsIOS(): boolean {
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream;
  });

  return !!isIOS;
}
