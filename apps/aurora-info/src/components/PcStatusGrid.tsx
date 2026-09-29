import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleQuestion,
  faUserLock,
  faUsers,
  faWifi,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { PcStatusType, type PublicPcStatusResponse } from '@gewis/aurora-api-client';

interface Props {
  pcs: PublicPcStatusResponse[] | null;
}

interface TileStyle {
  color: string;
  icon: IconDefinition | null;
}

const TILE_STYLES: Record<PcStatusType, TileStyle> = {
  [PcStatusType.FREE]: { color: 'border-emerald-600', icon: null },
  [PcStatusType.IN_USE]: { color: 'border-amber-400', icon: null },
  [PcStatusType.LOCKED]: { color: 'border-sky-500', icon: faUserLock },
  [PcStatusType.REMOTE]: { color: 'border-sky-500', icon: faUserLock },
  [PcStatusType.OFFLINE]: { color: 'border-neutral-700', icon: faWifi },
  [PcStatusType.MAINTENANCE]: { color: 'border-red-500', icon: null },
};

/** Id of the shared virtual desktop (matches the core's VDESKTOP_PC_ID). */
const VDESKTOP_PC_ID = 'vdesktop';

export default function PcStatusGrid({ pcs }: Props) {
  if (!pcs) return <div className="font-raleway text-2xl text-white/60">PC status unavailable</div>;

  return (
    <div className="flex flex-wrap gap-3 font-raleway">
      {pcs.map((pc) => {
        const style = TILE_STYLES[pc.status] ?? TILE_STYLES[PcStatusType.OFFLINE];
        const symbols = pc.users.map((user) => user.symbol);

        return (
          <div
            key={pc.pcId}
            className={`flex h-24 w-24 shrink-0 flex-col items-start justify-between rounded-lg border-2 bg-neutral-900 p-2 ${style.color}`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-semibold text-white/90">{pc.pcId}</span>
              {style.icon && (
                <FontAwesomeIcon icon={style.icon} className="text-sm text-white/70" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 text-lg text-white">
              {symbols.length === 0 ? (
                pc.status === PcStatusType.OFFLINE ? (
                  <span className="text-xs text-white/40">offline</span>
                ) : (
                  <span className="text-xs text-white/40">free</span>
                )
              ) : pc.pcId === VDESKTOP_PC_ID ? (
                <>
                  <FontAwesomeIcon icon={faUsers} className="text-sm text-white/70" />
                  <span className="text-xs">{symbols.length} sessions</span>
                </>
              ) : (
                // Symbols only: board ★ / keyholder 🔑 / anonymous dash.
                symbols.map((symbol, index) => (
                  <span key={index}>{symbol || <FontAwesomeIcon icon={faCircleQuestion} />}</span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
