const { Schema, type } = require('@colyseus/schema');

/**
 * Bullet - Projectile schema for Shooter game
 * Represents a bullet fired by a player
 */
class Bullet extends Schema {
    constructor() {
        super();
        this.id = '';           // Unique identifier
        this.x = 0;             // Current X position
        this.y = 0;             // Current Y position
        this.velocityX = 0;     // X velocity (pixels/second)
        this.velocityY = 0;     // Y velocity (pixels/second)
        this.rotation = 0;      // Visual rotation (radians)
        this.ownerId = '';      // Session ID of player who fired
        this.damage = 20;       // Damage dealt on hit
        this.lifetime = 3;      // Max lifetime in seconds
        this.createdAt = 0;     // Server timestamp (seconds)
    }
}

type('string')(Bullet.prototype, 'id');
type('number')(Bullet.prototype, 'x');
type('number')(Bullet.prototype, 'y');
type('number')(Bullet.prototype, 'velocityX');
type('number')(Bullet.prototype, 'velocityY');
type('number')(Bullet.prototype, 'rotation');
type('string')(Bullet.prototype, 'ownerId');
type('number')(Bullet.prototype, 'damage');
type('number')(Bullet.prototype, 'lifetime');
type('number')(Bullet.prototype, 'createdAt');

module.exports = { Bullet };
