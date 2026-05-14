import Link from "next/link";
import { getArchive } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import ArchiveGrid from "@/components/archive/ArchiveGrid";
import PageShell from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await getSessionUser();
  const items = user
    ? getArchive().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    : [];

  return (
    <PageShell title="Archive" actions={
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
    }>
      <div className="max-w-5xl mx-auto px-5 py-8">
        {!user ? (
          <p className="text-center py-16" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <Link href="/login" style={{ color: "var(--text-tertiary)" }}>Sign in</Link> to view the archive.
          </p>
        ) : (
          <ArchiveGrid items={items} />
        )}
      </div>
    </PageShell>
  );
}
