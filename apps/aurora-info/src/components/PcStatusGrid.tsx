import { PcStatusType, type PublicPcStatusResponse } from '@gewis/aurora-api-client';
import { StatusDot } from './RoomStatusBlocks';

interface Props {
  pcs: PublicPcStatusResponse[] | null;
}

/** Locks of 30 minutes or longer get the blinking dot (legacy rule). */
const LONG_LOCK_MINUTES = 30;

const VDESKTOP_PC_ID = 'vdesktop';

function lockMinutes(lockedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(lockedAt)) / 60_000));
}

/** Dot and text for one PC, following the legacy precedence: dead, free, locked, remote, in use. */
function describe(pc: PublicPcStatusResponse): { dot: string; text: string } {
  if (pc.status === PcStatusType.OFFLINE) return { dot: 'pc_offline', text: 'Offline' };
  if (pc.status === PcStatusType.MAINTENANCE) return { dot: 'pc_offline', text: 'Maintenance' };

  if (pc.pcId === VDESKTOP_PC_ID) {
    const n = pc.users.length;
    if (n === 0) return { dot: 'pc_free', text: 'Free' };
    const symbols = pc.users.map((u) => u.symbol).filter(Boolean).join(' ');
    return { dot: 'pc_remote', text: `${n} ${n === 1 ? 'session' : 'sessions'}${symbols ? ` ${symbols}` : ''}` };
  }

  if (pc.users.length === 0 || pc.status === PcStatusType.FREE) return { dot: 'pc_free', text: 'Free' };

  // Role symbols only (★ board, 🔑 keyholder, …); 👤 for anybody else. Never a name.
  const who = pc.users.map((u) => u.symbol || '👤').join(' ');
  if (pc.lockedAt) {
    const minutes = lockMinutes(pc.lockedAt);
    const age = minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}m`;
    return { dot: minutes >= LONG_LOCK_MINUTES ? 'pc_locked_long' : 'pc_locked', text: `${who} (locked for ${age})` };
  }
  if (pc.remote) return { dot: 'pc_remote', text: `${who} (remote)` };
  return { dot: 'pc_inuse', text: who };
}

export default function PcStatusGrid({ pcs }: Props) {
  if (!pcs) return <div className="text-[#696969]">PC status unavailable</div>;

  return (
    <div className="flex flex-col">
      {pcs.map((pc, index) => {
        const { dot, text } = describe(pc);
        return (
          <div key={pc.pcId}>
            {index > 0 && <hr className="my-2 border border-[#dddddd]" />}
            <StatusDot kind={dot} /> {pc.pcId === VDESKTOP_PC_ID ? 'VDESKTOP' : `PC ${pc.pcId}`}: {text}
          </div>
        );
      })}
    </div>
  );
}
