# DDN Games

System of multiple HTML5 mini-games (Frontend: Phaser 3, Backend: Express + Colyseus).

## Project Structure

- `client/`: Phaser 3 game client and Web UI.
- `server/`: Express API and Colyseus Game Server.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm

**Optional** (depending on authentication choice):
- Firebase project (for Google Sign-In)
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

    DDN Games supports two authentication methods:
    - **Guest Login**: No setup required, works out of the box
    - **Google Login**: Requires Firebase configuration
    
    **You must enable at least one method.**

    #### Quick Start (Guest Login Only)
    
    Create `client/.env.development`:
    
    ```env
    # Authentication Features
    VITE_ENABLE_GUEST_LOGIN=true
    VITE_ENABLE_GOOGLE_LOGIN=false

    # Backend URLs
    VITE_API_URL=http://localhost:2567
    VITE_WS_URL=ws://localhost:2567
    ```
    
    Create `server/.env.development`:
    
    ```env
    # Authentication Features
    ENABLE_GUEST_LOGIN=true
    ENABLE_GOOGLE_LOGIN=false

    # Server Configuration
    PORT=2567
    NODE_ENV=development
    ```
    
    That's it! No Firebase setup needed for guest-only mode.
    
    #### Full Setup (Both Authentication Methods)
    
    Create `client/.env.development`:
    
    ```env
    # Authentication Features
    VITE_ENABLE_GUEST_LOGIN=true
    VITE_ENABLE_GOOGLE_LOGIN=true

    # Firebase Configuration
    VITE_FIREBASE_API_KEY=your_firebase_api_key_here
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_APP_ID=your_app_id

    # Backend URLs
    VITE_API_URL=http://localhost:2567
    VITE_WS_URL=ws://localhost:2567
    ```
    
    Create `server/.env.development`:
    
    ```env
    # Authentication Features
    ENABLE_GUEST_LOGIN=true
    ENABLE_GOOGLE_LOGIN=true

    # Firebase Admin
    GOOGLE_APPLICATION_CREDENTIALS=./credentials/serviceAccountKey.json

    # Server Configuration
    PORT=2567
    NODE_ENV=development
    ```
    
    **For Firebase setup**, see [docs/auth-firebase.md](docs/auth-firebase.md)

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

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_ENABLE_GUEST_LOGIN` | Enable guest login | Yes* | `true` or `false` |
| `VITE_ENABLE_GOOGLE_LOGIN` | Enable Google login | Yes* | `true` or `false` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | If Google login enabled | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | If Google login enabled | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | If Google login enabled | `my-project` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | If Google login enabled | `1:123:web:abc` |
| `VITE_API_URL` | Backend HTTP API URL | Yes | `http://localhost:2567` |
| `VITE_WS_URL` | Backend WebSocket URL | Yes | `ws://localhost:2567` |

*At least one authentication method must be enabled.

### Server (.env.development / .env.production)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `ENABLE_GUEST_LOGIN` | Enable guest login | Yes* | `true` or `false` |
| `ENABLE_GOOGLE_LOGIN` | Enable Google login | Yes* | `true` or `false` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | If Google login enabled | `./credentials/serviceAccountKey.json` |
| `PORT` | Server port | No | `2567` |
| `NODE_ENV` | Environment mode | No | `development` or `production` |

*At least one authentication method must be enabled.

## Documentation

- [Quick Setup Guide](docs/setup.md) - Step-by-step setup instructions
- [Guest Login Setup](docs/auth-guest.md) - Simple authentication without Firebase
- [Firebase/Google Login Setup](docs/auth-firebase.md) - Complete Firebase configuration guide
- [Deployment Guide](docs/deployment.md) - Production deployment instructions
- [Build New Game](docs/build-new-game.md) - Step-by-step guide to create a new game
- [Project Structure](docs/project-structure.md) - Overview of the project structure

## External Documentation

- [Firebase Documentation](https://firebase.google.com/docs/web/setup)
- [Colyseus Documentation](https://docs.colyseus.io/)
- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
