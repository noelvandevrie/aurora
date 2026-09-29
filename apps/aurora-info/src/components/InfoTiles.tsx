import type { ReactNode } from 'react';
import type { PublicRoomStatusResponse } from '@gewis/aurora-api-client';
import StatusDot, { type Tone } from './StatusDot';

/** Coffee machine states (legacy 0..10 code): label and dot colour, as on the old page. */
const COFFEE_STATES: Record<number, { label: string; tone: Tone }> = {
  0: { label: 'It works', tone: 'free' },
  1: { label: 'Coffee, no tea', tone: 'locked' },
  2: { label: 'Tea, no coffee', tone: 'locked' },
  3: { label: 'It partially works', tone: 'locked' },
  4: { label: 'It does not work', tone: 'busy' },
  5: { label: 'Cleaning', tone: 'busy' },
  6: { label: 'Daily clean needed', tone: 'busy' },
  7: { label: 'Technician has been called', tone: 'busy' },
  8: { label: 'Technician is fixing it', tone: 'busy' },
  9: { label: '🪵', tone: 'busy' },
};
const COFFEE_UNKNOWN = { label: 'Unknown', tone: 'offline' as Tone };

function Tile({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm">
      <p className="text-xs font-medium tracking-widest text-muted uppercase">
        <span aria-hidden>{icon} </span>
        {title}
      </p>
      <div className="font-medium">{children}</div>
    </section>
  );
}

/** Coffee machine and "now playing", side by side. */
export default function InfoTiles({ status }: { status: PublicRoomStatusResponse }) {
  const coffee = COFFEE_STATES[status.coffeeStatus] ?? COFFEE_UNKNOWN;
  // The core formats the song for display ("♫ Artist - Title" or "♫ Playing music"); the tile has its own icon.
  const song = status.playingSong?.replace(/^♫\s*/, '');

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile icon="☕" title="Coffee">
        <span className="flex items-center gap-2">
          <StatusDot tone={coffee.tone} />
          {coffee.label}
        </span>
      </Tile>
      <Tile icon="♫" title="Music">
        {song ? <span className="line-clamp-2">{song}</span> : <span className="text-muted">Nothing playing</span>}
      </Tile>
    </div>
  );
}
