import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { bearer, makeUser, startDb, stopDb, tokenFor } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);

const sensitiveProfile = {
    ageGroup: '30-40',
    biologicalSex: 'female',
    allergies: ['penicillin'],
    chronicConditions: ['asthma'],
    pastSurgeries: ['appendectomy'],
    lifestyleIndicators: ['smoker']
};

describe('Medical ID token management', () => {
    it('requires login to get, rotate or revoke a token', async () => {
        expect((await request(app).get('/api/users/emergency-token')).status).toBe(401);
        expect((await request(app).post('/api/users/emergency-token/rotate')).status).toBe(401);
        expect((await request(app).delete('/api/users/emergency-token')).status).toBe(401);
    });

    it('issues a random token that is stable until rotated', async () => {
        const user = await makeUser();
        const auth = bearer(tokenFor(user.id));

        const first = await request(app).get('/api/users/emergency-token').set(auth);
        const again = await request(app).get('/api/users/emergency-token').set(auth);

        expect(first.status).toBe(200);
        expect(first.body.token).toMatch(/^[A-Za-z0-9_-]{20,64}$/);
        expect(first.body.token).not.toContain(user.id);
        expect(again.body.token).toBe(first.body.token);
    });
});

describe('public Medical ID lookup', () => {
    it('returns only critical fields and nothing private', async () => {
        const user = await makeUser({ healthProfile: sensitiveProfile, phone: '+911234567890' });
        const { body } = await request(app).get('/api/users/emergency-token').set(bearer(tokenFor(user.id)));

        const res = await request(app).get(`/api/users/emergency-info/${body.token}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Test User');
        expect(res.body.healthProfile.allergies).toEqual(['penicillin']);
        expect(res.body.healthProfile.chronicConditions).toEqual(['asthma']);

        const text = JSON.stringify(res.body);
        expect(res.body.email).toBeUndefined();
        expect(res.body._id).toBeUndefined();
        expect(res.body.emergencyToken).toBeUndefined();
        expect(text).not.toContain('appendectomy');
        expect(text).not.toContain('smoker');
        expect(text).not.toContain('example.com');
    });

    it('does not resolve a user id (the old, leaky lookup)', async () => {
        const user = await makeUser({ healthProfile: sensitiveProfile });
        const res = await request(app).get(`/api/users/emergency-info/${user.id}`);
        expect(res.status).toBe(404);
    });

    it('returns 404 for unknown or malformed tokens', async () => {
        expect((await request(app).get('/api/users/emergency-info/short')).status).toBe(404);
        expect((await request(app).get(`/api/users/emergency-info/${'a'.repeat(32)}`)).status).toBe(404);
    });

    it('stops working for the old token after rotation', async () => {
        const user = await makeUser({ healthProfile: sensitiveProfile });
        const auth = bearer(tokenFor(user.id));
        const oldToken = (await request(app).get('/api/users/emergency-token').set(auth)).body.token;

        const rotated = await request(app).post('/api/users/emergency-token/rotate').set(auth);
        expect(rotated.body.token).not.toBe(oldToken);

        expect((await request(app).get(`/api/users/emergency-info/${oldToken}`)).status).toBe(404);
        expect((await request(app).get(`/api/users/emergency-info/${rotated.body.token}`)).status).toBe(200);
    });

    it('stops working after revocation', async () => {
        const user = await makeUser({ healthProfile: sensitiveProfile });
        const auth = bearer(tokenFor(user.id));
        const token = (await request(app).get('/api/users/emergency-token').set(auth)).body.token;

        expect((await request(app).delete('/api/users/emergency-token').set(auth)).status).toBe(200);
        expect((await request(app).get(`/api/users/emergency-info/${token}`)).status).toBe(404);
    });
});
