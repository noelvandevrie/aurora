/** Hour at which the room/beer state resets (matches the core's 06:00 daily reset). */
export const RESET_HOUR = 6;

/**
 * Resolve a "HH:mm" beer time to an absolute Date on the current *logical* day.
 * The day resets at 06:00, so between midnight and 06:00 an evening beer time
 * still belongs to the previous calendar day — otherwise a countdown would
 * wrongly restart towards today's beer time just after midnight.
 */
export function nextBeerTime(beerTime: string, from: Date): Date | null {
  const match = beerTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const target = new Date(from);
  target.setHours(hour, Number(match[2]), 0, 0);
  // Early morning (before the reset) + an evening beer time ⇒ it was yesterday.
  if (from.getHours() < RESET_HOUR && hour >= RESET_HOUR) {
    target.setDate(target.getDate() - 1);
  }
  return target;
}
