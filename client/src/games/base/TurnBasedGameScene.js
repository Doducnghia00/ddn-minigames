import { BaseGameScene } from './BaseGameScene';

/**
 * TurnBasedGameScene
 * 
 * Extends BaseGameScene with helpers for games that require turn management.
 * Provides lifecycle hooks and utility methods shared across turn-based games.
 */
export class TurnBasedGameScene extends BaseGameScene {
    constructor(sceneKey) {
        super(sceneKey);
        this.turnChangeHandlers = [];
    }

    init(data) {
        super.init(data);
        this.currentTurn = null;
    }

    /**
     * Register a callback to be invoked whenever turn changes
     * @param {(sessionId: string|null) => void} handler 
     */
    onTurnChange(handler) {
        this.turnChangeHandlers.push(handler);
    }

    /**
     * Update the current turn and notify handlers
     */
    setCurrentTurn(sessionId) {
        this.currentTurn = sessionId;
        this.turnChangeHandlers.forEach((fn) => {
            try {
                fn(sessionId);
            } catch (error) {
                console.warn('Turn change handler failed', error);
            }
        });
        this.handleTurnChanged(sessionId);
    }

    /**
     * Can be overridden by subclasses to react to turn changes
     */
    handleTurnChanged() {
        // No-op by default
    }

    /**
     * Utility to check if it's the local player's turn
     */
    isMyTurn() {
        return this.currentTurn && this.room && this.currentTurn === this.room.sessionId;
    }
}

