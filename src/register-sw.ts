import { registerSW } from "virtual:pwa-register";

const isPreviewHostname = (hostname: string) => {
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  if (["lovable.app", "gpt-eng.com", "gptengineer.run"].some(domain => hostname === `project--5adc5ea4-f194-4d78-8ed3-b12ab7f3df09-dev.${domain}`)) return true;
  if (hostname === "id-preview--5adc5ea4-f194-4d78-8ed3-b12ab7f3df09.lovable.app") return true;

  const previewDomain = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"]
    .some(domain => hostname.endsWith(domain));
  const firstLabel = hostname.split(".")[0];
  return previewDomain && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(firstLabel);
};

const unregisterAppWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter(registration => /\/(?:sw|service-worker)\.js$/.test(new URL(registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || location.origin + "/sw.js").pathname))
      .map(registration => registration.unregister()),
  );
};

const hostname = window.location.hostname.toLowerCase();
const shouldRefuse = !import.meta.env.PROD
  || window.self !== window.top
  || isPreviewHostname(hostname)
  || new URLSearchParams(window.location.search).get("sw") === "off";

if (shouldRefuse) {
  void unregisterAppWorkers();
} else if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}
