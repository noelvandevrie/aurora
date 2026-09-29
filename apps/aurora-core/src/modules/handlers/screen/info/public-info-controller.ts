import { Get, Request, Route, Tags } from 'tsoa';
import { Controller } from '@tsoa/runtime';
import type { Request as ExpressRequest } from 'express';
import { injectable } from 'inversify';
import { FeatureEnabled } from '../../../server-settings';
import PublicInfoService, { PublicPcStatusResponse, PublicRoomStatusResponse } from './public-info-service';

/**
 * The two read-only endpoints behind the public status page (info.gewis.nl).
 * They carry no personal data — {@link PublicInfoService} strips it — so, like
 * `GET /auth/groups`, they have no `@Security` and need no authentication.
 * The info app's nginx proxies only these paths to core.
 */
@injectable()
@Route('public/info')
@Tags('Public')
@FeatureEnabled('InfoScreen')
export class PublicInfoController extends Controller {
  private publicInfoService = new PublicInfoService();

  /**
   * Whether the association room is open, today's beer time, the coffee machine
   * state and what is currently playing.
   */
  @Get('room-status')
  public async getPublicRoomStatus(@Request() req: ExpressRequest): Promise<PublicRoomStatusResponse> {
    // Set by the info app's proxy from the connection address, overwriting
    // anything the client sent; X-Forwarded-For's first hop is client-controlled.
    const realIp = req.headers['x-real-ip'];
    return this.publicInfoService.getPublicRoomStatus(typeof realIp === 'string' ? realIp : null);
  }

  /** Anonymized PC usage: per-PC state with board/keyholder symbols only. */
  @Get('pc-usage')
  public async getPublicPcUsage(): Promise<PublicPcStatusResponse[]> {
    return this.publicInfoService.getPublicPcUsage();
  }
}
