import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { bearer, clearUsers, makeUser, startDb, stopDb, tokenFor } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);

describe('registration', () => {
    it('ignores a client-supplied role (no admin self-signup)', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Mallory',
            email: 'mallory@example.com',
            password: 'Password123!',
            role: 'admin'
        });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('user');
        const stored = await User.findOne({ email: 'mallory@example.com' });
        expect(stored?.role).toBe('user');
    });
});

describe('login', () => {
    it('returns a token for valid credentials and 400 for a wrong password', async () => {
        await makeUser({ email: 'login@example.com' });

        const ok = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'Password123!' });
        expect(ok.status).toBe(200);
        expect(typeof ok.body.token).toBe('string');

        const bad = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'wrong-password' });
        expect(bad.status).toBe(400);
        expect(bad.body.token).toBeUndefined();
    });
});

describe('protect middleware', () => {
    it('rejects requests without a token', async () => {
        const res = await request(app).get('/api/users/profile');
        expect(res.status).toBe(401);
    });

    it('rejects a token that is signed with a different secret', async () => {
        const jwt = (await import('jsonwebtoken')).default;
        const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'secret');
        const res = await request(app).get('/api/users/profile').set(bearer(forged));
        expect(res.status).toBe(401);
    });

    it('rejects a valid token whose user no longer exists', async () => {
        const user = await makeUser();
        const token = tokenFor(user.id);
        await User.deleteOne({ _id: user._id });

        const res = await request(app).get('/api/users/profile').set(bearer(token));
        expect(res.status).toBe(401);
    });

    it('does not accept an MFA-pending token as a session token', async () => {
        const user = await makeUser();
        const mfaPending = tokenFor(user.id, { mfaPending: true });

        const res = await request(app).get('/api/users/profile').set(bearer(mfaPending));
        expect(res.status).toBe(401);
    });

    it('accepts a normal session token', async () => {
        const user = await makeUser();
        const res = await request(app).get('/api/users/profile').set(bearer(tokenFor(user.id)));
        expect(res.status).toBe(200);
        expect(res.body._id).toBe(user.id);
    });
});

describe('MFA login verification', () => {
    it('rejects a full session token used as an MFA challenge token', async () => {
        const user = await makeUser({ mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP' });
        const res = await request(app)
            .post('/api/auth/mfa/login-verify')
            .send({ tempToken: tokenFor(user.id), token: '123456' });
        expect(res.status).toBe(401);
    });
});

describe('admin routes', () => {
    it('returns 403 (not 401) for a signed-in non-admin', async () => {
        await clearUsers();
        const user = await makeUser();
        const res = await request(app).get('/api/admin/reports').set(bearer(tokenFor(user.id)));
        expect(res.status).toBe(403);
    });

    it('lets an admin through the role check', async () => {
        const admin = await makeUser({ role: 'admin' });
        const res = await request(app).get('/api/admin/reports').set(bearer(tokenFor(admin.id)));
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });
});
