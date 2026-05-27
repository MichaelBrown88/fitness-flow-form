/** Canonical coach-facing client AXIS report tab URL. */
export function clientReportPath(clientName: string, query?: Record<string, string>): string {
  const base = `/dashboard/clients/${encodeURIComponent(clientName.trim())}/report`;
  if (!query || Object.keys(query).length === 0) return base;
  const params = new URLSearchParams(query);
  return `${base}?${params.toString()}`;
}
