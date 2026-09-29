import SpotifyTrackHandler from '../../../spotify/spotify-track-handler';

/**
 * "What is playing in the GEWIS room" for the public info page.
 *
 * Reads the live Spotify playback state the core already tracks. The artist
 * and track are only revealed to visitors from within the TU/e network,
 * matching the old info.gewis.nl rule (any 131.155.* address).
 */
const TU_E_PREFIX = '131.155.';

export default class PlayingSongService {
  /** Maps the live Spotify state to the legacy display string. */
  public getPlayingSong(visitorIp: string | null): string | null {
    const current = SpotifyTrackHandler.getInstance().getCurrentlyPlaying();
    if (!current) return null;
    // Node reports IPv4 peers on dual-stack sockets as "::ffff:a.b.c.d".
    const ip = visitorIp?.replace(/^::ffff:/, '') ?? null;
    const insideTudE = ip !== null && ip.startsWith(TU_E_PREFIX);
    return insideTudE ? `♫ ${current.artist} - ${current.title}` : '♫ Playing music';
  }
}

export { TU_E_PREFIX };
