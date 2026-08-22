import { redirect } from "next/navigation";

// Marketing CTA target — the tenant signup lives in the /app portal.
export default function RegisterRedirect() {
  redirect("/app/signup");
}
