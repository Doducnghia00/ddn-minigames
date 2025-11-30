const { TurnBasedRoom } = require('../base/modes/TurnBasedRoom');
const { CaroState } = require('./CaroState');
const { CaroPlayer } = require('./CaroPlayer');
const { CARO_CONFIG } = require('./caro-config');

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
    }

    onCreate(options) {
        super.onCreate(options);

        // Apply rate limiting from BaseRoom (inherited)
        this.onMessage("move", (client, message = {}) => {
            if (!this.checkRateLimit(client)) return;
            this.handleMove(client, message);
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
        this.clearBoard();

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

