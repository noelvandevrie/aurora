import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faStar, faStarHalfStroke, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { PublicRoomStatusResponse } from '@gewis/aurora-api-client';

type Responsible = PublicRoomStatusResponse['responsible'][number];

/** The board/keyholder icon for a responsible person, or null. */
export function responsibleIcon(person: Responsible): IconDefinition | null {
  if (person.isBoard) return faStar;
  if (person.isCandidateBoard && person.isKeyholder) return faKey;
  if (person.isCandidateBoard) return faStarHalfStroke;
  if (person.isKeyholder) return faKey;
  return null;
}

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

function formatCountdown(target: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours >= 1) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

interface Props {
  status: PublicRoomStatusResponse | null;
}

export default function RoomStatusPanel({ status }: Props) {
  if (!status) {
    return (
      <div className="font-raleway text-3xl text-white/60">Room status unavailable</div>
    );
  }

  if (!status.open) {
    return (
      <div className="font-raleway text-4xl font-bold text-red-400">
        {status.closedMessage || 'GEWIS is closed'}
      </div>
    );
  }

  const beer = status.beerTime ? nextBeerTime(status.beerTime, new Date()) : null;
  const lastCall = status.lastCall ? nextBeerTime(status.lastCall, new Date()) : null;
  const beerPassed = beer !== null && beer.getTime() <= Date.now();

  return (
    <div className="flex flex-col gap-4 font-raleway">
      <div className="text-4xl font-bold text-green-500">
        {status.closedMessage || 'GEWIS is open'}
      </div>

      <div className="flex flex-col divide-y divide-white/15">
        {status.responsible.length === 0 && (
          <div className="py-2 text-2xl text-white/60">Nobody assigned</div>
        )}
        {status.responsible.map((person) => {
          const icon = responsibleIcon(person);
          return (
            <div key={person.name} className="flex items-center gap-3 py-2">
              <span className="text-2xl font-semibold text-white">{person.name}</span>
              {icon && <FontAwesomeIcon icon={icon} className="text-2xl text-amber-300" />}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xl text-white/70">
        {status.beerTime && (
          <span>
            Beer at <span className="font-semibold text-amber-300">{status.beerTime}</span>
            {': '}
            {beerPassed
              ? "it's beer o'clock!"
              : beer && (
                  <span className="tabular-nums">in {formatCountdown(beer, new Date())}</span>
                )}
          </span>
        )}
        {lastCall && status.lastCall && !beerPassed && (
          <span>
            Last call: <span className="font-semibold">{status.lastCall}</span>
          </span>
        )}
      </div>
    </div>
  );
}
