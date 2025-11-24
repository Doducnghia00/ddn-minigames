import React from 'react';

/**
 * PlayerCard - Component for displaying player information
 * Supports game-specific badges, roles, and status indicators
 * Pattern similar to Y8/CrazyGames: each game can customize player display
 */
const PlayerCard = ({ 
    player, 
    isOwner, 
    isCurrentUser, 
    currentTurn,
    gameState,
    onKick,
    renderRoleBadge,
    renderStatusBadge,
    renderExtraInfo
}) => {
    const isMyTurn = currentTurn === player.id && gameState === 'playing';
    const isActive = gameState === 'playing' && isMyTurn;

    return (
        <div
            className={`
                flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg 
                backdrop-blur-sm border transition-all duration-200
                ${isActive 
                    ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/20' 
                    : 'border-slate-700/50'
                }
                ${isCurrentUser ? 'ring-2 ring-blue-500/30' : ''}
            `}
        >
            {/* Avatar */}
            {player.avatar ? (
                <img
                    src={player.avatar}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border-2 border-slate-600"
                    alt={player.name}
                />
            ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-slate-600">
                    <span className="text-white font-bold text-sm">
                        {player.name[0]?.toUpperCase()}
                    </span>
                </div>
            )}

            {/* Player Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Name */}
                    <span className="text-white font-semibold truncate">
                        {player.name}
                        {isCurrentUser && <span className="text-blue-400 ml-1">(You)</span>}
                    </span>

                    {/* Owner Badge */}
                    {isOwner && (
                        <span 
                            className="text-yellow-500 text-xs font-bold px-1.5 py-0.5 bg-yellow-500/20 rounded"
                            title="Room Owner"
                        >
                            👑
                        </span>
                    )}

                    {/* Ready Badge */}
                    {player.isReady && gameState !== 'playing' && (
                        <span 
                            className="text-emerald-400 text-xs font-bold px-1.5 py-0.5 bg-emerald-500/20 rounded"
                            title="Ready"
                        >
                            ✓
                        </span>
                    )}

                    {/* Turn Indicator */}
                    {isMyTurn && (
                        <span 
                            className="text-green-400 text-xs font-bold px-1.5 py-0.5 bg-green-500/20 rounded animate-pulse"
                            title="Your Turn"
                        >
                            🎮
                        </span>
                    )}

                    {/* Game-specific Role Badge */}
                    {renderRoleBadge && renderRoleBadge(player)}
                </div>

                {/* Game-specific Extra Info */}
                {renderExtraInfo && (
                    <div className="mt-1">
                        {renderExtraInfo(player)}
                    </div>
                )}

                {/* Game-specific Status Badge */}
                {renderStatusBadge && (
                    <div className="mt-1">
                        {renderStatusBadge(player, { isMyTurn, gameState })}
                    </div>
                )}
            </div>

            {/* Kick Button (Owner only) */}
            {onKick && isOwner && !isCurrentUser && (
                <button
                    onClick={() => onKick(player.id)}
                    className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded transition"
                    title="Remove player from room"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default PlayerCard;

