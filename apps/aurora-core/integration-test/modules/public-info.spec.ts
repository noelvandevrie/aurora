import { describe, beforeAll, it, expect } from 'vitest';
import { TestEnvironment, type TestApp } from '../shared/test-app';
import { expectApiError } from '../shared/response-matchers';
import { createIntegrationKey } from '../shared/api-key';
import { getDataSource } from '@aurora/database';
import Keyholder from '@aurora/modules/handlers/screen/info/entities/keyholder';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await TestEnvironment.getInstance().getTestApp();
});

/**
 * Seeds a keyholder the tests can point the room-status and pc-usage payloads at.
 */
async function seedKeyholder(memberId: number, name: string, isBoard: boolean): Promise<void> {
  const repo = getDataSource().getRepository(Keyholder);
  const existing = await repo.findOneBy({ memberId });
  if (existing) {
    await repo.update(existing.id, { name, isBoard, isCandidateBoard: false, isKeyholder: !isBoard });
  } else {
    await repo.save({ memberId, name, isBoard, isCandidateBoard: false, isKeyholder: !isBoard });
  }
}

describe('GET /api/public/info/room-status', () => {
  it('fails without any auth on the internal endpoint', async () => {
    // ACT
    const res = await testApp.unauthorizedAgent.get('/api/handler/screen/info/room-status');

    // ASSERT
    expectApiError(res, 401);
  });

  it('returns 200 without authentication and exposes no responsibles', async () => {
    // ARRANGE
    await seedKeyholder(123456, 'Secret Openhouder', true);

    const admin = await testApp.authorizedAgent
      .put('/api/handler/screen/info/room-status')
      .send({ open: true, responsible1MemberId: 123456, beerTime: '16:30' });
    expect(admin.status).toBe(200);

    // ACT
    const publicRes = await testApp.unauthorizedAgent.get('/api/public/info/room-status');

    // ASSERT
    expect(publicRes.status).toBe(200);

    // Responsibles were never public on the old page, so the field is absent
    // entirely, not merely reduced.
    const serialized = JSON.stringify(publicRes.body);
    expect(serialized).not.toContain('responsible');
    expect(serialized).not.toContain('Secret Openhouder');
    expect(serialized).not.toContain('memberId');
    expect(serialized).not.toContain('photoUrl');
    expect(publicRes.body.responsible).toBeUndefined();

    // The rest of the room state is still there (other specs share the row, so
    // only assert on fields being present, not on exact daily values).
    expect(publicRes.body).toMatchObject({
      open: true,
      beerTime: '16:30',
      lastCall: null,
      closedMessage: null,
      coffeeStatus: expect.anything(),
      playingSong: null,
    });
    // LastFM is not configured in the integration env, so the field exists but is null.
    expect(publicRes.body.playingSong).toBeNull();
  });
});

describe('GET /api/public/info/pc-usage', () => {
  it('fails without any auth on the internal endpoint', async () => {
    const res = await testApp.unauthorizedAgent.get('/api/handler/screen/info/pc-usage');
    expectApiError(res, 401);
  });

  it('returns 200 without auth and serves symbols only', async () => {
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
        ],
      });
    expect(ingest.status).toBe(204);
    const ProbeEntity = (await import('@aurora/modules/handlers/screen/info/entities/pc-status')).default;
    const rowsNow = await getDataSource().getRepository(ProbeEntity).find();
    console.log('ROWS-NOW', JSON.stringify(rowsNow));

    // ACT
    const res = await testApp.unauthorizedAgent.get('/api/public/info/pc-usage');

    // ASSERT
    expect(res.status).toBe(200);
    console.log('ACTUAL', JSON.stringify(res.body));
    const byId = Object.fromEntries(res.body.map((pc: { pcId: string }) => [pc.pcId, pc]));
    expect(byId['1']).toMatchObject({ status: 'in-use', users: [{ symbol: '★' }] });
    expect(byId['2']).toMatchObject({ status: 'in-use', users: [{ symbol: '' }] });
    // The lock timestamp stays readable so the page can show how long a seat has been locked.
    expect(byId['3']).toMatchObject({ status: 'locked', lockedAt: expect.any(String) });
    expect(byId['7']).toMatchObject({ status: 'offline', users: [], lockedAt: null });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('Secret Openhouder');
    expect(serialized).not.toContain('Unregistered Visitor Person');
    expect(serialized).not.toContain('Locked Away');
    expect(serialized).not.toContain('memberId');
    expect(JSON.parse(serialized)).not.toContain('name');
});
});
