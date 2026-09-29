import './index.css';
import { useEffect, useState } from 'react';
import { client } from '@gewis/aurora-api-client/client';
import {
  getPublicPcUsage,
  getPublicRoomStatus,
  type PublicPcStatusResponse,
  type PublicRoomStatusResponse,
} from '@gewis/aurora-api-client';
import PcStatusGrid from './components/PcStatusGrid';
import RoomStatusBlocks from './components/RoomStatusBlocks';

// Same origin: the dev server (vite) and the production nginx both proxy /api
// to core, so the browser never talks to core and CORS is moot.
client.setConfig({ baseUrl: '/api' });

const POLL_MS = 30_000;

interface InfoState {
  roomStatus: PublicRoomStatusResponse | null;
  pcUsage: PublicPcStatusResponse[] | null;
  failed: boolean;
}

type Tab = 'room' | 'computers';

/**
 * The public info page, styled after the legacy info.gewis.nl mobile site:
 * a "GEWIS Status" header, a Room/Computers tab bar and white content blocks.
 * Polls the anonymized public endpoints every 30 s; a failed poll keeps the
 * last data on screen.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('room');
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

  const loading = info.roomStatus === null && info.pcUsage === null && !info.failed;

  return (
    <div className="min-h-screen bg-[#dddddd] font-roboto text-[14px] text-[#333333]">
      <div id="header" className="bg-white text-center text-[16px] leading-[30px]">
        <span className="text-[#333333]">GEWIS Status</span>
      </div>

      <div className="flex justify-center gap-4 border-b border-[#e8e8e8] bg-white text-[12px]">
        <button
          type="button"
          onClick={() => setTab('room')}
          className={`px-1 pt-2 pb-1 focus-visible:outline-none ${
            tab === 'room'
              ? 'border-b-[3px] border-[#46b98a] font-bold text-[#333333]'
              : 'text-[#696969] hover:border-b-[3px] hover:border-[#46b98a] hover:text-[#46b98a]'
          }`}
        >
          Room
        </button>
        <button
          type="button"
          onClick={() => setTab('computers')}
          className={`px-1 pt-2 pb-1 focus-visible:outline-none ${
            tab === 'computers'
              ? 'border-b-[3px] border-[#46b98a] font-bold text-[#333333]'
              : 'text-[#696969] hover:border-b-[3px] hover:border-[#46b98a] hover:text-[#46b98a]'
          }`}
        >
          Computers
        </button>
      </div>

      {loading ? (
        <div className="block mx-auto mt-10 max-w-[350px] bg-white p-6 text-center">Loading...</div>
      ) : info.failed && info.roomStatus === null && info.pcUsage === null ? (
        <div className="block mx-auto mt-10 max-w-[350px] bg-white p-6 text-center">
          GEWIS info unavailable
        </div>
      ) : tab === 'room' ? (
        <div className="mx-auto flex max-w-md flex-col items-center p-1" id="page_info">
          {info.roomStatus && <RoomStatusBlocks status={info.roomStatus} />}
        </div>
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-center p-1" id="page_computers">
          <div className="mt-2 w-full max-w-[350px] bg-white p-6 text-left">
            <h1 className="mb-4 border-b-2 border-[#dddddd] pb-2 font-bold">Computers</h1>
            <PcStatusGrid pcs={info.pcUsage} />
          </div>
        </div>
      )}
    </div>
  );
}
