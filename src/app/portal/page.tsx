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
