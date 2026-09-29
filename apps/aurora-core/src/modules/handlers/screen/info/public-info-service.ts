import InfoStatusService, { RoomStatusResponse } from './info-status-service';
import PlayingSongService from './playing-song-service';
import PcUsageService, { PcStatusResponse, PHYSICAL_PC_COUNT } from './pc-usage-service';
import { PcStatusType, VDESKTOP_PC_ID } from './entities/pc-status';

export interface PublicRoomStatusResponse {
  open: boolean;
  beerTime: string | null;
  lastCall: string | null;
  coffeeStatus: number;
  /**
   * Display string for whatever the room is currently playing, or null when
   * nothing plays. TU/e visitors get the artist and title, everybody else a
   * generic "playing music".
   */
  playingSong: string | null;
}

/**
 * A logged-in user as the public page sees it: only the board/keyholder symbol.
 * No name and no membership number ever leaves the core.
 */
export interface PublicPcUser {
  symbol: string;
}

export interface PublicPcStatusResponse {
  pcId: string;
  status: PcStatusType;
  remote: boolean;
  lockedAt: string | null;
  users: PublicPcUser[];
}

/**
 * Anonymous traffic is served from memory for this long, so a busy public page
 * costs at most one database round per window instead of one per visitor.
 */
const CACHE_TTL_MS = 10_000;

interface Cached<T> {
  value: T;
  at: number;
}

/**
 * Builds the anonymized shapes served by `PublicInfoController`.
 *
 * Anonymization is the reason this service exists: the internal responses carry
 * names, membership numbers and free-text messages, and every field not listed
 * on these public shapes is dropped here, before any HTTP serialization.
 */
export default class PublicInfoService {
  private static roomCache: Cached<RoomStatusResponse> | null = null;

  private static pcCache: Cached<PublicPcStatusResponse[]> | null = null;

  private infoStatusService = new InfoStatusService();

  private pcUsageService = new PcUsageService();

  private playingSongService = new PlayingSongService();

  public async getPublicRoomStatus(visitorIp: string | null): Promise<PublicRoomStatusResponse> {
    const status = await PublicInfoService.cached(
      () => PublicInfoService.roomCache,
      (c) => (PublicInfoService.roomCache = c),
      () => this.infoStatusService.getRoomStatus(),
    );
    // Per visitor (the artist is IP-gated) but in-memory, so never cached.
    return PublicInfoService.toPublicRoomStatus(status, this.playingSongService.getPlayingSong(visitorIp));
  }

  public async getPublicPcUsage(): Promise<PublicPcStatusResponse[]> {
    return PublicInfoService.cached(
      () => PublicInfoService.pcCache,
      (c) => (PublicInfoService.pcCache = c),
      async () => PublicInfoService.withAllPcs((await this.pcUsageService.getAll()).map(PublicInfoService.toPublicPcStatus)),
    );
  }

  private static async cached<T>(
    get: () => Cached<T> | null,
    set: (c: Cached<T>) => void,
    load: () => Promise<T>,
  ): Promise<T> {
    const hit = get();
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    const value = await load();
    set({ value, at: Date.now() });
    return value;
  }

  /** Test seam: forget cached responses. */
  public static clearCache(): void {
    PublicInfoService.roomCache = null;
    PublicInfoService.pcCache = null;
  }

  public static toPublicRoomStatus(status: RoomStatusResponse, playingSong: string | null): PublicRoomStatusResponse {
    return {
      open: status.open,
      beerTime: status.beerTime,
      lastCall: status.lastCall,
      coffeeStatus: status.coffeeStatus,
      playingSong,
    };
  }

  public static toPublicPcStatus(pc: PcStatusResponse): PublicPcStatusResponse {
    return {
      pcId: pc.pcId,
      status: pc.status,
      remote: pc.remote,
      lockedAt: pc.lockedAt,
      users: pc.users.map((user) => ({ symbol: user.symbol })),
    };
  }

  /**
   * The legacy page always listed every machine. PCs nothing has ever reported
   * (fresh deployment, wiped table) have no row, so they are added as offline;
   * the result is ordered 1..10 then the virtual desktop.
   */
  public static withAllPcs(reported: PublicPcStatusResponse[]): PublicPcStatusResponse[] {
    const ids = [...Array.from({ length: PHYSICAL_PC_COUNT }, (_, i) => String(i + 1)), VDESKTOP_PC_ID];
    const byId = new Map(reported.map((pc) => [pc.pcId, pc]));
    return ids.map(
      (pcId) =>
        byId.get(pcId) ?? { pcId, status: PcStatusType.OFFLINE, remote: false, lockedAt: null, users: [] },
    );
  }
}
