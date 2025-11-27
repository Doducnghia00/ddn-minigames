/**
 * Shooter Game Configuration
 * Central place for all game balance and settings
 * 
 * Adjust these values to tune gameplay without modifying core logic
 */

const SHOOTER_CONFIG = {
    // ===== MATCH SETTINGS =====
    match: {
        scoreLimit: 15,              // Kills needed to win (default: 8)
        matchDuration: 300,         // Match duration in seconds (default: 120 = 2 minutes)
        patchRate: 16.67,           // State sync rate in ms (16.67 = 60 FPS)
        minPlayers: 2,              // Minimum players to start
        maxPlayers: 8,              // Maximum players in room
    },

    // ===== ARENA SETTINGS =====
    arena: {
        width: 800,                 // Arena width in pixels
        height: 600,                // Arena height in pixels
    },

    // ===== PLAYER SETTINGS =====
    player: {
        maxHealth: 100,             // Maximum player health
        startHealth: 100,           // Starting health (usually same as max)
        moveSpeed: 200,             // Movement speed (pixels/second)
        hitboxRadius: 20,           // Player collision radius
        respawnDelay: 3,            // Seconds before respawn after death
    },

    // ===== WEAPON SETTINGS =====
    weapon: {
        fireRate: 300,              // Milliseconds between shots (300ms = ~3.3 shots/sec)
        bulletSpeed: 400,           // Bullet travel speed (pixels/second)
        bulletDamage: 20,           // Damage per bullet hit
        bulletLifetime: 3,          // Max bullet lifetime in seconds
    },

    // ===== GAME BALANCE NOTES =====
    // 
    // Time to Kill (TTK):
    // - 100 HP / 20 damage = 5 shots to kill
    // - With 300ms fire rate = 1.5 seconds minimum TTK
    // 
    // Map Size:
    // - 800x600 = small arena for 2-8 players
    // - Encourages fast-paced combat
    // 
    // Bullet Speed vs Player Speed:
    // - Bullet: 400 px/s
    // - Player: 200 px/s
    // - Ratio: 2:1 (bullets twice as fast as players)
};

module.exports = { SHOOTER_CONFIG };

