"use client";

import { useEffect } from "react";

const VERSION = "0.1.0";

export default function ConsoleInit() {
  useEffect(() => {
    console.log(`AIA Shell v${VERSION} initialised`);
  }, []);

  return null;
}
