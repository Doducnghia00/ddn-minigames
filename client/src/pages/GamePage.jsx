import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { getGameConfig, DEFAULT_GAME_ID } from '../config/gameRegistry';
import { getMergedGameProfile } from '../config/gameProfiles';
import PlayerCard from '../components/games/PlayerCard';
import Modal from '../components/ui/Modal';
import NetworkMonitor from '../components/ui/NetworkMonitor';

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
    const [showNetworkMonitor, setShowNetworkMonitor] = useState(false);

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
            const SYSTEM_FALLBACK_GAME_ID = DEFAULT_GAME_ID;

            // // Debug logging
            // console.log('[GamePage] Debug gameId detection:', {
            //     roomDataGameId: roomData?.gameId,
            //     metadataGameId: currentRoom?.metadata?.gameId,
            //     fullMetadata: currentRoom?.metadata,
            //     fallback: SYSTEM_FALLBACK_GAME_ID
            // });

            const gameId = roomData?.gameId || currentRoom?.metadata?.gameId || SYSTEM_FALLBACK_GAME_ID;
            const gameConfig = getGameConfig(gameId);

            console.log(`[GamePage] Initializing game: ${gameId}`, gameConfig);

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

        // Helper function to sync state to React
        const syncStateToReact = (state) => {
            // console.log('[GamePage] Syncing state - players in state:', state.players.size);

            const playerMap = new Map();
            state.players.forEach((player, id) => {
                // Only sync BASE player fields - no game-specific data
                playerMap.set(id, {
                    id: player.id,
                    name: player.name,
                    avatar: player.avatar,
                    isOwner: player.isOwner,
                    isReady: player.isReady
                });
            });

            // console.log('[GamePage] Setting players Map size:', playerMap.size);
            setPlayers(playerMap);
            setRoomOwner(state.roomOwner);
            setCurrentTurn(isTurnBased ? (state.currentTurn || null) : null);

            const readyPlayers = Array.from(playerMap.values()).filter((p) => p.isReady).length;
            setReadyCount(readyPlayers);
            const me = playerMap.get(currentRoom.sessionId);
            setIsReady(!!me?.isReady);
            setGameState(state.gameState);
        };

        // CRITICAL FIX: Sync initial state immediately to avoid race condition
        // onStateChange only fires on CHANGES, not on initial state
        if (currentRoom.state) {
            // console.log('[GamePage] Syncing initial state immediately');
            syncStateToReact(currentRoom.state);
        }

        // Then listen for future state changes
        currentRoom.onStateChange((state) => {
            syncStateToReact(state);
        });

        return () => {
            clearTimeout(timeoutId);
            if (phaserGameRef.current) {
                // console.log("Destroying Phaser game instance");

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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-4 lg:py-6">
            <div className="max-w-[1600px] mx-auto px-4">
                {/* Desktop 3-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_300px] gap-4 lg:gap-6 items-stretch">
                    
                    {/* LEFT COLUMN: Room Info + Players */}
                    <div className="flex flex-col gap-4 animate-slide-up order-2 lg:order-1">
                        {/* Room Info Card (Name + Status + Actions) */}
                        <div className="glass-effect rounded-xl px-4 py-3.5 shadow-lg border border-slate-700/60">
                            {/* Top row: room name + LIVE + actions */}
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm md:text-base font-semibold text-slate-50 truncate">
                                            {roomName}
                                        </h2>

                                        {/* LIVE badge */}
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[11px] font-medium text-emerald-300 tracking-wide">
                                                LIVE
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Action Icons */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setShowNetworkMonitor(!showNetworkMonitor)}
                                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-base transition-colors
                                            ${
                                                showNetworkMonitor
                                                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                                                    : 'bg-slate-800/80 border-slate-600/40 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                                            }`}
                                        title="Toggle Network Monitor"
                                    >
                                        📊
                                    </button>

                                    <button
                                        onClick={handleLeave}
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border text-base
                                                bg-red-500/10 border-red-500/40 text-red-300
                                                hover:bg-red-500/20 hover:text-red-100 transition-colors"
                                        title="Leave Room"
                                    >
                                        🚪
                                    </button>
                                </div>
                            </div>

                            {/* Bottom row: status text */}
                            <div className="mt-2.5 flex items-center gap-2 text-[13px]">
                                {gameState === 'waiting' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                        <span className="text-yellow-300">{statusTexts.waiting}</span>
                                    </>
                                ) : gameState === 'playing' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-green-300">{statusTexts.playing}</span>
                                    </>
                                ) : gameState === 'finished' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                                        <span className="text-purple-300">{statusTexts.finished}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                                        <span className="text-slate-400">Loading...</span>
                                    </>
                                )}
                            </div>
                        </div>


                        {/* Players Panel */}
                        <div className="glass-effect rounded-xl p-4 shadow-lg flex-1">
                            <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">
                                Players ({players.size})
                            </h3>
                            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
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
                                        renderRoleBadge={RoleBadge ? (p) => <RoleBadge player={p} currentRoom={currentRoom} /> : null}
                                        renderStatusBadge={StatusBadge ? (p, ctx) => <StatusBadge player={p} currentRoom={currentRoom} {...ctx} /> : null}
                                        renderExtraInfo={ExtraInfo ? (p) => <ExtraInfo player={p} currentRoom={currentRoom} /> : null}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CENTER COLUMN: Game Canvas */}
                    <div className="animate-slide-up order-1 lg:order-2" style={{ animationDelay: '75ms' }}>
                        <div className="glass-effect rounded-xl p-4 lg:p-6 shadow-lg h-full flex">
                            <div ref={gameRef} className="flex-1 flex items-center justify-center min-h-[480px]"></div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Queue */}
                    <div className="flex flex-col gap-4 animate-slide-up order-3" style={{ animationDelay: '150ms' }}>
                        {/* Queue Card */}
                        <div className="glass-effect rounded-xl p-4 shadow-lg">
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">Queue</div>
                            
                            {/* Ready Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-300">Ready</span>
                                    <span className="text-sm font-bold text-white">{readyCount}/{readinessTarget}</span>
                                </div>
                                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300 rounded-full"
                                        style={{ width: `${(readyCount / readinessTarget) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {readyStrategy === 'allPlayers' ? 'Everyone must be ready' : `Min ${minPlayers} players`}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleToggleReady}
                                    disabled={gameState === 'playing' || totalPlayers === 0}
                                    className={`w-full px-4 py-2.5 rounded-lg font-semibold transition text-sm ${isReady
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
                                        className={`w-full px-4 py-2.5 rounded-lg font-semibold transition text-sm ${canStartMatch
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25'
                                            : 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600/50'
                                            }`}
                                    >
                                        🚀 Start Match
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Reserved space for future features */}
                        <div className="glass-effect rounded-xl p-4 shadow-lg min-h-[120px] border border-dashed border-slate-600/70">
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                                Game Settings
                            </div>
                            <p className="text-sm text-slate-400">
                                Coming soon...
                            </p>
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

            {/* Network Monitor */}
            <NetworkMonitor 
                room={currentRoom} 
                enabled={showNetworkMonitor}
            />
        </div>
    );
};

export default GamePage;
