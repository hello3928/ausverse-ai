import Link from "next/link";
import { getArchiveItem } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ArchiveItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ background: "var(--bg)" }}>
        <div style={{
          padding: "40px 48px", borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Access Denied</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>You must be logged in to view this</p>
        </div>
        <Link href="/login" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
          Back to login
        </Link>
      </div>
    );
  }

  const item = getArchiveItem(id);
  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ background: "var(--bg)" }}>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Item not found.</p>
        <Link href="/archive" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
          Back to archive
        </Link>
      </div>
    );
  }

  const fileUrl = `/api/archive/file/${item.filename}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-5 py-3.5 flex items-center gap-3 justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          {item.title}
        </h1>
        <Link href="/archive"
          className="shrink-0"
          style={{
            fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none",
            padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6,
          }}>
          Back
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-card)" }}>
          {item.type === "image" && (
            <img src={fileUrl} alt={item.title} className="w-full" style={{ maxHeight: 600, objectFit: "contain" }} />
          )}
          {item.type === "video" && (
            <video src={fileUrl} controls className="w-full" style={{ maxHeight: 600 }} />
          )}
          {item.type === "file" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
                {item.filename.split(".").pop()?.toUpperCase()} file
              </p>
              <a href={fileUrl} download style={{
                fontSize: 12, fontWeight: 500, background: "var(--text-primary)", color: "var(--bg)",
                padding: "8px 18px", borderRadius: 6, textDecoration: "none",
              }}>
                Download
              </a>
            </div>
          )}
        </div>

        <div style={{
          padding: "20px 24px", borderRadius: 10,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}>
          {item.description && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
              {item.description}
            </p>
          )}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {item.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 10, color: "var(--text-tertiary)", letterSpacing: 0.5,
                  padding: "3px 10px", borderRadius: 4,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 0.5 }}>
            Filed {new Date(item.createdAt).toLocaleDateString("en-AU", { dateStyle: "long" })}
          </p>
        </div>
      </div>
    </div>
  );
}
