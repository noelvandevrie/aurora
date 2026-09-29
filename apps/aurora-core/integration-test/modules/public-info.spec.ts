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
export async function seedKeyholder(memberId: number, name: string, isBoard: boolean): Promise<void> {
  const repo = getDataSource().getRepository(Keyholder);
  const existing = await repo.findOneBy({ memberId });
  if (existing) {
    await repo.update(existing.id, { name, isBoard, isCandidateBoard: false, isKeyholder: !isBoard });
  } else {
    await repo.save({ memberId, name, isBoard, isCandidateBoard: false, isKeyholder: !isBoard });
  }
}

describe('GET /api/public/info/room-status', () => {
  it('fails without any auth', async () => {
    // ACT
    const res = await testApp.unauthorizedAgent.get('/api/handler/screen/info/room-status');

    // ASSERT
    expectApiError(res, 401);
  });

  it('returns 200 without authentication and strips memberId/photoUrl', async () => {
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
    expect(publicRes.body.open).toBe(true);
    expect(publicRes.body.responsible).toHaveLength(1);
    expect(publicRes.body.responsible[0]).toStrictEqual({
      name: 'Secret Openhouder',
      isBoard: true,
      isCandidateBoard: false,
      isKeyholder: false,
    });
    // Names are public (legacy openhouders were shown too); only the numeric
    // identity and photo must never appear.
    const serialized = JSON.stringify(publicRes.body);
    expect(serialized).not.toContain('memberId');
    expect(serialized).not.toContain('photoUrl');
    expect(serialized).not.toContain('123456');
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
        ],
      });
    expect(ingest.status).toBe(204);

    // ACT
    const res = await testApp.unauthorizedAgent.get('/api/public/info/pc-usage');

    // ASSERT
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual(
      expect.objectContaining({ pcId: '1', users: [{ symbol: '★' }] }),
    );
    expect(res.body).toContainEqual(
      expect.objectContaining({ pcId: '2', users: [{ symbol: '' }] }),
    );
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('Secret Openhouder');
    expect(serialized).not.toContain('Unregistered Visitor Person');
    expect(serialized).not.toContain('memberId');
    expect(serialized).not.toContain('name');
  });
});
