import type { JikanBroadcast } from '@/types/jikan';

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Converts a Jikan weekly broadcast slot (given in JST, e.g. "Sundays" +
 * "23:00") into the viewer's local weekday and time — e.g. "So · 16:30".
 *
 * JST has a fixed +9 offset (no DST), so we anchor to the upcoming JST
 * occurrence of the target weekday and read its local fields via the browser's
 * current offset. This handles both the day-shift across the date line and the
 * viewer's active DST. Returns null when the broadcast slot is unknown.
 */
export function formatBroadcastLocal(broadcast?: JikanBroadcast | null): string | null {
  if (!broadcast?.day || !broadcast?.time) return null;

  const key = broadcast.day.trim().toLowerCase().replace(/s$/, '');
  const dayJst = DAY_INDEX[key];
  if (dayJst === undefined) return null;

  const [hhStr, mmStr] = broadcast.time.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  // Find the JST calendar date in the coming week whose weekday matches, then
  // build the exact UTC instant for that JST wall-clock (JST = UTC+9).
  const nowMs = Date.now();
  for (let offset = 0; offset < 7; offset++) {
    const jst = new Date(nowMs + offset * 86400000 + 9 * 3600000);
    if (jst.getUTCDay() !== dayJst) continue;
    const utcMs = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(), hh - 9, mm);
    const local = new Date(utcMs);
    return `${DAY_DE[local.getDay()]} · ${pad(local.getHours())}:${pad(local.getMinutes())}`;
  }
  return null;
}
