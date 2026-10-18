import { redirect } from "next/navigation";

export default function PortalRegisterRedirect() {
  redirect("/portal/login");
}
