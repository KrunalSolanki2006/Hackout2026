const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const url = process.env.MONGODB_URL;
  const dbName = process.env.DATABASE_NAME || 'hackout_emission_db';

  try {
    await mongoose.connect(url, { dbName });
    isConnected = true;
    console.log(`[DB] Connected to MongoDB Atlas → ${dbName}`);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
