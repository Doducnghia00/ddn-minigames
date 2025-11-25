/**
 * Caro Game Configuration
 * 
 * Defines all metadata and settings for the Caro (5-in-a-row) game
 */

export const CARO_CONFIG = {
    // Game identification
    id: 'caro',
    name: 'Caro (5-in-a-row)',
    description: 'Classic strategy game where players try to get 5 marks in a row',

    // Player requirements
    minPlayers: 2,
    maxPlayers: 2,

    // Phaser configuration
    phaserConfig: {
        width: 800,
        height: 600,
        backgroundColor: '#111827'
    },

    // Game-specific rules
    rules: {
        boardSize: 15,
        cellSize: 40,
        winCondition: 5  // Number of marks in a row to win
    }
};
