# Project structure overview

```
ddn-games/
├── client/            # React + Phaser application
├── server/            # Express + Colyseus game server
├── docs/              # Internal guides
└── README.md
```

## Server layout

```
server/
├── index.js                  # Express / Colyseus entry point
├── rooms/
│   ├── base/                 # Shared “base core”
│   │   ├── BaseRoom.js       # Generic room logic (owner, ready, kick, rematch…)
│   │   ├── BaseRoomState.js  # Common schema (players, winner, gameState…)
│   │   ├── Player.js         # Shared player schema
│   │   ├── states/           # Extended states (e.g. TurnBasedRoomState)
│   │   └── modes/            # Room modes (TurnBasedRoom, TeamRoom, FreeForAllRoom…)
│   ├── caro/                 # Concrete game implementation
│   │   ├── CaroRoom.js
│   │   └── CaroState.js
│   └─ ...                    # Other games implementation
└── credentials/, package.json, ...
```

## Client layout

```
client/src/
├── config/
│   ├── gameRegistry.js    # Registers scenes + Phaser configs per game
│   ├── gameProfiles.js    # UI/HUD behaviors per game
│   └── auth.js            # Feature flags for login methods
├── context/               # AuthContext + GameContext providers
├── games/
│   ├── base/              # Base scenes (BaseGameScene, TurnBasedGameScene…)
│   ├── caro/              # Caro-specific scene + config
│   └── ...                # Other games scene + config
├── components/
│   ├── games/             # PlayerCard + per-game UI widgets
│   └── ui/                # Layout, Modal, etc.
├── pages/
│   ├── LobbyPage.jsx      # Game selection + room browser
│   ├── GamePage.jsx       # Boots the Phaser scene from registry
│   └── LoginPage.jsx
└── utils/, main.jsx, App.jsx, ...
```

## High-level flow

1. **LobbyPage** reads `GAME_REGISTRY`, lets players pick a game, and creates rooms with the chosen `gameId`.
2. **Server rooms** extend `BaseRoom` (or a mode) and set metadata (`gameId`, `roomName`, `isLocked`) so clients know how to render them.
3. **GamePage** inspects `room.metadata.gameId`, loads the matching config/profile, and instantiates the correct Phaser scene.
4. **Scenes** extend the appropriate base scene (e.g. `TurnBasedGameScene`, `TeamBasedGameScene`) to reuse lifecycle helpers.
5. **Shared UI** (PlayerCard, ready flow, badges) adapts via `gameProfiles.behaviors`.

To add a new game you typically:
- Create `server/rooms/<game>` with a room + state extending the relevant base classes.
- Create `client/src/games/<game>` with config + scene.
- Register the game inside `gameRegistry` and `gameProfiles`.
