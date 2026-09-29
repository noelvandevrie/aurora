import './index.css';
import { useEffect, useState } from 'react';
import { client } from '@gewis/aurora-api-client/client';
import {
  getPublicPcUsage,
  getPublicRoomStatus,
  type PublicPcStatusResponse,
  type PublicRoomStatusResponse,
} from '@gewis/aurora-api-client';
import RoomStatusPanel from './components/RoomStatusPanel';
import CoffeeStatus from './components/CoffeeStatus';
import PcStatusGrid from './components/PcStatusGrid';

// Same origin: the dev server (vite) and the production nginx both proxy /api
// to core, so the browser never talks to core directly and CORS is moot.
client.setConfig({ baseUrl: '/api' });

const POLL_MS = 30_000;

interface InfoState {
  roomStatus: PublicRoomStatusResponse | null;
  pcUsage: PublicPcStatusResponse[] | null;
  failed: boolean;
}

/**
 * The public info page. Polls the two anonymized public endpoints every 30 s
 * (matching the 5-minute staleness of the PC data and well inside how fast a
 * room status flips); a failed poll keeps the last data on screen.
 */
export default function App() {
  const [info, setInfo] = useState<InfoState>({ roomStatus: null, pcUsage: null, failed: false });

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const [room, pcs] = await Promise.all([getPublicRoomStatus(), getPublicPcUsage()]);
        if (room.error || pcs.error) throw room.error ?? pcs.error;
        if (!cancelled)
          setInfo({ roomStatus: room.data ?? null, pcUsage: pcs.data ?? null, failed: false });
      } catch {
        // Feature off, network blip, ...: keep showing the last known state.
        if (!cancelled) setInfo((previous) => ({ ...previous, failed: true }));
      }
    };

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-neutral-950 p-6">
      {info.roomStatus === null && info.pcUsage === null ? (
        <div className="flex flex-1 items-center justify-center font-raleway text-4xl text-white/60">
          {info.failed ? 'GEWIS info unavailable' : 'Loading...'}
        </div>
      ) : (
        <>
          <RoomStatusPanel status={info.roomStatus} />
          <CoffeeStatus status={info.roomStatus?.coffeeStatus ?? 10} />
          <PcStatusGrid pcs={info.pcUsage} />
        </>
      )}
    </div>
  );
}
