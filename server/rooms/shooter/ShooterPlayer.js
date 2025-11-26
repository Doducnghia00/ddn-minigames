const { FFAPlayer } = require('../base/players/FreeForAllPlayer');
const { type } = require('@colyseus/schema');

/**
 * ShooterPlayer - Player schema for Arena Shooter game
 * Extends FFAPlayer with position, rotation, and health
 * 
 * Inherits from FFAPlayer:
 * - score: Total points
 * - kills: Number of kills
 * - deaths: Number of deaths
 * 
 * Adds:
 * - Position and movement
 * - Health and combat status
 * - Weapon timing
 */
class ShooterPlayer extends FFAPlayer {
    constructor() {
        super(); // Inherits: id, name, avatar, isOwner, isReady, score, kills, deaths

        // Position & Movement
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotation = 0;  // Radians, direction player is facing/aiming

        // Combat
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;

        // Weapon
        this.lastFireTime = 0;  // Server timestamp of last shot
    }
}

// Type definitions for Colyseus schema
type('number')(ShooterPlayer.prototype, 'x');
type('number')(ShooterPlayer.prototype, 'y');
type('number')(ShooterPlayer.prototype, 'velocityX');
type('number')(ShooterPlayer.prototype, 'velocityY');
type('number')(ShooterPlayer.prototype, 'rotation');
type('number')(ShooterPlayer.prototype, 'health');
type('number')(ShooterPlayer.prototype, 'maxHealth');
type('boolean')(ShooterPlayer.prototype, 'isAlive');
type('number')(ShooterPlayer.prototype, 'lastFireTime');

module.exports = { ShooterPlayer };
