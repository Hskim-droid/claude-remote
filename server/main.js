/**
 * Claude Code Remote - Main Entry Point
 * Cross-platform web terminal (Windows/WSL2, Linux, macOS)
 */

const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const config = require('./config');
const apiRouter = require('./api');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API routes
app.use('/api', apiRouter);

// Static files
const staticPath = path.join(__dirname, '..', 'static');
app.use(express.static(staticPath));

// Terminal page route
app.get('/terminal', (req, res) => {
  res.sendFile(path.join(staticPath, 'terminal.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Platform label
const platformLabel = {
  win32: 'Windows (WSL2)',
  linux: 'Linux',
  darwin: 'macOS',
}[config.PLATFORM] || config.PLATFORM;

// WebSocket proxy: /ws on this server -> ttyd on localhost:TTYD_PORT/ws
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    const ttydUrl = `ws://localhost:${config.TTYD_PORT}/ws`;
    const upstream = new WebSocket(ttydUrl);

    upstream.on('open', () => {
      wss.handleUpgrade(req, socket, head, (client) => {
        // ttyd -> client
        upstream.on('message', (data, isBinary) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: isBinary });
          }
        });

        // client -> ttyd
        client.on('message', (data, isBinary) => {
          if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(data, { binary: isBinary });
          }
        });

        client.on('close', () => upstream.close());
        upstream.on('close', () => client.close());
      });
    });

    upstream.on('error', () => {
      socket.destroy();
    });
  } else {
    socket.destroy();
  }
});

// Start server
server.listen(config.PORT, config.HOST, () => {
  console.log('='.repeat(50));
  console.log('Claude Code Remote - Server');
  console.log('='.repeat(50));
  console.log(`Platform: ${platformLabel}`);
  console.log(`UI:       http://localhost:${config.PORT}`);
  console.log(`WS Proxy: /ws -> localhost:${config.TTYD_PORT}`);
  console.log('='.repeat(50));
});
