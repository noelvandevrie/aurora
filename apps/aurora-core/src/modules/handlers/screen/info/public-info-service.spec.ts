import { describe, it, expect } from 'vitest';
import PublicInfoService from './public-info-service';
import { PcStatusResponse, PcUser } from './pc-usage-service';
import { ResponsibleResponse, RoomStatusResponse } from './info-status-service';
import { PcStatusType } from './entities/pc-status';

function responsible(overrides: Partial<ResponsibleResponse>): ResponsibleResponse {
  return {
    memberId: 123456,
    name: 'Secret Name',
    isBoard: true,
    isCandidateBoard: false,
    isKeyholder: false,
    photoUrl: 'https://example.com/photo.png',
    ...overrides,
  };
}

function roomStatus(overrides: Partial<RoomStatusResponse>): RoomStatusResponse {
  return {
    open: true,
    responsible: [responsible({}), responsible({ memberId: null, name: 'Chesty', isBoard: false, isKeyholder: true })],
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
    it('drops memberId and photoUrl from responsibles', () => {
      const result = PublicInfoService.toPublicRoomStatus(roomStatus({}));

      for (const person of result.responsible) {
        expect(JSON.stringify(person)).not.toContain('memberId');
        expect(JSON.stringify(person)).not.toContain('photoUrl');
        expect(person).not.toHaveProperty('memberId');
        expect(person).not.toHaveProperty('photoUrl');
      }
    });

    it('keeps name and role flags so the page can show names next to icons', () => {
      const [board, keyholder] = PublicInfoService.toPublicRoomStatus(roomStatus({})).responsible;

      expect(board).toStrictEqual({ name: 'Secret Name', isBoard: true, isCandidateBoard: false, isKeyholder: false });
      expect(keyholder).toStrictEqual({ name: 'Chesty', isBoard: false, isCandidateBoard: false, isKeyholder: true });
    });

    it('passes through the daily and closing state', () => {
      const source = roomStatus({});
      expect(PublicInfoService.toPublicRoomStatus(source)).toMatchObject({
        open: source.open,
        beerTime: source.beerTime,
        lastCall: source.lastCall,
        closedMessage: source.closedMessage,
        coffeeStatus: source.coffeeStatus,
      });
    });
  });

  describe('toPublicPcStatus', () => {
    it('keeps only the symbol per user', () => {
      const result = PublicInfoService.toPublicPcStatus(
        pcStatus({ users: [pcUser({}), pcUser({ memberId: null, name: 'Other Person', symbol: '' })] }),
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

    it('passes through the per-PC technical state', () => {
      const locked = pcStatus({ remote: true, lockedAt: '2026-09-29T12:00:00Z', status: PcStatusType.LOCKED });
      expect(PublicInfoService.toPublicPcStatus(locked)).toMatchObject({
        pcId: '1',
        remote: true,
        lockedAt: '2026-09-29T12:00:00Z',
        status: PcStatusType.LOCKED,
      });
    });
  });
});
