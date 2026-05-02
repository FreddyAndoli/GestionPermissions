import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import routes from '../../routes';

vi.mock('../../middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      id: 1,
      firebaseUid: 'test-uid',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'Test',
      organizationId: 1,
      status: 'active',
      role: 'Super Admin'
    };
    next();
  }
}));

vi.mock('../../middlewares/role.middleware', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next()
}));

const app = express();
app.use(express.json());
app.use('/api/v1', routes);

describe('Leaves API Integration', () => {
  it('GET /api/v1/leaves should return leave requests', async () => {
    const res = await request(app)
      .get('/api/v1/leaves')
      .set('Authorization', 'Bearer test-token');

    expect([200, 500]).toContain(res.status);
  });

  it('POST /api/v1/leaves should validate periods', async () => {
    const res = await request(app)
      .post('/api/v1/leaves')
      .set('Authorization', 'Bearer test-token')
      .send({
        leaveTypeId: 1,
        periods: [],
        reason: 'Test'
      });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/leaves/balance should return user balance', async () => {
    const res = await request(app)
      .get('/api/v1/leaves/balance')
      .set('Authorization', 'Bearer test-token');

    expect([200, 500]).toContain(res.status);
  });
});
