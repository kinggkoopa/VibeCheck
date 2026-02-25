"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-elevated"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary-light">
          {email[0].toUpperCase()}
        </span>
        <span className="max-w-[150px] truncate text-muted">{email}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-surface p-1 shadow-lg">
          <button
            onClick={handleSignOut}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-surface-elevated"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
