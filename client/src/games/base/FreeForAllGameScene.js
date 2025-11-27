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

        // Reset events setup flag
        this.eventsSetup = false;
    }

    /**
     * Setup room event listeners
     * Called from GamePage when room is connected
     */
    setRoom(room) {
        this.room = room;
        this.setupRoomEvents();

        // Setup game-specific server messages (if subclass has it)
        if (this.setupServerMessages) {
            this.setupServerMessages();
        }
    }

    /**
     * Setup Colyseus state listeners
     */
    setupRoomEvents() {
        if (!this.room || !this.room.state) return;

        // Guard: prevent duplicate setup
        if (this.eventsSetup) {
            // console.log('[FreeForAllGameScene] Events already setup, skipping');
            return;
        }
        this.eventsSetup = true;

        // console.log('[FreeForAllGameScene] Setting up room events');

        // Listen to match timer updates
        this.room.state.listen('matchTimer', (value) => {
            this.matchTimer = value;
            this.onTimerUpdate(value);
        });

        // Listen to score limit
        this.room.state.listen('scoreLimit', (value) => {
            this.scoreLimit = value;
            // Notify subclass that state has been synced
            if (this.onStateSync) {
                this.onStateSync();
            }
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

        // IMPORTANT: Set callbacks BEFORE initializing existing players
        // to prevent race condition where new players join during initialization

        // Listen to player additions (NEW players joining)
        this.room.state.players.onAdd = (player, sessionId) => {
            // console.log('[FreeForAllGameScene] New player added:', sessionId, player.name);
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

        // NOW initialize existing players (after callbacks are set)
        this.room.state.players.forEach((player, sessionId) => {
            // console.log('[FreeForAllGameScene] Initializing existing player:', sessionId, player.name);
            this.onPlayerAdded(player, sessionId);
            this.setupPlayerListeners(player, sessionId);
        });

        // Listen to match events
        this.room.onMessage('match_started', (data) => {
            this.onMatchStarted(data);
        });

        this.room.onMessage('match_ended', (data) => {
            this.onMatchEnded(data);
        });
    }

    /**
     * Setup listeners for individual player state changes
     */
    setupPlayerListeners(player, sessionId) {
        // Initialize score tracking (important for leaderboard!)
        this.playerScores.set(sessionId, player.score || 0);
        this.playerKills.set(sessionId, player.kills || 0);
        this.playerDeaths.set(sessionId, player.deaths || 0);

        // Listen to score changes
        player.listen('score', (value) => {
            this.playerScores.set(sessionId, value);
            this.onScoreChanged(sessionId, value);
        });

        // Listen to kills changes
        player.listen('kills', (value) => {
            this.playerKills.set(sessionId, value);
            this.onKillsChanged(sessionId, value);
        });

        // Listen to deaths changes
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
