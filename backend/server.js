import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase } from './db.js';
import { startSimulationEngine, registerBroadcastCallback } from './simulation.js';

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

// Middleware
app.use(cors({
  origin: '*', // Allow Next.js frontend or any local dev client
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'JalDrishti Smart Multi-Village Water Intelligence System',
    version: '1.0.0',
    mode: 'SIMULATION_ENGINE_ACTIVE',
    architecture: '1 Central Pump Station -> 1 Distribution Junction -> 3 Villages (A, B, C)',
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

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

const connectedClients = new Set();

wss.on('connection', (ws, req) => {
  connectedClients.add(ws);
  console.log(`[WebSocket] Client connected from ${req.socket.remoteAddress}. Active clients: ${connectedClients.size}`);

  // Send initial connection acknowledgement
  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    message: 'Connected to JalDrishti real-time water telemetry stream.',
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => {
    connectedClients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Client error:', err);
    connectedClients.delete(ws);
  });
});

// Register broadcast callback for the physical simulation engine
registerBroadcastCallback((payload) => {
  const message = JSON.stringify(payload);
  for (const client of connectedClients) {
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
  WebSocket Stream: ws://localhost:${PORT}/ws/telemetry
  Architecture:   Central Main Pump Station (P-01) -> 3 Villages
  Environment:    Demonstration & Simulation Engine Active
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
