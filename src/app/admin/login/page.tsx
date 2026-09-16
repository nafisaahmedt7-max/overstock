import { redirect } from "next/navigation";

export default function LegacyAdminLogin() {
  redirect("/portal/login");
}
