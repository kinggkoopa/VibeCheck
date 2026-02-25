import { AppShell } from "@/components/layout/app-shell";

// Authenticated pages require Supabase session — never statically prerender
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
