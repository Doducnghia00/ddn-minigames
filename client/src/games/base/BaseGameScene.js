import Phaser from 'phaser';

/**
 * BaseGameScene - Abstract base class for all game scenes
 * 
 * Provides common functionality that all games need:
 * - Room connection management
 * - User and player state
 * - Cleanup lifecycle
 * 
 * Subclasses must implement:
 * - setupRoomEvents(): Game-specific room event handlers
 * - createGameUI(): Game-specific UI elements
 */
export class BaseGameScene extends Phaser.Scene {
    constructor(sceneKey) {
        super(sceneKey);
    }

    /**
     * Initialize common game state
     * Subclasses should call super.init(data) first, then add game-specific init
     */
    init(data) {
        this.room = null;
        this.user = data?.user || null;
        this.players = new Map();
        this.gameState = 'waiting';
        this.currentTurn = null;
        this.roomOwner = null;
    }

    /**
     * Set the Colyseus room and setup event listeners
     * Called by GamePage after scene is created
     */
    setRoom(room) {
        this.room = room;
        if (this.room) {
            this.setupRoomEvents();
        }
    }

    /**
     * Setup room event listeners
     * MUST be implemented by subclasses
     */
    setupRoomEvents() {
        throw new Error('setupRoomEvents() must be implemented by subclass');
    }

    /**
     * Create game-specific UI elements
     * MUST be implemented by subclasses
     */
    createGameUI() {
        throw new Error('createGameUI() must be implemented by subclass');
    }

    /**
     * Cleanup resources when scene is destroyed
     * Subclasses can override to add custom cleanup, but should call super.cleanup()
     */
    cleanup() {
        if (this.room) {
            this.room.removeAllListeners();
        }
    }

    /**
     * Called when scene is shut down
     * Triggers cleanup automatically
     */
    shutdown() {
        this.cleanup();
    }
}
