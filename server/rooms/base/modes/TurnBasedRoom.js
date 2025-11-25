const { BaseRoom } = require('../BaseRoom');

class TurnBasedRoom extends BaseRoom {
    onCreate(options = {}) {
        super.onCreate(options);
        this.turnOrder = [];
        this.turnPosition = 0;
        this.ensureTurnState();
    }

    ensureTurnState() {
        if (typeof this.state.currentTurn === 'undefined') {
            throw new Error(
                "TurnBasedRoom requires 'currentTurn' on room state. Extend TurnBasedRoomState when implementing createInitialState()."
            );
        }
    }

    afterPlayerJoin(client, player, options) {
        super.afterPlayerJoin(client, player, options);
        this.refreshTurnOrder();
    }

    afterPlayerLeave(client) {
        super.afterPlayerLeave(client);
        this.refreshTurnOrder(true);
    }

    refreshTurnOrder(resetCurrent = false) {
        this.turnOrder = this.buildTurnOrder();

        if (this.turnOrder.length === 0) {
            this.clearCurrentTurn();
            return;
        }

        if (resetCurrent || !this.getCurrentTurn()) {
            this.setCurrentTurn(this.turnOrder[0]);
            return;
        }

        if (!this.turnOrder.includes(this.getCurrentTurn())) {
            this.setCurrentTurn(this.turnOrder[0]);
        }
    }

    buildTurnOrder() {
        return Array.from(this.state.players.keys());
    }

    setCurrentTurn(sessionId) {
        this.ensureTurnState();
        this.state.currentTurn = sessionId || "";
        this.turnPosition = Math.max(0, this.turnOrder.indexOf(this.state.currentTurn));
    }

    clearCurrentTurn() {
        this.ensureTurnState();
        this.state.currentTurn = "";
        this.turnPosition = 0;
    }

    getCurrentTurn() {
        this.ensureTurnState();
        return this.state.currentTurn || "";
    }

    advanceTurn() {
        if (this.turnOrder.length === 0) {
            this.clearCurrentTurn();
            return "";
        }

        const currentIndex = this.turnOrder.indexOf(this.getCurrentTurn());
        const nextIndex = currentIndex >= 0
            ? (currentIndex + 1) % this.turnOrder.length
            : 0;

        const nextTurn = this.turnOrder[nextIndex];
        this.setCurrentTurn(nextTurn);
        this.notifyTurnChanged(nextTurn);
        return nextTurn;
    }

    notifyTurnChanged(sessionId) {
        if (!sessionId) {
            return;
        }
        this.broadcast("turn_changed", { currentTurn: sessionId });
    }
}

module.exports = { TurnBasedRoom };

