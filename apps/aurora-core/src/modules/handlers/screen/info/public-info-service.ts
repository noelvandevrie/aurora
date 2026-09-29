import InfoStatusService, { RoomStatusResponse } from './info-status-service';
import PcUsageService, { PcStatusResponse } from './pc-usage-service';
import { PcStatusType } from './entities/pc-status';

/**
 * What the public status page may show about a responsible person: the name and
 * the role flags that drive the star/key icons, but never the membership number
 * or the photo.
 */
export interface PublicResponsible {
  name: string;
  isBoard: boolean;
  isCandidateBoard: boolean;
  isKeyholder: boolean;
}

export interface PublicRoomStatusResponse {
  open: boolean;
  responsible: PublicResponsible[];
  beerTime: string | null;
  lastCall: string | null;
  closedMessage: string | null;
  coffeeStatus: number;
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

  public async getPublicRoomStatus(): Promise<PublicRoomStatusResponse> {
    return PublicInfoService.toPublicRoomStatus(await this.infoStatusService.getRoomStatus());
  }

  public async getPublicPcUsage(): Promise<PublicPcStatusResponse[]> {
    const pcs = await this.pcUsageService.getAll();
    return pcs.map((pc) => PublicInfoService.toPublicPcStatus(pc));
  }

  public static toPublicRoomStatus(status: RoomStatusResponse): PublicRoomStatusResponse {
    return {
      open: status.open,
      responsible: status.responsible.map(
        (r): PublicResponsible => ({
          name: r.name,
          isBoard: r.isBoard,
          isCandidateBoard: r.isCandidateBoard,
          isKeyholder: r.isKeyholder,
        }),
      ),
      beerTime: status.beerTime,
      lastCall: status.lastCall,
      closedMessage: status.closedMessage,
      coffeeStatus: status.coffeeStatus,
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
