import { Get, Request, Route, Tags } from 'tsoa';
import { Controller } from '@tsoa/runtime';
import type { Request as ExpressRequest } from 'express';
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
   * Whether the association room is open, today's beer time, the coffee machine
   * state and what is currently playing. Responsibles are deliberately NOT
   * exposed: that information was not public before either.
   */
  @Security(SecurityNames.PUBLIC)
  @Get('room-status')
  public async getPublicRoomStatus(
    @Request() req: ExpressRequest,
  ): Promise<PublicRoomStatusResponse> {
    // Behind the app's own nginx; the legacy page used the same forwarded-for rule.
    const forwardedFor = (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip;
    return this.publicInfoService.getPublicRoomStatus(forwardedFor ?? null);
  }

  /** Anonymized PC usage: per-PC state with board/keyholder symbols only. */
  @Security(SecurityNames.PUBLIC)
  @Get('pc-usage')
  public async getPublicPcUsage(): Promise<PublicPcStatusResponse[]> {
    return this.publicInfoService.getPublicPcUsage();
  }
}
