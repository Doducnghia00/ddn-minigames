# DDN Games

System of multiple HTML5 mini-games (Frontend: Phaser 3, Backend: Express + Colyseus).

## Project Structure

- `client/`: Phaser 3 game client and Web UI.
- `server/`: Express API and Colyseus Game Server.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm

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

3.  **Security Configuration**:
    - **Client**: Rename `client/.env` (if using example) and fill in your Firebase keys.
    - **Server**: Create `server/.env` and set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account key.

### Running the Project

1.  **Start Server**:
    ```bash
    cd server
    npm run dev
    ```
    Server runs on `http://localhost:2567`.

2.  **Start Client**:
    ```bash
    cd client
    npm run dev
    ```
    Client runs on `http://localhost:5173` (default Vite port).

## Features (Phase 1)

- Basic project structure.
- Express API server.
- Colyseus Game server with `Duel1v1Room`.
- Phaser 3 Client with `BootScene` and `LobbyScene`.
- Basic WebSocket connection between Client and Server.
- Firebase Authentication.

## Documentation

- Update later
