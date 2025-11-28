import React from 'react';

/**
 * Shooter-specific player badges - hiển thị trong PlayerCard sidebar
 * Đây là DUY NHẤT phần React UI cần thêm cho Shooter
 */

// Role Badge - Hiển thị K/D ratio
export const ShooterRoleBadge = ({ player, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    if (!fullPlayer) return null;

    const hasStats = fullPlayer.kills > 0 || fullPlayer.deaths > 0;
    if (!hasStats) return null;

    const kd = fullPlayer.deaths > 0 
        ? (fullPlayer.kills / fullPlayer.deaths).toFixed(2) 
        : fullPlayer.kills;

    return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full
            bg-purple-500/20 border border-purple-500/40 text-purple-400
            flex items-center gap-1"
            title={`K/D Ratio: ${kd}`}>
            <span>⚔️</span>
            <span>{kd} K/D</span>
        </span>
    );
};

// Status Badge - Ready/Alive/Dead status
export const ShooterStatusBadge = ({ player, gameState, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    if (!fullPlayer) return null;

    // Waiting state
    if (gameState === 'waiting') {
        if (player.isReady) {
            return (
                <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    <span>Ready for Battle</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                <span>Not Ready</span>
            </div>
        );
    }

    // Playing state - alive/dead
    if (gameState === 'playing') {
        if (fullPlayer.isAlive) {
            return (
                <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    <span>Alive</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    <span>Respawning...</span>
                </div>
            );
        }
    }

    // Finished state - không hiển thị alive/dead status nữa
    // (server đã reset isAlive = true cho tất cả players)
    if (gameState === 'finished') {
        return null;
    }

    return null;
};

// Extra Info - Stats during/after game
export const ShooterExtraInfo = ({ player, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    if (!fullPlayer) return null;

    const gameState = currentRoom?.state?.gameState;

    // Chỉ hiển thị khi playing hoặc finished
    if (gameState === 'playing' || gameState === 'finished') {
        return (
            <div className="flex items-center gap-3 text-xs mt-1">
                {/* Score */}
                <div className="flex items-center gap-1">
                    <span className="text-yellow-400">🏆</span>
                    <span className="text-white font-bold">{fullPlayer.score || 0}</span>
                </div>
                
                {/* Kills */}
                <div className="flex items-center gap-1">
                    <span className="text-green-400">⚔️</span>
                    <span className="text-green-300 font-bold">{fullPlayer.kills || 0}</span>
                </div>
                
                {/* Deaths */}
                <div className="flex items-center gap-1">
                    <span className="text-red-400">💀</span>
                    <span className="text-red-300 font-bold">{fullPlayer.deaths || 0}</span>
                </div>

                {/* Health (nếu đang chơi và còn sống) */}
                {gameState === 'playing' && fullPlayer.isAlive && (
                    <div className="flex items-center gap-1">
                        <span className="text-blue-400">❤️</span>
                        <span className="text-blue-300 font-bold">{fullPlayer.health || 0}</span>
                    </div>
                )}
            </div>
        );
    }

    return null;
};

