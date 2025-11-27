const { ArraySchema, type } = require('@colyseus/schema');
const { FreeForAllRoomState } = require('../base/states/FreeForAllRoomState');
const { Bullet } = require('./Bullet');
const { SHOOTER_CONFIG } = require('./shooter-config');

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
 * 
 * Note: players field is inherited from BaseRoomState and uses base Player type by default
 * ShooterPlayer type is enforced by ShooterRoom.createPlayer() method
 */
class ShooterState extends FreeForAllRoomState {
    constructor() {
        super();

        // Active bullets in the arena
        this.bullets = new ArraySchema();

        // Arena configuration
        this.arenaWidth = SHOOTER_CONFIG.arena.width;
        this.arenaHeight = SHOOTER_CONFIG.arena.height;

        // Game configuration (loaded from config)
        this.bulletSpeed = SHOOTER_CONFIG.weapon.bulletSpeed;
        this.playerSpeed = SHOOTER_CONFIG.player.moveSpeed;
        this.fireRate = SHOOTER_CONFIG.weapon.fireRate;
        this.respawnDelay = SHOOTER_CONFIG.player.respawnDelay;
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
