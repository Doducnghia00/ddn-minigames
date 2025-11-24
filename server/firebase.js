const admin = require('firebase-admin');

// Initialize Firebase Admin
// Ideally, you should use a service account key file or environment variables
// For this setup, we'll assume GOOGLE_APPLICATION_CREDENTIALS env var is set
// or use a placeholder that warns the user.

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.warn("Firebase Admin initialization failed. Make sure GOOGLE_APPLICATION_CREDENTIALS is set or provide a service account key.");
        console.warn("Error:", error.message);
    }
}

module.exports = admin;
