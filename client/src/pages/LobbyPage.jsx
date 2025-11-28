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
    const SYSTEM_FALLBACK_GAME_ID = DEFAULT_GAME_ID;
    const defaultGameId = gameDefinitions[0]?.id || SYSTEM_FALLBACK_GAME_ID;

    const [selectedGameId, setSelectedGameId] = useState(defaultGameId);
    const selectedGame = useMemo(
        () => getGameConfig(selectedGameId || defaultGameId),
        [selectedGameId, defaultGameId]
    );

    const [availableRooms, setAvailableRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const [fatalError, setFatalError] = useState('');   // lỗi lobby (không connect được)
    const [actionError, setActionError] = useState(''); // lỗi create/join

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingRoomId, setPendingRoomId] = useState(null);

    // Form data
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomPassword, setNewRoomPassword] = useState('');
    const [joinPassword, setJoinPassword] = useState('');

    // Kết nối lobby 1 lần, cleanup đúng room
    useEffect(() => {
        const client = new Colyseus.Client(import.meta.env.VITE_WS_URL);
        let room = null;

        (async () => {
            try {
                room = await client.joinOrCreate('lobby');

                room.onMessage('rooms', (rooms) => {
                    setAvailableRooms(rooms);
                    setLoading(false);
                });

                room.onMessage('+', ([roomId, roomData]) => {
                    setAvailableRooms((prev) => {
                        const existingIndex = prev.findIndex((r) => r.roomId === roomId);
                        if (existingIndex !== -1) {
                            const updated = [...prev];
                            updated[existingIndex] = roomData;
                            return updated;
                        }
                        return [...prev, roomData];
                    });
                });

                room.onMessage('-', (roomId) => {
                    setAvailableRooms((prev) => prev.filter((r) => r.roomId !== roomId));
                });

                setLoading(false);
            } catch (e) {
                console.error('Lobby join error', e);
                setFatalError('Failed to connect to lobby: ' + e.message);
                setLoading(false);
            }
        })();

        return () => {
            if (room) {
                room.leave();
            }
        };
    }, []);

    // Create room – return true/false để modal biết có nên đóng
    const handleCreateRoom = async () => {
        setActionError('');

        if (!selectedGameId) {
            setActionError('No games available to create.');
            return false;
        }

        const client = new Colyseus.Client(import.meta.env.VITE_WS_URL);
        const gameConfig = selectedGame || getGameConfig(selectedGameId);
        const defaultOptions = gameConfig?.createRoomDefaults?.(user) || {};

        const resolvedRoomName =
            (newRoomName || '').trim() ||
            defaultOptions.roomName ||
            `${user.name || user.email || 'Player'}'s Room`;

        const resolvedPassword = (newRoomPassword ?? '').trim() || defaultOptions.password || '';

        try {
            const room = await client.create(selectedGameId, {
                ...defaultOptions,
                roomName: resolvedRoomName,
                password: resolvedPassword,
                name: user.name || user.email,
                avatar: user.avatar || ''
            });

            joinRoom(room, {
                roomName: resolvedRoomName || room.metadata?.roomName,
                gameId: room.metadata?.gameId || selectedGameId,
                gameName: gameConfig?.name
            });
            navigate('/game');
            return true;
        } catch (e) {
            console.error('Create error', e);
            setActionError('Failed to create room: ' + e.message);
            return false;
        }
    };

    const handleJoinRoom = async (roomId, password = '') => {
        setActionError('');

        if (!roomId) {
            setActionError('Invalid room ID.');
            return;
        }

        const client = new Colyseus.Client(import.meta.env.VITE_WS_URL);
        const roomData = availableRooms.find((r) => r.roomId === roomId);

        try {
            const room = await client.joinById(roomId, {
                password,
                name: user.name || user.email,
                avatar: user.avatar || ''
            });

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
            console.error('Join error', e);
            setActionError('Failed to join room: ' + e.message);
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

    // Luôn filter rooms theo game đang chọn
    const filteredRooms = useMemo(() => {
        if (!selectedGameId) return availableRooms;
        return availableRooms.filter((room) => {
            const roomGameId = room.metadata?.gameId || DEFAULT_GAME_ID;
            return roomGameId === selectedGameId;
        });
    }, [availableRooms, selectedGameId]);

    // Loading & fatal error
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-400">Connecting to lobby...</p>
                </div>
            </div>
        );
    }

    if (fatalError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-center max-w-md px-4">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <p className="text-red-400 text-lg mb-2">Lobby Error</p>
                    <p className="text-red-300 text-sm">{fatalError}</p>
                </div>
            </div>
        );
    }

    // UI chính
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 animate-slide-down">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-1">Game Lobby</h1>
                        <p className="text-gray-400 text-sm md:text-base">
                            Choose a game, see active rooms, and jump into the action.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center justify-center px-5 md:px-6 py-2.5 md:py-3
                                   bg-gradient-to-r from-green-600 to-emerald-500
                                   hover:from-green-500 hover:to-emerald-400
                                   text-white font-bold text-sm md:text-base
                                   rounded-lg shadow-lg shadow-emerald-900/40
                                   transform transition hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <span className="text-xl mr-1">＋</span>
                        <span>Create Room</span>
                    </button>
                </header>

                {/* Action error banner */}
                {actionError && (
                    <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-sm flex items-center gap-2 animate-slide-down">
                        <span className="text-base">⚠️</span>
                        <span className="flex-1">{actionError}</span>
                        <button
                            onClick={() => setActionError('')}
                            className="ml-auto text-red-400 hover:text-red-200"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Game selector row */}
                <section className="mb-8 animate-slide-up">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                            Select a Game
                        </h2>
                        <span className="text-xs text-gray-500">
                            Selected:{' '}
                            <span className="text-gray-200 font-semibold">
                                {selectedGame?.name || 'None'}
                            </span>
                        </span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                        {gameDefinitions.length === 0 ? (
                            <div className="glass-effect rounded-xl p-4 border border-slate-700 text-gray-400 text-sm">
                                No games configured yet. Add entries to GAME_REGISTRY to enable selection.
                            </div>
                        ) : (
                            gameDefinitions.map((game) => {
                                const isActive = game.id === selectedGameId;
                                const accent =
                                    game.lobby?.accent === 'green'
                                        ? 'from-green-600 to-emerald-500'
                                        : 'from-blue-600 to-cyan-500';

                                return (
                                    <button
                                        key={game.id}
                                        onClick={() => setSelectedGameId(game.id)}
                                        className={`
                                            min-w-[220px] sm:min-w-[240px] max-w-xs
                                            flex-shrink-0 text-left
                                            glass-effect rounded-xl px-4 py-3
                                            border transition-all duration-200
                                            ${
                                                isActive
                                                    ? 'border-green-500 shadow-lg shadow-green-900/40'
                                                    : 'border-slate-700 hover:border-slate-500'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-gray-300">
                                                {game.lobby?.status || 'Available'}
                                            </div>
                                            {isActive && (
                                                <span className="text-[11px] text-green-300 font-semibold">
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className={`w-full h-20 rounded-lg mb-3 flex items-center justify-center text-3xl bg-gradient-to-br ${accent}`}
                                        >
                                            {game.lobby?.emoji || '🎮'}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-sm font-bold text-white">
                                                {game.name}
                                            </h3>
                                            <p className="text-xs text-gray-400 line-clamp-2">
                                                {game.description}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                Players: {game.minPlayers}–{game.maxPlayers}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Main layout: Rooms + Sidebar */}
                <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-6 animate-slide-up">
                    {/* Rooms panel */}
                    <div className="glass-effect rounded-2xl overflow-hidden border border-slate-800/70">
                        <div className="p-4 border-b border-slate-800/50 bg-slate-800/60 flex items-center justify-between">
                            <div className="flex flex-col">
                                <h2 className="font-bold text-white text-sm md:text-base">
                                    Active Rooms
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Showing rooms for{' '}
                                    <span className="text-gray-100 font-semibold">
                                        {selectedGame?.name || 'Selected Game'}
                                    </span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span>Real-time updates</span>
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {filteredRooms.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                    <div className="text-6xl mb-4">📭</div>
                                    <div className="text-lg font-medium">No rooms for this game</div>
                                    <div className="text-sm text-gray-600">
                                        Be the first to create one with the button above.
                                    </div>
                                </div>
                            ) : (
                                filteredRooms.map((room) => {
                                    const roomGameId = room.metadata?.gameId || DEFAULT_GAME_ID;
                                    const roomGame = getGameConfig(roomGameId);
                                    const isFull = room.clients >= room.maxClients;

                                    return (
                                        <div
                                            key={room.roomId}
                                            className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-slate-600/70 p-4 rounded-lg flex justify-between items-center transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-lg bg-slate-900/60 border border-slate-700/50 flex items-center justify-center text-2xl">
                                                    {room.metadata?.isLocked
                                                        ? '🔒'
                                                        : roomGame?.lobby?.emoji || '🌍'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-white group-hover:text-green-300 transition-colors truncate">
                                                        {room.metadata?.roomName || room.roomId}
                                                    </div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                                                        <span className="text-green-300 font-medium">
                                                            {roomGame?.name || 'Unknown Game'}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                        <span className="text-gray-500">
                                                            ID: {room.roomId.slice(0, 8)}...
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                        <span
                                                            className={
                                                                isFull
                                                                    ? 'text-red-400 font-medium'
                                                                    : 'text-emerald-400 font-medium'
                                                            }
                                                        >
                                                            {room.clients} / {room.maxClients} players
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleJoinRequest(
                                                        room.roomId,
                                                        room.metadata?.isLocked
                                                    )
                                                }
                                                disabled={isFull}
                                                className="px-4 py-2 bg-blue-600/90 hover:bg-blue-500
                                                           disabled:bg-gray-600 disabled:cursor-not-allowed
                                                           text-white text-sm font-bold rounded-lg
                                                           shadow-lg shadow-blue-900/20
                                                           transition-all transform
                                                           hover:-translate-y-0.5 active:translate-y-0
                                                           disabled:transform-none"
                                            >
                                                {isFull ? 'Full' : 'Join'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Game Details / future stuff */}
                    <aside className="flex flex-col gap-4">
                        {/* Selected game info */}
                        <div className="glass-effect rounded-2xl p-5 border border-slate-700/70">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
                                Game Details
                            </h3>

                            {selectedGame ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center text-3xl
                                                bg-gradient-to-br ${
                                                    selectedGame.lobby?.accent === 'green'
                                                        ? 'from-green-600 to-emerald-500'
                                                        : 'from-blue-600 to-cyan-500'
                                                }
                                            `}
                                        >
                                            {selectedGame.lobby?.emoji || '🎮'}
                                        </div>
                                        <div>
                                            <div className="text-white font-semibold">
                                                {selectedGame.name}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Players: {selectedGame.minPlayers}–
                                                {selectedGame.maxPlayers}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-400">
                                        {selectedGame.description}
                                    </p>

                                    <div className="text-xs text-gray-500 border-t border-slate-700/60 pt-3">
                                        Rooms shown on the left are filtered by this game. Use{' '}
                                        <span className="font-semibold text-gray-300">
                                            “Create Room”
                                        </span>{' '}
                                        to start a new lobby.
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No game selected. Please choose a game above.
                                </p>
                            )}
                        </div>

                        {/* Coming soon / extra slot */}
                        <div className="glass-effect rounded-2xl p-4 border border-dashed border-slate-700/70 text-sm text-gray-400">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                Coming Soon
                            </div>
                            <p>
                                This area can be used for recent rooms, quick filters, or event
                                announcements in the future.
                            </p>
                        </div>
                    </aside>
                </section>
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
                                onClick={async () => {
                                    const ok = await handleCreateRoom();
                                    if (ok) {
                                        setCreateModalOpen(false);
                                        setNewRoomName('');
                                        setNewRoomPassword('');
                                    }
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
                            autoFocus
                            className="w-full mb-8 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white text-center tracking-widest placeholder-gray-600"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (!pendingRoomId) return;
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
                                    if (!pendingRoomId) return;
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
