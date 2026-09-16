// WEB-009 charts.
//
// Zero-dependency, accessible visualisations (85_ACCESSIBILITY_BASELINE.md
// WCAG 1.4.11 / 1.4.13 / 3.1): every visual is accompanied by text —
// exact data in a visually-hidden list for screen readers and colour is
// never the only carrier of meaning. Charts render no user identifiers
// (09_SECURITY_BASELINE.md §4) — only calendar-aligned aggregates.

export type GrowthBucket = {
  bucket: string;
  new_users: number;
};

export type DistributionSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function formatBucketLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function GrowthChart({
  buckets,
  unitLabel,
}: {
  buckets: GrowthBucket[];
  unitLabel: string;
}) {
  const values = buckets.map((bucket) => bucket.new_users);
  const total = values.reduce((sum, value) => sum + value, 0);
  const max = Math.max(1, ...values);
  const width = 640;
  const height = 200;
  const padX = 12;
  const padY = 18;
  const slot = (width - padX * 2) / Math.max(1, buckets.length);
  const barWidth = Math.min(36, Math.max(2, slot - 8));
  const labelStep = buckets.length <= 12 ? 1 : Math.ceil(buckets.length / 12);

  return (
    <div className="chart-block">
      <div
        className="chart-canvas"
        role="img"
        aria-label={`New registered users ${unitLabel}, latest ${buckets.length} ${
          buckets.length === 1 ? "bucket" : "buckets"
        }. Total new users: ${total}. Peak: ${max}.`}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${width} ${height}`}
          role="presentation"
          width="100%"
          height={height}
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = padY + (height - padY * 2) * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text x={padX} y={y - 4} fontSize={9} fill="#53625a">
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}
          {buckets.map((bucket, index) => {
            const barHeight = (bucket.new_users / max) * (height - padY * 2);
            const x = padX + slot * index + (slot - barWidth) / 2;
            const y = height - padY - barHeight;
            return (
              <g key={`${index}-${bucket.bucket}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill="var(--chart-1)"
                />
                {index % labelStep === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 4}
                    fontSize={9}
                    textAnchor="middle"
                    fill="#53625a"
                  >
                    {formatBucketLabel(bucket.bucket)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {buckets.map((bucket, index) => (
          <li key={`${index}-${bucket.bucket}`}>
            {bucket.bucket ? formatBucketLabel(bucket.bucket) : "—"}: {bucket.new_users} new users
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DistributionBar({ segments }: { segments: DistributionSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const hasData = total > 0;
  return (
    <div className="distribution">
      <div
        aria-hidden="true"
        className="distribution-bar"
        role="presentation"
      >
        {hasData ? (
          segments.map((segment) => (
            <span
              key={segment.key}
              style={{
                width: `${(segment.value / total) * 100}%`,
                backgroundColor: segment.color,
              }}
            />
          ))
        ) : (
          <span className="distribution-bar-empty" style={{ width: "100%" }} />
        )}
      </div>
      <ul className="distribution-key">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="distribution-dot" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span>{segment.label}</span>
            <span className="distribution-count">{segment.value}</span>
            <span className="distribution-share">
              {hasData ? `${Math.round((segment.value / total) * 100)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}