/** Strip legacy dev prefixes from strings shown on client reports. */
export function sanitizeClientReportCopy(text: string): string {
  return text
    .replace(/^Placeholder:\s*/i, '')
    .replace(/\bPlaceholder:\s*/gi, '')
    .trim();
}
