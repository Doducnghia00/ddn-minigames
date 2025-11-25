# Firebase / Google Login Setup

This guide explains how to set up Google Sign-In using Firebase Authentication.

## Prerequisites

- Google account
- Firebase project (free tier is sufficient)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional)

## Step 2: Enable Google Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google**
3. Toggle **Enable**
4. Set a public-facing name for your project
5. Choose a support email
6. Click **Save**

## Step 3: Get Web App Credentials

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to "Your apps"
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

You'll see something like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 4: Get Server Credentials

1. In Firebase Console, go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Save the downloaded JSON file as `server/credentials/serviceAccountKey.json`

⚠️ **Important**: Never commit this file to version control!

## Step 5: Configure Client

Edit `client/.env.development`:

```env
# Enable Google login
VITE_ENABLE_GOOGLE_LOGIN=true

# Firebase Configuration (from Step 3)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Backend URLs
VITE_API_URL=http://localhost:2567
VITE_WS_URL=ws://localhost:2567

# Optional: Enable guest login too
VITE_ENABLE_GUEST_LOGIN=true
```

## Step 6: Configure Server

Edit `server/.env.development`:

```env
# Enable Google login
ENABLE_GOOGLE_LOGIN=true

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json

# Server Configuration
PORT=2567
NODE_ENV=development

# Optional: Enable guest login too
ENABLE_GUEST_LOGIN=true
```

## Step 7: Test

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the client:
   ```bash
   cd client
   npm run dev
   ```

3. Navigate to `http://localhost:5174`
4. Click "Sign in with Google"
5. Sign in with your Google account

## Production Setup

For production, create `client/.env.production` and `server/.env.production` with:

- Same Firebase credentials
- Production URLs (HTTPS and WSS)
- `NODE_ENV=production`

Example:

```env
# client/.env.production
VITE_ENABLE_GOOGLE_LOGIN=true
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

## Troubleshooting

### "Firebase not configured" error

- Check that all `VITE_FIREBASE_*` variables are set
- Verify `VITE_ENABLE_GOOGLE_LOGIN=true`
- Restart the dev server after changing `.env` files

### "Firebase Admin initialization failed"

- Check that `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Verify the service account key file exists
- Ensure the file is valid JSON

### "Invalid token" error

- Make sure client and server use the same Firebase project
- Check that the service account key matches the project

## Security Notes

- ✅ Service account keys are gitignored
- ✅ Never expose Firebase credentials in client-side code (they're public by design)
- ✅ Firebase Security Rules protect your data
- ⚠️ Keep service account keys secure on the server

## See Also

- [Firebase Documentation](https://firebase.google.com/docs)
- [Guest Login Setup](auth-guest.md)
- [Deployment Guide](deployment.md)
