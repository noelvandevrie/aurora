import type { PublicRoomStatusResponse } from '@gewis/aurora-api-client';
import { nextBeerTime } from '@gewis/aurora-api-client/beer-time';
import useNow from '../useNow';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** The big open/closed banner, with today's beer time underneath. */
export default function StatusBanner({ status }: { status: PublicRoomStatusResponse }) {
  const now = useNow();
  const beer = status.beerTime ? nextBeerTime(status.beerTime, now) : null;

  let beerLine;
  if (!beer) {
    beerLine = <span className="opacity-80">No beer time today</span>;
  } else if (beer.getTime() <= now.getTime()) {
    beerLine = (
      <span>
        It&apos;s beer time! <span className="opacity-80">(since {status.beerTime})</span>
      </span>
    );
  } else {
    beerLine = (
      <span>
        Beer in <span className="font-bold tabular-nums">{formatCountdown(beer.getTime() - now.getTime())}</span>
      </span>
    );
  }

  return (
    <section className={`rounded-2xl p-6 text-white shadow-sm ${status.open ? 'bg-open' : 'bg-closed'}`}>
      <p className="text-xs font-medium tracking-widest uppercase opacity-80">GEWIS is</p>
      <p className="text-5xl leading-tight font-bold">{status.open ? 'Open' : 'Closed'}</p>
      <div className="mt-4 flex flex-col gap-1 border-t border-white/25 pt-4 text-lg">
        <p>
          <span aria-hidden>🍺 </span>
          {beerLine}
        </p>
        {status.lastCall && <p className="text-sm opacity-80">Last call at {status.lastCall}</p>}
      </div>
    </section>
  );
}
