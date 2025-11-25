const { Room } = require('colyseus');
const { BaseRoomState } = require('./BaseRoomState');
const { Player } = require('./Player');

class BaseRoom extends Room {
    onCreate(options = {}) {
        this.password = options.password;
        this.minPlayers = this.getMinPlayers();
        this.maxClients = this.getMaxClients();

        this.setState(this.createInitialState(options));
        this.roomMetadata = this.buildMetadata(options);
        this.setMetadata(this.roomMetadata);

        this.registerBaseMessageHandlers();
    }

    buildMetadata(options = {}) {
        return {
            roomName: options.roomName || this.getDefaultRoomName(),
            isLocked: !!options.password,
            gameId: this.getGameId(),
            gameName: this.getGameName()
        };
    }

    registerBaseMessageHandlers() {
        this.onMessage("toggle_ready", (client, message) => {
            this.handleToggleReady(client, message?.ready);
        });

        this.onMessage("start_match", (client) => {
            this.handleStartMatch(client);
        });

        this.onMessage("kick_player", (client, payload = {}) => {
            this.handleKickPlayer(client, payload.targetId);
        });

        this.onMessage("change_password", (client, payload = {}) => {
            this.handleChangePassword(client, payload.newPassword);
        });

        this.onMessage("rematch", (client) => {
            this.handleRematch(client);
        });
    }

    createInitialState() {
        return new BaseRoomState();
    }

    getGameId() {
        return "base";
    }

    getGameName() {
        return "Base Game";
    }

    getDefaultRoomName() {
        return "Base Room";
    }

    getMinPlayers() {
        return 2;
    }

    getMaxClients() {
        return 2;
    }

    createPlayer(options = {}, client) {
        const player = new Player();
        player.id = client.sessionId;
        player.name = options.name || "Player";
        player.avatar = options.avatar || "";
        player.isOwner = false;
        player.isReady = false;
        return player;
    }

    onAuth(client, options = {}) {
        if (this.password && options.password !== this.password) {
            throw new Error("Invalid password");
        }
        return true;
    }

    onJoin(client, options = {}) {
        const player = this.createPlayer(options, client);
        this.state.players.set(client.sessionId, player);

        if (!this.state.roomOwner) {
            this.assignOwner(client.sessionId);
        }

        this.afterPlayerJoin(client, player, options);
    }

    afterPlayerJoin() {
        // Game-specific hook
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        this.state.rematchVotes.delete(client.sessionId);

        if (this.state.roomOwner === client.sessionId) {
            this.assignNextOwner();
        }

        this.afterPlayerLeave(client);
    }

    afterPlayerLeave() {
        // Game-specific hook
    }

    assignOwner(sessionId) {
        const player = this.state.players.get(sessionId);
        if (!player) return;

        if (this.state.roomOwner && this.state.players.has(this.state.roomOwner)) {
            const currentOwner = this.state.players.get(this.state.roomOwner);
            if (currentOwner) {
                currentOwner.isOwner = false;
            }
        }

        player.isOwner = true;
        this.state.roomOwner = sessionId;
    }

    assignNextOwner() {
        const nextOwner = Array.from(this.state.players.keys())[0];
        if (nextOwner) {
            this.assignOwner(nextOwner);
        } else {
            this.state.roomOwner = "";
        }
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
            return;
        }

        if (this.state.gameState === "playing") return;
        if (this.state.players.size < this.getMinPlayers()) return;
        if (!this.areAllPlayersReady()) return;

        this.startGame();
    }

    startGame() {
        if (this.state.players.size < this.getMinPlayers()) {
            return false;
        }

        this.resetReadiness();
        this.clearRematchVotes();
        this.state.winner = "";
        this.state.gameState = "playing";

        this.onGameStart();
        return true;
    }

    onGameStart() {
        // Game-specific hook
    }

    handleRematch(client) {
        if (this.state.gameState !== "finished") return;

        this.state.rematchVotes.set(client.sessionId, true);

        if (this.state.rematchVotes.size === this.state.players.size &&
            this.state.players.size >= this.getMinPlayers()) {
            this.state.gameState = "waiting";
            this.state.winner = "";
            this.onRematchApproved();
        }
    }

    onRematchApproved() {
        this.startGame();
    }

    handleKickPlayer(client, targetId) {
        if (this.state.roomOwner !== client.sessionId) {
            return;
        }

        if (!targetId || targetId === client.sessionId) return;

        const clients = Array.isArray(this.clients) ? this.clients : Array.from(this.clients || []);
        const targetClient = clients.find((c) => c.sessionId === targetId);
        if (targetClient) {
            try {
                targetClient.send("kicked", {
                    reason: "owner_kick",
                    message: "You have been removed from the room by the host."
                });
            } catch (err) {
                console.warn("Failed to send kick message", err);
            }
            targetClient.leave(4000);
        }
    }

    handleChangePassword(client, newPassword) {
        if (this.state.roomOwner !== client.sessionId) {
            return;
        }

        this.password = newPassword || undefined;
        this.roomMetadata = {
            ...this.roomMetadata,
            isLocked: !!newPassword
        };
        this.setMetadata(this.roomMetadata);

        this.broadcast("password_changed", { isLocked: !!newPassword });
    }

    resetReadiness() {
        for (const [, player] of this.state.players) {
            player.isReady = false;
        }
    }

    clearRematchVotes() {
        for (const key of Array.from(this.state.rematchVotes.keys())) {
            this.state.rematchVotes.delete(key);
        }
    }

    areAllPlayersReady() {
        if (this.state.players.size < this.getMinPlayers()) {
            return false;
        }

        for (const [, player] of this.state.players) {
            if (!player.isReady) return false;
        }

        return true;
    }
}

module.exports = { BaseRoom };

