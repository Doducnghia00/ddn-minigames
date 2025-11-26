const { ArraySchema, type } = require('@colyseus/schema');
const { FreeForAllRoomState } = require('../base/states/FreeForAllRoomState');
const { Bullet } = require('./Bullet');

/**
 * ShooterState - State for Arena Shooter game
 * Extends FreeForAllRoomState with bullets and arena configuration
 * 
 * Inherits from FreeForAllRoomState:
 * - players: Map of players
 * - matchTimer: Countdown timer
 * - scoreLimit: Win condition score
 * - maxPlayers: Maximum players
 * - gameState: 'waiting' | 'playing' | 'finished'
 * - winner: Session ID of winner
 * - roomOwner: Session ID of owner
 * 
 * Adds:
 * - Bullets collection
 * - Arena dimensions
 * - Game configuration
 */
class ShooterState extends FreeForAllRoomState {
    constructor() {
        super();

        // Active bullets in the arena
        this.bullets = new ArraySchema();

        // Arena configuration
        this.arenaWidth = 800;
        this.arenaHeight = 600;

        // Game configuration (can be customized per room)
        this.bulletSpeed = 400;         // Pixels per second
        this.playerSpeed = 200;         // Pixels per second
        this.fireRate = 300;            // Milliseconds between shots
        this.respawnDelay = 3;          // Seconds before respawn
    }
}

type([Bullet])(ShooterState.prototype, 'bullets');
type('number')(ShooterState.prototype, 'arenaWidth');
type('number')(ShooterState.prototype, 'arenaHeight');
type('number')(ShooterState.prototype, 'bulletSpeed');
type('number')(ShooterState.prototype, 'playerSpeed');
type('number')(ShooterState.prototype, 'fireRate');
type('number')(ShooterState.prototype, 'respawnDelay');

module.exports = { ShooterState };
