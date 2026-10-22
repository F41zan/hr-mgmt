"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Shown on 401 pages. A 401 means the session cookie is missing or no longer
 * valid (e.g. the account was deactivated or deleted). The middleware only
 * checks the cookie's signature, so a stale-but-signed cookie would bounce
 * /login straight back here. Clearing it first breaks that loop.
 */
export default function SignInAgainButton() {
  const router = useRouter();
  const cleared = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    cleared.current = fetch("/api/auth/logout", { method: "POST" }).catch(
      () => {},
    );
  }, []);

  async function signIn() {
    await (cleared.current ??
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {}));
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={signIn} className="btn-primary">
      Sign in
    </button>
  );
}
