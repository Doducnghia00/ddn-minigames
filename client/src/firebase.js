import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { AUTH_CONFIG } from './config/auth';

let auth = null;

// Only initialize Firebase if Google login is enabled
if (AUTH_CONFIG.enableGoogleLogin) {
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    // Initialize Firebase Authentication and get a reference to the service
    auth = getAuth(app);

    console.log('🔥 Firebase initialized for Google authentication');
}

export { auth };
