import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { PageIntro } from "../components/page-intro";
import { useAuth } from "../lib/auth-context";
import { DistributionBar, GrowthChart, type DistributionSegment } from "../components/admin/charts";
import { UserDirectory } from "../components/admin/user-directory";
import {
  GROWTH_WINDOW_DAYS,
  loadAdminMetrics,
  type AdminMetricsData,
  type GrowthUnit,
} from "../lib/admin-metrics-service";

type DashboardState =
  | { status: "idle" }
  | { status: "loading"; data: AdminMetricsData | null }
  | { status: "ready"; data: AdminMetricsData }
  | { status: "error"; message: string; data: AdminMetricsData };

const GROWTH_OPTIONS: { value: GrowthUnit; label: string }[] = [
  { value: "day", label: "Per day" },
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
];

const GROWTH_UNIT_LABEL: Record<GrowthUnit, string> = {
  day: "per day",
  week: "per week",
  month: "per month",
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 19).replace("T", " ")}Z`;
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base leading-snug font-medium">{label}</h3>
      </CardHeader>
      <CardContent>
        <p className="stat-value">{value}</p>
        {detail ? <p className="form-note">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

function DistributionSection({
  ariaId,
  heading,
  totalLabel,
  segments,
  summary,
}: {
  ariaId: string;
  heading: string;
  totalLabel: string;
  segments: DistributionSegment[];
  summary: string;
}) {
  return (
    <section aria-labelledby={ariaId}>
      <h2 id={ariaId} className="form-heading">
        {heading}
      </h2>
      <p className="form-note">
        {totalLabel}: {formatCount(segments.reduce((sum, segment) => sum + segment.value, 0))}. {summary}
      </p>
      <DistributionBar segments={segments} />
    </section>
  );
}

export function Admin() {
  const { client, user, loading, profile } = useAuth();
  const [growthUnit, setGrowthUnit] = useState<GrowthUnit>("day");
  const [reloadToken, setReloadToken] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardState>({ status: "idle" });

  const isOwner = profile?.role === "admin";

  useEffect(() => {
    if (!client || !isOwner) {
      setDashboard({ status: "idle" });
      return;
    }
    let cancelled = false;
    setDashboard((current) =>
      current.status === "ready" || current.status === "error"
        ? { status: "loading", data: current.data }
        : { status: "loading", data: null },
    );
    loadAdminMetrics(client, { unit: growthUnit, days: GROWTH_WINDOW_DAYS }).then((result) => {
      if (cancelled) return;
      setDashboard(
        result.error
          ? { status: "error", message: result.error, data: result.data }
          : { status: "ready", data: result.data },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [client, isOwner, growthUnit, reloadToken]);

  if (loading) {
    return (
      <PageIntro eyebrow="OWNER" title="Owner dashboard." lede="Loading your access…" />
    );
  }

  if (!user) {
    return (
      <PageIntro
        eyebrow="OWNER"
        title="Sign in to view the owner dashboard."
        lede="The owner dashboard shows activation, subscription, lifetime licence, and device aggregates for Soravo."
      >
        <div className="page-actions">
          <Link className="button small" to="/login">
            Go to sign in
          </Link>
        </div>
      </PageIntro>
    );
  }

  if (!profile) {
    return (
      <PageIntro eyebrow="OWNER" title="Owner dashboard." lede="Checking owner access…" />
    );
  }

  if (profile.role !== "admin") {
    return (
      <PageIntro
        eyebrow="OWNER"
        title="Owner access required."
        lede="This area is restricted to the product owner."
      >
        <div className="page-actions">
          <Link className="button small" to="/account">
            Go to your account
          </Link>
        </div>
      </PageIntro>
    );
  }

  const data = dashboard.status === "idle" ? null : dashboard.data;
  const totals = data?.totals ?? null;
  const devices = totals?.devices;
  const subscriptions = totals?.subscriptions;
  const lifetime = totals?.lifetime;
  const generatedAt = totals?.generated_at ? formatGeneratedAt(totals.generated_at) : null;

  const subscriptionSegments: DistributionSegment[] = subscriptions
    ? [
        { key: "active", label: "Active", value: subscriptions.active, color: "var(--chart-1)" },
        { key: "cancelled", label: "Cancelled", value: subscriptions.cancelled, color: "var(--chart-2)" },
        { key: "expired", label: "Expired", value: subscriptions.expired, color: "var(--chart-3)" },
      ]
    : [];

  const lifetimeSegments: DistributionSegment[] = lifetime
    ? [
        { key: "active", label: "Active", value: lifetime.active, color: "var(--chart-1)" },
        { key: "revoked", label: "Revoked", value: lifetime.revoked, color: "var(--chart-2)" },
      ]
    : [];

  const growthEmpty = data !== null && data.growth.length === 0;

  return (
    <PageIntro
      eyebrow="OWNER"
      title="Owner dashboard."
      lede="Activation, subscription, lifetime licence, and device aggregates for Soravo, plus a searchable user directory — never internal ids, provider references, or financial details."
    >
      {dashboard.status === "loading" && dashboard.data === null ? (
        <p className="form-note" role="status">
          Loading owner metrics…
        </p>
      ) : null}

      {dashboard.status === "error" ? (
        <div role="alert">
          <p className="form-error">{dashboard.message}</p>
          <div className="page-actions">
            <Button type="button" variant="outline" onClick={() => setReloadToken((token) => token + 1)}>
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {data !== null ? (
        <>
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="form-heading">
              Overview
            </h2>
            <div className="card-grid">
              <StatCard
                label="Registered users"
                value={totals ? formatCount(totals.total_users) : "—"}
                detail="Total product accounts"
              />
              <StatCard
                label="Paid users"
                value={totals ? formatCount(totals.paid_users) : "—"}
                detail="Users with an active paid entitlement"
              />
              <StatCard
                label="Active (last 30 days)"
                value={formatCount(data.activeUsers)}
                detail="Users with recorded activity in the past thirty days"
              />
              <StatCard
                label="Registered devices"
                value={devices ? formatCount(devices.total) : "—"}
                detail={
                  devices
                    ? `${devices.by_platform.macos} macOS · ${devices.by_platform.windows} Windows · ${devices.by_platform.linux} Linux · ${devices.revoked} revoked`
                    : undefined
                }
              />
            </div>
          </section>

          <section aria-labelledby="growth-heading">
            <h2 id="growth-heading" className="form-heading">
              New user growth
            </h2>
            <div className="filter-row" role="group" aria-label="Growth granularity">
              {GROWTH_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={growthUnit === option.value ? "default" : "outline"}
                  aria-pressed={growthUnit === option.value}
                  onClick={() => setGrowthUnit(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {growthEmpty ? (
              <p className="form-note" role="status">
                No new-user activity in this window yet.
              </p>
            ) : (
              <GrowthChart buckets={data.growth} unitLabel={GROWTH_UNIT_LABEL[growthUnit]} />
            )}
          </section>

          {totals && subscriptions ? (
            <DistributionSection
              ariaId="subscriptions-distribution"
              heading="Monthly subscriptions"
              totalLabel="Subscription count"
              segments={subscriptionSegments}
              summary="Status split across the active monthly plan."
            />
          ) : null}

          {totals && lifetime ? (
            <DistributionSection
              ariaId="lifetime-distribution"
              heading="Lifetime licences"
              totalLabel="Licence count"
              segments={lifetimeSegments}
              summary="Active and revoked lifetime licenses."
            />
          ) : null}

          {generatedAt ? (
            <p className="form-note">
              Snapshot generated {generatedAt} (UTC).
            </p>
          ) : null}
        </>
      ) : null}

      {client ? <UserDirectory client={client} /> : null}
    </PageIntro>
  );
}

export default Admin;