/**
 * Caro Game Configuration
 * Central place for all game balance and settings
 * 
 * Adjust these values to tune gameplay without modifying core logic
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

    // ===== RENDER SETTINGS (Client-side reference) =====
    render: {
        cellSize: 40,               // Default cell size in pixels
        canvasWidth: 800,           // Canvas width // TODO: Kiểm tra, vô dụng vì bị trùng với game-registry.js
        canvasHeight: 600,          // Canvas height // TODO: Kiểm tra, vô dụng vì bị trùng với game-registry.js
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

module.exports = { CARO_CONFIG };

