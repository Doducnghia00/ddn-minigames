# Quick Setup Guide

This guide will help you quickly set up the development environment for DDN Games.

## Prerequisites

- Node.js (v16+) installed
- npm installed
- Firebase project created
- Firebase service account key downloaded

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 2. Set Up Environment Files

#### Client Environment

Create `client/.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend URLs
VITE_API_URL=http://localhost:2567
VITE_WS_URL=ws://localhost:2567
```

Get Firebase credentials from: Firebase Console → Project Settings → General → Your apps

> **Optional**: If you need different URLs for development vs production, create:
> - `client/.env.development` with `VITE_API_URL=http://localhost:2567` and `VITE_WS_URL=ws://localhost:2567`
> - `client/.env.production` with `VITE_API_URL=https://your-production-api.com` and `VITE_WS_URL=wss://your-production-api.com`
> 
> These will override the base `.env` values when running `npm run dev` or `npm start`.

#### Server Environment

Create `server/.env` file:

```env
# Google Cloud Service Account
GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json

# Server Configuration
PORT=2567
NODE_ENV=development
```

### 3. Add Firebase Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the downloaded JSON file as `server/credentials/serviceAccountKey.json`

### 4. Start the Application

Open two terminal windows:

**Terminal 1 - Start Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start Client:**
```bash
cd client
npm run dev
```

### 5. Access the Application

Open your browser and navigate to:
- **Client**: http://localhost:5174
- **Server API**: http://localhost:2567
- **Colyseus Monitor**: http://localhost:2567/colyseus

## Troubleshooting

### "Cannot find module" errors
Make sure you ran `npm install` in both client and server directories.

### Firebase authentication errors
- Verify all Firebase environment variables are correctly set
- Ensure Firebase Authentication is enabled in Firebase Console
- Check that the service account key file exists and path is correct

### Connection errors
- Ensure both server and client are running
- Check that ports 2567 and 5174 are not in use by other applications
- Verify `VITE_API_URL` and `VITE_WS_URL` match your server configuration

## Production Deployment

For production deployment:

1. Update your `.env` files or create environment-specific overrides:
   
   **Option A**: Update `client/.env` with production URLs, or
   
   **Option B**: Create `client/.env.production` to override URLs:
   ```env
   # Backend URLs (Production)
   VITE_API_URL=https://your-production-api.com
   VITE_WS_URL=wss://your-production-api.com
   ```
   
   For server, update `server/.env` with:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json
   PORT=2567
   NODE_ENV=production
   ```

2. Build the client:
   ```bash
   cd client
   npm run build
   ```

3. Start the server in production mode:
   ```bash
   cd server
   NODE_ENV=production npm start
   ```

## Need Help?

Check the main [README.md](../readme.md) for detailed documentation.
