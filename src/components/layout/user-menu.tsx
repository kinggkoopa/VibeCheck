"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted">{email}</span>
      <button
        onClick={handleSignOut}
        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
