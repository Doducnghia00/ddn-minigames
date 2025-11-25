/**
 * Authentication Configuration
 * 
 * Feature flags for authentication methods.
 * At least one method must be enabled.
 */

export const AUTH_CONFIG = {
    enableGuestLogin: import.meta.env.VITE_ENABLE_GUEST_LOGIN === 'true',
    enableGoogleLogin: import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true'
};

// Validate: at least one authentication method must be enabled
if (!AUTH_CONFIG.enableGuestLogin && !AUTH_CONFIG.enableGoogleLogin) {
    throw new Error(
        '❌ Authentication Configuration Error:\n' +
        'At least one authentication method must be enabled.\n' +
        'Set VITE_ENABLE_GUEST_LOGIN=true or VITE_ENABLE_GOOGLE_LOGIN=true in your .env file.\n\n' +
        'Example .env.development:\n' +
        'VITE_ENABLE_GUEST_LOGIN=true\n' +
        'VITE_ENABLE_GOOGLE_LOGIN=true'
    );
}

// Validate: if Google login is enabled, Firebase config must be complete
if (AUTH_CONFIG.enableGoogleLogin) {
    const requiredFirebaseVars = {
        'VITE_FIREBASE_API_KEY': import.meta.env.VITE_FIREBASE_API_KEY,
        'VITE_FIREBASE_AUTH_DOMAIN': import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        'VITE_FIREBASE_PROJECT_ID': import.meta.env.VITE_FIREBASE_PROJECT_ID,
        'VITE_FIREBASE_APP_ID': import.meta.env.VITE_FIREBASE_APP_ID
    };

    const missingVars = Object.entries(requiredFirebaseVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingVars.length > 0) {
        throw new Error(
            '❌ Firebase Configuration Error:\n' +
            'Google login is enabled but Firebase configuration is incomplete.\n' +
            `Missing environment variables: ${missingVars.join(', ')}\n\n` +
            'Please add these to your .env file or set VITE_ENABLE_GOOGLE_LOGIN=false'
        );
    }
}

console.log('🔐 Authentication Configuration:');
console.log(`   Guest Login: ${AUTH_CONFIG.enableGuestLogin ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`   Google Login: ${AUTH_CONFIG.enableGoogleLogin ? '✅ Enabled' : '❌ Disabled'}`);
