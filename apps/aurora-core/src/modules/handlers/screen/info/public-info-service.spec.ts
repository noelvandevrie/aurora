import { describe, it, expect, vi, afterEach } from 'vitest';
import PublicInfoService from './public-info-service';
import PlayingSongService from './playing-song-service';
import { PcUser, PcStatusResponse } from './pc-usage-service';
import { RoomStatusResponse } from './info-status-service';
import SpotifyTrackHandler from '../../../spotify/spotify-track-handler';
import { PcStatusType } from './entities/pc-status';

vi.mock('../../../spotify/spotify-track-handler');

    function roomStatus(overrides: Partial<RoomStatusResponse>): RoomStatusResponse {
  return {
    open: true,
    responsible: [
      {
        memberId: 123456,
        name: 'Secret Name',
        isBoard: true,
        isCandidateBoard: false,
        isKeyholder: false,
        photoUrl: 'https://example.com/photo.png',
      },
    ],
    beerTime: '16:30',
    lastCall: '19:00',
    closedMessage: null,
    coffeeStatus: 4,
    ...overrides,
  };
}

function pcUser(overrides: Partial<PcUser>): PcUser {
  return { memberId: 123456, name: 'Secret Name', symbol: '★', ...overrides };
}

function pcStatus(overrides: Partial<PcStatusResponse>): PcStatusResponse {
  return {
    pcId: '1',
    users: [pcUser({})],
    remote: false,
    lockedAt: null,
    status: PcStatusType.IN_USE,
    ...overrides,
  };
}

describe('PublicInfoService', () => {
  describe('toPublicRoomStatus', () => {
    it('never exposes anything about the responsibles: that was not public before', () => {
      const result = PublicInfoService.toPublicRoomStatus(roomStatus({}), null);

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('responsible');
      expect(serialized).not.toContain('Secret Name');
      expect(serialized).not.toContain('123456');
      expect(JSON.parse(serialized)).not.toHaveProperty('responsible');
    });

    it('keeps the room state fields the page needs', () => {
      const status = roomStatus({ beerTime: null, lastCall: null, closedMessage: 'Empty' });
      expect(PublicInfoService.toPublicRoomStatus(status, null)).toStrictEqual({
        open: true,
        beerTime: null,
        lastCall: null,
        closedMessage: 'Empty',
        coffeeStatus: 4,
        playingSong: null,
      });
    });

    it('passes through the playing-song display string', () => {
      const result = PublicInfoService.toPublicRoomStatus(roomStatus({}), '♫ Some Artist - Some Track');
      expect(result.playingSong).toBe('♫ Some Artist - Some Track');
    });
  });

  describe('toPublicPcStatus', () => {
    it('keeps the symbol per user', () => {
      const result = PublicInfoService.toPublicPcStatus(
        pcStatus({ users: [pcUser({}), pcUser({ symbol: '' })] }),
      );

      expect(result.users).toStrictEqual([{ symbol: '★' }, { symbol: '' }]);
    });

    it('leaks neither names nor membership numbers anywhere in the payload', () => {
      const result = PublicInfoService.toPublicPcStatus(
        pcStatus({
          pcId: 'vdesktop',
          users: [pcUser({}), pcUser({ name: 'Other Person', memberId: 987654, symbol: '🔑' })],
        }),
      );

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('Secret Name');
      expect(serialized).not.toContain('Other Person');
      expect(serialized).not.toContain('123456');
      expect(serialized).not.toContain('987654');
      expect(serialized).not.toContain('memberId');
      expect(serialized).not.toContain('name');
    });

    it('passes through the per-PC technical state including the lock time', () => {
      const locked = pcStatus({ remote: true, lockedAt: '2026-09-29T12:00:00Z', status: PcStatusType.LOCKED });
      expect(PublicInfoService.toPublicPcStatus(locked)).toMatchObject({
        pcId: '1',
        remote: true,
        lockedAt: '2026-09-29T12:00:00Z',
        status: PcStatusType.LOCKED,
      });
    });
  });

  describe('PlayingSongService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('returns null when nothing is playing', () => {
      vi.spyOn(SpotifyTrackHandler, 'getInstance').mockReturnValue(
        { getCurrentlyPlaying: () => null } as unknown as SpotifyTrackHandler,
      );
      const service = new PlayingSongService();
      expect(service.getPlayingSong('131.155.0.1')).toBeNull();
    });

    it('shows artist and title to TU/e visitors', () => {
      vi.spyOn(SpotifyTrackHandler, 'getInstance').mockReturnValue(
        { getCurrentlyPlaying: () => ({ artist: 'Some Artist', title: 'Some Track' }) } as unknown as SpotifyTrackHandler,
      );
      const stub: unknown = null;
      void stub;
      const service = new PlayingSongService();
      expect(service.getPlayingSong('131.155.71.116')).toBe('♫ Some Artist - Some Track');
    });

    it('hides the artist and track from outside TU/e', () => {
      vi.spyOn(SpotifyTrackHandler, 'getInstance').mockReturnValue(
        { getCurrentlyPlaying: () => ({ artist: 'Some Artist', title: 'Some Track' }) } as unknown as SpotifyTrackHandler,
      );
      const stub: unknown = null;
      void stub;
      const service = new PlayingSongService();
      expect(service.getPlayingSong('8.8.8.8')).toBe('♫ Playing music');
      expect(service.getPlayingSong(null)).toBe('♫ Playing music');
    });
  });
});
