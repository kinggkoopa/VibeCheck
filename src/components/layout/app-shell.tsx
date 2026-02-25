import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { NoKeyBanner } from "@/components/no-key-banner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b border-border px-6">
          <UserMenu />
        </header>
        <Suspense fallback={null}>
          <NoKeyBanner />
        </Suspense>
        <OfflineBanner />
        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
