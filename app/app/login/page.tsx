import { redirect } from "next/navigation";

// Marketing CTA target — the tenant login lives in the /app portal.
export default function LoginRedirect() {
  redirect("/app/login");
}
