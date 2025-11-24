const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server, LobbyRoom } = require('colyseus');
const { monitor } = require('@colyseus/monitor');
const { Duel1v1Room } = require('./rooms/Duel1v1Room');
const { CaroRoom } = require('./rooms/CaroRoom');

require('dotenv').config();

const port = process.env.PORT || 2567;
const app = express();

app.use(cors());
app.use(express.json());

const admin = require('./firebase');

// Basic API routes
app.get('/', (req, res) => {
    res.send('DDN Games Server is running');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Middleware
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Auth error:", error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.post('/api/login', authenticate, (req, res) => {
    res.json({ message: 'Authenticated successfully', user: req.user });
});

// Create HTTP server
const server = http.createServer(app);

// Create Colyseus server
const gameServer = new Server({
    server: server,
});

// Define Rooms
gameServer.define('lobby', LobbyRoom);
gameServer.define('duel_1v1', Duel1v1Room);
gameServer.define('caro', CaroRoom)
    .enableRealtimeListing();

// Add Colyseus monitor
app.use('/colyseus', monitor());

// Start server
gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
