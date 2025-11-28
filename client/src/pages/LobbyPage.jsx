import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Colyseus from 'colyseus.js';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { getGameDefinitions, getGameConfig, DEFAULT_GAME_ID } from '../config/gameRegistry';

const LobbyPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { joinRoom } = useGame();

    const gameDefinitions = useMemo(() => getGameDefinitions(), []);
    const SYSTEM_FALLBACK_GAME_ID = DEFAULT_GAME_ID || Object.keys(GAME_REGISTRY)[0];
    const defaultGameId = gameDefinitions[0]?.id || SYSTEM_FALLBACK_GAME_ID;
    const [selectedGameId, setSelectedGameId] = useState(defaultGameId);
    const selectedGame = useMemo(() => getGameConfig(selectedGameId || defaultGameId), [selectedGameId, defaultGameId]);

    const [lobbyRoom, setLobbyRoom] = useState(null);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingRoomId, setPendingRoomId] = useState(null);

    // Form data
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomPassword, setNewRoomPassword] = useState('');
    const [joinPassword, setJoinPassword] = useState('');

    useEffect(() => {
        connectToLobby();
        return () => {
            if (lobbyRoom) {
                lobbyRoom.leave();
            }
        };
    }, []);

    const connectToLobby = async () => {
        const client = new Colyseus.Client(import.meta.env.VITE_WS_URL);
        try {
            const room = await client.joinOrCreate("lobby");
            setLobbyRoom(room);

            room.onMessage("rooms", (rooms) => {
                setAvailableRooms(rooms);
                setLoading(false);
            });

            room.onMessage("+", ([roomId, roomData]) => {
                setAvailableRooms(prev => {
                    const existingIndex = prev.findIndex(r => r.roomId === roomId);
                    if (existingIndex !== -1) {
                        const updated = [...prev];
                        updated[existingIndex] = roomData;
                        return updated;
                    }
                    return [...prev, roomData];
                });
            });

            room.onMessage("-", (roomId) => {
                setAvailableRooms(prev => prev.filter(r => r.roomId !== roomId));
            });

            setLoading(false);
        } catch (e) {
            console.error("Lobby join error", e);
            setError('Failed to connect to lobby: ' + e.message);
            setLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        if (!selectedGameId) {
            alert("No games available to create.");
            return;
        }

        const client = new Colyseus.Client(import.meta.env.VITE_WS_URL);
        const gameConfig = selectedGame || getGameConfig(selectedGameId);
        const defaultOptions = gameConfig?.createRoomDefaults?.(user) || {};
        const resolvedRoomName = (newRoomName || '').trim() || defaultOptions.roomName || `${user.name || user.email || 'Player'}'s Room`;
        const resolvedPassword = (newRoomPassword ?? '').trim() || defaultOptions.password || '';

        try {
            const room = await client.joinOrCreate(selectedGameId, {
                ...defaultOptions,
                roomName: resolvedRoomName,
                password: resolvedPassword,
                name: user.name || user.email,
                avatar: user.avatar || ""
            });

            joinRoom(room, {
                roomName: resolvedRoomName || room.metadata?.roomName,
                gameId: room.metadata?.gameId || selectedGameId,
                gameName: gameConfig?.name
            });
            navigate('/game');
        } catch (e) {
            console.error("Create error", e);
            alert("Failed to create room: " + e.message);
        }
    };

    const handleJoinRoom = async (roomId, password = '') => {
        const client = new Colyseus.Client(import.meta.env.VITE_WS_URL);

        // Find the room data from availableRooms to get correct gameId
        const roomData = availableRooms.find(r => r.roomId === roomId);

        try {
            const room = await client.joinById(roomId, {
                password: password,
                name: user.name || user.email,
                avatar: user.avatar || ""
            });

            // Use gameId from room listing (which comes from server metadata)
            // NOT from room.metadata (which may not be synced yet)
            const joinedGameId = roomData?.metadata?.gameId || room.name || DEFAULT_GAME_ID;
            const joinedGameConfig = getGameConfig(joinedGameId);

            console.log('[LobbyPage] Joining room:', {
                roomId,
                roomName: room.name,
                roomDataGameId: roomData?.metadata?.gameId,
                metadataGameId: room.metadata?.gameId,
                selectedGameId: joinedGameId
            });

            joinRoom(room, {
                roomName: room.metadata?.roomName || roomData?.metadata?.roomName,
                gameId: joinedGameId,
                gameName: joinedGameConfig?.name
            });
            navigate('/game');
        } catch (e) {
            console.error("Join error", e);
            alert("Failed to join room: " + e.message);
        }
    };

    const handleJoinRequest = (roomId, isLocked) => {
        if (isLocked) {
            setPendingRoomId(roomId);
            setPasswordModalOpen(true);
        } else {
            handleJoinRoom(roomId);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Connecting to lobby...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <p className="text-red-400 text-lg">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-8 animate-slide-down">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2">Game Lobby</h1>
                        <p className="text-gray-400">Join a room or create your own</p>
                    </div>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-lg shadow-lg shadow-green-900/30 transform transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                    >
                        <span className="text-xl">+</span>
                        <span>Create Room</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Featured Games */}
                    <div className="lg:col-span-1 flex flex-col gap-4 animate-slide-up">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Featured Games</h2>

                        {gameDefinitions.length === 0 ? (
                            <div className="glass-effect rounded-2xl p-6 border border-slate-700 text-gray-400 text-sm">
                                No games configured yet. Add entries to GAME_REGISTRY to enable selection.
                            </div>
                        ) : (
                            gameDefinitions.map((game) => {
                                const isActive = game.id === selectedGameId;
                                const accent = game.lobby?.accent === 'green'
                                    ? 'from-green-600 to-emerald-500'
                                    : 'from-blue-600 to-cyan-500';
                                return (
                                    <button
                                        key={game.id}
                                        onClick={() => setSelectedGameId(game.id)}
                                        className={`
                                            text-left glass-effect rounded-2xl p-6 border transition-all duration-300 group
                                            ${isActive ? 'border-green-500 shadow-lg shadow-green-900/30' : 'border-slate-700 hover:border-slate-500'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                                                {game.lobby?.status || 'Available'}
                                            </div>
                                            {isActive && (
                                                <span className="text-xs text-green-300 font-semibold">Selected</span>
                                            )}
                                        </div>
                                        <div className={`h-32 rounded-xl mb-4 flex items-center justify-center text-4xl shadow-inner bg-gradient-to-br ${accent}`}>
                                            {game.lobby?.emoji || '🎮'}
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
                                        <p className="text-gray-400 text-sm">{game.description}</p>
                                        <div className="text-xs text-gray-500 mt-3">
                                            Players: {game.minPlayers} - {game.maxPlayers}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Room List */}
                    <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <div className="glass-effect rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
                                <h2 className="font-bold text-white">Active Rooms</h2>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span>Real-time updates</span>
                                </div>
                            </div>

                            <div className="p-4 flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {availableRooms.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                        <div className="text-6xl mb-4">📭</div>
                                        <div className="text-lg font-medium">No active rooms</div>
                                        <div className="text-sm text-gray-600">Be the first to create one!</div>
                                    </div>
                                ) : (
                                    availableRooms.map(room => {
                                        const roomGameId = room.metadata?.gameId || DEFAULT_GAME_ID;
                                        const roomGame = getGameConfig(roomGameId);
                                        const isFull = room.clients >= room.maxClients;
                                        return (
                                            <div
                                                key={room.roomId}
                                                className="bg-slate-700/40 hover:bg-slate-700/80 border border-slate-700/50 hover:border-slate-600 p-4 rounded-xl flex justify-between items-center transition-all duration-200 group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                                                        {room.metadata?.isLocked ? '🔒' : '🌍'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white group-hover:text-green-400 transition-colors">
                                                            {room.metadata?.roomName || room.roomId}
                                                        </div>
                                                        <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                                                            <span className="text-green-300 font-semibold">{roomGame?.name || 'Unknown Game'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                            <span>ID: {room.roomId.slice(0, 8)}...</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                            <span className={isFull ? 'text-red-400' : 'text-green-400'}>
                                                                {room.clients} / {room.maxClients} Players
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleJoinRequest(room.roomId, room.metadata?.isLocked)}
                                                    disabled={isFull}
                                                    className="px-4 py-2 bg-blue-600/90 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
                                                >
                                                    {isFull ? 'Full' : 'Join'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Room Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in px-4">
                    <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl animate-scale-in">
                        <h3 className="text-2xl font-bold text-white mb-6">Create Room</h3>

                        <div className="flex flex-col gap-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                    Game
                                </label>
                                <select
                                    value={selectedGameId || ''}
                                    onChange={(e) => setSelectedGameId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white transition-all"
                                >
                                    {gameDefinitions.map((game) => (
                                        <option key={game.id} value={game.id}>
                                            {game.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedGame && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {selectedGame.description}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                    Room Name
                                </label>
                                <input
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="e.g. Pro Arena"
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white placeholder-gray-600 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                    Password (Optional)
                                </label>
                                <input
                                    type="password"
                                    value={newRoomPassword}
                                    onChange={(e) => setNewRoomPassword(e.target.value)}
                                    placeholder="Leave empty for public"
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white placeholder-gray-600 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setCreateModalOpen(false);
                                    setNewRoomName('');
                                    setNewRoomPassword('');
                                }}
                                className="px-5 py-2.5 text-gray-400 hover:text-white font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleCreateRoom();
                                    setCreateModalOpen(false);
                                    setNewRoomName('');
                                    setNewRoomPassword('');
                                }}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition"
                            >
                                Create Room
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {passwordModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in px-4">
                    <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                🔒
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Private Room</h3>
                            <p className="text-gray-400 text-sm">Enter password to join</p>
                        </div>

                        <input
                            type="password"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full mb-8 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white text-center tracking-widest placeholder-gray-600"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleJoinRoom(pendingRoomId, joinPassword);
                                    setPasswordModalOpen(false);
                                    setJoinPassword('');
                                    setPendingRoomId(null);
                                }
                            }}
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setPasswordModalOpen(false);
                                    setJoinPassword('');
                                    setPendingRoomId(null);
                                }}
                                className="px-5 py-2.5 text-gray-400 hover:text-white font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleJoinRoom(pendingRoomId, joinPassword);
                                    setPasswordModalOpen(false);
                                    setJoinPassword('');
                                    setPendingRoomId(null);
                                }}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition"
                            >
                                Join Room
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LobbyPage;
