import { useEffect, useState, type ReactNode } from 'react';
import type { PublicRoomStatusResponse } from '@gewis/aurora-api-client';
import { nextBeerTime } from '@gewis/aurora-api-client/beer-time';

interface Props {
  status: PublicRoomStatusResponse;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-2 w-full max-w-[350px] bg-white p-6 text-left">
      <h1 className="mb-4 border-b-2 border-[#dddddd] pb-2 font-bold">{title}</h1>
      {children}
    </div>
  );
}

/** The round status dot used throughout the legacy page. */
export function StatusDot({ kind }: { kind: string }) {
  return <span className={`pc_status_color inline-block h-3 w-3 align-middle ${kind}`} />;
}

/** Coffee machine states (legacy 0..10 code): label and dot colour, as on the old page. */
const COFFEE_STATES: Record<number, { label: string; dot: string }> = {
  0: { label: 'It works ☕/🍵', dot: 'pc_free' },
  1: { label: 'Coffee, no tea ☕', dot: 'pc_locked' },
  2: { label: 'Tea, no coffee 🍵', dot: 'pc_locked' },
  3: { label: 'It partially works', dot: 'pc_locked' },
  4: { label: 'It does not work 😔', dot: 'pc_inuse' },
  5: { label: 'Cleaning 🧼', dot: 'pc_inuse' },
  6: { label: 'Daily clean needed 🕣', dot: 'pc_inuse' },
  7: { label: 'Technician has been called 🚚', dot: 'pc_inuse' },
  8: { label: 'Technician is fixing the machine 👷', dot: 'pc_inuse' },
  9: { label: '🪵', dot: 'pc_inuse' },
};
const COFFEE_UNKNOWN = { label: 'Unknown', dot: 'pc_offline' };

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Re-render every second so the beer countdown ticks like the legacy page. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function AlcoholStatus({ beerTime, lastCall }: { beerTime: string | null; lastCall: string | null }) {
  const now = useNow();
  const beer = beerTime ? nextBeerTime(beerTime, now) : null;
  if (!beerTime || !beer) {
    return (
      <>
        <StatusDot kind="pc_inuse" /> No beer time today
      </>
    );
  }
  if (beer.getTime() <= now.getTime()) {
    return (
      <>
        <StatusDot kind="pc_free" /> It&apos;s beer time! (since {beerTime})
        {lastCall && <div className="mt-2">Last call: {lastCall}</div>}
      </>
    );
  }
  return (
    <>
      <StatusDot kind="pc_inuse" /> You can have a beer at GEWIS in{' '}
      <span className="tabular-nums">{formatCountdown(beer.getTime() - now.getTime())}</span>
    </>
  );
}

/** The Room tab, in the legacy order: coffee, room (+ music), alcohol. */
export default function RoomStatusBlocks({ status }: Props) {
  const coffee = COFFEE_STATES[status.coffeeStatus] ?? COFFEE_UNKNOWN;

  return (
    <>
      <Block title="Coffee status">
        <StatusDot kind={coffee.dot} /> {coffee.label}
      </Block>

      <Block title="Room status">
        <StatusDot kind={status.open ? 'pc_free' : 'pc_inuse'} />{' '}
        {status.open ? 'GEWIS is open' : 'GEWIS is closed'}
        <h1 className="mt-8 mb-4 border-b-2 border-[#dddddd] pb-2 font-bold">Currently playing</h1>
        <span>{status.playingSong ?? '🔇 Nothing is playing'}</span>
      </Block>

      <Block title="Alcohol status">
        <AlcoholStatus beerTime={status.beerTime} lastCall={status.lastCall} />
      </Block>
    </>
  );
}
