/**
 * Game Registry
 * 
 * Central registry for all available games.
 * Maps game IDs to their scenes and configurations.
 * 
 * To add a new game:
 * 1. Import the scene and config
 * 2. Add an entry to GAME_REGISTRY
 * 3. That's it! No other files need changes.
 */

import { CaroScene } from '../games/caro/CaroScene';
import { CARO_CONFIG } from '../games/caro/config';
import { TestFFAScene } from '../games/test-ffa/TestFFAScene';
import { TEST_FFA_CONFIG } from '../games/test-ffa/config';

/**
 * Registry of all available games
 * Key: game ID (used in room metadata)
 * Value: game configuration object
 */
export const GAME_REGISTRY = {
    caro: {
        id: CARO_CONFIG.id,
        name: CARO_CONFIG.name,
        description: CARO_CONFIG.description,
        scene: CaroScene,
        scenes: [CaroScene],
        phaserConfig: CARO_CONFIG.phaserConfig,
        minPlayers: CARO_CONFIG.minPlayers,
        maxPlayers: CARO_CONFIG.maxPlayers,
        lobby: {
            status: 'Active',
            emoji: '⭕❌',
            accent: 'green'
        },
        createRoomDefaults: (user) => ({
            roomName: `${user?.name || user?.email || 'Player'}'s Room`,
            password: ''
        })
    },
    'test-ffa': {
        id: TEST_FFA_CONFIG.id,
        name: TEST_FFA_CONFIG.name,
        description: TEST_FFA_CONFIG.description,
        scene: TestFFAScene,
        scenes: [TestFFAScene],
        phaserConfig: TEST_FFA_CONFIG.phaserConfig,
        minPlayers: TEST_FFA_CONFIG.minPlayers,
        maxPlayers: TEST_FFA_CONFIG.maxPlayers,
        lobby: {
            status: 'Test',
            emoji: '🧪',
            accent: 'blue'
        },
        createRoomDefaults: (user) => ({
            roomName: `${user?.name || 'Player'}'s Test Room`,
            password: ''
        })
    }
    // Future games can be added here...
};

export const DEFAULT_GAME_ID = Object.keys(GAME_REGISTRY)[0];

/**
 * Get game configuration by ID
 * @param {string} gameId - The game identifier
 * @returns {object} Game configuration object
 */
export function getGameConfig(gameId) {
    const fallbackId = DEFAULT_GAME_ID;
    const config = GAME_REGISTRY[gameId];

    if (!config) {
        console.warn(`Game '${gameId}' not found in registry, falling back to '${fallbackId}'`);
        return GAME_REGISTRY[fallbackId];
    }

    return config;
}

/**
 * Get list of all available game IDs
 * @returns {string[]} Array of game IDs
 */
export function getAvailableGames() {
    return Object.keys(GAME_REGISTRY);
}

/**
 * Returns full game definitions for UI listings
 */
export function getGameDefinitions() {
    return Object.values(GAME_REGISTRY);
}
