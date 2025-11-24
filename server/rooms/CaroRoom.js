const { Room } = require('colyseus');
const { CaroState, Player } = require('./schema/CaroState');

class CaroRoom extends Room {
    onCreate(options) {
        this.setState(new CaroState());
        this.maxClients = 2;
        this.minPlayers = 2;
        this.state.gameState = "waiting";
        this.state.currentTurn = null;

        // Metadata for Lobby
        this.setMetadata({
            roomName: options.roomName || "Caro Room",
            isLocked: !!options.password,
            gameId: "caro",
            gameName: "Caro Online"
        });

        if (options.password) {
            this.password = options.password;
        }

        this.onMessage("move", (client, message) => {
            this.handleMove(client, message);
        });

        this.onMessage("rematch", (client) => {
            this.handleRematch(client);
        });

        this.onMessage("toggle_ready", (client, message) => {
            this.handleToggleReady(client, message?.ready);
        });

        this.onMessage("start_match", (client) => {
            this.handleStartMatch(client);
        });

        this.onMessage("kick_player", (client, { targetId }) => {
            this.handleKickPlayer(client, targetId);
        });

        this.onMessage("change_password", (client, { newPassword }) => {
            this.handleChangePassword(client, newPassword);
        });
    }

    onAuth(client, options, request) {
        if (this.password && options.password !== this.password) {
            throw new Error("Invalid password");
        }
        return true;
    }

    onJoin(client, options) {
        console.log(client.sessionId, "joined Caro room");

        const player = new Player();
        player.id = client.sessionId;
        player.name = options.name || "Player";
        player.avatar = options.avatar || ""; // Google photo URL
        player.isReady = false;

        // Assign symbol: 1 for first player (X), 2 for second (O)
        // First player is also the room owner
        if (this.state.players.size === 0) {
            player.symbol = 1;
            player.isOwner = true;
            this.state.roomOwner = client.sessionId;
            this.state.currentTurn = client.sessionId; // X goes first
        } else {
            player.symbol = 2;
            player.isOwner = false;
        }

        this.state.players.set(client.sessionId, player);

        this.resetReadiness();

        if (this.state.players.size < this.minPlayers && this.state.gameState !== "playing") {
            this.state.gameState = "waiting";
            this.state.currentTurn = null;
        }
    }

    handleMove(client, { x, y }) {
        if (this.state.gameState !== "playing") return;
        if (this.state.currentTurn !== client.sessionId) return;

        const index = y * 15 + x;
        if (this.state.board[index] !== 0) return; // Cell not empty

        const player = this.state.players.get(client.sessionId);
        this.state.board[index] = player.symbol;

        if (this.checkWin(x, y, player.symbol)) {
            this.state.winner = client.sessionId;
            this.state.gameState = "finished";
            this.state.currentTurn = null;
            this.resetReadiness();
            this.broadcast("game_over", { winner: client.sessionId });
        } else {
            this.switchTurn();
        }
    }

    switchTurn() {
        for (let [id, player] of this.state.players) {
            if (id !== this.state.currentTurn) {
                this.state.currentTurn = id;
                break;
            }
        }
    }

    checkWin(x, y, symbol) {
        const directions = [
            [1, 0],  // Horizontal
            [0, 1],  // Vertical
            [1, 1],  // Diagonal \
            [1, -1]  // Diagonal /
        ];

        for (let [dx, dy] of directions) {
            let count = 1;

            // Check forward
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break;
                if (this.state.board[ny * 15 + nx] === symbol) count++;
                else break;
            }

            // Check backward
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break;
                if (this.state.board[ny * 15 + nx] === symbol) count++;
                else break;
            }

            if (count >= 5) return true;
        }
        return false;
    }

    onLeave(client, consented) {
        console.log(client.sessionId, "left Caro room");
        this.state.players.delete(client.sessionId);
        this.state.rematchVotes.delete(client.sessionId);
        this.resetReadiness();

        // Transfer ownership if owner left
        if (this.state.roomOwner === client.sessionId && this.state.players.size > 0) {
            const newOwner = Array.from(this.state.players.keys())[0];
            this.state.roomOwner = newOwner;
            this.state.players.get(newOwner).isOwner = true;
            console.log("Ownership transferred to", newOwner);
        }

        if (this.state.gameState === "playing") {
            // Find the remaining player and set them as winner
            const remainingPlayerId = Array.from(this.state.players.keys())[0];
            if (remainingPlayerId) {
                this.state.winner = remainingPlayerId;
                this.state.gameState = "finished";
                this.state.currentTurn = null;
                this.resetReadiness();
                this.broadcast("game_over", { winner: remainingPlayerId });
            } else {
                // No players left, just finish the game
                this.state.gameState = "finished";
                this.state.currentTurn = null;
                this.broadcast("game_over", { winner: "draw" });
            }
        }

        if (this.state.players.size < this.minPlayers && this.state.gameState !== "playing") {
            this.state.gameState = "waiting";
            this.state.currentTurn = null;
        }
    }

    handleRematch(client) {
        if (this.state.gameState !== "finished") return;

        this.state.rematchVotes.set(client.sessionId, true);
        console.log("Rematch vote from", client.sessionId);

        // Check if all players voted for rematch
        if (this.state.rematchVotes.size === this.state.players.size) {
            this.startGame();
        }
    }

    handleKickPlayer(client, targetId) {
        // Only room owner can kick
        if (this.state.roomOwner !== client.sessionId) {
            console.log("Non-owner tried to kick:", client.sessionId);
            return;
        }

        // Cannot kick yourself
        if (targetId === client.sessionId) return;

        // Find and disconnect the target client
        const targetClient = Array.from(this.clients).find(c => c.sessionId === targetId);
        if (targetClient) {
            console.log("Kicking player:", targetId);
            try {
                targetClient.send("kicked", {
                    reason: "owner_kick",
                    message: "You have been removed from the room by the host."
                });
            } catch (err) {
                console.warn("Failed to send kick message", err);
            }
            targetClient.leave(4000); // Custom close code for kick
        }
    }

    handleChangePassword(client, newPassword) {
        // Only room owner can change password
        if (this.state.roomOwner !== client.sessionId) {
            console.log("Non-owner tried to change password:", client.sessionId);
            return;
        }

        this.password = newPassword || undefined;
        this.setMetadata({
            ...this.metadata,
            isLocked: !!newPassword
        });

        console.log("Password changed by owner");
        this.broadcast("password_changed", { isLocked: !!newPassword });
    }

    handleToggleReady(client, ready) {
        if (this.state.gameState === "playing") {
            return;
        }

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.isReady = !!ready;
    }

    handleStartMatch(client) {
        if (this.state.roomOwner !== client.sessionId) {
            console.log("Non-owner tried to start match:", client.sessionId);
            return;
        }

        if (this.state.gameState === "playing") return;
        if (this.state.players.size < this.minPlayers) return;

        if (!this.areAllPlayersReady()) {
            console.log("Cannot start match, not everyone is ready");
            return;
        }

        this.startGame();
    }

    areAllPlayersReady() {
        if (this.state.players.size < this.minPlayers) return false;
        for (let [, player] of this.state.players) {
            if (!player.isReady) return false;
        }
        return true;
    }

    startGame() {
        if (this.state.players.size < this.minPlayers) {
            console.warn("Attempted to start match without enough players");
            return;
        }

        console.log("Starting new Caro match");
        this.clearBoard();
        this.state.rematchVotes.clear();
        this.state.winner = "";
        this.state.gameState = "playing";

        // Ensure there is always a player assigned to X (symbol 1)
        let startingPlayerId = null;
        for (let [id, player] of this.state.players) {
            if (player.symbol === 1) {
                startingPlayerId = id;
                break;
            }
        }

        if (!startingPlayerId) {
            const firstEntry = this.state.players.entries().next().value;
            if (firstEntry) {
                const [id, player] = firstEntry;
                player.symbol = 1;
                startingPlayerId = id;
            }
        }

        if (!startingPlayerId) {
            console.warn("Unable to determine starting player");
            return;
        }

        this.state.currentTurn = startingPlayerId;

        // Ensure other players have symbols
        for (let [id, player] of this.state.players) {
            if (id !== startingPlayerId && player.symbol !== 2) {
                player.symbol = 2;
            }
        }

        this.resetReadiness();
        this.broadcast("start_game", { startPlayer: this.state.currentTurn });
    }

    clearBoard() {
        for (let i = 0; i < 225; i++) {
            this.state.board[i] = 0;
        }
    }

    resetReadiness() {
        for (let [, player] of this.state.players) {
            player.isReady = false;
        }
    }
}

exports.CaroRoom = CaroRoom;
