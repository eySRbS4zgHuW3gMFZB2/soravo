const HOST_ENV = "VITE_UMAMI_HOST_URL";
const WEBSITE_ID_ENV = "VITE_UMAMI_WEBSITE_ID";

export type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (name?: string, data?: AnalyticsData) => void;
    };
  }
}

function envValue(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : undefined;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(envValue(HOST_ENV) && envValue(WEBSITE_ID_ENV));
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

let trackerLoaded = false;

export function loadAnalytics(): void {
  if (trackerLoaded || !isAnalyticsEnabled()) return;
  const host = envValue(HOST_ENV)!;
  if (!isHttpUrl(host)) return;
  trackerLoaded = true;
  const websiteId = envValue(WEBSITE_ID_ENV)!;
  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.src = `${host.replace(/\/+$/, "")}/script.js`;
  script.setAttribute("data-website-id", websiteId);
  script.setAttribute("data-host-url", host);
  script.setAttribute("data-exclude-search", "true");
  script.setAttribute("data-exclude-hash", "true");
  document.head.appendChild(script);
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (!isAnalyticsEnabled()) return;
  window.umami?.track(name, data);
}