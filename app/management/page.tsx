import { redirect } from "next/navigation";
import { getManagementUser } from "@/lib/auth";
import ManagementPanel from "@/components/admin/ManagementPanel";

export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  const user = await getManagementUser();
  if (!user) redirect("/login");
  return <ManagementPanel username={user.username} />;
}
