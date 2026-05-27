/** Match Cloud Functions `generateClientSlugFromName` for coach navigation. */
export function clientSlugFromName(clientName: string): string {
  const safe = (clientName || '').trim().replace(/\s+/g, ' ');
  return (safe || 'unnamed-client').toLowerCase().replace(/\s+/g, '-');
}
