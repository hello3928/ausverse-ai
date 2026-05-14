import { notFound } from "next/navigation";
import ErrorPage from "@/components/layout/ErrorPage";

const VALID_CODES = [400, 401, 403, 404, 408, 429, 500, 502, 503, 504];

export function generateStaticParams() {
  return VALID_CODES.map((code) => ({ code: String(code) }));
}

export default async function ErrorCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: codeStr } = await params;
  const code = parseInt(codeStr, 10);
  if (!VALID_CODES.includes(code)) notFound();
  return <ErrorPage code={code} />;
}
