import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User.js';

let mongod: MongoMemoryServer | undefined;

export const startDb = async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    // Make sure unique/sparse indexes (e.g. emergencyToken) exist before tests run.
    await User.init();
};

export const stopDb = async () => {
    await mongoose.disconnect();
    await mongod?.stop();
};

export const clearUsers = async () => {
    await User.deleteMany({});
};

type UserOverrides = Record<string, unknown>;

export const makeUser = async (overrides: UserOverrides = {}) => {
    const suffix = Math.random().toString(36).slice(2, 8);
    return User.create({
        name: 'Test User',
        username: `user_${suffix}`,
        email: `user_${suffix}@example.com`,
        password: await bcrypt.hash('Password123!', 4),
        role: 'user',
        ...overrides
    });
};

export const tokenFor = (userId: string, extra: Record<string, unknown> = {}) =>
    jwt.sign({ id: userId, ...extra }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
