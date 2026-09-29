import InfoStatusService, { RoomStatusResponse } from './info-status-service';
import PlayingSongService from './playing-song-service';
import PcUsageService, { PcStatusResponse } from './pc-usage-service';
import { PcStatusType } from './entities/pc-status';

export interface PublicRoomStatusResponse {
  open: boolean;
  beerTime: string | null;
  lastCall: string | null;
  closedMessage: string | null;
  coffeeStatus: number;
  /**
   * Display string for whatever the board account is currently playing, or null
   * when unknown. Calculated once by PlayingSongService; TU/e visitors get the
   * artist and title, everybody else a generic "playing music".
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
 * Builds the anonymized shapes served by `PublicInfoController`.
 *
 * Anonymization is the single reason this service exists: the internal responses
 * carry names and membership numbers, and every field not listed on these public
 * shapes is dropped here, before any HTTP serialization happens.
 */
export default class PublicInfoService {
  private infoStatusService = new InfoStatusService();
  private pcUsageService = new PcUsageService();
  private playingSongService = new PlayingSongService();

  public async getPublicRoomStatus(visitorIp: string | null): Promise<PublicRoomStatusResponse> {
    const [status, playingSong] = await Promise.all([
      this.infoStatusService.getRoomStatus(),
      this.playingSongService.getPlayingSong(visitorIp),
    ]);
    return PublicInfoService.toPublicRoomStatus(status, playingSong);
  }

  public async getPublicPcUsage(): Promise<PublicPcStatusResponse[]> {
    const pcs = await this.pcUsageService.getAll();
    return pcs.map((pc) => PublicInfoService.toPublicPcStatus(pc));
  }

  public static toPublicRoomStatus(
    status: RoomStatusResponse,
    playingSong: string | null,
  ): PublicRoomStatusResponse {
    return {
      open: status.open,
      beerTime: status.beerTime,
      lastCall: status.lastCall,
      closedMessage: status.closedMessage,
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
}
