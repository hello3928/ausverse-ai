import Link from "next/link";

const ERRORS: Record<number, { title: string; message: string }> = {
  400: { title: "Malformed Request", message: "The request parameters are invalid." },
  401: { title: "Authorisation Required", message: "Valid credentials are required to access this resource." },
  403: { title: "Access Denied", message: "Your clearance level is insufficient for this resource." },
  404: { title: "Not Found", message: "This record does not exist or has been removed." },
  408: { title: "Request Timeout", message: "The operation took too long. Check your connection and retry." },
  429: { title: "Rate Limited", message: "Too many requests. Try again shortly." },
  500: { title: "Internal Error", message: "An unexpected error occurred. The incident has been logged." },
  502: { title: "Bad Gateway", message: "The upstream service returned an invalid response." },
  503: { title: "Service Unavailable", message: "This system is temporarily offline." },
  504: { title: "Gateway Timeout", message: "The upstream service did not respond in time." },
};

const FALLBACK = { title: "Unknown Error", message: "An unclassified error occurred." };

export default function ErrorPage({ code, reset }: { code: number; reset?: () => void }) {
  const { title, message } = ERRORS[code] ?? FALLBACK;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--bg)" }}>

      <div style={{ maxWidth: 400 }}>
        <p style={{ fontSize: 64, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1, letterSpacing: -2, marginBottom: 16 }}>
          {code}
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div className="flex items-center justify-center gap-3">
          {reset && (
            <button onClick={reset} style={{
              fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
              padding: "8px 18px", border: "1px solid var(--border)",
              borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontFamily: "inherit",
            }}>
              Retry
            </button>
          )}
          <Link href="/" style={{
            fontSize: 13, color: "var(--text-tertiary)",
            padding: "8px 18px", border: "1px solid var(--border)",
            borderRadius: 8, textDecoration: "none",
          }}>
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
