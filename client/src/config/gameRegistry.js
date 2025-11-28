/**
 * Game Registry - Dynamic Loading from Server
 * 
 * PHASE 2 REFACTOR:
 * - Game list now fetched from server API (single source of truth)
 * - Scene mappings and Phaser configs remain client-side (build-time)
 * - Registry initialized on app load
 */

import Phaser from 'phaser';
import { CaroScene } from '../games/caro/CaroScene';
import { TestFFAScene } from '../games/test-ffa/TestFFAScene';
import { ShooterScene } from '../games/shooter/ShooterScene';
import { fetchAvailableGames } from '../services/gameService';

// ===== SCENE MAPPING (Static - must know at build time) =====
const SCENE_MAP = {
    'caro': CaroScene,
    'test-ffa': TestFFAScene,
    'shooter': ShooterScene
};

// ===== PHASER CONFIG TEMPLATES (Client-specific) =====
// These are rendering configs, not gameplay configs
const PHASER_CONFIG_TEMPLATES = {
    'caro': (width, height) => ({
        type: Phaser.AUTO,
        width: width,
        height: height,
        backgroundColor: '#1a1a2e'
    }),
    
    'test-ffa': (width, height) => ({
        type: Phaser.AUTO,
        width: width,
        height: height,
        backgroundColor: '#1a1a2e',
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: false }
        }
    }),
    
    'shooter': (width, height) => ({
        type: Phaser.AUTO,
        width: width,
        height: height,
        backgroundColor: '#1a1a2e',
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: false }
        }
    })
};

// ===== DYNAMIC REGISTRY =====
let GAME_REGISTRY = null;
let loadingPromise = null;

/**
 * Initialize game registry from server
 * @returns {Promise<Object>} Loaded game registry
 */
export async function initGameRegistry() {
    // Prevent duplicate fetches
    if (loadingPromise) {
        return loadingPromise;
    }
    
    loadingPromise = (async () => {
        const games = await fetchAvailableGames();
        
        if (games.length === 0) {
            console.error('[GameRegistry] No games available from server');
            throw new Error('No games available');
        }
        
        GAME_REGISTRY = {};
        
        for (const game of games) {
            console.log('[GameRegistry] Game:', game);
            const scene = SCENE_MAP[game.id];
            if (!scene) {
                console.warn(`[GameRegistry] Scene not found for game: ${game.id}, skipping`);
                continue;
            }
            
            const phaserConfigTemplate = PHASER_CONFIG_TEMPLATES[game.id];
            if (!phaserConfigTemplate) {
                console.warn(`[GameRegistry] Phaser config not found for game: ${game.id}, using defaults`);
            }
            
            GAME_REGISTRY[game.id] = {
                // From server
                id: game.id,
                name: game.name,
                description: game.description,
                minPlayers: game.minPlayers,
                maxPlayers: game.maxPlayers,
                
                // Client-side scene and config
                scene: scene,
                scenes: [scene],
                phaserConfig: phaserConfigTemplate 
                    ? phaserConfigTemplate(game.uiConfig.arenaWidth, game.uiConfig.arenaHeight)
                    : { type: Phaser.AUTO, width: 800, height: 600 },
                
                // Lobby UI (from server)
                lobby: {
                    emoji: game.emoji,
                    accent: game.accent,
                    status: game.status
                },
                
                // Room creation defaults
                createRoomDefaults: (user) => ({
                    roomName: `${user?.name || user?.email || 'Player'}'s ${game.name}`,
                    password: ''
                })
            };
        }
        
        console.log(`[GameRegistry] Initialized with ${Object.keys(GAME_REGISTRY).length} games`);
        return GAME_REGISTRY;
    })();
    
    return loadingPromise;
}

export const DEFAULT_GAME_ID = 'shooter'; // Fallback if registry not ready

/**
 * Get game configuration by ID
 * @param {string} gameId - The game identifier
 * @returns {object} Game configuration object
 */
export function getGameConfig(gameId) {
    if (!GAME_REGISTRY) {
        console.error('[GameRegistry] Registry not initialized');
        return null;
    }
    
    const config = GAME_REGISTRY[gameId];
    
    if (!config) {
        console.warn(`Game '${gameId}' not found in registry, trying fallback`);
        // Return first available game as fallback
        const fallbackId = Object.keys(GAME_REGISTRY)[0];
        return GAME_REGISTRY[fallbackId];
    }
    
    return config;
}

/**
 * Get list of all available game IDs
 * @returns {string[]} Array of game IDs
 */
export function getAvailableGames() {
    if (!GAME_REGISTRY) {
        return [];
    }
    return Object.keys(GAME_REGISTRY);
}

/**
 * Returns full game definitions for UI listings
 */
export function getGameDefinitions() {
    if (!GAME_REGISTRY) {
        return [];
    }
    return Object.values(GAME_REGISTRY);
}
