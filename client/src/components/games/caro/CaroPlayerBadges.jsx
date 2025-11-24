import React from 'react';

/**
 * Caro-specific player badges and role indicators
 * Pattern: Each game has its own folder with game-specific UI components
 */

// Role Badge - Displays player's game piece
export const CaroRoleBadge = ({ player }) => {
    if (typeof player.symbol === 'undefined') return null;

    const symbolConfig = {
        1: { icon: '✕', label: 'Piece X', color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/40' },
        2: { icon: '◯', label: 'Piece O', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/40' }
    };

    const config = symbolConfig[player.symbol];
    if (!config) return null;

    return (
        <span 
            className={`
                ${config.color} text-xs font-bold px-2 py-0.5 rounded-full
                ${config.bgColor} border ${config.borderColor}
                flex items-center gap-1
            `}
            title={config.label}
        >
            <span className="text-sm">{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
};

// Status Badge - Displays special status in game
export const CaroStatusBadge = ({ player, gameState, isMyTurn }) => {
    if (gameState !== 'playing') return null;

    if (isMyTurn) {
        return (
            <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                <span>Your Turn</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
            <span>Waiting</span>
        </div>
    );
};

// Extra Info - Additional information about player in Caro
export const CaroExtraInfo = ({ player }) => {
    // Can add statistics, scores, etc. here
    return null;
};

