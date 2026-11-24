import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// Kept in its own file so its requests don't use up the auth limiter of other test files.
describe('rate limiting', () => {
    it('blocks brute-force login attempts with 429', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 25; i++) {
            const res = await request(app).post('/api/auth/login').send({});
            statuses.push(res.status);
        }

        expect(statuses[0]).toBe(400); // normal validation error first
        expect(statuses).toContain(429);
        expect(statuses.slice(0, 20).every((s) => s !== 429)).toBe(true);
    });
});
