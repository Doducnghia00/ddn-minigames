const { BaseRoom } = require('../BaseRoom');
const { FreeForAllRoomState } = require('../states/FreeForAllRoomState');
const { FFAPlayer } = require('../players/FreeForAllPlayer');

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

        // Timer optimization - sync less frequently
        this.lastTimerSync = 0;
        this.timerSyncInterval = 1000; // Sync timer every 1000ms (1 FPS) instead of 60 FPS

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
        
        // DEBUG: Track actual time to verify tick rate
        this.gameStartTime = Date.now();
        this.tickCount = 0;
        
        // CRITICAL FIX: Use Node.js setInterval instead of this.clock.setInterval
        // Colyseus clock is synchronized with patch rate, causing timer to run slow
        // when patch rate is reduced (e.g., 30 FPS patch = timer runs at 50% speed)
        // Native setInterval ensures game loop runs at true 60 FPS regardless of patch rate
        this.gameLoopInterval = setInterval(() => {
            this.gameLoop(1 / TICK_RATE);
        }, 1000 / TICK_RATE);

        console.log(`[FreeForAllRoom] Game started - Match duration: ${this.matchDuration}s, Tick rate: ${TICK_RATE} FPS`);

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

        // DEBUG: Count ticks and verify actual elapsed time
        this.tickCount++;
        
        // Update timer internally
        this.elapsedTime += deltaTime;
        const newTimer = Math.max(0, this.matchDuration - this.elapsedTime);

        // OPTIMIZATION: Only sync timer to state every 1 second instead of 60 times/second
        // This reduces state updates by ~98% (60 FPS -> 1 FPS for timer)
        const now = Date.now();
        if (now - this.lastTimerSync >= this.timerSyncInterval) {
            this.state.matchTimer = newTimer;
            this.lastTimerSync = now;

            // DEBUG: Verify timer accuracy every 5 seconds
            const actualElapsed = (now - this.gameStartTime) / 1000;
            const timerDiff = Math.abs(this.elapsedTime - actualElapsed);
            
            // WARNING: If timer drift is > 1 second, something is wrong
            if (timerDiff > 1.0) {
                console.warn(`[FreeForAllRoom] ⚠️ TIMER DRIFT DETECTED! Internal: ${this.elapsedTime.toFixed(2)}s vs Actual: ${actualElapsed.toFixed(2)}s (diff: ${timerDiff.toFixed(2)}s)`);
            }
        }

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
     * End the current match
     */
    endMatch() {
        this.state.gameState = 'finished';

        // Stop game loop (native setInterval)
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }

        // Determine winner
        const winnerId = this.determineWinner();
        const winner = this.state.players.get(winnerId);
        this.state.winner = winnerId;

        console.log('=== MATCH ENDED ===');
        console.log(`Winner: ${winner?.name || 'Unknown'} (${winnerId})`);
        console.log(`Score: ${winner?.score || 0}`);
        console.log(`Kills: ${winner?.kills || 0}`);
        console.log('Final Scores:', this.getFinalScores());
        console.log('==================');

        this.broadcast('match_ended', {
            winner: winnerId,
            winnerName: winner?.name || 'Unknown',
            winnerScore: winner?.score || 0,
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
     * Cleanup when room is disposed
     */
    onDispose() {
        if (this.gameLoopInterval) {
            // Clear native setInterval (not Colyseus clock)
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
    }
}

module.exports = { FreeForAllRoom };
