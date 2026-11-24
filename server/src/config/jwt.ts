/**
 * Returns the JWT signing secret. There is deliberately no fallback value:
 * a missing secret must stop the server instead of silently making every
 * token forgeable.
 */
export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('JWT_SECRET is missing or shorter than 16 characters. Set it in server/.env before starting the server.');
    }
    return secret;
};
