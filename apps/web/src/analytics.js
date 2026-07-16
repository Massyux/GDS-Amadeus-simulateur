// Cloudflare Web Analytics (missions/MISSION-07.md Partie A): cookieless,
// no consent banner needed. The beacon token is supplied via the
// VITE_CF_BEACON_TOKEN build-time env var (Cloudflare Pages -> Settings ->
// Environment variables) so Massy can turn this on/off without touching
// code. Empty by default -- a no-op, no external script is ever injected
// until he configures it himself (same pattern as VITE_FALLBACK_KEY_HASHES).
export function initAnalytics() {
  const token = import.meta.env.VITE_CF_BEACON_TOKEN;
  if (!token) return;
  if (document.querySelector("script[data-cf-beacon]")) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  document.head.appendChild(script);
}
