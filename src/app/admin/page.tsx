import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin)
    return (
      <main className="admin-login">
        <section className="admin-panel">
          <h1>ACCESS PENDING</h1>
          <p>
            This account is signed in but is not registered as the OVERSTOCK
            administrator.
          </p>
        </section>
      </main>
    );
  return <AdminDashboard email={user.email ?? "Administrator"} />;
}
