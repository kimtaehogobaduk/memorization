# Architecture

- Use `vite-plugin-pwa` with `generateSW` for offline app-shell support; register only through `src/register-sw.ts`, never in development or Lovable preview contexts, to avoid stale previews.
- Store authenticated offline vocabulary snapshots and pending cloud mutations in per-user IndexedDB; keep guest data in the existing localStorage service so accounts remain isolated and local edits can sync later.
- Keep logo rotation in an app-level provider using uploaded asset pointers, so browser tab and fixed-size headers share one sequence across navigation with reduced-motion-aware transitions.
