import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { getGameConfig } from '../config/gameRegistry';
import { getMergedGameProfile } from '../config/gameProfiles';
import PlayerCard from '../components/games/PlayerCard';
import Modal from '../components/ui/Modal';

const GamePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentRoom, leaveRoom, roomData } = useGame();
    const gameRef = useRef(null);
    const phaserGameRef = useRef(null);
    const kickedMessageRef = useRef(null);
    const hasNavigatedRef = useRef(false);

    const [players, setPlayers] = useState(new Map());
    const [gameState, setGameState] = useState('waiting');
    const [roomName, setRoomName] = useState('Game Room');
    const [roomOwner, setRoomOwner] = useState(null);
    const [currentTurn, setCurrentTurn] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [readyCount, setReadyCount] = useState(0);
    const [kickModal, setKickModal] = useState({ isOpen: false, message: '' });

    useEffect(() => {
        hasNavigatedRef.current = false;
    }, [currentRoom]);

    const redirectToLobby = useCallback(() => {
        if (hasNavigatedRef.current) return;
        hasNavigatedRef.current = true;
        navigate('/lobby');
    }, [navigate]);

    const activeGameId = roomData?.gameId || currentRoom?.metadata?.gameId || 'default';
    const gameProfile = getMergedGameProfile(activeGameId);
    const { statusTexts, readyLabel: readyIdleLabel, minPlayers, components, behaviors } = gameProfile;
    const { RoleBadge, StatusBadge, ExtraInfo } = components;
    const {
        turnBased: isTurnBased = false,
        readyStrategy = 'allPlayers',
        allowKicks = true
    } = behaviors || {};

    useEffect(() => {
        if (roomData?.roomName) {
            setRoomName(roomData.roomName);
        } else if (currentRoom?.metadata?.roomName) {
            setRoomName(currentRoom.metadata.roomName);
        }
    }, [currentRoom, roomData]);

    useEffect(() => {
        if (!currentRoom) {
            redirectToLobby();
            return;
        }

        if (phaserGameRef.current) {
            console.log("Phaser game already initialized, skipping...");
        } else {
            // Get game configuration dynamically
            const SYSTEM_FALLBACK_GAME_ID = DEFAULT_GAME_ID || Object.keys(GAME_REGISTRY)[0];
            const gameId = roomData?.gameId || currentRoom?.metadata?.gameId || SYSTEM_FALLBACK_GAME_ID;
            const gameConfig = getGameConfig(gameId);

            console.log(`Initializing game: ${gameId}`, gameConfig);

            const config = {
                type: Phaser.AUTO,
                ...gameConfig.phaserConfig,  // Dynamic config from registry
                parent: gameRef.current,
                dom: {
                    createContainer: true
                },
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 0 },
                        debug: false
                    }
                },
                scene: [gameConfig.scene]  // Dynamic scene from registry
            };

            phaserGameRef.current = new Phaser.Game(config);
        }

        const timeoutId = setTimeout(() => {
            if (!phaserGameRef.current) return;

            const scene = phaserGameRef.current.scene.scenes[0];
            if (scene) {
                scene.user = user;
                console.log("Setting room in scene:", currentRoom.sessionId);
                if (scene.setRoom) {
                    scene.setRoom(currentRoom);
                }
            }
        }, 100);

        currentRoom.onMessage("kicked", (payload) => {
            kickedMessageRef.current = payload?.message || 'You have been removed from the room by the host.';
        });

        currentRoom.onLeave((code) => {
            // Only show kick modal if code is 4000 (kick) AND we have a kick message
            // This prevents showing modal when user voluntarily leaves
            if (code === 4000 && kickedMessageRef.current) {
                setKickModal({
                    isOpen: true,
                    message: kickedMessageRef.current
                });
            } else {
                // Normal leave - just redirect without modal
                leaveRoom({ skipRemote: true });
                redirectToLobby();
            }
        });

        currentRoom.onStateChange((state) => {
            const playerMap = new Map();
            state.players.forEach((player, id) => {
                playerMap.set(id, {
                    id: player.id,
                    name: player.name,
                    avatar: player.avatar,
                    symbol: player.symbol,
                    isOwner: player.isOwner,
                    isReady: player.isReady
                });
            });
            setPlayers(playerMap);
            setRoomOwner(state.roomOwner);
            setCurrentTurn(isTurnBased ? (state.currentTurn || null) : null);

            const readyPlayers = Array.from(playerMap.values()).filter((p) => p.isReady).length;
            setReadyCount(readyPlayers);
            const me = playerMap.get(currentRoom.sessionId);
            setIsReady(!!me?.isReady);
            setGameState(state.gameState);
        });

        return () => {
            clearTimeout(timeoutId);
            if (phaserGameRef.current) {
                console.log("Destroying Phaser game instance");

                // Clean up DOM elements before destroying Phaser
                const scene = phaserGameRef.current.scene.scenes[0];
                if (scene && scene.cleanup) {
                    scene.cleanup();
                }

                phaserGameRef.current.destroy(true);
                phaserGameRef.current = null;
            }
        };
    }, [currentRoom, user, leaveRoom, redirectToLobby, isTurnBased]);

    const handleLeave = () => {
        leaveRoom();
        redirectToLobby();
    };

    const handleKick = (playerId) => {
        if (currentRoom) {
            currentRoom.send('kick_player', { targetId: playerId });
        }
    };

    const handleToggleReady = () => {
        if (!currentRoom || gameState === 'playing') return;
        currentRoom.send('toggle_ready', { ready: !isReady });
    };

    const handleStartMatch = () => {
        if (!currentRoom) return;
        currentRoom.send('start_match');
    };

    const handleCloseKickModal = () => {
        setKickModal({ isOpen: false, message: '' });
        kickedMessageRef.current = null;
        leaveRoom({ skipRemote: true });
        redirectToLobby();
    };

    const totalPlayers = players.size;
    const readinessTarget = readyStrategy === 'allPlayers'
        ? Math.max(totalPlayers, 1)
        : Math.max(minPlayers, 1);
    const hasEnoughPlayers = totalPlayers >= minPlayers;
    const everyoneReady = (() => {
        switch (readyStrategy) {
            case 'minPlayers':
                return hasEnoughPlayers;
            case 'allPlayers':
            default:
                return totalPlayers > 0 && readyCount === totalPlayers;
        }
    })();
    const canStartMatch = currentRoom?.sessionId === roomOwner && gameState !== 'playing' && everyoneReady;
    const canKickPlayers = allowKicks && currentRoom?.sessionId === roomOwner;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Game Header */}
                <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 animate-slide-down">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                        <div className="glass-effect rounded-xl px-6 py-3 shadow-lg">
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Room</div>
                            <div className="text-lg font-bold text-white flex items-center gap-2">
                                <span>{roomName}</span>
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Live</span>
                            </div>
                        </div>

                        {/* Game Status Badge */}
                        <div className="glass-effect rounded-xl px-6 py-3 shadow-lg">
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Status</div>
                            <div className="text-lg font-bold flex items-center gap-2">
                                {gameState === 'waiting' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                        <span className="text-yellow-400">{statusTexts.waiting}</span>
                                    </>
                                ) : gameState === 'playing' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-green-400">{statusTexts.playing}</span>
                                    </>
                                ) : gameState === 'finished' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        <span className="text-purple-400">{statusTexts.finished}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                        <span className="text-gray-400">⚪ Loading...</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 glass-effect rounded-xl px-4 py-3 shadow-lg w-full sm:w-auto">
                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Queue</div>
                        <div className="text-sm text-gray-300">
                            Ready: <span className="text-white font-semibold">{readyCount}/{readinessTarget}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                            Target: {readyStrategy === 'allPlayers' ? 'Everyone ready' : `${minPlayers}+ players`}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={handleToggleReady}
                                disabled={gameState === 'playing' || totalPlayers === 0}
                                className={`px-4 py-2 rounded-lg font-semibold transition ${isReady
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                    : 'bg-slate-700/60 text-slate-200 border border-slate-500/50 hover:bg-slate-600/60'
                                    } ${gameState === 'playing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isReady ? '✅ Ready' : readyIdleLabel}
                            </button>
                            {currentRoom?.sessionId === roomOwner && (
                                <button
                                    onClick={handleStartMatch}
                                    disabled={!canStartMatch}
                                    className={`px-4 py-2 rounded-lg font-semibold transition ${canStartMatch
                                        ? 'bg-blue-500/80 text-white hover:bg-blue-500'
                                        : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    🚀 Start Match
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleLeave}
                        className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold transition backdrop-blur-md"
                    >
                        Leave Match
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Players Panel */}
                    <div className="lg:col-span-1 flex flex-col gap-4 animate-slide-up">
                        <div className="glass-effect rounded-xl p-4 shadow-lg">
                            <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">Players</h3>
                            <div className="flex flex-col gap-2">
                                {Array.from(players.values()).map((player) => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        isOwner={player.isOwner}
                                        isCurrentUser={player.id === currentRoom?.sessionId}
                                        currentTurn={isTurnBased ? currentTurn : null}
                                        gameState={gameState}
                                        onKick={canKickPlayers ? handleKick : null}
                                        showTurnIndicator={isTurnBased}
                                        allowKickActions={allowKicks}
                                        renderRoleBadge={RoleBadge ? (p) => <RoleBadge player={p} /> : null}
                                        renderStatusBadge={StatusBadge ? (p, ctx) => <StatusBadge player={p} {...ctx} /> : null}
                                        renderExtraInfo={ExtraInfo ? (p) => <ExtraInfo player={p} /> : null}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Game Canvas */}
                    <div className="lg:col-span-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <div className="glass-effect rounded-xl p-6 shadow-lg">
                            <div ref={gameRef} className="flex justify-center items-center"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kick Modal */}
            <Modal
                isOpen={kickModal.isOpen}
                onClose={handleCloseKickModal}
                title="Removed from Room"
                message={kickModal.message}
                icon="🚫"
                type="error"
            />
        </div>
    );
};

export default GamePage;
