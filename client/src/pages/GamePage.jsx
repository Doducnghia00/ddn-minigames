import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { CaroScene } from '../games/caro/CaroScene';

const GamePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentRoom, leaveRoom } = useGame();
    const gameRef = useRef(null);
    const phaserGameRef = useRef(null);
    
    const [players, setPlayers] = useState(new Map());
    const [gameState, setGameState] = useState('waiting');
    const [currentTurn, setCurrentTurn] = useState(null);
    const [roomName, setRoomName] = useState('Game Room');
    const [roomOwner, setRoomOwner] = useState(null);
    
    // Game over state
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [rematchVotes, setRematchVotes] = useState(new Set());

    useEffect(() => {
        if (!currentRoom) {
            navigate('/lobby');
            return;
        }

        // Set room name from metadata
        if (currentRoom.state?.roomName) {
            setRoomName(currentRoom.state.roomName);
        }

        // Prevent duplicate initialization
        if (phaserGameRef.current) {
            console.log("Phaser game already initialized, skipping...");
            return;
        }

        // Initialize Phaser
        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: gameRef.current,
            backgroundColor: '#111827',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: [CaroScene]
        };

        phaserGameRef.current = new Phaser.Game(config);
        
        // Wait for scene to be ready, then pass room to scene
        const timeoutId = setTimeout(() => {
            if (!phaserGameRef.current) return;
            
            const scene = phaserGameRef.current.scene.scenes[0];
            if (scene) {
                scene.user = user;
                console.log("Setting room in scene:", currentRoom.sessionId);
                // Use setRoom method to properly initialize room events
                if (scene.setRoom) {
                    scene.setRoom(currentRoom);
                } else {
                    // Fallback for immediate access
                    scene.room = currentRoom;
                }
            }
        }, 100); // Small delay to ensure scene is created

        // Listen to room state changes
        currentRoom.onStateChange((state) => {
            // Update players
            const playerMap = new Map();
            state.players.forEach((player, id) => {
                playerMap.set(id, {
                    id: player.id,
                    name: player.name,
                    avatar: player.avatar,
                    symbol: player.symbol,
                    isOwner: player.isOwner
                });
            });
            setPlayers(playerMap);
            setRoomOwner(state.roomOwner);
            
            // Only update gameState if we're not in 'finished' state
            // This prevents server state from overwriting the finished state set by game_over message
            setGameState(prevState => {
                if (prevState === 'finished') {
                    return 'finished'; // Keep finished state
                }
                return state.gameState;
            });
            
            setCurrentTurn(state.currentTurn);
        });

        // Listen to game over message
        currentRoom.onMessage("game_over", (message) => {
            setGameOver(true);
            setWinner(message.winner);
            setGameState('finished'); // Set to finished so rematch button shows
        });

        // Listen to game start message
        currentRoom.onMessage("start_game", (message) => {
            console.log("Game started! First player:", message.startPlayer);
            setGameState('playing');
        });

        // Listen to game reset
        currentRoom.onMessage("game_reset", () => {
            setGameOver(false);
            setWinner(null);
            setRematchVotes(new Set());
            setGameState('waiting'); // Reset to waiting state for rematch
        });

        // Cleanup
        return () => {
            clearTimeout(timeoutId);
            if (phaserGameRef.current) {
                console.log("Destroying Phaser game instance");
                phaserGameRef.current.destroy(true);
                phaserGameRef.current = null;
            }
        };
    }, [currentRoom, navigate, user]);

    // Update rematch votes
    useEffect(() => {
        if (currentRoom && currentRoom.state) {
            const votes = new Set(currentRoom.state.rematchVotes || []);
            setRematchVotes(votes);
        }
    }, [currentRoom]);

    const handleLeave = () => {
        leaveRoom();
        navigate('/lobby');
    };

    const handleRematch = () => {
        if (currentRoom) {
            currentRoom.send('rematch');
        }
    };

    const handleKick = (playerId) => {
        if (currentRoom) {
            currentRoom.send('kick_player', { targetId: playerId });
        }
    };

    const currentPlayer = players.get(currentTurn);
    const isMyTurn = currentTurn === currentRoom?.sessionId;
    const hasVoted = rematchVotes.has(currentRoom?.sessionId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Game Header */}
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-slide-down">
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
                            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Trạng thái</div>
                            <div className="text-lg font-bold flex items-center gap-2">
                                {gameState === 'waiting' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                        <span className="text-yellow-400">⏳ Đang chờ đủ người chơi</span>
                                    </>
                                ) : gameState === 'playing' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-green-400">🎮 Trò chơi đang diễn ra</span>
                                    </>
                                ) : gameState === 'finished' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        <span className="text-purple-400">🏁 Đã kết thúc</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                        <span className="text-gray-400">⚪ Đang tải...</span>
                                    </>
                                )}
                            </div>
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
                                {Array.from(players.values()).map(player => {
                                    const isOwner = player.id === roomOwner;
                                    const isCurrentUser = player.id === currentRoom?.sessionId;
                                    
                                    return (
                                        <div
                                            key={player.id}
                                            className={`flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg ${isCurrentUser ? 'ring-2 ring-green-500/50' : ''}`}
                                        >
                                            {player.avatar ? (
                                                <img
                                                    src={player.avatar}
                                                    referrerPolicy="no-referrer"
                                                    className="w-10 h-10 rounded-full"
                                                    alt={player.name}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                                                    {player.name[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-grow">
                                                <div className="text-sm font-bold text-white flex items-center gap-1">
                                                    {player.name}
                                                    {isOwner && <span className="text-yellow-400">👑</span>}
                                                </div>
                                                <div className="text-xs text-gray-400">{player.symbol === 1 ? 'X' : 'O'}</div>
                                            </div>
                                            {isOwner && currentRoom?.sessionId === roomOwner && !isCurrentUser && (
                                                <button
                                                    onClick={() => handleKick(player.id)}
                                                    className="text-red-400 hover:text-red-300 text-xs font-medium"
                                                >
                                                    Kick
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Game Canvas */}
                    <div className="lg:col-span-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <div className="glass-effect rounded-xl p-6 shadow-lg">
                            <div ref={gameRef} className="flex justify-center items-center"></div>
                            
                            {/* Game Status */}
                            <div className="mt-4 flex justify-center gap-4">
                                {gameState === 'waiting' ? (
                                    <div className="bg-slate-800/90 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                                        <span className="font-bold text-gray-200">⏳ Đang chờ đối thủ...</span>
                                    </div>
                                ) : gameState === 'playing' && currentPlayer ? (
                                    <div className={`bg-slate-800/90 backdrop-blur-md border ${isMyTurn ? 'border-green-500/50' : 'border-red-500/30'} px-6 py-3 rounded-full shadow-xl flex items-center gap-3 transition-all duration-300`}>
                                        <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                                        {currentPlayer.avatar ? (
                                            <img
                                                src={currentPlayer.avatar}
                                                referrerPolicy="no-referrer"
                                                className="w-6 h-6 rounded-full"
                                                alt={currentPlayer.name}
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                                                {currentPlayer.name[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <span className="font-bold text-gray-200">🎮 {isMyTurn ? "Lượt của bạn" : `Lượt của ${currentPlayer.name}`}</span>
                                    </div>
                                ) : gameState === 'finished' ? (
                                    <>
                                        <div className="bg-slate-800/90 backdrop-blur-md border border-purple-500/30 px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                            <span className="font-bold text-gray-200">🏁 Trò chơi đã kết thúc</span>
                                        </div>
                                        {currentRoom?.sessionId === roomOwner && (
                                            <button
                                                onClick={handleRematch}
                                                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-full shadow-xl transition-all transform hover:-translate-y-0.5"
                                            >
                                                🔄 Chơi lại
                                            </button>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Over Modal */}
            {gameOver && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-fade-in">
                    <div className="bg-slate-900 p-10 rounded-3xl border border-slate-700 shadow-2xl text-center animate-scale-in max-w-md mx-4">
                        <div className="text-6xl mb-4">
                            {winner === currentRoom?.sessionId ? '🏆' : winner === 'draw' ? '🤝' : '💀'}
                        </div>
                        <h2 className={`text-5xl font-black italic mb-2 ${
                            winner === currentRoom?.sessionId ? 'text-green-400' :
                            winner === 'draw' ? 'text-gray-400' : 'text-red-500'
                        }`}>
                            {winner === currentRoom?.sessionId ? 'VICTORY!' :
                             winner === 'draw' ? 'DRAW' :
                             winner === 'opponent_left' ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-gray-400 mb-8 text-lg">
                            {winner === currentRoom?.sessionId ? 'You dominated the arena.' :
                             winner === 'draw' ? 'A perfectly matched battle.' :
                             winner === 'opponent_left' ? 'Opponent forfeited.' : 'Better luck next time.'}
                        </p>
                        
                        <button
                            onClick={() => setGameOver(false)}
                            className="px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition transform hover:-translate-y-1 shadow-lg"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamePage;
