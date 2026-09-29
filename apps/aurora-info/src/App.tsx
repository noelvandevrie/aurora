import './index.css';
import { useEffect, useState, type ReactNode } from 'react';
import { client } from '@gewis/aurora-api-client/client';
import {
  getPublicPcUsage,
  getPublicRoomStatus,
  type PublicPcStatusResponse,
  type PublicRoomStatusResponse,
} from '@gewis/aurora-api-client';
import StatusBanner from './components/StatusBanner';
import InfoTiles from './components/InfoTiles';
import PcList from './components/PcList';

// Same origin: the dev server (vite) and the production nginx both proxy the
// public endpoints to core, so the browser never talks to core and CORS is moot.
client.setConfig({ baseUrl: '/api' });

const POLL_MS = 30_000;

interface Snapshot {
  room: PublicRoomStatusResponse;
  pcs: PublicPcStatusResponse[];
  at: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function Notice({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl bg-card p-6 text-center text-muted shadow-sm">{children}</section>;
}

/**
 * The public info page (info.gewis.nl): one screen with the room status and
 * beer countdown up top, coffee and music tiles, then the computers. Polls the
 * anonymized public endpoints every 30 s; a failed poll keeps the last data on
 * screen and says how old it is.
 */
export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const [room, pcs] = await Promise.all([getPublicRoomStatus(), getPublicPcUsage()]);
        if (!room.data || !pcs.data) throw room.error ?? pcs.error;
        if (!cancelled) {
          setSnapshot({ room: room.data, pcs: pcs.data, at: new Date() });
          setFailed(false);
        }
      } catch {
        // Feature off, network blip, ...: keep showing the last known state.
        if (!cancelled) setFailed(true);
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

  let body;
  if (snapshot) {
    body = (
      <>
        <StatusBanner status={snapshot.room} />
        <InfoTiles status={snapshot.room} />
        <PcList pcs={snapshot.pcs} />
      </>
    );
  } else if (failed) {
    body = <Notice>The status of GEWIS is unavailable right now.</Notice>;
  } else {
    body = <Notice>Loading…</Notice>;
  }

  return (
    <div className="min-h-screen bg-page font-sans text-ink antialiased">
      <main className="mx-auto flex max-w-md flex-col gap-3 px-4 pt-6 pb-10">
        <header className="flex items-baseline justify-between px-1">
          <h1 className="text-lg font-bold">GEWIS Status</h1>
          {snapshot && (
            <span className={`text-xs ${failed ? 'text-busy' : 'text-muted'}`}>
              {failed ? `Offline · data from ${formatTime(snapshot.at)}` : `Updated ${formatTime(snapshot.at)}`}
            </span>
          )}
        </header>
        {body}
      </main>
    </div>
  );
}
