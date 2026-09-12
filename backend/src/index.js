require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db/connection');
const { seedDatabase } = require('./services/seedService');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRouter = require('./routes/auth');
const facilitiesRouter = require('./routes/facilities');
const assessmentsRouter = require('./routes/assessments');
const datasetsRouter = require('./routes/datasets');

const app = express();
const PORT = process.env.PORT || 8000;

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ──────────────────────────────────────────
// Health check (no auth)
// ──────────────────────────────────────────
const healthHandler = (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
};
app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// ──────────────────────────────────────────
// Dual route mounting: /api/v1/* AND /*
// Prevents base URL mismatches between frontend configurations
// ──────────────────────────────────────────
const PREFIXES = ['/api/v1', ''];

for (const prefix of PREFIXES) {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/facilities`, facilitiesRouter);
  app.use(`${prefix}/assessments`, assessmentsRouter);
  app.use(prefix || '/', datasetsRouter);
}

// ──────────────────────────────────────────
// 404 handler
// ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

// ──────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────
// Startup
// ──────────────────────────────────────────
async function start() {
  console.log('[Server] Starting HackOut 2026 Backend...');
  await connectDB();
  await seedDatabase();

  const server = app.listen(PORT, () => {
    console.log(`[Server] ✅ Running on http://localhost:${PORT}`);
    console.log(`[Server] API available at http://localhost:${PORT}/api/v1`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] ❌ Port ${PORT} is already in use. Terminate the process using port ${PORT} and restart.`);
    } else {
      console.error('[Server] Server error:', err);
    }
  });
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
