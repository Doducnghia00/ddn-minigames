const { FreeForAllRoom } = require('../base/modes/FreeForAllRoom');
const { ShooterState } = require('./ShooterState');
const { ShooterPlayer } = require('./ShooterPlayer');
const { Bullet } = require('./Bullet');
const { SHOOTER_CONFIG } = require('./shooter-config');
const { InputBuffer } = require('../base/InputBuffer');
const { SpatialGrid } = require('../base/SpatialGrid');

/**
 * ShooterRoom - Top-down Arena Shooter
 * Extends FreeForAllRoom with shooter-specific game logic
 * 
 * Features:
 * - Real-time movement (WASD)
 * - Mouse-aimed shooting
 * - Bullet physics and collisions
 * - Health system with respawn
 * - Score/Kill tracking
 */
class ShooterRoom extends FreeForAllRoom {
    onCreate(options) {
        // Set custom options BEFORE calling super to override defaults
        const shooterOptions = {
            ...options,
            scoreLimit: options.scoreLimit || SHOOTER_CONFIG.match.scoreLimit,
            matchDuration: options.matchDuration || SHOOTER_CONFIG.match.matchDuration
        };

        super.onCreate(shooterOptions);

        this.nextBulletId = 0;

        // Initialize input buffer for throttling (50ms = 20 msg/s)
        this.inputBuffer = new InputBuffer(50);

        // Initialize spatial grid for optimized collision detection
        // 800x600 arena with 100px cells = 8x6 grid (48 cells)
        this.spatialGrid = new SpatialGrid(
            SHOOTER_CONFIG.arena.width, 
            SHOOTER_CONFIG.arena.height, 
            100
        );

        // Scheduled bullet cleanup (every 500ms instead of every frame)
        this.bulletCleanupInterval = null;

        // Broadcast filtering - throttle non-critical broadcasts
        this.lastRespawnBroadcast = new Map(); // Track last respawn broadcast per player
        this.broadcastThrottle = 1000; // Minimum ms between similar broadcasts

        // Set patch rate for state sync (30 FPS = 33.33ms)
        // Note: This should NOT affect simulation speed (FreeForAllRoom runs game loop at 60 FPS)
        this.setPatchRate(SHOOTER_CONFIG.match.patchRate);

        // Register shooter-specific message handlers
        // Note: Movement is now buffered and processed in game loop
        this.onMessage('move', (client, data) => {
            // Add to input buffer instead of processing immediately
            this.inputBuffer.addInput(client.sessionId, {
                type: 'move',
                data
            });
        });

        this.onMessage('shoot', (client, data) => {
            this.handleShoot(client, data);
        });

        this.onMessage('stop_move', (client) => {
            this.handleStopMove(client);
        });

        console.log('[ShooterRoom] Room created:', this.roomId);
    }

    onError(client, error) {
        console.error('[ShooterRoom] Error for client', client.sessionId, ':', error.message);
        console.error(error.stack);
    }

    /**
     * Cleanup on room disposal
     */
    onDispose() {
        console.log('[ShooterRoom] Room disposing:', this.roomId);
        console.log('[ShooterRoom] Players at dispose:', this.state?.players?.size);
        
        // Clear input buffer
        if (this.inputBuffer) {
            this.inputBuffer.clear();
        }

        // Stop bullet cleanup interval (native interval)
        if (this.bulletCleanupInterval) {
            clearInterval(this.bulletCleanupInterval);
            this.bulletCleanupInterval = null;
        }
        
        super.onDispose();
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
        return SHOOTER_CONFIG.match.minPlayers;
    }

    getMaxClients() {
        return SHOOTER_CONFIG.match.maxPlayers;
    }

    createInitialState(options) {
        const state = new ShooterState();

        // State will be configured by FreeForAllRoom.onCreate()
        // which reads from options.scoreLimit and options.matchDuration

        return state;
    }

    /**
     * Create ShooterPlayer instance for joining player
     */
    createPlayer(options = {}, client) {
        const player = new ShooterPlayer();
        player.id = client.sessionId;
        player.name = options.name || "Player";
        player.avatar = options.avatar || "";
        player.isOwner = false;
        player.isReady = false;

        // Initialize FFAPlayer fields
        player.score = 0;
        player.kills = 0;
        player.deaths = 0;

        // Initialize ShooterPlayer fields (will be set properly on spawn)
        player.health = player.maxHealth;
        player.isAlive = false; // Will be spawned when match starts
        player.lastFireTime = 0;

        console.log('[ShooterRoom] Created player:', {
            sessionId: client.sessionId,
            name: player.name,
            playerType: player.constructor.name,
            playersMapSize: this.state?.players?.size
        });

        return player;
    }

    /**
     * Called after a player joins the room
     */
    afterPlayerJoin(client, player, options) {
        super.afterPlayerJoin(client, player, options);

        console.log('[ShooterRoom] Player joined:', player.name, '- Total players:', this.state.players.size);

        // If joining mid-game, set as spectator
        if (this.state.gameState === 'playing') {
            player.isSpectator = true;
            player.isAlive = false;
            console.log('[ShooterRoom] Mid-game join -', player.name, 'will spectate until next match');
        }

        // Reset all players' readiness when someone new joins (if not playing)
        if (this.state.gameState !== 'playing') {
            this.resetReadiness();
        }

        // If not enough players and not playing, ensure waiting state
        if (this.state.players.size < this.getMinPlayers() && this.state.gameState !== 'playing') {
            this.state.gameState = 'waiting';
        }
    }

    /**
     * Called after a player leaves the room
     */
    afterPlayerLeave(client) {
        super.afterPlayerLeave(client);

        console.log('[ShooterRoom] Player left - Remaining players:', this.state.players.size);

        // Clear input buffer for this player
        this.inputBuffer.clearPlayer(client.sessionId);

        // Reset readiness
        this.resetReadiness();

        // If playing and not enough players left, end the match
        if (this.state.gameState === 'playing') {
            if (this.state.players.size < this.getMinPlayers()) {
                console.log('[ShooterRoom] Not enough players, ending match');
                this.endMatch();
            }
            // Could also: declare winner if only 1 player remains
            // For now, just continue the match
        }

        // If not playing and below min players, reset to waiting
        if (this.state.gameState !== 'playing' && this.state.players.size < this.getMinPlayers()) {
            this.state.gameState = 'waiting';
        }
    }

    onGameStart() {
        super.onGameStart();

        console.log('[ShooterRoom] Match starting - spawning all players');

        // Clear bullets from previous match
        this.state.bullets.clear();
        this.nextBulletId = 0;

        // Start scheduled bullet cleanup (every 500ms instead of every frame)
        // Use native setInterval to avoid Colyseus clock sync issues
        if (this.bulletCleanupInterval) {
            clearInterval(this.bulletCleanupInterval);
        }
        this.bulletCleanupInterval = setInterval(() => {
            this.cleanupBullets();
        }, 500);

        // Spawn all players and clear spectator flags
        for (const [sessionId, player] of this.state.players) {
            player.isSpectator = false; // Everyone can play now
            this.spawnPlayer(player);
        }
    }

    /**
     * Spawn player at random position with full health
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
     * @param {Client} client 
     * @param {Object} data - { direction: 'up'|'down'|'left'|'right'|null, rotation?: number }
     */
    handleMove(client, data) {
        if (this.state.gameState !== 'playing') return;

        const player = this.state.players.get(client.sessionId);
        if (!player || !player.isAlive) return;

        const { direction, rotation } = data;
        const speed = this.state.playerSpeed;

        // ALWAYS reset velocity first, then apply movement if direction exists
        // This fixes the issue where releasing keys doesn't stop the player
        player.velocityX = 0;
        player.velocityY = 0;

        // Handle directional movement
        if (direction) {
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
        }

        // Update rotation (aim direction)
        if (typeof rotation === 'number') {
            player.rotation = rotation;
        }
    }

    /**
     * Stop player movement
     */
    handleStopMove(client) {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.velocityX = 0;
        player.velocityY = 0;
    }

    /**
     * Handle shooting
     * @param {Client} client 
     * @param {Object} data - { rotation: number }
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
    }

    /**
     * Main game update loop - called 60 times/second by FreeForAllRoom
     * @param {number} deltaTime - Time since last update in seconds
     */
    onGameUpdate(deltaTime) {
        // Safety check - only update if game is still playing
        if (this.state.gameState !== 'playing') return;

        // Process buffered inputs (throttled to 20 msg/s per player)
        this.processBufferedInputs();

        // Update player positions
        this.updatePlayerPositions(deltaTime);

        // Update bullet positions
        this.updateBulletPositions(deltaTime);

        // Check bullet-player collisions
        this.checkCollisions();

        // Note: Bullet cleanup now runs on a schedule (every 500ms) instead of every frame
        // This reduces unnecessary checks from 60/s to 2/s
    }

    /**
     * Process buffered player inputs
     */
    processBufferedInputs() {
        this.inputBuffer.processInputs((sessionId, input) => {
            const client = Array.from(this.clients).find(c => c.sessionId === sessionId);
            if (!client) return;

            if (input.type === 'move') {
                this.handleMove(client, input.data);
            }
        });
    }

    /**
     * Update all player positions based on velocity
     */
    updatePlayerPositions(deltaTime) {
        for (const [, player] of this.state.players) {
            if (!player.isAlive) continue;

            // Update position
            player.x += player.velocityX * deltaTime;
            player.y += player.velocityY * deltaTime;

            // Boundary checking (keep players inside arena)
            const padding = SHOOTER_CONFIG.player.hitboxRadius;
            player.x = Math.max(padding, Math.min(this.state.arenaWidth - padding, player.x));
            player.y = Math.max(padding, Math.min(this.state.arenaHeight - padding, player.y));
        }
    }

    /**
     * Update all bullet positions
     */
    updateBulletPositions(deltaTime) {
        for (let i = 0; i < this.state.bullets.length; i++) {
            const bullet = this.state.bullets[i];

            // Safety check
            if (!bullet) continue;

            bullet.x += bullet.velocityX * deltaTime;
            bullet.y += bullet.velocityY * deltaTime;
        }
    }

    /**
     * Check collisions between bullets and players using spatial grid
     * OLD: O(N×M) - check every bullet against every player
     * NEW: O(N+M) - only check bullets against nearby players
     */
    checkCollisions() {
        // Safety check - if game ended during this function, stop processing
        if (this.state.gameState !== 'playing') return;

        // Clear and populate spatial grid
        this.spatialGrid.clear();

        // Insert all alive players into grid
        for (const [playerId, player] of this.state.players) {
            if (!player.isAlive) continue;
            this.spatialGrid.insert(
                player.x, 
                player.y, 
                SHOOTER_CONFIG.player.hitboxRadius,
                'player',
                { id: playerId, player }
            );
        }

        // Check each bullet against nearby players only
        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const bullet = this.state.bullets[i];

            // Safety check
            if (!bullet) continue;

            // Query spatial grid for nearby players
            const nearbyEntities = this.spatialGrid.query(
                bullet.x, 
                bullet.y, 
                SHOOTER_CONFIG.player.hitboxRadius,
                'player'
            );

            let bulletHit = false;

            for (const entity of nearbyEntities) {
                const { id: playerId, player } = entity.data;

                // Can't hit self
                if (playerId === bullet.ownerId) continue;

                // Precise circle collision detection
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const hitRadius = SHOOTER_CONFIG.player.hitboxRadius;

                if (distance < hitRadius) {
                    // Hit detected!
                    this.handlePlayerHit(playerId, bullet);

                    // Remove bullet
                    this.state.bullets.splice(i, 1);
                    bulletHit = true;
                    break; // Bullet can only hit one player
                }
            }

            // Check again if game is still playing after each collision check
            // (handlePlayerHit might have ended the match)
            if (this.state.gameState !== 'playing') return;

            if (bulletHit) continue;
        }
    }

    /**
     * Handle player getting hit by bullet
     */
    handlePlayerHit(playerId, bullet) {
        const player = this.state.players.get(playerId);
        if (!player) return;

        // Apply damage
        player.health -= bullet.damage;

        // Check if player died
        if (player.health <= 0) {
            this.handlePlayerDeath(playerId, bullet.ownerId);
        }
    }

    /**
     * Handle player death
     */
    handlePlayerDeath(victimId, killerId) {
        const victim = this.state.players.get(victimId);
        const killer = this.state.players.get(killerId);

        if (!victim) return;

        // Update victim state
        victim.isAlive = false;
        victim.deaths++;

        // Update killer stats (if not self-kill)
        if (killer && killerId !== victimId) {
            killer.kills++;
            killer.score++;
        }

        console.log(`[ShooterRoom] ${victim.name} killed by ${killer?.name || 'themselves'}. Score: ${killer?.score || 0}`);

        // Check win condition after score update
        if (this.checkWinCondition()) {
            console.log('[ShooterRoom] Win condition met after kill!');
            this.endMatch();
            return; // Don't schedule respawn if match ended
        }

        // Schedule respawn (only if match still ongoing)
        // Use native setTimeout to avoid Colyseus clock sync issues
        setTimeout(() => {
            if (this.state.gameState === 'playing') {
                this.respawnPlayer(victimId);
            }
        }, this.state.respawnDelay * 1000);

        // BROADCAST FILTERING: Only broadcast kill events (critical information)
        // State sync already handles player death/stats, so broadcast is for UI notifications only
        this.broadcast('player_killed', {
            victim: victimId,
            killer: killerId,
            victimName: victim.name,
            killerName: killer?.name || 'Unknown'
        });
    }

    /**
     * Respawn a player
     */
    respawnPlayer(playerId) {
        const player = this.state.players.get(playerId);
        if (!player) return;

        this.spawnPlayer(player);

        // BROADCAST FILTERING: Throttle respawn notifications
        // State sync already handles respawn position/health, broadcast is optional
        const now = Date.now();
        const lastBroadcast = this.lastRespawnBroadcast.get(playerId) || 0;
        
        if (now - lastBroadcast >= this.broadcastThrottle) {
            this.broadcast('player_respawned', {
                playerId: playerId,
                playerName: player.name
            });
            this.lastRespawnBroadcast.set(playerId, now);
        }
        // If throttled, clients will still see the respawn via state sync
    }

    /**
     * Clean up expired or out-of-bounds bullets
     */
    cleanupBullets() {
        const now = Date.now() / 1000;

        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const bullet = this.state.bullets[i];

            // Safety check
            if (!bullet) continue;

            // Remove if expired (lifetime exceeded)
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

    /**
     * Override to add shooter-specific cleanup
     */
    onMatchEnd() {
        console.log('[ShooterRoom] Match ended');

        // Stop scheduled bullet cleanup (native interval)
        if (this.bulletCleanupInterval) {
            clearInterval(this.bulletCleanupInterval);
            this.bulletCleanupInterval = null;
        }

        // Stop all player movement and reset states
        for (const [, player] of this.state.players) {
            player.velocityX = 0;
            player.velocityY = 0;
            
            // Reset player to alive state (so UI doesn't show "Respawning...")
            player.isAlive = true;
            player.health = player.maxHealth;
        }

        // Clear all bullets
        this.state.bullets.clear();
    }

}

module.exports = { ShooterRoom };
