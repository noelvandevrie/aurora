import { PcStatusType, type PublicPcStatusResponse } from '@gewis/aurora-api-client';
import useNow from '../useNow';
import StatusDot, { type Tone } from './StatusDot';

/** Locks of 30 minutes or longer get the blinking dot (legacy rule). */
const LONG_LOCK_MINUTES = 30;

const VDESKTOP_PC_ID = 'vdesktop';

/** Dot and text for one PC, following the legacy precedence: dead, free, locked, remote, in use. */
function describe(pc: PublicPcStatusResponse, now: Date): { tone: Tone; text: string } {
  if (pc.status === PcStatusType.OFFLINE) return { tone: 'offline', text: 'Offline' };
  if (pc.status === PcStatusType.MAINTENANCE) return { tone: 'offline', text: 'Maintenance' };

  if (pc.pcId === VDESKTOP_PC_ID) {
    const n = pc.users.length;
    if (n === 0) return { tone: 'free', text: 'Free' };
    const symbols = pc.users.map((u) => u.symbol).filter(Boolean).join(' ');
    return { tone: 'remote', text: `${n} ${n === 1 ? 'session' : 'sessions'}${symbols ? ` ${symbols}` : ''}` };
  }

  if (pc.users.length === 0 || pc.status === PcStatusType.FREE) return { tone: 'free', text: 'Free' };

  // Role symbols only (★ board, 🔑 keyholder, …); 👤 for anybody else. Never a name.
  const who = pc.users.map((u) => u.symbol || '👤').join(' ');
  if (pc.lockedAt) {
    const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(pc.lockedAt)) / 60_000));
    const age = minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}m`;
    return { tone: minutes >= LONG_LOCK_MINUTES ? 'locked-long' : 'locked', text: `${who} · locked ${age}` };
  }
  if (pc.remote) return { tone: 'remote', text: `${who} · remote` };
  return { tone: 'busy', text: who };
}

export default function PcList({ pcs }: { pcs: PublicPcStatusResponse[] }) {
  const now = useNow();
  const rows = pcs.map((pc) => ({ pc, ...describe(pc, now) }));
  const physical = rows.filter((row) => row.pc.pcId !== VDESKTOP_PC_ID);
  const free = physical.filter((row) => row.tone === 'free').length;

  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs font-medium tracking-widest text-muted uppercase">
          <span aria-hidden>🖥 </span>Computers
        </h2>
        <span className="text-sm font-medium">
          {free} of {physical.length} free
        </span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map(({ pc, tone, text }) => (
          <li key={pc.pcId} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex items-center gap-3">
              <StatusDot tone={tone} />
              <span className="font-medium">{pc.pcId === VDESKTOP_PC_ID ? 'Virtual desktop' : `PC ${pc.pcId}`}</span>
            </span>
            <span className={tone === 'offline' ? 'text-muted' : ''}>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
