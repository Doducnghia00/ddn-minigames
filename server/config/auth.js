/**
 * Authentication Configuration
 * 
 * Feature flags for authentication methods.
 * At least one method must be enabled.
 */

const AUTH_CONFIG = {
    enableGuestLogin: process.env.ENABLE_GUEST_LOGIN === 'true',
    enableGoogleLogin: process.env.ENABLE_GOOGLE_LOGIN === 'true'
};

// Validate: at least one authentication method must be enabled
if (!AUTH_CONFIG.enableGuestLogin && !AUTH_CONFIG.enableGoogleLogin) {
    throw new Error(
        '❌ Authentication Configuration Error:\n' +
        'At least one authentication method must be enabled.\n' +
        'Set ENABLE_GUEST_LOGIN=true or ENABLE_GOOGLE_LOGIN=true in your .env file.\n\n' +
        'Example .env.development:\n' +
        'ENABLE_GUEST_LOGIN=true\n' +
        'ENABLE_GOOGLE_LOGIN=true'
    );
}

// Validate: if Google login is enabled, Firebase credentials must exist
if (AUTH_CONFIG.enableGoogleLogin) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error(
            '❌ Firebase Configuration Error:\n' +
            'Google login is enabled but GOOGLE_APPLICATION_CREDENTIALS is not set.\n' +
            'Please set this environment variable to the path of your Firebase service account key,\n' +
            'or set ENABLE_GOOGLE_LOGIN=false to disable Google login.\n\n' +
            'Example:\n' +
            'GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json'
        );
    }
}

console.log('🔐 Authentication Configuration:');
console.log(`   Guest Login: ${AUTH_CONFIG.enableGuestLogin ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`   Google Login: ${AUTH_CONFIG.enableGoogleLogin ? '✅ Enabled' : '❌ Disabled'}`);

module.exports = AUTH_CONFIG;
