import { describe, beforeAll, beforeEach, it, expect } from 'vitest';
import { TestEnvironment, type TestApp } from '../shared/test-app';
import { createIntegrationKey } from '../shared/api-key';
import { getDataSource } from '@aurora/database';
import Keyholder from '@aurora/modules/handlers/screen/info/entities/keyholder';
import PublicInfoService from '@aurora/modules/handlers/screen/info/public-info-service';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await TestEnvironment.getInstance().getTestApp();
});

beforeEach(() => {
  // Responses are cached for anonymous traffic; every test sets its own state.
  PublicInfoService.clearCache();
});

async function seedKeyholder(memberId: number, name: string, isBoard: boolean): Promise<void> {
  const repo = getDataSource().getRepository(Keyholder);
  const existing = await repo.findOneBy({ memberId });
  const values = { name, isBoard, isCandidateBoard: false, isKeyholder: !isBoard };
  if (existing) await repo.update(existing.id, values);
  else await repo.save({ memberId, ...values });
}

describe('GET /api/public/info/room-status', () => {
  it('is served without authentication and leaks no responsibles or free text', async () => {
    // ARRANGE
    await seedKeyholder(123456, 'Secret Openhouder', true);
    const admin = await testApp.authorizedAgent.put('/api/handler/screen/info/room-status').send({
      open: true,
      responsible1MemberId: 123456,
      beerTime: '16:30',
      closedMessage: 'Internal note',
    });
    expect(admin.status).toBe(200);

    // ACT
    const res = await testApp.unauthorizedAgent.get('/api/public/info/room-status');

    // ASSERT
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toStrictEqual(
      ['beerTime', 'coffeeStatus', 'lastCall', 'open', 'playingSong'].sort(),
    );
    expect(res.body).toMatchObject({ open: true, beerTime: '16:30' });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('Secret Openhouder');
    expect(serialized).not.toContain('Internal note');
  });
});

describe('GET /api/public/info/pc-usage', () => {
  it('is served without authentication and serves symbols only', async () => {
    // ARRANGE
    await seedKeyholder(123456, 'Secret Openhouder', true);
    const key = await createIntegrationKey(['setInfoPcUsage']);
    const ingest = await testApp.unauthorizedAgent
      .post('/api/handler/screen/info/pc-usage')
      .set('X-API-Key', key)
      .send({
        pcs: [
          { pcId: '1', memberId: 123456, name: 'Secret Openhouder', status: 'in-use' },
          { pcId: '2', memberId: 111222, name: 'Unregistered Visitor Person', status: 'in-use' },
          { pcId: '3', memberId: 111222, name: 'Locked Away', status: 'locked', lockedAt: new Date().toISOString() },
          { pcId: '4', memberId: 111222, name: 'Gone', status: 'maintenance', lockedAt: new Date().toISOString() },
        ],
      });
    expect(ingest.status).toBe(204);

    // ACT
    const res = await testApp.unauthorizedAgent.get('/api/public/info/pc-usage');

    // ASSERT
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.map((pc: { pcId: string }) => [pc.pcId, pc]));
    expect(Object.keys(byId)).toHaveLength(11);
    expect(byId['1']).toMatchObject({ status: 'in-use', users: [{ symbol: '★' }] });
    expect(byId['2']).toMatchObject({ status: 'in-use', users: [{ symbol: '' }] });
    expect(byId['3']).toMatchObject({ status: 'locked', lockedAt: expect.any(String) });
    // A dead machine carries no session, so no (ever-aging) lock either.
    expect(byId['4']).toMatchObject({ status: 'maintenance', users: [], lockedAt: null });
    for (const pc of res.body) {
      for (const user of pc.users) expect(Object.keys(user)).toStrictEqual(['symbol']);
    }
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('Secret Openhouder');
    expect(serialized).not.toContain('Unregistered Visitor Person');
    expect(serialized).not.toContain('Locked Away');
  });
});
