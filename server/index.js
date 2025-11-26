const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server, LobbyRoom } = require('colyseus');
const { monitor } = require('@colyseus/monitor');
const { Duel1v1Room } = require('./rooms/duel1v1/Duel1v1Room');
const { CaroRoom } = require('./rooms/caro/CaroRoom');

const test = require('dotenv').config();
console.log("test", test);

const AUTH_CONFIG = require('./config/auth');
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

// Auth Features Endpoint - report which auth methods are enabled
app.get('/api/auth/features', (req, res) => {
    res.json({
        guestLogin: AUTH_CONFIG.enableGuestLogin,
        googleLogin: AUTH_CONFIG.enableGoogleLogin
    });
});

// Auth Middleware (only used if Google login is enabled)
const authenticate = async (req, res, next) => {
    if (!AUTH_CONFIG.enableGoogleLogin || !admin) {
        return res.status(503).json({
            error: 'Google authentication is not enabled on this server'
        });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            error: 'Missing authorization header. Please sign in again.'
        });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Invalid authorization format. Please sign in again.'
        });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
        return res.status(401).json({
            error: 'Missing authentication token. Please sign in again.'
        });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Auth error:", error.code, error.message);

        // Provide specific error messages based on error type
        let errorMessage = 'Authentication failed. Please sign in again.';

        if (error.code === 'auth/id-token-expired') {
            errorMessage = 'Your session has expired. Please sign in again.';
        } else if (error.code === 'auth/id-token-revoked') {
            errorMessage = 'Your session has been revoked. Please sign in again.';
        } else if (error.code === 'auth/invalid-id-token') {
            errorMessage = 'Invalid authentication token. Please sign in again.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'User account not found. Please sign in again.';
        }

        res.status(401).json({ error: errorMessage });
    }
};

// Google Login Endpoint (only registered if Google login is enabled)
if (AUTH_CONFIG.enableGoogleLogin) {
    app.post('/api/login', authenticate, (req, res) => {
        res.json({ message: 'Authenticated successfully', user: req.user });
    });
    console.log('✅ Google login endpoint registered');
}

// Guest Login Endpoint (only registered if guest login is enabled)
if (AUTH_CONFIG.enableGuestLogin) {
    app.post('/api/guest-login', (req, res) => {
        const { username } = req.body;

        // Validate username
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Trim and validate length
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 2 || trimmedUsername.length > 20) {
            return res.status(400).json({ error: 'Username must be between 2 and 20 characters' });
        }

        // Validate characters (allow letters, numbers, spaces, and some special chars)
        const validUsernameRegex = /^[a-zA-Z0-9\s_-]+$/;
        if (!validUsernameRegex.test(trimmedUsername)) {
            return res.status(400).json({ error: 'Username contains invalid characters' });
        }

        // Check for excessive whitespace
        if (trimmedUsername.includes('  ')) {
            return res.status(400).json({ error: 'Username cannot contain consecutive spaces' });
        }

        // Generate unique guest ID
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const guestUser = {
            uid: guestId,
            name: trimmedUsername,
            email: `${guestId}@guest.local`,
            isGuest: true,
            avatar: ''
        };

        res.json({
            message: 'Guest login successful',
            user: guestUser
        });
    });
    console.log('✅ Guest login endpoint registered');
}

// Fallback routes for disabled auth methods (return clear error messages)
if (!AUTH_CONFIG.enableGoogleLogin) {
    app.post('/api/login', (req, res) => {
        res.status(503).json({
            error: 'Google login is not enabled on this server. Please use guest login or contact the administrator.'
        });
    });
}

if (!AUTH_CONFIG.enableGuestLogin) {
    app.post('/api/guest-login', (req, res) => {
        res.status(503).json({
            error: 'Guest login is not enabled on this server. Please use Google sign-in or contact the administrator.'
        });
    });
}

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
