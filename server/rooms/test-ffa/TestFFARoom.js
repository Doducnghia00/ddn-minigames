const { FreeForAllRoom } = require('../base/modes/FreeForAllRoom');

/**
 * TestFFARoom - Simple test implementation of FreeForAllRoom
 * Used to verify FFA infrastructure works correctly
 */
class TestFFARoom extends FreeForAllRoom {
    onCreate(options) {
        super.onCreate(options);

        // Test room config
        this.matchDuration = options.matchDuration || 60; // 1 minute for testing
        this.scoreLimit = options.scoreLimit || 10;       // Low limit for quick tests

        this.state.matchTimer = this.matchDuration;
        this.state.scoreLimit = this.scoreLimit;

        // Register test message handlers
        this.onMessage('add_score', (client, message) => {
            this.handleAddScore(client, message);
        });
    }

    getGameId() {
        return 'test-ffa';
    }

    getGameName() {
        return 'Test FFA Mode';
    }

    getDefaultRoomName() {
        return 'Test FFA Room';
    }

    getMinPlayers() {
        return 2;
    }

    getMaxClients() {
        return 8;
    }

    /**
     * Test handler: manually add score to player
     */
    handleAddScore(client, message = {}) {
        if (this.state.gameState !== 'playing') return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const amount = message.amount || 1;
        player.score += amount;

        console.log(`[TestFFA] ${player.name} scored! Total: ${player.score}`);
    }

    onGameUpdate(deltaTime) {
        // Optionally: Auto-increment scores slowly for testing
        // This verifies game loop is running
    }
}

module.exports = { TestFFARoom };
