/**
 * Server Game Registry - Single Source of Truth
 * 
 * Each game entry contains:
 * - enabled: Can be toggled to hide/show game
 * - roomClass: Colyseus room class reference
 * - config: Full game config (from game-specific config file)
 * - metadata: UI metadata for lobby display
 */

const { ShooterRoom } = require('../rooms/shooter/ShooterRoom');
const { SHOOTER_CONFIG } = require('../rooms/shooter/shooter-config');
const { CaroRoom } = require('../rooms/caro/CaroRoom');
const { TestFFARoom } = require('../rooms/test-ffa/TestFFARoom');

const GAME_REGISTRY = {
    shooter: {
        id: 'shooter',
        enabled: true,
        
        // Colyseus room configuration
        roomClass: ShooterRoom,
        roomName: 'shooter',
        
        // Full game config (gameplay + balance)
        config: SHOOTER_CONFIG,
        
        // UI Metadata (for lobby display)
        metadata: {
            name: 'Arena Shooter',
            description: 'Top-down multiplayer shooter - Dominate the arena!',
            emoji: '🔫',
            accent: 'red',
            status: 'Active'
        }
    },
    
    caro: {
        id: 'caro',
        enabled: true,
        roomClass: CaroRoom,
        roomName: 'caro',
        config: {
            match: { minPlayers: 2, maxPlayers: 2 },
            arena: { width: 800, height: 600 }
        },
        metadata: {
            name: 'Caro Online',
            description: 'Classic 5-in-a-row board game',
            emoji: '⭕❌',
            accent: 'green',
            status: 'Active'
        }
    },
    
    'test-ffa': {
        id: 'test-ffa',
        enabled: true,
        roomClass: TestFFARoom,
        roomName: 'test-ffa',
        config: {
            match: { minPlayers: 2, maxPlayers: 8 },
            arena: { width: 800, height: 600 }
        },
        metadata: {
            name: 'Test FFA',
            description: 'Testing Free-For-All game mode',
            emoji: '🧪',
            accent: 'blue',
            status: 'Test'
        }
    }
};

/**
 * Get all enabled games
 */
function getEnabledGames() {
    return Object.values(GAME_REGISTRY).filter(game => game.enabled);
}

/**
 * Get game by ID
 */
function getGame(gameId) {
    return GAME_REGISTRY[gameId];
}

module.exports = { 
    GAME_REGISTRY,
    getEnabledGames,
    getGame
};
