import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Portal() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");
  const [a, s, f] = await Promise.all([
    sb
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    sb
      .from("seller_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    sb
      .from("fulfillment_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (a.data) redirect("/admin");
  if (s.data && f.data) {
    return (
      <main className="admin-login portal-role-picker-page">
        <section className="admin-panel portal-role-picker" aria-labelledby="portal-role-picker-title">
          <p className="portal-role-picker-eyebrow">OVERSTOCK / PORTAL</p>
          <h1 id="portal-role-picker-title">CHOOSE YOUR WORKSPACE</h1>
          <p className="portal-role-picker-copy">This account has access to both workspaces. Choose where you want to go.</p>
          <nav className="portal-role-options" aria-label="Choose a workspace">
            <Link className="portal-role-option" href="/seller">SELLER</Link>
            <Link className="portal-role-option" href="/fulfilment">FULFILMENT</Link>
          </nav>
        </section>
      </main>
    );
  }
  if (s.data) redirect("/seller");
  if (f.data) redirect("/fulfilment");
  return (
    <main className="admin-login">
      <section className="admin-panel">
        <h1>ACCESS PENDING</h1>
        <p>
          This email is not linked to an OVERSTOCK portal account. Use the
          secure invitation link sent to this address, or contact
          operations.overstock@gmail.com for help.
        </p>
      </section>
    </main>
  );
}
