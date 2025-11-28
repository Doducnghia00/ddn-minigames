const { Room } = require('colyseus');
const { BaseRoomState } = require('./BaseRoomState');
const { Player } = require('./Player');

class BaseRoom extends Room {
    onCreate(options = {}) {
        this.password = options.password;
        this.minPlayers = this.getMinPlayers();
        this.maxClients = this.getMaxClients();

        // Message rate limiting - prevent spam/abuse
        this.messageRateLimits = new Map(); // sessionId -> { count, resetTime }
        this.maxMessagesPerSecond = 50; // Generous limit to prevent abuse

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

    /**
     * Check if client is within rate limit
     * @returns {boolean} True if allowed, false if rate limited
     */
    checkRateLimit(client) {
        const now = Date.now();
        const limit = this.messageRateLimits.get(client.sessionId);

        if (!limit || now > limit.resetTime) {
            // Reset counter
            this.messageRateLimits.set(client.sessionId, {
                count: 1,
                resetTime: now + 1000
            });
            return true;
        }

        if (limit.count >= this.maxMessagesPerSecond) {
            console.warn(`[BaseRoom] Rate limit exceeded for client ${client.sessionId}`);
            return false;
        }

        limit.count++;
        return true;
    }

    registerBaseMessageHandlers() {
        // Ping-pong for RTT measurement (bypass rate limit as it's needed for network stats)
        this.onMessage("ping", (client) => {
            client.send("pong");
        });

        this.onMessage("toggle_ready", (client, message) => {
            if (!this.checkRateLimit(client)) return;
            this.handleToggleReady(client, message?.ready);
        });

        this.onMessage("start_match", (client) => {
            if (!this.checkRateLimit(client)) return;
            this.handleStartMatch(client);
        });

        this.onMessage("kick_player", (client, payload = {}) => {
            if (!this.checkRateLimit(client)) return;
            this.handleKickPlayer(client, payload.targetId);
        });

        this.onMessage("change_password", (client, payload = {}) => {
            if (!this.checkRateLimit(client)) return;
            this.handleChangePassword(client, payload.newPassword);
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

        // Clean up rate limit tracking
        this.messageRateLimits.delete(client.sessionId);

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
        this.state.winner = "";
        this.state.gameState = "playing";

        this.onGameStart();
        return true;
    }

    onGameStart() {
        // Game-specific hook
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

        // BROADCAST FILTERING: Password change is low-frequency, keep broadcast
        // (Happens rarely, so not a performance concern)
        this.broadcast("password_changed", { isLocked: !!newPassword });
    }

    resetReadiness() {
        for (const [, player] of this.state.players) {
            player.isReady = false;
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

