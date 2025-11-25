const AUTH_CONFIG = require('./config/auth');

let admin = null;

// Only initialize Firebase Admin if Google login is enabled
if (AUTH_CONFIG.enableGoogleLogin) {
    admin = require('firebase-admin');

    if (!admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log('🔥 Firebase Admin initialized successfully');
        } catch (error) {
            console.error('❌ Firebase Admin initialization failed');
            console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly');
            console.error('Error:', error.message);
            throw error;
        }
    }
}

module.exports = admin;
