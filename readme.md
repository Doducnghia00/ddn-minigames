# DDN Games

System of multiple HTML5 mini-games (Frontend: Phaser 3, Backend: Express + Colyseus).

## Project Structure

- `client/`: Phaser 3 game client and Web UI.
- `server/`: Express API and Colyseus Game Server.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm
- Firebase project with Authentication enabled
- Google Cloud service account key (for server-side Firebase Admin)

### Installation

1.  **Server Setup**:
    ```bash
    cd server
    npm install
    ```

2.  **Client Setup**:
    ```bash
    cd client
    npm install
    ```

3.  **Environment Configuration**:

    #### Client Environment Setup
    
    Create `client/.env.development` with the following content:
    
    ```env
    # Firebase Configuration
    VITE_FIREBASE_API_KEY=your_firebase_api_key_here
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_APP_ID=your_app_id

    # Backend URLs (Development)
    VITE_API_URL=http://localhost:2567
    VITE_WS_URL=ws://localhost:2567
    ```
    
    For production, create `client/.env.production`:
    
    ```env
    # Firebase Configuration (same as development)
    VITE_FIREBASE_API_KEY=your_firebase_api_key_here
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_APP_ID=your_app_id

    # Backend URLs (Production)
    VITE_API_URL=https://your-production-api.com
    VITE_WS_URL=wss://your-production-api.com
    ```
    
    #### Server Environment Setup
    
    Create `server/.env.development`:
    
    ```env
    # Google Cloud Service Account
    GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json

    # Server Configuration
    PORT=2567
    NODE_ENV=development
    ```
    
    For production, create `server/.env.production`:
    
    ```env
    # Google Cloud Service Account
    GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json

    # Server Configuration
    PORT=2567
    NODE_ENV=production
    ```

4.  **Firebase Service Account**:
    - Download your Firebase service account key from Firebase Console
    - Place it in `server/credentials/serviceAccountKey.json`
    - Ensure the path matches `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` file

### Running the Project

#### Development Mode

1.  **Start Server**:
    ```bash
    cd server
    npm run dev
    ```
    Server runs on `http://localhost:2567` (or your configured PORT).

2.  **Start Client**:
    ```bash
    cd client
    npm run dev
    ```
    Client runs on `http://localhost:5174` (Vite dev server).

#### Production Mode

1.  **Build Client**:
    ```bash
    cd client
    npm run build
    ```

2.  **Start Server**:
    ```bash
    cd server
    NODE_ENV=production npm start
    ```

## Features

- **Authentication**: 
  - Google Sign-In via Firebase
  - Guest login (no account required)
- **Real-time Multiplayer**: Powered by Colyseus WebSocket server
- **Games**:
  - Caro (5-in-a-row) - Classic strategy game
- **Room Management**: 
  - Create public/private rooms
  - Password-protected rooms
  - Room owner controls (kick players, start match)
- **Modern UI**: Built with React, TailwindCSS, and Phaser 3

## Environment Variables Reference

### Client (.env.development / .env.production)

| Variable | Description | Example (Dev) | Example (Prod) |
|----------|-------------|---------------|----------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIza...` | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `my-project` | `my-project` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` | `1:123:web:abc` |
| `VITE_API_URL` | Backend HTTP API URL | `http://localhost:2567` | `https://api.yourdomain.com` |
| `VITE_WS_URL` | Backend WebSocket URL | `ws://localhost:2567` | `wss://api.yourdomain.com` |

### Server (.env.development / .env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | `./credentials/serviceAccountKey.json` |
| `PORT` | Server port | `2567` |
| `NODE_ENV` | Environment mode | `development` or `production` |

## Documentation

- [Quick Setup Guide](docs/setup.md) - Step-by-step setup instructions
- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [Colyseus Documentation](https://docs.colyseus.io/)
- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
