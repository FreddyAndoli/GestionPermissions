import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import routes from '../../routes';

// Mock auth middleware for tests
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
      role: 'Super Admin',
      effectivePermissions: { 'admin.read': true, 'users.read': true, 'users.create': true }
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

describe('Users API Integration', () => {
  it('GET /api/v1/users should return paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/users?page=1&limit=10')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  it('GET /api/v1/users/:id should return user details', async () => {
    const res = await request(app)
      .get('/api/v1/users/1')
      .set('Authorization', 'Bearer test-token');

    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/v1/users should validate input', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Auth API Integration', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/status should return services status', async () => {
    const res = await request(app)
      .get('/api/v1/status')
      .set('Authorization', 'Bearer test-token');

    expect([200, 503]).toContain(res.status);
  });
});
