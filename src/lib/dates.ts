// Dates on the site are UTC, from the archived creation timestamp. Visitors
// come from every time zone; the artwork page may add the viewer's local time
// beside the UTC instant, never instead of it.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
function parts(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${iso}`);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
  };
}
/** "May 7, 2022" */
export function formatUtcDate(iso: string): string {
  const d = parts(iso);
  return `${LONG_MONTHS[d.month]} ${d.day}, ${d.year}`;
}
/** "May 7, 2022, 12:07 UTC" */
export function formatUtcDateTime(iso: string): string {
  const d = parts(iso);
  const hh = String(d.hours).padStart(2, '0');
  const mm = String(d.minutes).padStart(2, '0');
  return `${formatUtcDate(iso)}, ${hh}:${mm} UTC`;
}
/** A compact span: "May 7 to 30, 2022", "Mar 25 to Jun 4, 2022", "Oct 20, 2021 to Dec 14, 2024". */
export function formatUtcSpan(dates: string[]): string | null {
  const sorted = dates.filter(Boolean).sort();
  if (!sorted.length) return null;
  const a = parts(sorted[0]);
  const b = parts(sorted[sorted.length - 1]);
  if (a.year === b.year && a.month === b.month && a.day === b.day)
    return `${MONTHS[a.month]} ${a.day}, ${a.year}`;
  if (a.year === b.year && a.month === b.month)
    return `${MONTHS[a.month]} ${a.day} to ${b.day}, ${a.year}`;
  if (a.year === b.year)
    return `${MONTHS[a.month]} ${a.day} to ${MONTHS[b.month]} ${b.day}, ${a.year}`;
  return `${MONTHS[a.month]} ${a.day}, ${a.year} to ${MONTHS[b.month]} ${b.day}, ${b.year}`;
}
