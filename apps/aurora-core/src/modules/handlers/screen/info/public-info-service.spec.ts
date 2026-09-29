import { describe, it, expect, vi, afterEach } from 'vitest';
import PublicInfoService, { PublicPcStatusResponse } from './public-info-service';
import PlayingSongService from './playing-song-service';
import { PcStatusResponse, PcUser } from './pc-usage-service';
import { RoomStatusResponse } from './info-status-service';
import SpotifyTrackHandler from '../../../spotify/spotify-track-handler';
import { PcStatusType } from './entities/pc-status';

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
    closedMessage: 'Internal note',
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

function playing(current: { artist: string; title: string } | null) {
  vi.spyOn(SpotifyTrackHandler, 'getInstance').mockReturnValue({
    getCurrentlyPlaying: () => current,
  } as unknown as SpotifyTrackHandler);
}

describe('PublicInfoService.toPublicRoomStatus', () => {
  it('exposes exactly the public room fields: no responsibles, no free-text message', () => {
    expect(PublicInfoService.toPublicRoomStatus(roomStatus({}), '♫ Playing music')).toStrictEqual({
      open: true,
      beerTime: '16:30',
      lastCall: '19:00',
      coffeeStatus: 4,
      playingSong: '♫ Playing music',
    });
  });
});

describe('PublicInfoService.toPublicPcStatus', () => {
  it('reduces every user to their symbol', () => {
    const result = PublicInfoService.toPublicPcStatus(
      pcStatus({ users: [pcUser({}), pcUser({ name: 'Other Person', memberId: 987654, symbol: '' })] }),
    );

    expect(result.users).toStrictEqual([{ symbol: '★' }, { symbol: '' }]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Secret Name');
    expect(serialized).not.toContain('Other Person');
    expect(serialized).not.toContain('987654');
  });
});

describe('PublicInfoService.withAllPcs', () => {
  const reported: PublicPcStatusResponse = {
    pcId: '3',
    status: PcStatusType.IN_USE,
    remote: false,
    lockedAt: null,
    users: [{ symbol: '★' }],
  };

  it('lists PCs 1..10 and the virtual desktop in order, filling the unreported ones as offline', () => {
    const result = PublicInfoService.withAllPcs([reported]);

    expect(result.map((pc) => pc.pcId)).toStrictEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'vdesktop']);
    expect(result[2]).toBe(reported);
    expect(result[0]).toStrictEqual({ pcId: '1', status: PcStatusType.OFFLINE, remote: false, lockedAt: null, users: [] });
  });

  it('drops ids that are neither a physical PC nor the virtual desktop', () => {
    const result = PublicInfoService.withAllPcs([{ ...reported, pcId: 'session-42' }]);
    expect(result.map((pc) => pc.pcId)).not.toContain('session-42');
  });
});

describe('PlayingSongService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns null when nothing is playing', () => {
    playing(null);
    expect(new PlayingSongService().getPlayingSong('131.155.0.1')).toBeNull();
  });

  it('shows artist and title to TU/e visitors, including IPv4-mapped addresses', () => {
    playing({ artist: 'Some Artist', title: 'Some Track' });
    const service = new PlayingSongService();
    expect(service.getPlayingSong('131.155.71.116')).toBe('♫ Some Artist - Some Track');
    expect(service.getPlayingSong('::ffff:131.155.71.116')).toBe('♫ Some Artist - Some Track');
  });

  it('hides the artist and track from everybody else', () => {
    playing({ artist: 'Some Artist', title: 'Some Track' });
    const service = new PlayingSongService();
    expect(service.getPlayingSong('8.8.8.8')).toBe('♫ Playing music');
    expect(service.getPlayingSong(null)).toBe('♫ Playing music');
  });
});
