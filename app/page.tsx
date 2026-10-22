/**
 * app/page.tsx  — Root route
 * Redirects authenticated users to their role dashboard,
 * unauthenticated users to /login.
 */

import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/dal";
import { ROLE_DASHBOARD } from "@/lib/roles";

export default async function RootPage() {
  const session = await getVerifiedSession();

  if (!session) {
    redirect("/login");
  }

  redirect(ROLE_DASHBOARD[session.role]);
}
