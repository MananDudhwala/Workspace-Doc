import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import shareRoutes from './routes/share';
import uploadRoutes from './routes/upload';
import mediaRoutes from './routes/media';
import { hocuspocus } from './hocuspocus';
import crossws from 'crossws/adapters/node';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.use('/documents', shareRoutes);
app.use('/upload', uploadRoutes);
app.use('/media', mediaRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Integrate Hocuspocus via crossws
const ws = crossws({
  hooks: {
    open(peer) {
      // Hocuspocus handles the connection. We can pass the request.
      const clientConnection = hocuspocus.handleConnection(
        peer.websocket as any, 
        peer.request,
        {} // context
      );
      (peer as any)._hocuspocus = clientConnection;
    },
    message(peer, message) {
      if (message && typeof message.uint8Array === 'function') {
         (peer as any)._hocuspocus?.handleMessage(message.uint8Array());
      } else if (message instanceof Uint8Array || Buffer.isBuffer(message)) {
         (peer as any)._hocuspocus?.handleMessage(message);
      } else {
         // Some adapters pass ArrayBuffer or raw string.
         (peer as any)._hocuspocus?.handleMessage(Buffer.from(message as any));
      }
    },
    close(peer, event) {
      (peer as any)._hocuspocus?.handleClose({ code: event?.code || 1000, reason: event?.reason || '' });
    },
    error(peer, error) {
      // Hocuspocus will handle disconnects anyway
      (peer as any)._hocuspocus?.handleClose({ code: 1001, reason: error?.message || 'Error' });
    }
  }
});

// Attach crossws to upgrade event
httpServer.on('upgrade', (request, socket, head) => {
  ws.handleUpgrade(request, socket, head);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 WorkspaceDoc API running on http://localhost:${PORT}`);
  console.log(`🔌 Hocuspocus (Yjs) ready for real-time collaboration`);
});

export default app;

