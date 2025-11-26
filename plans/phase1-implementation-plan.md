# Phase 1: Chuẩn Bị Infrastructure - Implementation Plan (Clean Architecture)

> **Mục tiêu Phase 1**: Xây dựng infrastructure cơ bản cho các game real-time multiplayer với **clean architecture** và **khả năng mở rộng tốt**
> 
> **Thời gian ước tính**: 1.5-2 tuần (part-time)
> 
> **Nguyên tắc thiết kế**: Code clean, separation of concerns, game-specific extensions

---

## 📋 Tổng Quan

Phase 1 tập trung vào việc xây dựng **foundation** cho game Arena Shooter bằng cách:
1. ✅ **Refactor** kiến trúc hiện tại để clean và dễ mở rộng hơn
2. 🔨 **Implement** đầy đủ FreeForAllRoom mode với game-specific Player extensions
3. ♻️ **Đảm bảo reusability** cho nhiều loại game real-time trong tương lai

### Thay đổi chính so với kiến trúc hiện tại:

| Trước (❌ Bloated) | Sau (✅ Clean) |
|-------------------|----------------|
| `Player` chứa tất cả fields của mọi game | `Player` chỉ chứa common fields |
| Mỗi game thêm fields vào base class | Mỗi game extend Player riêng |
| `symbol` field trong base Player | `CaroPlayer extends Player` |
| Khó scale khi thêm game mới | Dễ dàng thêm game với Player riêng |

---

## 🏗️ Kiến Trúc Mới (Clean Architecture)

### Player Extension Pattern

```
Player (base)                      ← COMMON fields only
├── id, name, avatar
├── isOwner, isReady
└── NO game-specific fields

├── CaroPlayer extends Player      ← Game-specific
│   └── symbol                     (chỉ dùng cho Caro)
│
├── FFAPlayer extends Player       ← Mode-specific  
│   ├── score                      (dùng cho FFA games)
│   ├── kills
│   └── deaths
│
└── TeamPlayer extends Player      ← Future mode
    ├── team
    └── role
```

### Benefits của Pattern này:

✅ **Separation of Concerns**: Mỗi game quản lý data riêng  
✅ **No Bloat**: Base Player không chứa unused fields  
✅ **Type Safety**: Mỗi game biết chính xác fields nào có sẵn  
✅ **Scalability**: Thêm game mới không ảnh hưởng base class  
✅ **Clean Code**: Follow OOP principles (Liskov Substitution, Single Responsibility)

---

## 🎯 Phase 1: Chi Tiết Công Việc

### 🔄 Task 0: Refactor Existing Code (Caro)

> **Mục tiêu**: Clean up existing code trước khi build new features

#### Task 0.1: Tạo CaroPlayer Extension

**File**: `server/rooms/caro/CaroPlayer.js` (TẠO MỚI)

```javascript
const { Player } = require('../base/Player');
const { type } = require('@colyseus/schema');

/**
 * CaroPlayer - Player schema specific to Caro game
 * Extends base Player with Caro-specific data
 */
class CaroPlayer extends Player {
    constructor() {
        super();
        this.symbol = 0; // 0 = none, 1 = X, 2 = O
    }
}

type('number')(CaroPlayer.prototype, 'symbol');

module.exports = { CaroPlayer };
```

#### Task 0.2: Refactor Base Player (Remove Game-Specific Fields)

**File**: `server/rooms/base/Player.js`

```diff
const { Schema, type } = require('@colyseus/schema');

class Player extends Schema {
    constructor() {
        super();
        this.id = "";
        this.name = "Player";
        this.avatar = "";
        this.isOwner = false;
        this.isReady = false;
-       this.symbol = 0;  // ❌ REMOVE - game-specific
    }
}

type("string")(Player.prototype, "id");
type("string")(Player.prototype, "name");
type("string")(Player.prototype, "avatar");
type("boolean")(Player.prototype, "isOwner");
type("boolean")(Player.prototype, "isReady");
-type("number")(Player.prototype, "symbol");  // ❌ REMOVE

module.exports = { Player };
```

#### Task 0.3: Update CaroRoom to Use CaroPlayer

**File**: `server/rooms/caro/CaroRoom.js`

```diff
const { TurnBasedRoom } = require('../base/modes/TurnBasedRoom');
const { CaroState } = require('./CaroState');
+const { CaroPlayer } = require('./CaroPlayer');

class CaroRoom extends TurnBasedRoom {
    // ...

    createPlayer(options = {}, client) {
-       const player = super.createPlayer(options, client);
-       player.symbol = 0;
-       return player;
+       // Create CaroPlayer instead of base Player
+       const player = new CaroPlayer();
+       player.id = client.sessionId;
+       player.name = options.name || "Player";
+       player.avatar = options.avatar || "";
+       player.isOwner = false;
+       player.isReady = false;
+       player.symbol = 0;  // Caro-specific
+       return player;
    }

    // Rest of the code remains the same
}
```

#### Task 0.4: Update CaroState to Use CaroPlayer

**File**: `server/rooms/caro/CaroState.js`

```diff
const { ArraySchema, type } = require('@colyseus/schema');
const { TurnBasedRoomState } = require('../base/states/TurnBasedRoomState');
+const { CaroPlayer } = require('./CaroPlayer');

class CaroState extends TurnBasedRoomState {
    constructor() {
        super();
        this.board = new ArraySchema();

        for (let i = 0; i < 225; i++) {
            this.board.push(0);
        }
    }
}

type(["number"])(CaroState.prototype, "board");
+// Override players type to use CaroPlayer
+type({ map: CaroPlayer })(CaroState.prototype, "players");

module.exports = { CaroState };
```

#### ✅ Acceptance Criteria (Task 0):
- [ ] CaroPlayer.js created with symbol field
- [ ] Base Player.js has NO game-specific fields
- [ ] CaroRoom uses CaroPlayer in createPlayer()
- [ ] CaroState declares CaroPlayer type
- [ ] Existing Caro game still works correctly
- [ ] No regression in Caro functionality

---

### Task 1.1: Tạo FFAPlayer Extension

**File**: `server/rooms/base/modes/FFAPlayer.js` (TẠO MỚI)

#### 📝 Mục tiêu:
Tạo Player extension cho Free-For-All games với score tracking

#### 🔧 Implementation:

```javascript
const { Player } = require('../Player');
const { type } = require('@colyseus/schema');

/**
 * FFAPlayer - Player schema for Free-For-All games
 * Extends base Player with FFA-specific data like scores, kills, deaths
 * 
 * Usage:
 * - Shooter games
 * - Racing games
 * - Battle royale games
 * - Any competitive FFA mode
 */
class FFAPlayer extends Player {
    constructor() {
        super();
        this.score = 0;    // Generic score/points
        this.kills = 0;    // For combat games
        this.deaths = 0;   // For combat games
    }
}

type('number')(FFAPlayer.prototype, 'score');
type('number')(FFAPlayer.prototype, 'kills');
type('number')(FFAPlayer.prototype, 'deaths');

module.exports = { FFAPlayer };
```

#### 💡 Design Rationale:

**Q: Tại sao FFAPlayer có cả `score` và `kills`?**  
A: `score` là generic (có thể dùng cho racing, puzzle), `kills` specific cho combat games. Shooter game có thể dùng `kills` làm `score`.

**Q: Có wasteful không khi racing game không dùng `kills`/`deaths`?**  
A: Acceptable tradeoff. 3 fields integer nhẹ, và FFAPlayer cover nhiều game types. Nếu thật sự cần optimize, có thể tạo `CombatFFAPlayer extends FFAPlayer` sau.

#### ✅ Acceptance Criteria:
- [ ] FFAPlayer extends Player
- [ ] Has score, kills, deaths fields
- [ ] Properly typed with Colyseus schema decorators
- [ ] Exported correctly

---

### Task 1.2: Tạo FreeForAllRoomState

**File**: `server/rooms/base/states/FreeForAllRoomState.js` (TẠO MỚI)

#### 📝 Mục tiêu:
State schema cho FreeForAllRoom với match timer và score limit

#### 🔧 Implementation:

```javascript
const { type } = require('@colyseus/schema');
const { BaseRoomState } = require('../BaseRoomState');
const { FFAPlayer } = require('../modes/FFAPlayer');

/**
 * FreeForAllRoomState - State for FFA game modes
 * Extends BaseRoomState with FFA-specific state like timer and score limit
 */
class FreeForAllRoomState extends BaseRoomState {
    constructor() {
        super();
        this.matchTimer = 0;       // Countdown timer in seconds
        this.scoreLimit = 20;      // Win condition: first to reach this score
        this.maxPlayers = 8;       // Max players in FFA
    }
}

type('number')(FreeForAllRoomState.prototype, 'matchTimer');
type('number')(FreeForAllRoomState.prototype, 'scoreLimit');
type('number')(FreeForAllRoomState.prototype, 'maxPlayers');

// CRITICAL: Override players type to use FFAPlayer instead of base Player
type({ map: FFAPlayer })(FreeForAllRoomState.prototype, 'players');

module.exports = { FreeForAllRoomState };
```

#### 💡 Key Point:

```javascript
// This line is CRITICAL:
type({ map: FFAPlayer })(FreeForAllRoomState.prototype, 'players');
```

Nó override `players` map từ BaseRoomState để dùng `FFAPlayer` thay vì base `Player`. Clients sẽ receive `score`, `kills`, `deaths` fields.

#### ✅ Acceptance Criteria:
- [ ] Extends BaseRoomState
- [ ] Has matchTimer, scoreLimit, maxPlayers fields
- [ ] players map uses FFAPlayer type
- [ ] All fields synced to clients

---

### Task 1.3: Implement FreeForAllRoom

**File**: `server/rooms/base/modes/FreeForAllRoom.js`

#### 📝 Mục tiêu:
Tạo base class cho real-time multiplayer games với game loop

#### 🔧 Implementation:

```javascript
const { BaseRoom } = require('../BaseRoom');
const { FreeForAllRoomState } = require('../states/FreeForAllRoomState');
const { FFAPlayer } = require('./FFAPlayer');

/**
 * FreeForAllRoom - Base class for real-time FFA games
 * 
 * Features:
 * - 60 FPS game loop
 * - Match timer countdown
 * - Score/time-based win conditions
 * - Per-player score tracking
 * 
 * Extend this for specific FFA games (Shooter, Racing, etc.)
 */
class FreeForAllRoom extends BaseRoom {
    onCreate(options = {}) {
        super.onCreate(options);
        
        // FFA-specific config
        this.matchDuration = options.matchDuration || 300; // 5 minutes
        this.scoreLimit = options.scoreLimit || 20;
        this.gameLoopInterval = null;
        this.elapsedTime = 0;
        
        // Sync config to state
        this.state.matchTimer = this.matchDuration;
        this.state.scoreLimit = this.scoreLimit;
        this.state.maxPlayers = this.getMaxClients();
    }

    createInitialState(options) {
        return new FreeForAllRoomState();
    }

    getMaxClients() {
        return 8; // Default FFA max players
    }

    /**
     * Override to create FFAPlayer instead of base Player
     */
    createPlayer(options = {}, client) {
        const player = new FFAPlayer();
        player.id = client.sessionId;
        player.name = options.name || "Player";
        player.avatar = options.avatar || "";
        player.isOwner = false;
        player.isReady = false;
        player.score = 0;
        player.kills = 0;
        player.deaths = 0;
        return player;
    }

    onGameStart() {
        super.onGameStart();
        
        // Reset match timer
        this.elapsedTime = 0;
        this.state.matchTimer = this.matchDuration;
        
        // Reset all player scores
        for (const [, player] of this.state.players) {
            player.score = 0;
            player.kills = 0;
            player.deaths = 0;
        }
        
        // Start game loop at 60 FPS
        const TICK_RATE = 60;
        this.gameLoopInterval = this.clock.setInterval(() => {
            this.gameLoop(1 / TICK_RATE);
        }, 1000 / TICK_RATE);

        this.broadcast('match_started', {
            matchDuration: this.matchDuration,
            scoreLimit: this.scoreLimit
        });
    }

    /**
     * Main game loop - runs at 60 FPS
     * @param {number} deltaTime - Time since last tick (in seconds)
     */
    gameLoop(deltaTime) {
        if (this.state.gameState !== 'playing') return;

        // Update timer
        this.elapsedTime += deltaTime;
        this.state.matchTimer = Math.max(0, this.matchDuration - this.elapsedTime);
        
        // Check win conditions
        if (this.checkWinCondition()) {
            this.endMatch();
            return;
        }
        
        // Hook for game-specific updates (override in subclass)
        this.onGameUpdate(deltaTime);
    }

    /**
     * Override this in game-specific rooms (e.g., ShooterRoom)
     * Use for physics updates, collision detection, etc.
     */
    onGameUpdate(deltaTime) {
        // Subclasses implement game logic here
    }

    /**
     * Check if match should end
     * @returns {boolean} True if win condition met
     */
    checkWinCondition() {
        // Time limit reached
        if (this.state.matchTimer <= 0) {
            return true;
        }
        
        // Score limit reached by any player
        for (const [, player] of this.state.players) {
            if (player.score >= this.state.scoreLimit) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * End the match and determine winner
     */
    endMatch() {
        if (this.state.gameState !== 'playing') return;
        
        // Stop game loop
        if (this.gameLoopInterval) {
            this.gameLoopInterval.clear();
            this.gameLoopInterval = null;
        }
        
        // Determine winner
        const winnerId = this.determineWinner();
        this.state.winner = winnerId;
        this.state.gameState = 'finished';
        
        this.broadcast('match_ended', {
            winner: winnerId,
            finalScores: this.getFinalScores()
        });
        
        this.onMatchEnd();
    }

    /**
     * Find player with highest score
     * @returns {string} Winner's session ID
     */
    determineWinner() {
        let highestScore = -1;
        let winnerId = '';
        
        for (const [id, player] of this.state.players) {
            if (player.score > highestScore) {
                highestScore = player.score;
                winnerId = id;
            }
        }
        
        return winnerId;
    }

    /**
     * Get leaderboard sorted by score
     */
    getFinalScores() {
        const scores = [];
        for (const [id, player] of this.state.players) {
            scores.push({
                id,
                name: player.name,
                score: player.score,
                kills: player.kills,
                deaths: player.deaths
            });
        }
        return scores.sort((a, b) => b.score - a.score);
    }

    /**
     * Hook called when match ends
     */
    onMatchEnd() {
        // Override in subclass if needed
    }

    /**
     * Override rematch to reset FFA-specific state
     */
    onRematchApproved() {
        // Reset is handled in onGameStart
        this.startGame();
    }

    /**
     * Cleanup when room is disposed
     */
    onDispose() {
        if (this.gameLoopInterval) {
            this.gameLoopInterval.clear();
            this.gameLoopInterval = null;
        }
    }
}

module.exports = { FreeForAllRoom };
```

#### 💡 Design Decisions:

**1. Tại sao 60 FPS?**
- Smooth gameplay cho action games
- Match với client-side Phaser (mặc định 60 FPS)
- Trade-off: CPU usage cao hơn, nhưng cần thiết cho shooter

**2. Timer implementation**
- Dùng `elapsedTime` internal + `matchTimer` synced
- Tránh floating point drift với `Math.max(0, ...)`
- Update mỗi tick để clients có smooth countdown

**3. Win condition flexibility**
- Time-based: Match tự kết thúc sau X phút
- Score-based: First to reach target wins
- Both conditions check mỗi tick

#### ✅ Acceptance Criteria:
- [ ] Extends BaseRoom correctly
- [ ] Creates FFAPlayer instances
- [ ] Game loop runs at 60 FPS
- [ ] Match timer counts down
- [ ] Win conditions work (time + score)
- [ ] Winner determined by highest score
- [ ] Proper cleanup on dispose
- [ ] Rematch resets scores and timer

---

### Task 1.4: Enhance FreeForAllGameScene (Client)

**File**: `client/src/games/base/FreeForAllGameScene.js`

#### 📝 Mục tiêu:
Upgrade từ helper class sang full-featured base scene

#### 🔧 Implementation:

```javascript
import { BaseGameScene } from './BaseGameScene';

/**
 * FreeForAllGameScene - Base scene for FFA game modes
 * 
 * Provides:
 * - Real-time score tracking
 * - Match timer display
 * - Leaderboard management
 * - Player join/leave handling
 * 
 * Subclasses should override:
 * - createGameUI(): Build game-specific UI
 * - onPlayerAdded(): Handle new player visuals
 * - onScoreChanged(): Update score displays
 * - onTimerUpdate(): Update timer UI
 */
export class FreeForAllGameScene extends BaseGameScene {
    constructor(sceneKey) {
        super(sceneKey);
        
        // FFA-specific state
        this.playerScores = new Map();    // sessionId -> score
        this.playerKills = new Map();     // sessionId -> kills
        this.playerDeaths = new Map();    // sessionId -> deaths
        this.matchTimer = 0;
        this.scoreLimit = 0;
        this.maxPlayers = 8;
    }

    init(data) {
        super.init(data);
        
        // Clear FFA state
        this.playerScores.clear();
        this.playerKills.clear();
        this.playerDeaths.clear();
        this.matchTimer = 0;
        this.scoreLimit = 0;
    }

    /**
     * Setup room event listeners
     * MUST call super.setRoom(room) first
     */
    setRoom(room) {
        super.setRoom(room);
        
        if (!this.room) return;
        
        this.setupRoomEvents();
    }

    /**
     * Setup Colyseus state listeners
     */
    setupRoomEvents() {
        if (!this.room || !this.room.state) return;

        // Listen to match timer updates
        this.room.state.listen('matchTimer', (value) => {
            this.matchTimer = value;
            this.onTimerUpdate(value);
        });

        // Listen to score limit
        this.room.state.listen('scoreLimit', (value) => {
            this.scoreLimit = value;
        });

        // Listen to max players
        this.room.state.listen('maxPlayers', (value) => {
            this.maxPlayers = value;
        });

        // Listen to game state changes
        this.room.state.listen('gameState', (value) => {
            this.gameState = value;
            this.onGameStateChanged(value);
        });

        // Listen to winner
        this.room.state.listen('winner', (value) => {
            this.onWinnerDeclared(value);
        });

        // Listen to player additions
        this.room.state.players.onAdd = (player, sessionId) => {
            this.onPlayerAdded(player, sessionId);
            this.setupPlayerListeners(player, sessionId);
        };

        // Listen to player removals
        this.room.state.players.onRemove = (player, sessionId) => {
            this.onPlayerRemoved(sessionId);
            this.playerScores.delete(sessionId);
            this.playerKills.delete(sessionId);
            this.playerDeaths.delete(sessionId);
        };

        // Listen to match events
        this.room.onMessage('match_started', (data) => {
            this.onMatchStarted(data);
        });

        this.room.onMessage('match_ended', (data) => {
            this.onMatchEnded(data);
        });
    }

    /**
     * Setup listeners for individual player changes
     */
    setupPlayerListeners(player, sessionId) {
        // Listen to score changes
        player.listen('score', (value) => {
            this.playerScores.set(sessionId, value);
            this.onScoreChanged(sessionId, value);
        });

        // Listen to kills
        player.listen('kills', (value) => {
            this.playerKills.set(sessionId, value);
            this.onKillsChanged(sessionId, value);
        });

        // Listen to deaths
        player.listen('deaths', (value) => {
            this.playerDeaths.set(sessionId, value);
            this.onDeathsChanged(sessionId, value);
        });
    }

    // ========== Hooks for Subclasses ==========

    /**
     * Called when a player is added to the room
     * Override to create player sprites, UI elements, etc.
     */
    onPlayerAdded(player, sessionId) {
        // Subclass implements
    }

    /**
     * Called when a player is removed from the room
     * Override to destroy player sprites, UI elements, etc.
     */
    onPlayerRemoved(sessionId) {
        // Subclass implements
    }

    /**
     * Called when game state changes (waiting -> playing -> finished)
     */
    onGameStateChanged(newState) {
        // Subclass implements
    }

    /**
     * Called when a player's score changes
     */
    onScoreChanged(sessionId, newScore) {
        // Subclass implements (update HUD, leaderboard, etc.)
    }

    /**
     * Called when a player's kills change
     */
    onKillsChanged(sessionId, newKills) {
        // Subclass implements
    }

    /**
     * Called when a player's deaths change
     */
    onDeathsChanged(sessionId, newDeaths) {
        // Subclass implements
    }

    /**
     * Called every tick when match timer updates
     */
    onTimerUpdate(timeRemaining) {
        // Subclass implements (update timer display)
    }

    /**
     * Called when match starts
     */
    onMatchStarted(data) {
        // Subclass implements
    }

    /**
     * Called when match ends
     */
    onMatchEnded(data) {
        // Subclass implements
    }

    /**
     * Called when winner is declared
     */
    onWinnerDeclared(winnerId) {
        // Subclass implements
    }

    // ========== Utility Methods ==========

    /**
     * Get sorted leaderboard
     * @param {number} limit - Max number of entries
     * @returns {Array} [[sessionId, score], ...]
     */
    getLeaderboard(limit = 10) {
        return Array.from(this.playerScores.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);
    }

    /**
     * Get player rank (1-indexed)
     */
    getPlayerRank(sessionId) {
        const leaderboard = this.getLeaderboard();
        const index = leaderboard.findIndex(([id]) => id === sessionId);
        return index >= 0 ? index + 1 : -1;
    }

    /**
     * Get current player's score
     */
    getMyScore() {
        return this.playerScores.get(this.room?.sessionId) || 0;
    }

    /**
     * Check if local player is winning
     */
    isWinning() {
        const mySessionId = this.room?.sessionId;
        if (!mySessionId) return false;
        
        const myScore = this.playerScores.get(mySessionId) || 0;
        for (const [id, score] of this.playerScores) {
            if (id !== mySessionId && score > myScore) {
                return false;
            }
        }
        return true;
    }

    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
```

#### ✅ Acceptance Criteria:
- [ ] Extends BaseGameScene
- [ ] Listens to all FFA state changes
- [ ] Tracks scores, kills, deaths per player
- [ ] Provides leaderboard utility
- [ ] Hooks implemented for subclasses
- [ ] Timer formatting utility
- [ ] Proper cleanup on player remove

---

### Task 1.5: Create TestFFARoom & Scene

#### Task 1.5a: TestFFARoom (Server)

**File**: `server/rooms/test-ffa/TestFFARoom.js` (TẠO MỚI)

```javascript
const { FreeForAllRoom } = require('../base/modes/FreeForAllRoom');

/**
 * TestFFARoom - Simple test implementation of FreeForAllRoom
 * Used to verify FFA infrastructure works correctly
 */
class TestFFARoom extends FreeForAllRoom {
    onCreate(options) {
        super.onCreate(options);
        
        // Test room config
        this.matchDuration = options.matchDuration || 60; // 1 minute for testing
        this.scoreLimit = options.scoreLimit || 10;       // Low limit for quick tests
        
        this.state.matchTimer = this.matchDuration;
        this.state.scoreLimit = this.scoreLimit;
        
        // Register test message handlers
        this.onMessage('add_score', (client, message) => {
            this.handleAddScore(client, message);
        });
    }

    getGameId() {
        return 'test-ffa';
    }

    getGameName() {
        return 'Test FFA Mode';
    }

    getDefaultRoomName() {
        return 'Test FFA Room';
    }

    getMinPlayers() {
        return 2;
    }

    getMaxClients() {
        return 8;
    }

    /**
     * Test handler: manually add score to player
     */
    handleAddScore(client, message = {}) {
        if (this.state.gameState !== 'playing') return;
        
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        const amount = message.amount || 1;
        player.score += amount;
        
        console.log(`[TestFFA] ${player.name} scored! Total: ${player.score}`);
    }

    onGameUpdate(deltaTime) {
        // Optionally: Auto-increment scores slowly for testing
        // This verifies game loop is running
    }
}

module.exports = { TestFFARoom };
```

#### Task 1.5b: TestFFAScene (Client)

**File**: `client/src/games/test-ffa/TestFFAScene.js` (TẠO MỚI)

```javascript
import Phaser from 'phaser';
import { FreeForAllGameScene } from '../base/FreeForAllGameScene';

export class TestFFAScene extends FreeForAllGameScene {
    constructor() {
        super('TestFFAScene');
    }

    create() {
        // Background
        this.cameras.main.setBackgroundColor('#1a1a2e');
        
        this.createGameUI();
    }

    createGameUI() {
        const centerX = this.cameras.main.width / 2;
        
        // Title
        this.add.text(centerX, 30, 'Test FFA Mode', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Timer display
        this.timerText = this.add.text(centerX, 80, 'Time: --:--', {
            fontSize: '24px',
            color: '#00ff88'
        }).setOrigin(0.5);

        // Score limit display
        this.scoreLimitText = this.add.text(centerX, 110, 'First to: --', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5);

        // Leaderboard
        this.leaderboardText = this.add.text(centerX, 200, '', {
            fontSize: '18px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Test button (only shown during match)
        this.addScoreBtn = this.add.text(centerX, 450, '🎯 Add Score (+1)', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#4CAF50',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .setVisible(false);

        this.addScoreBtn.on('pointerdown', () => {
            this.room.send('add_score', { amount: 1 });
        });

        this.addScoreBtn.on('pointerover', () => {
            this.addScoreBtn.setBackgroundColor('#45a049');
        });

        this.addScoreBtn.on('pointerout', () => {
            this.addScoreBtn.setBackgroundColor('#4CAF50');
        });

        // Game state text
        this.stateText = this.add.text(centerX, 520, 'Waiting for players...', {
            fontSize: '16px',
            color: '#ffaa00'
        }).setOrigin(0.5);

        // Initialize displays
        this.updateScoreLimitDisplay();
        this.updateLeaderboard();
    }

    // ========== FFA Scene Hooks ==========

    onGameStateChanged(newState) {
        console.log('[TestFFA] Game state:', newState);
        
        if (newState === 'playing') {
            this.stateText.setText('Match in progress!');
            this.addScoreBtn.setVisible(true);
        } else if (newState === 'finished') {
            this.stateText.setText('Match ended!');
            this.addScoreBtn.setVisible(false);
        } else {
            this.stateText.setText('Waiting for players...');
            this.addScoreBtn.setVisible(false);
        }
    }

    onTimerUpdate(timeRemaining) {
        if (this.timerText) {
            this.timerText.setText(`Time: ${this.formatTime(timeRemaining)}`);
            
            // Warning color when < 10 seconds
            if (timeRemaining < 10) {
                this.timerText.setColor('#ff0000');
            } else {
                this.timerText.setColor('#00ff88');
            }
        }
    }

    onScoreChanged(sessionId, newScore) {
        console.log('[TestFFA] Score changed:', sessionId, newScore);
        this.updateLeaderboard();
    }

    onPlayerAdded(player, sessionId) {
        console.log('[TestFFA] Player added:', player.name);
        this.updateLeaderboard();
    }

    onPlayerRemoved(sessionId) {
        console.log('[TestFFA] Player removed:', sessionId);
        this.updateLeaderboard();
    }

    onMatchStarted(data) {
        console.log('[TestFFA] Match started!', data);
        this.updateScoreLimitDisplay();
    }

    onMatchEnded(data) {
        console.log('[TestFFA] Match ended!', data);
        
        const winnerPlayer = this.room.state.players.get(data.winner);
        const winnerName = winnerPlayer?.name || 'Unknown';
        
        this.stateText.setText(`🏆 Winner: ${winnerName}!`);
        this.stateText.setColor('#ffd700');
    }

    // ========== UI Update Methods ==========

    updateScoreLimitDisplay() {
        if (this.scoreLimitText) {
            this.scoreLimitText.setText(`First to: ${this.scoreLimit}`);
        }
    }

    updateLeaderboard() {
        if (!this.leaderboardText || !this.room) return;
        
        const leaderboard = this.getLeaderboard(5);
        
        if (leaderboard.length === 0) {
            this.leaderboardText.setText('No players yet');
            return;
        }
        
        let text = '📊 Leaderboard 📊\n\n';
        
        leaderboard.forEach(([sessionId, score], index) => {
            const player = this.room.state.players.get(sessionId);
            const name = player?.name || 'Unknown';
            const isMe = sessionId === this.room.sessionId;
            
            const prefix = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const nameDisplay = isMe ? `${name} (You)` : name;
            
            text += `${prefix} ${nameDisplay}: ${score}\n`;
        });
        
        this.leaderboardText.setText(text);
    }
}
```

#### Task 1.5c: TestFFA Config

**File**: `client/src/games/test-ffa/config.js` (TẠO MỚI)

```javascript
import Phaser from 'phaser';

export const TEST_FFA_CONFIG = {
    id: 'test-ffa',
    name: 'Test FFA',
    description: 'Test Free-For-All Mode - Verify FFA infrastructure',
    minPlayers: 2,
    maxPlayers: 8,
    phaserConfig: {
        type: Phaser.CANVAS,
        width: 800,
        height: 600,
        backgroundColor: '#1a1a2e'
    }
};
```

#### Task 1.5d: Register in gameRegistry

**File**: `client/src/config/gameRegistry.js`

```diff
import { CaroScene } from '../games/caro/CaroScene';
import { CARO_CONFIG } from '../games/caro/config';
+import { TestFFAScene } from '../games/test-ffa/TestFFAScene';
+import { TEST_FFA_CONFIG } from '../games/test-ffa/config';

export const GAME_REGISTRY = {
    caro: {
        // ... existing config
    },
+   'test-ffa': {
+       id: TEST_FFA_CONFIG.id,
+       name: TEST_FFA_CONFIG.name,
+       description: TEST_FFA_CONFIG.description,
+       scene: TestFFAScene,
+       scenes: [TestFFAScene],
+       phaserConfig: TEST_FFA_CONFIG.phaserConfig,
+       minPlayers: TEST_FFA_CONFIG.minPlayers,
+       maxPlayers: TEST_FFA_CONFIG.maxPlayers,
+       lobby: {
+           status: 'Test',
+           emoji: '🧪',
+           accent: 'blue'
+       },
+       createRoomDefaults: (user) => ({
+           roomName: `${user?.name || 'Player'}'s Test Room`,
+           password: ''
+       })
+   }
};
```

#### Task 1.5e: Register in server

**File**: `server/index.js`

```diff
const { Duel1v1Room } = require('./rooms/duel1v1/Duel1v1Room');
const { CaroRoom } = require('./rooms/caro/CaroRoom');
+const { TestFFARoom } = require('./rooms/test-ffa/TestFFARoom');

// Define Rooms
gameServer.define('lobby', LobbyRoom);
gameServer.define('duel_1v1', Duel1v1Room);
gameServer.define('caro', CaroRoom)
    .enableRealtimeListing();
+gameServer.define('test-ffa', TestFFARoom)
+   .enableRealtimeListing();
```

#### ✅ Acceptance Criteria (Task 1.5):
- [ ] TestFFARoom extends FreeForAllRoom
- [ ] TestFFAScene extends FreeForAllGameScene
- [ ] Registered in gameRegistry and server
- [ ] Can create and join test rooms
- [ ] Add Score button works
- [ ] Leaderboard updates in real-time
- [ ] Timer counts down
- [ ] Win condition triggers
- [ ] Winner displayed correctly

---

## ✅ Verification Plan

### Manual Testing Checklist

#### ✅ Test 0: Verify Caro Still Works (Regression Test)
**Mục tiêu**: Ensure refactoring didn't break existing game

1. Start server & client
2. Create Caro room
3. Join with 2 players
4. Play a full game
5. Verify:
   - [ ] Symbols (X/O) display correctly
   - [ ] Turns work
   - [ ] Win detection works
   - [ ] Rematch works

---

#### ✅ Test 1: FFA Room Creation & Join

1. Navigate to lobby
2. Create "Test FFA" room
3. Verify:
   - [ ] Room appears in lobby with 🧪 emoji
   - [ ] Can join successfully
   - [ ] Timer shows 1:00 (60 seconds)
   - [ ] Score limit shows "First to: 10"

---

#### ✅ Test 2: Game Loop & Timer

1. In test room, 2 players ready up
2. Owner starts match
3. Verify:
   - [ ] Timer counts down smoothly (1:00 → 0:59 → ...)
   - [ ] No stuttering or lag
   - [ ] Timer turns red at < 10 seconds
   - [ ] "Add Score" button appears

---

#### ✅ Test 3: Score Tracking

1. In active match, click "Add Score" button
2. Verify:
   - [ ] Your score increases by 1
   - [ ] Leaderboard updates immediately
   - [ ] Other players see your score update
3. Have other player click their button
4. Verify:
   - [ ] Their score updates in your leaderboard
   - [ ] Leaderboard re-sorts by score

---

#### ✅ Test 4: Win Condition - Score Limit

1. Configure room with `scoreLimit: 5`
2. Click "Add Score" until reaching 5
3. Verify:
   - [ ] Match ends automatically
   - [ ] Winner displayed: "🏆 Winner: [Your Name]!"
   - [ ] Game state changes to "finished"
   - [ ] "Add Score" button disappears

---

#### ✅ Test 5: Win Condition - Time Limit

1. Configure room with `matchDuration: 10`
2. Start match and wait (don't click anything)
3. Verify:
   - [ ] Timer counts down to 0:00
   - [ ] Match ends automatically
   - [ ] Player with highest score wins

---

#### ✅ Test 6: Leaderboard Ranking

1. Start match with 3+ players
2. Have each player score different amounts
3. Verify:
   - [ ] Leaderboard shows correct order (highest first)
   - [ ] Medal emojis: 🥇 🥈 🥉
   - [ ] Your entry says "(You)"

---

#### ✅ Test 7: Player Leave During Match

1. Start match with 3 players
2. Have one player disconnect
3. Verify:
   - [ ] Match continues for remaining players
   - [ ] Leaderboard removes disconnected player
   - [ ] No crashes or errors

---

#### ✅ Test 8: Rematch Flow

1. Complete a match
2. All players vote for rematch
3. Verify:
   - [ ] Scores reset to 0
   - [ ] Timer resets to full duration
   - [ ] Leaderboard shows all 0s
   - [ ] Match starts again

---

#### ✅ Test 9: Multi-Room Stability

1. Create 3 concurrent Test FFA rooms
2. Join each with 2-3 players
3. Run matches simultaneously
4. Verify:
   - [ ] No server crashes
   - [ ] All rooms function independently
   - [ ] Timers don't interfere with each other
   - [ ] Score updates isolated per room

---

## 📊 Deliverables

### Server Side
- ✅ `base/Player.js` - Refactored (common fields only)
- ✅ `caro/CaroPlayer.js` - New game-specific extension
- ✅ `caro/CaroRoom.js` - Updated to use CaroPlayer
- ✅ `caro/CaroState.js` - Updated player type
- ✅ `base/modes/FFAPlayer.js` - New FFA player extension
- ✅ `base/states/FreeForAllRoomState.js` - New state schema
- ✅ `base/modes/FreeForAllRoom.js` - Full implementation
- ✅ `test-ffa/TestFFARoom.js` - Test implementation

### Client Side
- ✅ `base/FreeForAllGameScene.js` - Enhanced base scene
- ✅ `test-ffa/TestFFAScene.js` - Test scene
- ✅ `test-ffa/config.js` - Test game config
- ✅ Updated `gameRegistry.js` - Test FFA registered

### Documentation
- ✅ This implementation plan
- ✅ Manual testing checklist
- ✅ Architecture decision rationale

---

## 🎯 Success Criteria

Phase 1 is **COMPLETE** when:

1. ✅ All acceptance criteria met
2. ✅ All manual tests pass
3. ✅ No regression in Caro game
4. ✅ Code is clean and well-documented
5. ✅ Test FFA room fully functional
6. ✅ Pattern established for future FFA games

---

## 🔄 Next Steps (Phase 2)

Phase 2 will build **Shooter game** on top of this infrastructure:

1. **ShooterRoom extends FreeForAllRoom**
   - Player movement system
   - Bullet management
   - Collision detection
   - Respawn logic

2. **ShooterState extends FreeForAllRoomState**
   - Player positions (x, y, rotation)
   - Bullet collection
   - Health tracking

3. **ShooterScene extends FreeForAllGameScene**
   - Phaser sprites & physics
   - Input handling (WASD, mouse)
   - Weapon firing
   - HUD (health, ammo, crosshair)

> **Phase 1 sets clean foundation → Phase 2 builds fast**

---

## 💡 Architecture Benefits Recap

### Clean Code Achieved ✅

**Before:**
```javascript
class Player {
    // Bloated with all game fields
    symbol, score, kills, deaths, ...
}
```

**After:**
```javascript
class Player {
    // Only common fields
    id, name, avatar, isOwner, isReady
}

class CaroPlayer extends Player {
    symbol  // Caro only
}

class FFAPlayer extends Player {
    score, kills, deaths  // FFA only
}
```

### Scalability ✅

Adding new games is now:
1. Create `XxxPlayer extends Player` (if needed)
2. Create `XxxRoom extends FreeForAllRoom`
3. Register in `gameRegistry`

**No changes to base classes!**

---

## ❓ Questions for Review

> [!IMPORTANT]
> **Các điểm cần xác nhận:**

1. **Match duration**: 60 seconds cho test room, 5 phút cho real games có OK không?

2. **Score limit**: 10 cho test, 20 cho real games có phù hợp?

3. **Max players**: 8 players cho FFA có hợp lý không? (trade-off: server load vs fun)

4. **FFAPlayer fields**: `score`, `kills`, `deaths` có đủ cho hầu hết FFA games không?

5. **Test room**: Có publish lên production hay chỉ dùng local development?

---

**Sẵn sàng implement Phase 1 với clean architecture!** 🚀
