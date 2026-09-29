import { PcStatusType, type PublicPcStatusResponse } from '@gewis/aurora-api-client';
import { StatusDot } from './RoomStatusBlocks';

interface Props {
  pcs: PublicPcStatusResponse[] | null;
}

/** Locks of 30 minutes or longer get the blinking attention dot (legacy rule). */
const LONG_LOCK_MINUTES = 30;

const VDESKTOP_PC_ID = 'vdesktop';

const DOT_MAP: Record<string, string> = {
  [PcStatusType.FREE]: 'pc_free',
  [PcStatusType.IN_USE]: 'pc_inuse',
  remote: 'pc_remote',
  [PcStatusType.LOCKED]: 'pc_locked',
  [PcStatusType.OFFLINE]: 'pc_offline',
  [PcStatusType.MAINTENANCE]: 'pc_offline',
};

/**
 * The dot class for a PC: remote beats in-use, a fresh lock becomes orange
 * and a long lock starts blinking.
 */
function pcDotClass(pc: { status: PcStatusType; remote: boolean; lockedAt: string | null }): {
  dot: string;
  lockedFor: string | null;
} {
  if (pc.lockedAt) {
    const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(pc.lockedAt)) / 60_000));
    const lockedFor = minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}m`;
    return {
      dot: minutes >= LONG_LOCK_MINUTES ? 'pc_locked_long' : 'pc_locked',
      lockedFor,
    };
  }
  if (pc.remote) return { dot: DOT_MAP.remote, lockedFor: null };
  return { dot: DOT_MAP[pc.status] ?? 'pc_offline', lockedFor: null };
}

export default function PcStatusGrid({ pcs }: Props) {
  if (!pcs) return <div className="text-[#696969]">PC status unavailable</div>;

  return (
    <div className="flex flex-col">
      {pcs.map((pc) => {
        const { dot, lockedFor } = pcDotClass(pc);
        // Role symbols only: board ★ / keyholder 🔑; no names ever live here.
        const symbols = pc.users.map((user) => user.symbol);
        const symbolText =
          pc.pcId === VDESKTOP_PC_ID
            ? `${symbols.length} sessions`
            : symbols.map((symbol) => symbol || '👤').join(' ');

        return (
          <div key={pc.pcId} className="pb-1">
            <div className="flex items-baseline gap-2">
              <span className="flex items-center gap-2">
                <StatusDot kind={dot} />
                <span className="font-medium">
                  {pc.pcId === VDESKTOP_PC_ID
                    ? 'Virtual desktop'
                    : `PC ${pc.pcId}`}
                </span>
              </span>
              <span className="text-[#696969]">
                {pc.status === PcStatusType.OFFLINE
                  ? '· offline'
                  : pc.status === PcStatusType.MAINTENANCE
                    ? '· maintenance'
                    : pc.status === PcStatusType.FREE
                      ? '· Free'
                      : lockedFor
                        ? `· locked for ${lockedFor}`
                        : pc.remote
                          ? '· in use (remote)'
                          : symbolText
                            ? `· ${symbolText}`
                            : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
