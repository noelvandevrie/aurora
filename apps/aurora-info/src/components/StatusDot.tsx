export type Tone = 'free' | 'busy' | 'locked' | 'locked-long' | 'remote' | 'offline';

const TONE_CLASS: Record<Tone, string> = {
  free: 'bg-free',
  busy: 'bg-busy',
  locked: 'bg-locked',
  'locked-long': 'bg-locked animate-blink',
  remote: 'bg-remote',
  offline: 'bg-offline',
};

export default function StatusDot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`} />;
}
