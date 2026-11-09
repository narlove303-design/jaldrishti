import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase, db } from './db.js';
import { startSimulationEngine, registerBroadcastCallback } from './simulation.js';
import { verifyJwtToken, recordAudit } from './middleware/auth.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';

// Import route modules
import authRoutes from './routes/auth.js';
import villagesRoutes from './routes/villages.js';
import pumpRoutes from './routes/pump.js';
import networkRoutes from './routes/network.js';
import tanksRoutes from './routes/tanks.js';
import sensorsRoutes from './routes/sensors.js';
import leaksRoutes from './routes/leaks.js';
import noticesRoutes from './routes/notices.js';
import complaintsRoutes from './routes/complaints.js';
import maintenanceRoutes from './routes/maintenance.js';
import assetsRoutes from './routes/assets.js';
import analyticsRoutes from './routes/analytics.js';
import usersRoutes from './routes/users.js';
import auditRoutes from './routes/audit.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Database & Seeds
initDatabase();

// Security: Whitelisted CORS Origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, or local scripts)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development mode, allow localhost with any port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: origin ${origin} is not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalApiLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'JalDrishti Smart Multi-Village Water Intelligence System',
    version: '1.1.0',
    mode: 'PHYSICAL_SIMULATION_ACTIVE',
    architecture: '1 Central Pump Station -> 1 Distribution Junction -> 3 Villages (A, B, C)',
    security: {
      jwtAuth: 'ACTIVE_256_BIT',
      rbacEnforced: true,
      rateLimiting: 'ACTIVE'
    },
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/villages', villagesRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/tanks', tanksRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/leaks', leaksRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);

// Create HTTP and Secure WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

// Track connected clients with their authenticated user context
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
  // Parse token from query parameter: /ws/telemetry?token=...
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const token = url.searchParams.get('token');

  let user = null;
  if (token) {
    user = verifyJwtToken(token);
  }

  connectedClients.set(ws, {
    user,
    ip: req.socket.remoteAddress || '127.0.0.1',
    connectedAt: new Date()
  });

  const clientInfo = user ? `${user.name} (${user.role})` : 'Anonymous Viewer';
  console.log(`[WebSocket] Client connected: ${clientInfo} from ${req.socket.remoteAddress}. Active clients: ${connectedClients.size}`);

  // Send initial connection acknowledgement
  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    authenticated: !!user,
    user: user ? { name: user.name, role: user.role, village: user.village } : null,
    message: 'Connected to JalDrishti real-time telemetry stream.',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages & validate operations
  ws.on('message', (messageBuffer) => {
    try {
      const msg = JSON.parse(messageBuffer.toString());
      const clientMeta = connectedClients.get(ws);

      // Handle in-band AUTH message
      if (msg.type === 'AUTH') {
        const verified = verifyJwtToken(msg.token);
        if (verified) {
          clientMeta.user = verified;
          ws.send(JSON.stringify({
            type: 'AUTH_SUCCESS',
            user: { name: verified.name, role: verified.role, village: verified.village }
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'AUTH_ERROR',
            error: 'Invalid or expired session token.'
          }));
        }
        return;
      }

      // Security Interlock: Equipment Control operations over WebSocket
      if (msg.type === 'PUMP_CONTROL') {
        if (!clientMeta.user || !['Administrator', 'Operating Staff'].includes(clientMeta.user.role)) {
          recordAudit(
            clientMeta.user?.name || 'Unauthenticated WS Client',
            clientMeta.user?.role || 'Guest',
            'WS_SECURITY_VIOLATION_BLOCKED',
            'Pump Control',
            `Attempted unauthorized pump control over WebSocket without operator privileges.`,
            clientMeta.ip
          );
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Forbidden: Pump control requires Administrator or Operating Staff privileges.'
          }));
          return;
        }

        // Forward to authorized command handler
        const { command } = msg;
        if (command === 'START') {
          db.prepare("UPDATE pump_station SET status = 'Running', discharge_pressure_bar = 3.62, flow_rate_m3h = 84.0 WHERE id = 1").run();
          ws.send(JSON.stringify({ type: 'PUMP_STATUS_UPDATE', status: 'Running' }));
        } else if (command === 'STOP') {
          db.prepare("UPDATE pump_station SET status = 'Stopped', discharge_pressure_bar = 0.50, flow_rate_m3h = 0.0 WHERE id = 1").run();
          ws.send(JSON.stringify({ type: 'PUMP_STATUS_UPDATE', status: 'Stopped' }));
        }
      }
    } catch (parseErr) {
      ws.send(JSON.stringify({ type: 'ERROR', error: 'Malformed WebSocket payload.' }));
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Client error:', err);
    connectedClients.delete(ws);
  });
});

// Register broadcast callback for physical simulation telemetry
registerBroadcastCallback((payload) => {
  const message = JSON.stringify(payload);
  for (const [client] of connectedClients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

// Start simulation engine
startSimulationEngine();

// Start HTTP & WS Server
server.listen(PORT, () => {
  console.log(`
================================================================
💧 JalDrishti Water Intelligence Backend Server
================================================================
  HTTP API:       http://localhost:${PORT}/api/health
  WebSocket:      ws://localhost:${PORT}/ws/telemetry
  Architecture:   Central Main Pump Station (P-01) -> 3 Villages
  Environment:    Physics Simulation & Telemetry Stream Active
================================================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down JalDrishti server...');
  server.close(() => {
    process.exit(0);
  });
});

export { app, server };
