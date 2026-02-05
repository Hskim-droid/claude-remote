/**
 * Claude Code Remote - Main Entry Point
 * WSL2 + tmux + ttyd based web terminal
 */

const express = require('express');
const path = require('path');
const config = require('./config');
const apiRouter = require('./api');

const app = express();

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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.PORT, config.HOST, () => {
  console.log('='.repeat(50));
  console.log('Claude Code Remote - Server');
  console.log('='.repeat(50));
  console.log(`UI:       http://localhost:${config.PORT}`);
  console.log(`Terminal: http://localhost:${config.TTYD_PORT} (after connecting)`);
  console.log('='.repeat(50));
});
