/**
 * Claude Code Remote - Main Entry Point
 * WSL2 + tmux + ttyd based remote web terminal
 */

const express = require('express');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./api');
const { RateLimiter } = require('./security');
const { killAllTtyd } = require('./wsl');

const app = express();
const rateLimiter = new RateLimiter();

// Middleware
app.use(express.json());
app.use(rateLimiter.middleware());

// CORS for development
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
app.use('/api', apiRoutes);

// Static files
app.use(express.static(path.join(__dirname, '..', 'static')));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.port, config.host, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Claude Code Remote - Web Terminal               ║
╠═══════════════════════════════════════════════════════════╣
║  Server:    http://${config.host}:${config.port.toString().padEnd(28)}║
║  WSL:       ${config.wslDistro.padEnd(44)}║
║  ttyd:      port ${config.ttydPort.toString().padEnd(39)}║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
async function shutdown() {
    console.log('\nShutting down...');
    try {
        await killAllTtyd();
        console.log('Cleaned up ttyd processes');
    } catch (err) {
        // Ignore cleanup errors
    }
    rateLimiter.destroy();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
