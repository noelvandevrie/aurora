import type { PublicRoomStatusResponse } from '@gewis/aurora-api-client';

/** Hour at which the room/beer state resets (matches the server's 06:00). */
const RESET_HOUR = 6;

/**
 * Resolve a "HH:mm" beer time to an absolute Date on the current *logical* day.
 * The day resets at 06:00, so between midnight and 06:00 an evening beer time
 * still belongs to the previous calendar day — otherwise the countdown would
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

interface Props {
  status: PublicRoomStatusResponse | null;
}

interface BlockProps {
  title: string;
  children: React.ReactNode;
}

function Block({ title, children }: BlockProps) {
  return (
    <div className="mt-2 w-full max-w-[350px] bg-white p-6 text-left">
      <h1 className="mb-4 border-b-2 border-[#dddddd] pb-2 font-bold">{title}</h1>
      {children}
    </div>
  );
}

export default function RoomStatusBlocks({ status }: Props) {
  if (!status) {
    return (
      <Block title="Room status">
        <span>Room status unavailable</span>
      </Block>
    );
  }

  const beer = status.beerTime ? nextBeerTime(status.beerTime, new Date()) : null;
  const beerPassed = beer !== null && beer.getTime() <= Date.now();

  return (
    <>
      <Block title="Room status">
        <StatusDot kind={status.open ? 'pc_free' : 'pc_inuse'} />
        {' '}
        {status.open
          ? status.closedMessage || 'GEWIS is open'
          : status.closedMessage || 'GEWIS is closed'}
      </Block>

      {(status.playingSong || status.coffeeStatus !== 10) && (
        <Block title="Currently playing">
          <div className="flex items-center gap-2">
            <StatusDot kind="pc_inuse" />
            <span className="truncate">{status.playingSong ?? 'Not playing anything'}</span>
          </div>
        </Block>
      )}

      <Block title="Coffee status">
        <StatusDot kind={coffeeDot(status.coffeeStatus)} />
        {' '}
        {coffeeState(status.coffeeStatus).label}
      </Block>

      <Block title="Alcohol status">
        {!status.beerTime ? (
          <>
            <StatusDot kind="pc_inuse" /> No beer time set
          </>
        ) : beerPassed ? (
          <>
            <StatusDot kind="pc_free" /> It&apos;s beer time! (since {status.beerTime})
          </>
        ) : beer && (
          <>
            <StatusDot kind="pc_inuse" /> You can have a beer at GEWIS in{' '}
            <span className="tabular-nums">{formatCountdown(beer, new Date())}</span>
            {status.lastCall && (
              <div className="mt-2">
                <StatusDot kind="pc_locked" /> Last call: {status.lastCall}
              </div>
            )}
          </>
        )}
      </Block>
    </>
  );
}

function formatCountdown(target: Date, now: Date): string {
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

const COFFEE_DOT_BY_STATUS: Record<number, string> = {
  0: 'pc_free',
  1: 'pc_locked',
  2: 'pc_locked',
  3: 'pc_locked',
  4: 'pc_inuse',
  5: 'pc_inuse',
  6: 'pc_inuse',
  7: 'pc_inuse',
  8: 'pc_inuse',
  9: 'pc_inuse',
};

/** Dot colour for a coffee status, matching the legacy mapping. */
function coffeeDot(status: number): string {
  return COFFEE_DOT_BY_STATUS[status] ?? 'pc_offline';
}

export const COFFEE_LABELS: Record<number, string> = {
  0: 'It works ☕/🍵',
  1: 'Coffee, no tea ☕',
  2: 'Tea, no coffee 🍵',
  3: 'It partially works',
  4: 'It does not work 😔',
  5: 'Cleaning 🧼',
  6: 'Daily clean needed 🕣',
  7: 'Technician has been called 🚚',
  8: 'Technician is fixing the machine 👷',
  9: '🪵',
  10: 'Unknown',
};

export function coffeeState(status: number): { label: string; dot: string } {
  return { label: COFFEE_LABELS[status] ?? COFFEE_LABELS[10], dot: coffeeDot(status) };
}

/** The round status dot used throughout the legacy page. */
export function StatusDot({ kind }: { kind: string }) {
  return <span className={`pc_status_color inline-block h-3 w-3 align-middle ${kind}`} />;
}
