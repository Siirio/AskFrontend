import { redirect } from "next/navigation";

/** /app/auth → the auth surface is two pages now (login / register); default to
 *  login. Kept so the /app/auth URL (architecture §2, the smoke test) resolves. */
export default function AuthRoute() {
  redirect("/app/auth/login");
}
