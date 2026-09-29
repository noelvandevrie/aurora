import { Get, Route, Tags } from 'tsoa';
import { Controller } from '@tsoa/runtime';
import { injectable } from 'inversify';
import { Security } from '../../../auth';
import { SecurityNames } from '../../../../helpers/security';
import { FeatureEnabled } from '../../../server-settings';
import PublicInfoService, {
  PublicPcStatusResponse,
  PublicRoomStatusResponse,
} from './public-info-service';

/**
 * The two read-only info endpoints behind the public status page
 * (info.gewis.nl). They carry no personal data — names, membership numbers and
 * photos are already stripped by {@link PublicInfoService} — so they are
 * reachable without any authentication. The app's nginx proxies /api to this
 * core over the internal network; a browser never talks to core directly.
 */
@injectable()
@Route('public/info')
@Tags('Public')
@FeatureEnabled('InfoScreen')
export class PublicInfoController extends Controller {
  private publicInfoService = new PublicInfoService();

  /**
   * Whether the association room is open, who is responsible, today's beer time
   * and the coffee machine state.
   */
  @Security(SecurityNames.PUBLIC)
  @Get('room-status')
  public async getPublicRoomStatus(): Promise<PublicRoomStatusResponse> {
    return this.publicInfoService.getPublicRoomStatus();
  }

  /** Anonymized PC usage: per-PC state with board/keyholder symbols only. */
  @Security(SecurityNames.PUBLIC)
  @Get('pc-usage')
  public async getPublicPcUsage(): Promise<PublicPcStatusResponse[]> {
    return this.publicInfoService.getPublicPcUsage();
  }
}
