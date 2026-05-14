"use client";

import ErrorPage from "@/components/layout/ErrorPage";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorPage code={500} reset={reset} />;
}
