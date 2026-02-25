import { getAnalyticsOverview } from "@/features/analytics/actions";
import { ProfileDashboard } from "@/components/ProfileDashboard";
import { UsageTracker } from "@/components/UsageTracker";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const overview = await getAnalyticsOverview();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vibe Profile &amp; Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Your coding vibe at a glance. Track usage patterns, score trends, and
          get personalized improvement suggestions.
        </p>
      </div>

      <UsageTracker />
      <ProfileDashboard overview={overview} />
    </div>
  );
}
