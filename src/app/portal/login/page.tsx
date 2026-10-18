import PortalLoginForm from "./portal-login-form";

type SearchParams = Promise<{
  mode?: string | string[];
  email?: string | string[];
}>;

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const initialMode = params.mode === "register" && email ? "register" : "login";

  return (
    <PortalLoginForm initialMode={initialMode} invitationEmail={email} />
  );
}
