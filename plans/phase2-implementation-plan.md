# Phase 2: Core Shooter Mechanics - Implementation Plan

> **Mục tiêu Phase 2**: Xây dựng game Top-down Arena Shooter hoàn chỉnh dựa trên FreeForAllRoom infrastructure
> 
> **Thời gian ước tính**: 2-3 tuần (part-time)
> 
> **Nguyên tắc**: Chỉ tạo files mới trong `shooter/`, KHÔNG sửa base classes

---

## 📋 Tổng Quan

Phase 2 tập trung vào việc xây dựng **Shooter Game** thực sự bằng cách extend các base classes từ Phase 1:

✅ **Đã có sẵn** (Phase 1):
- `FreeForAllRoom` với 60 FPS game loop
- `FreeForAllGameScene` với score tracking
- `FFAPlayer` với score, kills, deaths
- Test infrastructure hoạt động tốt

🔨 **Cần implement** (Phase 2):
- Shooter-specific logic (movement, shooting, collisions)
- Player positions và bullet management
- Physics và collision detection
- Weapon system
- Respawn mechanics

---

## 🎯 Phase 2: Chi Tiết Công Việc

### Task 2.1: Tạo ShooterPlayer Extension

**File**: `server/rooms/shooter/ShooterPlayer.js` (TẠO MỚI)

#### 📝 Mục tiêu:
Extend FFAPlayer với Shooter-specific fields

#### 🔧 Implementation:

```javascript
const { FFAPlayer } = require('../base/players/FreeForAllPlayer');
const { type } = require('@colyseus/schema');

/**
 * ShooterPlayer - Player schema for Shooter game
 * Extends FFAPlayer with position, rotation, health
 */
class ShooterPlayer extends FFAPlayer {
    constructor() {
        super(); // Kế thừa: score, kills, deaths
        
        // Position & Movement
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotation = 0;  // Radians
        
        // Combat
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        
        // Weapon
        this.lastFireTime = 0;
    }
}

type('number')(ShooterPlayer.prototype, 'x');
type('number')(ShooterPlayer.prototype, 'y');
type('number')(ShooterPlayer.prototype, 'velocityX');
type('number')(ShooterPlayer.prototype, 'velocityY');
type('number')(ShooterPlayer.prototype, 'rotation');
type('number')(ShooterPlayer.prototype, 'health');
type('number')(ShooterPlayer.prototype, 'maxHealth');
type('boolean')(ShooterPlayer.prototype, 'isAlive');
type('number')(ShooterPlayer.prototype, 'lastFireTime');

module.exports = { ShooterPlayer };
```

#### ✅ Acceptance Criteria:
- [ ] Extends FFAPlayer (có score, kills, deaths)
- [ ] Has position fields (x, y)
- [ ] Has movement fields (velocityX, velocityY, rotation)
- [ ] Has combat fields (health, isAlive)
- [ ] All fields synced to clients

---

### Task 2.2: Tạo Bullet Schema

**File**: `server/rooms/shooter/Bullet.js` (TẠO MỚI)

#### 📝 Mục tiêu:
Schema cho bullets trong game

#### 🔧 Implementation:

```javascript
const { Schema, type } = require('@colyseus/schema');

/**
 * Bullet - Projectile schema
 */
class Bullet extends Schema {
    constructor() {
        super();
        this.id = '';
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotation = 0;
        this.ownerId = '';      // Player who fired
        this.damage = 20;
        this.lifetime = 3;      // Seconds before despawn
        this.createdAt = 0;
    }
}

type('string')(Bullet.prototype, 'id');
type('number')(Bullet.prototype, 'x');
type('number')(Bullet.prototype, 'y');
type('number')(Bullet.prototype, 'velocityX');
type('number')(Bullet.prototype, 'velocityY');
type('number')(Bullet.prototype, 'rotation');
type('string')(Bullet.prototype, 'ownerId');
type('number')(Bullet.prototype, 'damage');
type('number')(Bullet.prototype, 'lifetime');
type('number')(Bullet.prototype, 'createdAt');

module.exports = { Bullet };
```

#### ✅ Acceptance Criteria:
- [ ] Has position and velocity
- [ ] Tracks owner
- [ ] Has damage value
- [ ] Has lifetime tracking

---

### Task 2.3: Tạo ShooterState

**File**: `server/rooms/shooter/ShooterState.js` (TẠO MỚI)

#### 📝 Mục tiêu:
Extend FreeForAllRoomState với bullets và arena config

#### 🔧 Implementation:

```javascript
const { ArraySchema, type } = require('@colyseus/schema');
const { FreeForAllRoomState } = require('../base/states/FreeForAllRoomState');
const { Bullet } = require('./Bullet');

/**
 * ShooterState - State for Shooter game
 * Extends FreeForAllRoomState with bullets and arena config
 */
class ShooterState extends FreeForAllRoomState {
    constructor() {
        super(); // Kế thừa: matchTimer, scoreLimit, maxPlayers, players
        
        this.bullets = new ArraySchema();
        
        // Arena configuration
        this.arenaWidth = 800;
        this.arenaHeight = 600;
        
        // Game configuration (optional, có thể để trong config file)
        this.bulletSpeed = 400;
        this.playerSpeed = 200;
        this.fireRate = 300;        // ms between shots
        this.respawnDelay = 3;      // seconds
    }
}

type([Bullet])(ShooterState.prototype, 'bullets');
type('number')(ShooterState.prototype, 'arenaWidth');
type('number')(ShooterState.prototype, 'arenaHeight');
type('number')(ShooterState.prototype, 'bulletSpeed');
type('number')(ShooterState.prototype, 'playerSpeed');
type('number')(ShooterState.prototype, 'fireRate');
type('number')(ShooterState.prototype, 'respawnDelay');

module.exports = { ShooterState };
```

#### ✅ Acceptance Criteria:
- [ ] Extends FreeForAllRoomState
- [ ] Has bullets array
- [ ] Has arena dimensions
- [ ] Has game config (speeds, rates)

---

### Task 2.4: Implement ShooterRoom Core Logic

**File**: `server/rooms/shooter/ShooterRoom.js` (TẠO MỚI)

#### 📝 Mục tiêu:
Implement game logic: movement, shooting, collisions

#### 🔧 Implementation:

```javascript
const { FreeForAllRoom } = require('../base/modes/FreeForAllRoom');
const { ShooterState } = require('./ShooterState');
const { ShooterPlayer } = require('./ShooterPlayer');
const { Bullet } = require('./Bullet');

/**
 * ShooterRoom - Top-down Arena Shooter
 * Extends FreeForAllRoom with shooter-specific logic
 */
class ShooterRoom extends FreeForAllRoom {
    onCreate(options) {
        super.onCreate(options);
        
        this.nextBulletId = 0;
        
        // Register shooter-specific messages
        this.onMessage('move', (client, data) => {
            this.handleMove(client, data);
        });
        
        this.onMessage('shoot', (client, data) => {
            this.handleShoot(client, data);
        });
        
        this.onMessage('stop_move', (client) => {
            this.handleStopMove(client);
        });
    }

    getGameId() {
        return 'shooter';
    }

    getGameName() {
        return 'Arena Shooter';
    }

    getDefaultRoomName() {
        return 'Shooter Arena';
    }

    getMinPlayers() {
        return 2;
    }

    getMaxClients() {
        return 8;
    }

    createInitialState(options) {
        return new ShooterState();
    }

    createPlayer(options = {}, client) {
        const player = new ShooterPlayer();
        player.id = client.sessionId;
        player.name = options.name || "Player";
        player.avatar = options.avatar || "";
        player.isOwner = false;
        player.isReady = false;
        player.score = 0;
        player.kills = 0;
        player.deaths = 0;
        
        // Shooter-specific initialization
        this.spawnPlayer(player);
        
        return player;
    }

    onGameStart() {
        super.onGameStart();
        
        // Spawn all players at random positions
        for (const [, player] of this.state.players) {
            this.spawnPlayer(player);
        }
        
        // Clear all bullets
        this.state.bullets.clear();
    }

    /**
     * Spawn player at random position
     */
    spawnPlayer(player) {
        const padding = 50;
        player.x = padding + Math.random() * (this.state.arenaWidth - padding * 2);
        player.y = padding + Math.random() * (this.state.arenaHeight - padding * 2);
        player.velocityX = 0;
        player.velocityY = 0;
        player.rotation = 0;
        player.health = player.maxHealth;
        player.isAlive = true;
    }

    /**
     * Handle player movement input
     */
    handleMove(client, data) {
        if (this.state.gameState !== 'playing') return;
        
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.isAlive) return;
        
        const { direction, rotation } = data;
        
        // Update velocity based on direction
        const speed = this.state.playerSpeed;
        switch (direction) {
            case 'up':
                player.velocityY = -speed;
                break;
            case 'down':
                player.velocityY = speed;
                break;
            case 'left':
                player.velocityX = -speed;
                break;
            case 'right':
                player.velocityX = speed;
                break;
        }
        
        // Update rotation (aim)
        if (typeof rotation === 'number') {
            player.rotation = rotation;
        }
    }

    handleStopMove(client) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        
        player.velocityX = 0;
        player.velocityY = 0;
    }

    /**
     * Handle shooting
     */
    handleShoot(client, data) {
        if (this.state.gameState !== 'playing') return;
        
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.isAlive) return;
        
        // Fire rate limiting
        const now = Date.now();
        if (now - player.lastFireTime < this.state.fireRate) {
            return; // Too soon to fire again
        }
        player.lastFireTime = now;
        
        const { rotation } = data;
        
        // Create bullet
        const bullet = new Bullet();
        bullet.id = `bullet_${this.nextBulletId++}`;
        bullet.x = player.x;
        bullet.y = player.y;
        bullet.rotation = rotation;
        bullet.velocityX = Math.cos(rotation) * this.state.bulletSpeed;
        bullet.velocityY = Math.sin(rotation) * this.state.bulletSpeed;
        bullet.ownerId = client.sessionId;
        bullet.createdAt = now / 1000; // Convert to seconds
        
        this.state.bullets.push(bullet);
        
        console.log(`[Shooter] ${player.name} fired bullet ${bullet.id}`);
    }

    /**
     * Main game update - called 60 times/second by FreeForAllRoom
     */
    onGameUpdate(deltaTime) {
        // Update player positions
        this.updatePlayerPositions(deltaTime);
        
        // Update bullet positions
        this.updateBulletPositions(deltaTime);
        
        // Check bullet-player collisions
        this.checkCollisions();
        
        // Remove expired bullets
        this.cleanupBullets();
    }

    updatePlayerPositions(deltaTime) {
        for (const [, player] of this.state.players) {
            if (!player.isAlive) continue;
            
            // Update position
            player.x += player.velocityX * deltaTime;
            player.y += player.velocityY * deltaTime;
            
            // Boundary checking
            const padding = 20; // Player hitbox radius
            player.x = Math.max(padding, Math.min(this.state.arenaWidth - padding, player.x));
            player.y = Math.max(padding, Math.min(this.state.arenaHeight - padding, player.y));
        }
    }

    updateBulletPositions(deltaTime) {
        for (let i = 0; i < this.state.bullets.length; i++) {
            const bullet = this.state.bullets[i];
            bullet.x += bullet.velocityX * deltaTime;
            bullet.y += bullet.velocityY * deltaTime;
        }
    }

    checkCollisions() {
        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const bullet = this.state.bullets[i];
            
            for (const [playerId, player] of this.state.players) {
                if (!player.isAlive) continue;
                if (playerId === bullet.ownerId) continue; // Can't hit self
                
                // Circle collision detection
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const hitRadius = 20; // Player hitbox radius
                
                if (distance < hitRadius) {
                    // Hit!
                    this.handlePlayerHit(playerId, bullet);
                    
                    // Remove bullet
                    this.state.bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    handlePlayerHit(playerId, bullet) {
        const player = this.state.players.get(playerId);
        if (!player) return;
        
        // Apply damage
        player.health -= bullet.damage;
        
        console.log(`[Shooter] ${player.name} hit! Health: ${player.health}`);
        
        if (player.health <= 0) {
            this.handlePlayerDeath(playerId, bullet.ownerId);
        }
    }

    handlePlayerDeath(victimId, killerId) {
        const victim = this.state.players.get(victimId);
        const killer = this.state.players.get(killerId);
        
        if (!victim) return;
        
        victim.isAlive = false;
        victim.deaths++;
        
        if (killer && killerId !== victimId) {
            killer.kills++;
            killer.score++;
        }
        
        console.log(`[Shooter] ${victim.name} killed by ${killer?.name || 'themselves'}`);
        
        // Schedule respawn
        this.clock.setTimeout(() => {
            if (this.state.gameState === 'playing') {
                this.respawnPlayer(victimId);
            }
        }, this.state.respawnDelay * 1000);
        
        this.broadcast('player_killed', {
            victim: victimId,
            killer: killerId
        });
    }

    respawnPlayer(playerId) {
        const player = this.state.players.get(playerId);
        if (!player) return;
        
        this.spawnPlayer(player);
        
        console.log(`[Shooter] ${player.name} respawned`);
        
        this.broadcast('player_respawned', {
            playerId: playerId
        });
    }

    cleanupBullets() {
        const now = Date.now() / 1000;
        
        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const bullet = this.state.bullets[i];
            
            // Remove if expired
            if (now - bullet.createdAt > bullet.lifetime) {
                this.state.bullets.splice(i, 1);
                continue;
            }
            
            // Remove if out of bounds
            if (bullet.x < 0 || bullet.x > this.state.arenaWidth ||
                bullet.y < 0 || bullet.y > this.state.arenaHeight) {
                this.state.bullets.splice(i, 1);
            }
        }
    }

    onDispose() {
        super.onDispose();
        console.log('[Shooter] Room disposed');
    }
}

module.exports = { ShooterRoom };
```

#### ✅ Acceptance Criteria:
- [ ] Extends FreeForAllRoom
- [ ] Creates ShooterPlayer instances
- [ ] Handles movement messages
- [ ] Handles shoot messages
- [ ] Updates player positions in game loop
- [ ] Updates bullet positions in game loop
- [ ] Detects bullet-player collisions
- [ ] Applies damage correctly
- [ ] Handles player death
- [ ] Respawns players after delay
- [ ] Cleans up expired bullets
- [ ] Updates kills/deaths/score

---

### Task 2.5: Implement ShooterScene (Client)

**File**: `client/src/games/shooter/ShooterScene.js` (TẠO MỚI)

#### 📝 Mục tiêu:
Client-side rendering và input handling

#### 🔧 Implementation Overview:

```javascript
import Phaser from 'phaser';
import { FreeForAllGameScene } from '../base/FreeForAllGameScene';

export class ShooterScene extends FreeForAllGameScene {
    constructor() {
        super('ShooterScene');
        
        // Sprite groups
        this.playerSprites = new Map();
        this.bulletSprites = new Map();
        
        // Input
        this.keys = {};
    }

    preload() {
        // Load assets (or create simple graphics)
        // For MVP, use simple shapes
    }

    create() {
        this.createArena();
        this.setupInput();
        this.createGameUI();
    }

    createArena() {
        // Background
        this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            800, 600,
            0x1a1a2e
        );
        
        // Border
        this.add.rectangle(400, 300, 800, 600)
            .setStrokeStyle(2, 0x00ff00);
    }

    setupInput() {
        // WASD
        this.keys.W = this.input.keyboard.addKey('W');
        this.keys.A = this.input.keyboard.addKey('A');
        this.keys.S = this.input.keyboard.addKey('S');
        this.keys.D = this.input.keyboard.addKey('D');
        
        // Mouse for shooting
        this.input.on('pointerdown', () => {
            this.handleShoot();
        });
    }

    update() {
        this.handleInput();
        this.updatePlayerSprites();
        this.updateBulletSprites();
    }

    handleInput() {
        if (!this.room || this.gameState !== 'playing') return;
        
        const myPlayer = this.room.state.players.get(this.room.sessionId);
        if (!myPlayer || !myPlayer.isAlive) return;
        
        // Movement
        if (this.keys.W.isDown) {
            this.room.send('move', { direction: 'up' });
        } else if (this.keys.S.isDown) {
            this.room.send('move', { direction: 'down' });
        }
        
        if (this.keys.A.isDown) {
            this.room.send('move', { direction: 'left' });
        } else if (this.keys.D.isDown) {
            this.room.send('move', { direction: 'right' });
        }
        
        // Aim towards mouse
        const pointer = this.input.activePointer;
        const rotation = Phaser.Math.Angle.Between(
            myPlayer.x, myPlayer.y,
            pointer.x, pointer.y
        );
        this.room.send('move', { rotation });
    }

    handleShoot() {
        if (!this.room || this.gameState !== 'playing') return;
        
        const myPlayer = this.room.state.players.get(this.room.sessionId);
        if (!myPlayer || !myPlayer.isAlive) return;
        
        const pointer = this.input.activePointer;
        const rotation = Phaser.Math.Angle.Between(
            myPlayer.x, myPlayer.y,
            pointer.x, pointer.y
        );
        
        this.room.send('shoot', { rotation });
    }

    // FFA Scene hooks
    onPlayerAdded(player, sessionId) {
        // Create sprite for player
        const sprite = this.add.circle(
            player.x, player.y, 20,
            sessionId === this.room.sessionId ? 0x00ff00 : 0xff0000
        );
        
        const nameText = this.add.text(
            player.x, player.y - 30,
            player.name,
            { fontSize: '12px', color: '#ffffff' }
        ).setOrigin(0.5);
        
        this.playerSprites.set(sessionId, { sprite, nameText });
    }

    onPlayerRemoved(sessionId) {
        const playerObj = this.playerSprites.get(sessionId);
        if (playerObj) {
            playerObj.sprite.destroy();
            playerObj.nameText.destroy();
            this.playerSprites.delete(sessionId);
        }
    }

    updatePlayerSprites() {
        if (!this.room) return;
        
        this.room.state.players.forEach((player, sessionId) => {
            const playerObj = this.playerSprites.get(sessionId);
            if (!playerObj) return;
            
            // Update position
            playerObj.sprite.setPosition(player.x, player.y);
            playerObj.nameText.setPosition(player.x, player.y - 30);
            
            // Update visibility based on alive status
            playerObj.sprite.setVisible(player.isAlive);
            playerObj.nameText.setVisible(player.isAlive);
        });
    }

    updateBulletSprites() {
        if (!this.room) return;
        
        // Remove bullets that no longer exist
        for (const [bulletId, sprite] of this.bulletSprites) {
            const exists = this.room.state.bullets.find(b => b.id === bulletId);
            if (!exists) {
                sprite.destroy();
                this.bulletSprites.delete(bulletId);
            }
        }
        
        // Add/update bullets
        this.room.state.bullets.forEach(bullet => {
            let sprite = this.bulletSprites.get(bullet.id);
            
            if (!sprite) {
                sprite = this.add.circle(bullet.x, bullet.y, 5, 0xffff00);
                this.bulletSprites.set(bullet.id, sprite);
            }
            
            sprite.setPosition(bullet.x, bullet.y);
        });
    }
}
```

#### ✅ Acceptance Criteria:
- [ ] Extends FreeForAllGameScene
- [ ] Creates arena background
- [ ] Handles WASD input for movement
- [ ] Handles mouse click for shooting
- [ ] Aim follows mouse cursor
- [ ] Creates sprites for players
- [ ] Updates player sprite positions
- [ ] Creates sprites for bullets
- [ ] Updates bullet sprite positions
- [ ] Shows/hides dead players

---

### Task 2.6: Tạo Shooter Config và UI Components

**Files**:
- `client/src/games/shooter/config.js`
- `client/src/games/shooter/components/ShooterHUD.jsx`
- `client/src/games/shooter/components/ShooterPlayerBadges.jsx`

#### Config.js:

```javascript
import Phaser from 'phaser';

export const SHOOTER_CONFIG = {
    id: 'shooter',
    name: 'Arena Shooter',
    description: 'Top-down multiplayer shooter - Last player standing wins!',
    minPlayers: 2,
    maxPlayers: 8,
    phaserConfig: {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: '#1a1a2e',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        }
    }
};
```

#### ShooterHUD.jsx (Simple):

```jsx
export const ShooterHUD = ({ player, matchTimer, scoreLimit }) => {
    if (!player) return null;
    
    return (
        <div className="absolute top-4 left-4 space-y-2">
            {/* Health bar */}
            <div className="bg-gray-800 rounded p-2">
                <div className="text-xs text-gray-400 mb-1">Health</div>
                <div className="w-32 h-4 bg-gray-700 rounded overflow-hidden">
                    <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                    />
                </div>
            </div>
            
            {/* KD Ratio */}
            <div className="bg-gray-800 rounded p-2 text-sm">
                <span className="text-green-400">{player.kills}</span>
                <span className="text-gray-500"> / </span>
                <span className="text-red-400">{player.deaths}</span>
            </div>
        </div>
    );
};
```

#### ✅ Acceptance Criteria:
- [ ] Config với Phaser settings
- [ ] HUD shows health bar
- [ ] HUD shows K/D ratio
- [ ] PlayerBadges show health in lobby

---

### Task 2.7: Register Shooter Game

**Files to Update**:
- `client/src/config/gameRegistry.js`
- `client/src/config/gameProfiles.js` (optional)
- `server/index.js`

#### gameRegistry.js:

```javascript
import { ShooterScene } from '../games/shooter/ShooterScene';
import { SHOOTER_CONFIG } from '../games/shooter/config';

export const GAME_REGISTRY = {
    // ... existing games
    shooter: {
        id: SHOOTER_CONFIG.id,
        name: SHOOTER_CONFIG.name,
        description: SHOOTER_CONFIG.description,
        scene: ShooterScene,
        scenes: [ShooterScene],
        phaserConfig: SHOOTER_CONFIG.phaserConfig,
        minPlayers: SHOOTER_CONFIG.minPlayers,
        maxPlayers: SHOOTER_CONFIG.maxPlayers,
        lobby: {
            status: 'Active',
            emoji: '🔫',
            accent: 'red'
        },
        createRoomDefaults: (user) => ({
            roomName: `${user?.name || 'Player'}'s Arena`,
            password: ''
        })
    }
};
```

#### server/index.js:

```javascript
const { ShooterRoom } = require('./rooms/shooter/ShooterRoom');

gameServer.define('shooter', ShooterRoom)
    .enableRealtimeListing();
```

#### ✅ Acceptance Criteria:
- [ ] Shooter registered in gameRegistry
- [ ] Shooter registered in server
- [ ] Appears in lobby with 🔫 emoji

---

## ✅ Verification Plan

### Unit Testing (Manual)

#### Test 1: Room Creation & Basic Flow
1. Create Shooter room
2. Join with 2 players
3. Ready up and start match
4. Verify:
   - [✓] Players spawn at random positions
   - [✓] Timer counts down
   - [✓] Both players visible

#### Test 2: Movement
1. In active match, press WASD
2. Verify:
   - [✓] Player sprite moves
   - [✓] Position updates for other players
   - [✓] Cannot move outside arena bounds

#### Test 3: Aiming
1. Move mouse around
2. Verify:
   - [✓] Player rotates towards mouse
   - [✓] Rotation synced to server

#### Test 4: Shooting
1. Click mouse to shoot
2. Verify:
   - [✓] Bullet appears at player position
   - [✓] Bullet travels in aimed direction
   - [✓] Fire rate limit works (can't spam)
   - [✓] Bullets despawn after 3 seconds

#### Test 5: Combat & Damage
1. Shoot another player
2. Verify:
   - [✓] Bullet hits player (collision works)
   - [✓] Health decreases
   - [✓] Health bar updates

#### Test 6: Death & Respawn
1. Kill a player (reduce health to 0)
2. Verify:
   - [✓] Player becomes invisible
   - [✓] Kills/deaths update
   - [✓] Score updates for killer
   - [✓] Player respawns after 3 seconds
   - [✓] Player has full health after respawn

#### Test 7: Win Condition - Score Limit
1. Set scoreLimit to 3
2. Get 3 kills
3. Verify:
   - [✓] Match ends
   - [✓] Winner declared
   - [✓] Leaderboard shows final scores

#### Test 8: Win Condition - Time Limit
1. Set matchDuration to 30 seconds
2. Wait for timer to reach 0
3. Verify:
   - [✓] Match ends
   - [✓] Player with most kills wins

#### Test 9: Multi-Player Combat
1. Join with 4+ players
2. Everyone shoots each other
3. Verify:
   - [ ] All collisions work
   - [ ] No ghost bullets
   - [ ] Scores update correctly

#### Test 10: Edge Cases
1. Test self-damage (should not work)
2. Test shooting while dead (should not work)
3. Test movement while dead (should not work)
4. Test rapid fire spam
5. Verify all handled correctly

---

## 📊 Deliverables

### Server Files (6 new)
- ✅ `shooter/ShooterPlayer.js`
- ✅ `shooter/Bullet.js`
- ✅ `shooter/ShooterState.js`
- ✅ `shooter/ShooterRoom.js`

### Client Files (4+ new)
- ✅ `shooter/ShooterScene.js`
- ✅ `shooter/config.js`
- ✅ `shooter/components/ShooterHUD.jsx`
- ✅ `shooter/components/ShooterPlayerBadges.jsx`

### Updated Files (3)
- ✅ `config/gameRegistry.js`
- ✅ `config/gameProfiles.js` (optional)
- ✅ `server/index.js`

---

## 🎯 Success Criteria

Phase 2 is **COMPLETE** when:

1. ✅ All tasks implemented
2. ✅ All verification tests pass
3. ✅ No regression in Caro or Test FFA
4. ✅ Can play full shooter match:
   - Players spawn
   - Can move with WASD
   - Can shoot with mouse
   - Bullets hit players
   - Health/damage works
   - Players die and respawn
   - Match ends with winner
5. ✅ Code follows established patterns
6. ✅ **Zero changes to base classes**

---

## 🔄 Future Enhancements (Post-Phase 2)

### Phase 3 Ideas:
- Multiple weapon types
- Power-ups (health, speed, shield)
- Arena obstacles/walls
- Better graphics/animations
- Sound effects
- Kill feed UI
- Spectator mode
- Multiple maps
- Team deathmatch mode

---

## 💡 Technical Notes

### Performance Considerations
- Bullet pooling (if > 50 bullets)
- Spatial partitioning for collisions (if > 8 players)
- Client-side prediction (optional, Phase 3)

### Network Optimization
- Already using Colyseus delta compression
- 60 FPS is acceptable for 8 players
- Monitor server load in production

### Collision Detection
- Simple circle-circle for MVP
- Player hitbox: 20px radius
- Bullet hitbox: 5px radius
- Good enough for top-down shooter

---

**LET'S BUILD A SHOOTER!** 🔫🎯
