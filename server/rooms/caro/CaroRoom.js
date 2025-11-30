const { TurnBasedRoom } = require('../base/modes/TurnBasedRoom');
const { CaroState } = require('./CaroState');
const { CaroPlayer } = require('./CaroPlayer');
const { CARO_CONFIG } = require('./caro-config');
const { validateAllSettings } = require('./settings-validator');

class CaroRoom extends TurnBasedRoom {
    constructor() {
        super();
        
        // Initialize game config BEFORE onCreate (needed for createInitialState)
        this.gameConfig = {
            boardSize: CARO_CONFIG.board.size,
            winCondition: CARO_CONFIG.board.winCondition,
            timePerTurn: CARO_CONFIG.turn.timeLimit,
            allowUndo: CARO_CONFIG.turn.allowUndo
        };

        // Room-specific customizable settings (host can modify)
        this.roomSettings = {
            boardSize: CARO_CONFIG.board.size,
            winCondition: CARO_CONFIG.board.winCondition,
            timePerTurn: CARO_CONFIG.turn.timeLimit
        };
    }

    onCreate(options) {
        super.onCreate(options);

        // Sync initial settings to state
        this.syncSettingsToState();

        // Apply rate limiting from BaseRoom (inherited)
        this.onMessage("move", (client, message = {}) => {
            if (!this.checkRateLimit(client)) return;
            this.handleMove(client, message);
        });

        // Handle settings updates (host only)
        this.onMessage("update_settings", (client, data = {}) => {
            this.handleUpdateSettings(client, data);
        });
    }

    getGameId() {
        return "caro";
    }

    getGameName() {
        return "Caro Online";
    }

    getDefaultRoomName() {
        return "Caro Room";
    }

    getMinPlayers() {
        return CARO_CONFIG.match.minPlayers;
    }

    getMaxClients() {
        return CARO_CONFIG.match.maxPlayers;
    }

    createInitialState() {
        return new CaroState(this.gameConfig.boardSize, this.gameConfig.winCondition);
    }

    createPlayer(options = {}, client) {
        // Create CaroPlayer instead of base Player
        const player = new CaroPlayer();
        player.id = client.sessionId;
        player.name = options.name || "Player";
        player.avatar = options.avatar || "";
        player.isOwner = false;
        player.isReady = false;
        player.symbol = 0;  // Caro-specific field
        return player;
    }

    afterPlayerJoin(client, player, options) {
        super.afterPlayerJoin(client, player, options);

        if (this.state.players.size === 1) {
            player.symbol = 1;
        } else if (this.state.players.size === 2) {
            player.symbol = 2;
        } else {
            player.symbol = 0;
        }

        this.resetReadiness();

        if (this.state.players.size < this.getMinPlayers() && this.state.gameState !== "playing") {
            this.state.gameState = "waiting";
            this.state.currentTurn = "";
        }
    }

    afterPlayerLeave(client) {
        super.afterPlayerLeave(client);
        this.resetReadiness();

        if (this.state.gameState === "playing") {
            const remainingPlayerId = Array.from(this.state.players.keys())[0];
            if (remainingPlayerId) {
                this.finishGame(remainingPlayerId);
            } else {
                this.finishGame("draw");
            }
        } else if (this.state.players.size < this.getMinPlayers()) {
            this.state.gameState = "waiting";
            this.state.currentTurn = "";
        }
    }

    onGameStart() {
        // Apply room settings to game config
        this.gameConfig.boardSize = this.roomSettings.boardSize;
        this.gameConfig.winCondition = this.roomSettings.winCondition;
        this.gameConfig.timePerTurn = this.roomSettings.timePerTurn;

        // If board size changed, recreate state with new size
        if (this.state.boardSize !== this.gameConfig.boardSize || 
            this.state.winCondition !== this.gameConfig.winCondition) {
            
            // Preserve players
            const players = new Map(this.state.players);
            
            // Recreate state with new board size
            this.setState(new CaroState(this.gameConfig.boardSize, this.gameConfig.winCondition));
            
            // Restore players and room owner
            this.state.players = players;
            // roomOwner is already in the recreated state from previous state
            const currentOwner = Array.from(players.entries()).find(([id, p]) => p.isOwner);
            if (currentOwner) {
                this.state.roomOwner = currentOwner[0];
            }
            this.state.gameState = 'playing';
            
            // Re-sync settings
            this.syncSettingsToState();
        } else {
            // Just clear existing board
            this.clearBoard();
        }

        const startingPlayerId = this.getStartingPlayerId();
        if (!startingPlayerId) {
            this.state.gameState = "waiting";
            this.state.currentTurn = "";
            return;
        }

        this.setCurrentTurn(startingPlayerId);
        this.assignSymbols(startingPlayerId);
        this.broadcast("start_game", { startPlayer: this.getCurrentTurn() });
    }

    handleMove(client, { x, y }) {
        if (typeof x !== "number" || typeof y !== "number") return;
        if (this.state.gameState !== "playing") return;
        if (this.state.currentTurn !== client.sessionId) return;

        // Use dynamic board size from config
        const boardSize = this.gameConfig.boardSize;
        const index = y * boardSize + x;
        if (index < 0 || index >= this.state.board.length) return;
        if (this.state.board[index] !== 0) return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        this.state.board[index] = player.symbol;

        if (this.checkWin(x, y, player.symbol)) {
            this.finishGame(client.sessionId);
        } else {
            this.advanceTurn();
        }
    }

    getStartingPlayerId() {
        for (const [id, player] of this.state.players) {
            if (player.symbol === 1) {
                return id;
            }
        }

        const firstEntry = this.state.players.entries().next().value;
        if (firstEntry) {
            const [id, player] = firstEntry;
            player.symbol = 1;
            return id;
        }

        return null;
    }

    assignSymbols(startingPlayerId) {
        for (const [id, player] of this.state.players) {
            if (id === startingPlayerId) {
                player.symbol = 1;
            } else {
                player.symbol = 2;
            }
        }
    }

    finishGame(winnerId) {
        this.state.winner = winnerId;
        this.state.gameState = "finished";
        this.clearCurrentTurn();
        this.resetReadiness();
        this.broadcast("game_over", { winner: winnerId });
    }

    // ===== SETTINGS MANAGEMENT =====

    /**
     * Sync room settings to state (for client display)
     */
    syncSettingsToState() {
        this.state.cfg_boardSize = this.roomSettings.boardSize;
        this.state.cfg_winCondition = this.roomSettings.winCondition;
        this.state.cfg_timePerTurn = this.roomSettings.timePerTurn;

        // Also update the actual fields for immediate preview
        // (only when not playing - during match, these should not change)
        if (this.state.gameState !== 'playing') {
            this.state.boardSize = this.roomSettings.boardSize;
            this.state.winCondition = this.roomSettings.winCondition;
        }
    }

    /**
     * Handle settings update request from client
     */
    handleUpdateSettings(client, data) {
        // 1. Check if sender is host
        if (client.sessionId !== this.state.roomOwner) {
            client.send('settings_error', { error: 'Only host can change settings' });
            return;
        }

        // 2. Check if game is not playing
        if (this.state.gameState === 'playing') {
            client.send('settings_error', { error: 'Cannot change settings during match' });
            return;
        }

        // 3. Validate settings
        const { validated, errors } = validateAllSettings(data.settings || {});

        if (errors.length > 0) {
            client.send('settings_error', { errors });
            return;
        }

        // 4. Apply settings
        this.applySettings(validated);

        // 5. Broadcast success
        const hostPlayer = this.state.players.get(client.sessionId);
        this.broadcast('settings_updated', {
            settings: this.getCurrentSettings(),
            updatedBy: hostPlayer?.name || 'Host'
        });

        console.log(`[CaroRoom] Settings updated by ${hostPlayer?.name}:`, validated);
    }

    /**
     * Apply validated settings
     */
    applySettings(settings) {
        const oldBoardSize = this.roomSettings.boardSize;
        
        // Update room settings
        Object.assign(this.roomSettings, settings);

        // Update gameConfig for next match
        Object.assign(this.gameConfig, settings);

        // If board size changed and game is not playing, recreate board array
        if (settings.boardSize && settings.boardSize !== oldBoardSize && this.state.gameState !== 'playing') {
            const newSize = settings.boardSize;
            const newCellCount = newSize * newSize;
            
            // Recreate board array with new size
            this.state.board.clear();
            for (let i = 0; i < newCellCount; i++) {
                this.state.board.push(0);
            }
            
            console.log(`[CaroRoom] Board size changed: ${oldBoardSize}x${oldBoardSize} -> ${newSize}x${newSize}`);
        }

        // Sync to state for clients (this will trigger canvas re-render)
        this.syncSettingsToState();
    }

    /**
     * Get current settings
     */
    getCurrentSettings() {
        return { ...this.roomSettings };
    }

    clearBoard() {
        for (let i = 0; i < this.state.board.length; i++) {
            this.state.board[i] = 0;
        }
    }

    checkWin(x, y, symbol) {
        // Use dynamic board size and win condition from config
        const boardSize = this.gameConfig.boardSize;
        const winCondition = this.gameConfig.winCondition;

        const directions = [
            [1, 0],   // Horizontal
            [0, 1],   // Vertical
            [1, 1],   // Diagonal \
            [1, -1]   // Diagonal /
        ];

        for (const [dx, dy] of directions) {
            let count = 1;

            // Check positive direction
            for (let i = 1; i < winCondition; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;
                if (this.state.board[ny * boardSize + nx] === symbol) count++;
                else break;
            }

            // Check negative direction
            for (let i = 1; i < winCondition; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;
                if (this.state.board[ny * boardSize + nx] === symbol) count++;
                else break;
            }

            if (count >= winCondition) {
                return true;
            }
        }

        return false;
    }
}

module.exports = { CaroRoom };

