/**
 * Caro Game Configuration
 * 
 * This file contains:
 * 1. CARO_CONFIG: Default game configuration values
 * 2. CARO_CUSTOMIZABLE_SETTINGS: Metadata for host-customizable settings
 * 
 * @module caro-config
 */

/**
 * Default Caro Game Configuration
 * 
 * These are the default values used when creating a new room.
 * Some of these can be customized by room host (see CARO_CUSTOMIZABLE_SETTINGS).
 * 
 * @type {Object}
 */
const CARO_CONFIG = {
    // ===== BOARD SETTINGS =====
    board: {
        size: 15,                   // Board width/height (10-20)
        winCondition: 5,            // Consecutive marks to win (4-6)
    },

    // ===== TURN SETTINGS =====
    turn: {
        timeLimit: 0,               // Seconds per turn (0 = unlimited)
        allowUndo: false,           // Can player undo last move (future feature)
    },

    // ===== MATCH SETTINGS =====
    match: {
        minPlayers: 2,              // Always 2 for Caro
        maxPlayers: 2,              // Always 2 for Caro
    },

    // ===== ARENA SETTINGS =====
    arena: {
        width: 800,                 // Arena width in pixels (square for board game)
        height: 800,                // Arena height in pixels
    },

    // ===== GAME BALANCE NOTES =====
    // 
    // Board Sizes:
    // - 10x10: Quick game (~5-10 minutes)
    // - 15x15: Standard (default - classic Gomoku)
    // - 20x20: Long game (~20-30 minutes)
    //
    // Win Conditions:
    // - 4 in a row: Easier, faster games
    // - 5 in a row: Standard (classic Gomoku/Caro)
    // - 6 in a row: Harder, longer games
    //
    // Notes:
    // - Win condition should be <= board size / 2 for playability
    // - Larger boards need more strategic thinking
};

// Helper: Calculate total cell count
CARO_CONFIG.board.cellCount = CARO_CONFIG.board.size * CARO_CONFIG.board.size;

/**
 * Customizable Settings Metadata
 * 
 * Defines which settings can be customized by room host and their constraints.
 * Settings NOT listed here are locked (server-controlled) and cannot be changed by users.
 * 
 * LOCKED settings (cannot be customized):
 * - match.minPlayers, match.maxPlayers: Game-specific (always 2 for Caro)
 * - arena.width, arena.height: Client already initialized canvas with these
 */
const CARO_CUSTOMIZABLE_SETTINGS = {
    boardSize: {
        path: 'board.size',
        min: 10,
        max: 20,
        step: 1,
        default: 15,
        editable: true,
        label: 'Board Size',
        description: 'Width and height of the game board',
        category: 'board',
        unit: 'cells'
    },

    winCondition: {
        path: 'board.winCondition',
        min: 4,
        max: 6,
        step: 1,
        default: 5,
        editable: true,
        label: 'Win Condition',
        description: 'Consecutive marks needed to win',
        category: 'rules',
        unit: 'in a row'
    },

    timePerTurn: {
        path: 'turn.timeLimit',
        min: 0,
        max: 120,
        step: 5,
        default: 0,
        editable: true,
        label: 'Time Per Turn',
        description: 'Seconds per turn (0 = unlimited)',
        category: 'timing',
        unit: 'seconds'
    },
};

module.exports = { 
    CARO_CONFIG,
    CARO_CUSTOMIZABLE_SETTINGS 
};

