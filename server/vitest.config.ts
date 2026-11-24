import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        // The first run downloads a mongod binary for mongodb-memory-server.
        hookTimeout: 180_000,
        testTimeout: 30_000,
        env: {
            NODE_ENV: 'test',
            JWT_SECRET: 'test-secret-0123456789abcdef'
        }
    }
});
