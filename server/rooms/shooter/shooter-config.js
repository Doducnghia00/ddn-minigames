/**
 * Shooter Game Configuration
 * 
 * This file contains:
 * 1. SHOOTER_CONFIG: Default game configuration values
 * 2. SHOOTER_CUSTOMIZABLE_SETTINGS: Metadata for host-customizable settings
 * 
 * @module shooter-config
 */

/**
 * Default Shooter Game Configuration
 * 
 * These are the default values used when creating a new room.
 * Some of these can be customized by room host (see SHOOTER_CUSTOMIZABLE_SETTINGS).
 * 
 * @type {Object}
 */
const SHOOTER_CONFIG = {
    // ===== MATCH SETTINGS =====
    match: {
        scoreLimit: 5,              // Kills needed to win (default: 8)
        matchDuration: 300,         // Match duration in seconds (default: 120 = 2 minutes)
        patchRate: 16.67,           // 60 FPS - WORKAROUND for stutter issue (see docs/ISSUE-stuttering-investigation.md)
                                    // Ideally should be 33.33 (30 FPS) for bandwidth, but causes stutter on high refresh monitors
        minPlayers: 2,              // Minimum players to start
        maxPlayers: 8,              // Maximum players in room
    },

    // ===== ARENA SETTINGS =====
    arena: {
        width: 800,                 // Arena width in pixels
        height: 800,                // Arena height in pixels
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
        fireRate: 800,              // Milliseconds between shots (300ms = ~3.3 shots/sec)
        bulletSpeed: 500,           // Bullet travel speed (pixels/second)
        bulletDamage: 25,           // Damage per bullet hit
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
}

/**
 * Customizable Settings Metadata
 * 
 * Defines which settings can be customized by room host and their constraints.
 * Settings NOT listed here are locked (server-controlled) and cannot be changed by users.
 * 
 * LOCKED settings (cannot be customized):
 * - match.minPlayers, match.maxPlayers: Game-specific, defines lobby behavior
 * - match.patchRate: Server performance setting
 * - arena.width, arena.height: Client already initialized canvas with these
 * - player.maxHealth, player.hitboxRadius: Core game mechanics
 * - weapon.bulletLifetime: Auto-calculated from arena size
 */
const SHOOTER_CUSTOMIZABLE_SETTINGS = {
    scoreLimit: {
        path: 'match.scoreLimit',
        min: 5,
        max: 50,
        step: 5,
        default: 5,
        editable: true,
        label: 'Score Limit',
        description: 'Kills needed to win the match',
        category: 'victory',
        unit: 'kills'
    },

    matchDuration: {
        path: 'match.matchDuration',
        min: 120,
        max: 600,
        step: 60,
        default: 300,
        editable: true,
        label: 'Match Duration',
        description: 'Time limit for the match',
        category: 'match',
        unit: 'seconds',
        format: (v) => `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`
    },

    moveSpeed: {
        path: 'player.moveSpeed',
        min: 150,
        max: 300,
        step: 10,
        default: 200,
        editable: true,
        label: 'Player Speed',
        description: 'How fast players move',
        category: 'movement',
        unit: 'px/s'
    },

    respawnDelay: {
        path: 'player.respawnDelay',
        min: 1,
        max: 10,
        step: 1,
        default: 3,
        editable: true,
        label: 'Respawn Delay',
        description: 'Seconds before respawning after death',
        category: 'gameplay',
        unit: 'seconds'
    },

    fireRate: {
        path: 'weapon.fireRate',
        min: 100,
        max: 1000,
        step: 50,
        default: 800,
        editable: true,
        label: 'Fire Rate',
        description: 'Time between shots (lower = faster)',
        category: 'combat',
        unit: 'ms'
    },

    bulletSpeed: {
        path: 'weapon.bulletSpeed',
        min: 200,
        max: 800,
        step: 50,
        default: 500,
        editable: true,
        label: 'Bullet Speed',
        description: 'How fast bullets travel',
        category: 'combat',
        unit: 'px/s'
    },

    bulletDamage: {
        path: 'weapon.bulletDamage',
        min: 10,
        max: 50,
        step: 5,
        default: 25,
        editable: true,
        label: 'Bullet Damage',
        description: 'Damage per bullet hit',
        category: 'combat',
        unit: 'HP'
    },
};

module.exports = { 
    SHOOTER_CONFIG,
    SHOOTER_CUSTOMIZABLE_SETTINGS 
};

