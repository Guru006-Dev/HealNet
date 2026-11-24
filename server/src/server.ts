// Must be the first import so .env is loaded before the app module reads process.env.
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { getJwtSecret } from './config/jwt.js';
import seedHospitals from './utils/seeder.js';

// Refuse to start without a real JWT secret (no insecure fallback).
getJwtSecret();

// Global Exception Handlers for better logging
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL-ERROR] Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[CRITICAL-ERROR] Unhandled Rejection:', reason?.message || reason);
  if (reason?.stack) console.error(reason.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  seedHospitals();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
