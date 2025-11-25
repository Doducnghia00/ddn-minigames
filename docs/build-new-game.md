## Build a new game from the base core

This guide walks through every layer needed to add a brand-new game.

---

## 1. Plan the foundations

1. Pick a unique `gameId` (e.g. `duel`, `tictactoe`).
2. Decide which server mode fits best:
   - **BaseRoom** for generic ready/kick/password flows.
   - **TurnBasedRoom** for alternating turns (2–N players).
   - **TeamRoom** or **FreeForAllRoom** for future team/FFA support.
3. Pick the matching client scene base:
   - `BaseGameScene` if no special turn/score logic is needed.
   - `TurnBasedGameScene`, `TeamBasedGameScene`, or `FreeForAllGameScene` for richer behaviors.

---

## 2. Server implementation

### 2.1. Folder structure

```
server/rooms/<gameId>/
├── <Game>Room.js
└── <Game>State.js
```

### 2.2. State

1. Extend the right base state:
   ```js
   const { TurnBasedRoomState } = require('../base/states/TurnBasedRoomState');

   class DuelState extends TurnBasedRoomState {
       constructor() {
           super();
           // custom fields
           this.hp = new MapSchema();
       }
   }
   ```
2. Use `type(...)` decorators just like in `CaroState`.

### 2.3. Room

1. Extend `BaseRoom` or a concrete mode:
   ```js
   const { TurnBasedRoom } = require('../base/modes/TurnBasedRoom');
   const { DuelState } = require('./DuelState');

   class DuelRoom extends TurnBasedRoom {
       createInitialState() {
           return new DuelState();
       }

       getGameId() {
           return 'duel';
       }
   }
   ```
2. Override hooks as needed:
   - `afterPlayerJoin` / `afterPlayerLeave` for setup/cleanup.
   - `onGameStart`, message handlers (`move`, `shoot`, …).
3. Register the room inside `server/index.js`:
   ```js
   const { DuelRoom } = require('./rooms/duel/DuelRoom');
   gameServer.define('duel', DuelRoom);
   ```

### 2.4. Metadata

- Call `this.setMetadata()` with `gameId`, `roomName`, `isLocked` so clients can display the room correctly.

---

## 3. Client implementation

### 3.1. Scene & config

1. Create `client/src/games/<gameId>/config.js`:
   ```js
   export const DUEL_CONFIG = {
       id: 'duel',
       name: 'Duel 1v1',
       description: 'Best-of-3 duel',
       minPlayers: 2,
       maxPlayers: 2,
       phaserConfig: { width: 800, height: 600, backgroundColor: '#000' },
       rules: { ... }
   };
   ```
2. Create `client/src/games/<gameId>/<Game>Scene.js`:
   ```js
   import { TurnBasedGameScene } from '../base/TurnBasedGameScene';
   import { DUEL_CONFIG } from './config';

   export class DuelScene extends TurnBasedGameScene {
       constructor() {
           super('DuelScene');
       }

       init(data) {
           super.init(data);
           // init riêng
       }

       setupRoomEvents() {
           this.room.onStateChange((state) => {
               // sync players, scores, turn...
           });
       }

       createGameUI() {
           // render board/canvas/hud
       }
   }
   ```

### 3.2. Register the game

1. **`gameRegistry`**:
   ```js
   import { DuelScene } from '../games/duel/DuelScene';
   import { DUEL_CONFIG } from '../games/duel/config';

   GAME_REGISTRY.duel = {
       id: DUEL_CONFIG.id,
       name: DUEL_CONFIG.name,
       description: DUEL_CONFIG.description,
       scene: DuelScene,
       scenes: [DuelScene],
       phaserConfig: DUEL_CONFIG.phaserConfig,
       minPlayers: DUEL_CONFIG.minPlayers,
       maxPlayers: DUEL_CONFIG.maxPlayers,
       lobby: { status: 'Beta', emoji: '⚔️', accent: 'blue' },
       createRoomDefaults: (user) => ({
           roomName: `${user?.name || 'Player'}'s Duel`,
           password: ''
       })
   };
   ```
2. **`gameProfiles`**:
   ```js
   GAME_PROFILES.duel = {
       minPlayers: 2,
       readyLabel: '⚔️ Ready to duel',
       statusTexts: { ... },
       behaviors: {
           turnBased: true,
           readyStrategy: 'allPlayers',
           allowKicks: true
       },
       components: {
           RoleBadge: DuelRoleBadge,
           StatusBadge: DuelStatusBadge,
           ExtraInfo: null
       }
   };
   ```

### 3.3. Custom UI

- Add bespoke badges/HUD in `client/src/components/games/<gameId>/` and wire them through `gameProfiles`.
- Lobby automatically lists new games via the registry—no extra wiring needed.

---

## 4. Test checklist

1. **Server**: `cd server && npm run dev`, create/join rooms via Lobby and ensure gameplay messages behave as expected.
2. **Client**: `cd client && npm run dev`, log in (guest or Google), create a room with the new game, and open `/game`.
3. Verify:
   - Room metadata exposes the correct `gameId`.
   - GamePage loads the correct scene/profile.
   - Ready / start / gameplay messages stay in sync between client and server.

---

## 5. Tips & troubleshooting

- Whenever you add schema fields on the server, mirror them in the client scene (`state.players.get(...)`, additional maps).
- Multi-scene games can expose `scenes: [LoadingScene, DuelScene]` in `gameRegistry` and track which scene should receive `setRoom`.
- `gameProfiles.behaviors` can be extended (e.g. new ready strategies, HUD toggles) without changing GamePage.
- Keep `gameId` consistent everywhere:
  - `gameRegistry` and `gameProfiles` on the client
  - `Room#getGameId()` and `gameServer.define('<gameId>')` on the server

Follow these steps and the “base core” will handle the heavy lifting, letting you focus purely on game-specific mechanics.
