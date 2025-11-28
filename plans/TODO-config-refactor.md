# TODO: Refactor Config System - Server as Single Source of Truth

**Status:** ⏳ Pending (Chờ Shooter game hoàn thiện)  
**Priority:** 🔵 Medium  
**Estimated Effort:** ~4-6 hours

---

## Vấn đề hiện tại

Config hiện đang bị **duplicate và phân tán** giữa Client và Server:

### Server Config
- `server/rooms/shooter/shooter-config.js`
  - scoreLimit, matchDuration, minPlayers, maxPlayers
  - arena.width, arena.height
  - player stats (maxHealth, moveSpeed, respawnDelay)
  - weapon stats (fireRate, bulletSpeed, bulletDamage, bulletLifetime)

### Client Config
- `client/src/games/shooter/config.js`
  - minPlayers, maxPlayers (**DUPLICATE!**)
  - phaserConfig.width, phaserConfig.height (**DUPLICATE với arena!**)
  - name, description (UI only)
  
- `client/src/config/gameRegistry.js`
  - Duplicate lại minPlayers, maxPlayers
  - lobby config (emoji, accent, status)

### Vấn đề
1. ❌ Phải sửa nhiều file khi thay đổi config
2. ❌ Dễ bị inconsistent giữa client và server
3. ❌ Client có thể cheat nếu modify local config
4. ❌ Khó bật/tắt game từ server

---

## Giải pháp đề xuất: Server as Single Source of Truth

### Kiến trúc mới

```plaintext
Server (Master Config)
    ↓
    ├─ Room State (sync gameplay config)
    └─ API Endpoint (provide game list & metadata)
         ↓
    Client (receives config)
```

### Ưu điểm
- ✅ Chỉ sửa 1 chỗ duy nhất (server)
- ✅ Server control hoàn toàn gameplay balance
- ✅ Chống cheat - client không thể modify
- ✅ Có thể có config khác nhau cho từng room
- ✅ Dễ bật/tắt game từ server (add/remove từ registry)
- ✅ Có thể A/B testing các config khác nhau

### Nhược điểm
- ⚠️ Client phải đợi server trước khi init Phaser scene (negligible - đã có room join flow)
- ⚠️ Cần tạo thêm API endpoint cho game list

---

## Implementation Plan

### Phase 1: Server-side Changes

#### 1.1. Tạo Server Game Registry
**File:** `server/config/game-registry.js`

```javascript
const { SHOOTER_CONFIG } = require('../rooms/shooter/shooter-config');
// Import other game configs...

const GAME_REGISTRY = {
    shooter: {
        id: 'shooter',
        enabled: true,  // ← Control game availability
        roomClass: 'ShooterRoom',
        
        // Metadata (for lobby UI)
        metadata: {
            name: 'Arena Shooter',
            description: 'Top-down multiplayer shooter - Dominate the arena!',
            emoji: '🔫',
            accent: 'red',
            status: 'Active'
        },
        
        // Game config (gameplay rules)
        config: SHOOTER_CONFIG
    },
    
    caro: {
        id: 'caro',
        enabled: true,
        // ...
    }
    
    // Future games...
};

module.exports = { GAME_REGISTRY };
```

#### 1.2. Sync Config qua Room State
**File:** `server/rooms/shooter/ShooterState.js`

```javascript
class ShooterState extends Schema {
    // ... existing fields
    
    // Add config fields
    @type("number") arenaWidth;
    @type("number") arenaHeight;
    @type("number") maxPlayers;
    
    // Optional: client có thể cần
    @type("number") bulletSpeed;
    @type("number") playerSpeed;
}
```

**File:** `server/rooms/shooter/ShooterRoom.js`

```javascript
onCreate(options) {
    // Sync config to state
    this.state.arenaWidth = SHOOTER_CONFIG.arena.width;
    this.state.arenaHeight = SHOOTER_CONFIG.arena.height;
    this.state.maxPlayers = SHOOTER_CONFIG.match.maxPlayers;
    // ...
}
```

#### 1.3. Tạo API Endpoint cho Game List
**File:** `server/index.js` (hoặc tạo routes riêng)

```javascript
app.get('/api/games', (req, res) => {
    const availableGames = Object.entries(GAME_REGISTRY)
        .filter(([id, game]) => game.enabled)
        .map(([id, game]) => ({
            id: game.id,
            name: game.metadata.name,
            description: game.metadata.description,
            emoji: game.metadata.emoji,
            accent: game.metadata.accent,
            status: game.metadata.status,
            minPlayers: game.config.match.minPlayers,
            maxPlayers: game.config.match.maxPlayers
        }));
    
    res.json({ games: availableGames });
});

app.get('/api/games/:gameId/config', (req, res) => {
    const game = GAME_REGISTRY[req.params.gameId];
    if (!game || !game.enabled) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    // Send public config (hide sensitive values nếu cần)
    res.json({
        id: game.id,
        metadata: game.metadata,
        config: {
            arena: game.config.arena,
            match: {
                minPlayers: game.config.match.minPlayers,
                maxPlayers: game.config.match.maxPlayers,
                // scoreLimit, matchDuration sẽ sync qua room.state
            }
        }
    });
});
```

### Phase 2: Client-side Changes

#### 2.1. Fetch Game List từ Server
**File:** `client/src/services/gameService.js` (NEW)

```javascript
export async function fetchAvailableGames() {
    const response = await fetch(`${SERVER_URL}/api/games`);
    const data = await response.json();
    return data.games;
}

export async function fetchGameConfig(gameId) {
    const response = await fetch(`${SERVER_URL}/api/games/${gameId}/config`);
    return await response.json();
}
```

#### 2.2. Update Game Registry (Client)
**File:** `client/src/config/gameRegistry.js`

```javascript
// Remove static GAME_REGISTRY
// Replace with dynamic loading:

let GAME_REGISTRY = null;

export async function initGameRegistry() {
    const games = await fetchAvailableGames();
    
    GAME_REGISTRY = {};
    for (const game of games) {
        GAME_REGISTRY[game.id] = {
            id: game.id,
            name: game.name,
            description: game.description,
            scene: getSceneClass(game.id), // Map to imported scene
            phaserConfig: getPhaserConfig(game.id), // Still need client-side Phaser config
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            lobby: {
                emoji: game.emoji,
                accent: game.accent,
                status: game.status
            },
            createRoomDefaults: (user) => ({
                roomName: `${user?.name || 'Player'}'s ${game.name}`,
                password: ''
            })
        };
    }
    
    return GAME_REGISTRY;
}

export function getGameConfig(gameId) {
    if (!GAME_REGISTRY) {
        throw new Error('Game registry not initialized. Call initGameRegistry() first.');
    }
    return GAME_REGISTRY[gameId];
}
```

#### 2.3. Init Registry khi App Load
**File:** `client/src/App.jsx` (hoặc tương tự)

```javascript
useEffect(() => {
    async function init() {
        await initGameRegistry();
        setIsReady(true);
    }
    init();
}, []);
```

#### 2.4. Update Phaser Scene để nhận config từ Room State
**File:** `client/src/games/shooter/ShooterScene.js`

```javascript
create() {
    // Wait for room state to sync
    this.room.state.listen('arenaWidth', (width) => {
        this.arenaWidth = width;
        this.updatePhysicsBounds();
    });
    
    this.room.state.listen('arenaHeight', (height) => {
        this.arenaHeight = height;
        this.updatePhysicsBounds();
    });
    
    // ...
}

updatePhysicsBounds() {
    if (this.arenaWidth && this.arenaHeight) {
        this.cameras.main.setBounds(0, 0, this.arenaWidth, this.arenaHeight);
        this.physics.world.setBounds(0, 0, this.arenaWidth, this.arenaHeight);
    }
}
```

### Phase 3: Cleanup & Testing

#### 3.1. Remove duplicate configs
- ❌ Delete `client/src/games/shooter/config.js` (move Phaser config vào gameRegistry)
- ❌ Simplify `server/rooms/shooter/shooter-config.js` (chỉ giữ gameplay config)

#### 3.2. Update tests
- Test API endpoints
- Test dynamic game registry loading
- Test config sync qua room.state

#### 3.3. Migration cho existing games
- Áp dụng pattern tương tự cho `caro`, `test-ffa`
- Standardize tất cả games dùng cùng 1 architecture

---

## Files cần thay đổi

### Server
- [ ] `server/config/game-registry.js` (NEW)
- [ ] `server/index.js` (add API routes)
- [ ] `server/rooms/shooter/ShooterState.js` (add config fields)
- [ ] `server/rooms/shooter/ShooterRoom.js` (sync config to state)

### Client
- [ ] `client/src/services/gameService.js` (NEW)
- [ ] `client/src/config/gameRegistry.js` (refactor to dynamic)
- [ ] `client/src/App.jsx` (init registry on load)
- [ ] `client/src/games/shooter/ShooterScene.js` (read config from state)
- [ ] `client/src/games/shooter/config.js` (DELETE or simplify)

### Shared
- [ ] Update documentation
- [ ] Add migration guide

---

## Future Enhancements

1. **Admin Panel**: UI để bật/tắt games, điều chỉnh config realtime
2. **Feature Flags**: A/B testing cho game configs
3. **Per-Room Config Override**: Host có thể customize config cho room riêng
4. **Analytics**: Track game popularity, player retention per game
5. **Dynamic Loading**: Lazy load game scenes chỉ khi cần

---

## Notes

- Khi implement, cần đảm bảo backward compatibility nếu có rooms đang chạy
- Cân nhắc caching game list ở client (localStorage) để load nhanh hơn
- Server config vẫn có thể bị override per-room nếu cần (ví dụ: custom matches)

