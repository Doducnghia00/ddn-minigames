# Phase 3: UI/UX Components & Polish - Implementation Plan

> **Mục tiêu Phase 3**: Xây dựng UI/UX hoàn chỉnh cho Arena Shooter với React components và game-specific HUD
> 
> **Thời gian ước tính**: 1-1.5 tuần (part-time)
> 
> **Nguyên tắc**: Follow patterns từ Caro, tạo game-specific UI components

---

## 📋 Tổng Quan

Phase 3 tập trung vào việc xây dựng **UI/UX layer** cho Shooter Game bằng cách:
1. ✅ **React Components**: Tạo game-specific UI cho lobby và in-game
2. ✅ **Game Profile**: Cấu hình behaviors và components trong gameProfiles
3. ✅ **HUD Enhancement**: Health bars, ammo, crosshair, kill feed
4. ✅ **Scoreboard**: Real-time leaderboard hiển thị đẹp
5. ✅ **Polish**: Animations, notifications, visual feedback

### Đã có sẵn (Phase 1 & 2):
- ✅ ShooterRoom với full game logic
- ✅ ShooterScene với basic rendering
- ✅ FreeForAllGameScene với score tracking hooks
- ✅ Player movement, shooting, collision hoạt động tốt
- ✅ Registered in gameRegistry

### Cần thêm (Phase 3):
- ❌ Shooter-specific React components (PlayerBadges, HUD)
- ❌ Game profile configuration
- ❌ Enhanced in-game HUD (health, K/D, timer)
- ❌ Kill feed notifications
- ❌ End-game scoreboard
- ❌ Visual polish (effects, animations)

---

## 🎯 Phase 3: Chi Tiết Công Việc

### Task 3.1: Tạo ShooterPlayerBadges (Lobby UI)

**File**: `client/src/components/games/shooter/ShooterPlayerBadges.jsx` (TẠO MỚI)

#### 📝 Mục tiêu:
Tạo các badge components hiển thị trong lobby (trước khi match bắt đầu)

#### 🔧 Implementation:

```jsx
import React from 'react';

/**
 * Shooter-specific player badges and status indicators
 * Displayed in lobby before match starts
 */

// Role Badge - Displays player status/role in shooter
export const ShooterRoleBadge = ({ player, currentRoom }) => {
    // Get full player data from room state
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    
    if (!fullPlayer) return null;

    // Show K/D ratio if player has played before (from previous matches)
    const hasStats = fullPlayer.kills > 0 || fullPlayer.deaths > 0;
    
    if (!hasStats) return null;

    const kd = fullPlayer.deaths > 0 
        ? (fullPlayer.kills / fullPlayer.deaths).toFixed(2) 
        : fullPlayer.kills;

    return (
        <span
            className="text-xs font-bold px-2 py-0.5 rounded-full
                bg-purple-500/20 border border-purple-500/40 text-purple-400
                flex items-center gap-1"
            title={`K/D Ratio: ${kd}`}
        >
            <span>⚔️</span>
            <span>{kd} K/D</span>
        </span>
    );
};

// Status Badge - Displays player status in lobby
export const ShooterStatusBadge = ({ player, gameState, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    
    if (!fullPlayer) return null;

    // Show ready status before game
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

    // Show alive/dead status during game
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

    return null;
};

// Extra Info - Displays additional shooter stats in lobby
export const ShooterExtraInfo = ({ player, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    
    if (!fullPlayer) return null;

    const gameState = currentRoom?.state?.gameState;

    // During game or after, show K/D/Score
    if (gameState === 'playing' || gameState === 'finished') {
        return (
            <div className="flex items-center gap-3 text-xs mt-1">
                {/* Score */}
                <div className="flex items-center gap-1">
                    <span className="text-yellow-400">🏆</span>
                    <span className="text-gray-400">Score:</span>
                    <span className="text-white font-bold">{fullPlayer.score || 0}</span>
                </div>
                
                {/* Kills */}
                <div className="flex items-center gap-1">
                    <span className="text-green-400">⚔️</span>
                    <span className="text-gray-400">Kills:</span>
                    <span className="text-green-300 font-bold">{fullPlayer.kills || 0}</span>
                </div>
                
                {/* Deaths */}
                <div className="flex items-center gap-1">
                    <span className="text-red-400">💀</span>
                    <span className="text-gray-400">Deaths:</span>
                    <span className="text-red-300 font-bold">{fullPlayer.deaths || 0}</span>
                </div>

                {/* Health (if playing) */}
                {gameState === 'playing' && fullPlayer.isAlive && (
                    <div className="flex items-center gap-1">
                        <span className="text-blue-400">❤️</span>
                        <span className="text-gray-400">HP:</span>
                        <span className="text-blue-300 font-bold">{fullPlayer.health || 0}</span>
                    </div>
                )}
            </div>
        );
    }

    return null;
};
```

#### ✅ Acceptance Criteria:
- [ ] ShooterRoleBadge shows K/D ratio if player has stats
- [ ] ShooterStatusBadge shows ready/alive/respawning status
- [ ] ShooterExtraInfo shows Score, Kills, Deaths, Health
- [ ] All components follow Caro pattern
- [ ] Styling consistent with game theme

---

### Task 3.2: Tạo ShooterHUD (In-Game Overlay)

**File**: `client/src/components/games/shooter/ShooterHUD.jsx` (TẠO MỚI)

#### 📝 Mục tiêu:
HUD overlay hiển thị trong game (health, K/D, timer, leaderboard)

#### 🔧 Implementation:

```jsx
import React, { useState, useEffect } from 'react';

/**
 * ShooterHUD - In-game HUD overlay
 * Displays health, K/D, timer, mini-leaderboard
 */
export const ShooterHUD = ({ room, gameState }) => {
    const [myPlayer, setMyPlayer] = useState(null);
    const [matchTimer, setMatchTimer] = useState(0);
    const [scoreLimit, setScoreLimit] = useState(0);
    const [topPlayers, setTopPlayers] = useState([]);

    useEffect(() => {
        if (!room || !room.state) return;

        // Get my player
        const player = room.state.players?.get(room.sessionId);
        setMyPlayer(player);

        // Listen to timer
        const timerListener = room.state.listen('matchTimer', (value) => {
            setMatchTimer(value);
        });

        // Listen to score limit
        const scoreLimitListener = room.state.listen('scoreLimit', (value) => {
            setScoreLimit(value);
        });

        // Update leaderboard
        const updateLeaderboard = () => {
            if (!room.state.players) return;
            
            const players = [];
            room.state.players.forEach((player, id) => {
                players.push({ id, ...player });
            });
            
            const sorted = players
                .sort((a, b) => b.score - a.score)
                .slice(0, 5); // Top 5
            
            setTopPlayers(sorted);
        };

        // Update leaderboard on score changes
        room.state.players.onAdd = updateLeaderboard;
        room.state.players.onRemove = updateLeaderboard;
        
        room.state.players.forEach((player) => {
            player.listen('score', updateLeaderboard);
            player.listen('kills', updateLeaderboard);
        });

        updateLeaderboard();

        return () => {
            timerListener?.clear();
            scoreLimitListener?.clear();
        };
    }, [room]);

    if (gameState !== 'playing' || !myPlayer) return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const healthPercent = myPlayer.maxHealth > 0 
        ? (myPlayer.health / myPlayer.maxHealth) * 100 
        : 0;

    const getHealthColor = () => {
        if (healthPercent > 60) return 'bg-green-500';
        if (healthPercent > 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getHealthBarColor = () => {
        if (healthPercent > 60) return 'border-green-500/40';
        if (healthPercent > 30) return 'border-yellow-500/40';
        return 'border-red-500/40';
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Top Left - Player Stats */}
            <div className="absolute top-4 left-4 space-y-2 pointer-events-auto">
                {/* Health Bar */}
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-400 text-sm">❤️</span>
                        <span className="text-xs text-gray-400 font-semibold">HEALTH</span>
                        <span className="text-white text-sm font-bold ml-auto">
                            {Math.round(myPlayer.health)} / {myPlayer.maxHealth}
                        </span>
                    </div>
                    <div className={`w-48 h-3 bg-gray-800 rounded-full overflow-hidden border-2 ${getHealthBarColor()}`}>
                        <div 
                            className={`h-full ${getHealthColor()} transition-all duration-300 ease-out`}
                            style={{ width: `${healthPercent}%` }}
                        />
                    </div>
                </div>

                {/* K/D Stats */}
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 text-sm">⚔️</span>
                            <span className="text-xs text-gray-400">Kills:</span>
                            <span className="text-green-400 text-lg font-bold">{myPlayer.kills || 0}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-red-400 text-sm">💀</span>
                            <span className="text-xs text-gray-400">Deaths:</span>
                            <span className="text-red-400 text-lg font-bold">{myPlayer.deaths || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Center - Timer & Score Limit */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-sm">⏱️</span>
                            <span className={`text-xl font-bold font-mono ${matchTimer < 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {formatTime(matchTimer)}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-400 text-sm">🎯</span>
                            <span className="text-xs text-gray-400">First to:</span>
                            <span className="text-yellow-400 text-lg font-bold">{scoreLimit}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Right - Mini Leaderboard */}
            <div className="absolute top-4 right-4">
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                        <span className="text-yellow-400 text-sm">🏆</span>
                        <span className="text-xs text-gray-400 font-semibold">LEADERBOARD</span>
                    </div>
                    <div className="space-y-1">
                        {topPlayers.map((player, index) => {
                            const isMe = player.id === room.sessionId;
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                            
                            return (
                                <div 
                                    key={player.id}
                                    className={`flex items-center gap-2 text-xs ${isMe ? 'text-blue-400 font-bold' : 'text-gray-300'}`}
                                >
                                    <span className="w-6 text-center">{medal}</span>
                                    <span className="flex-1 truncate">{player.name}</span>
                                    <span className="text-yellow-400 font-bold">{player.score}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Center - Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-8 h-8">
                    {/* Crosshair lines */}
                    <div className="absolute top-1/2 left-0 w-2 h-0.5 bg-white/70"></div>
                    <div className="absolute top-1/2 right-0 w-2 h-0.5 bg-white/70"></div>
                    <div className="absolute left-1/2 top-0 w-0.5 h-2 bg-white/70"></div>
                    <div className="absolute left-1/2 bottom-0 w-0.5 h-2 bg-white/70"></div>
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
                </div>
            </div>

            {/* Bottom Center - Respawn Message */}
            {!myPlayer.isAlive && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                    <div className="bg-red-900/90 backdrop-blur-sm rounded-lg px-6 py-3 border-2 border-red-500">
                        <p className="text-red-100 font-bold text-lg animate-pulse">
                            💀 You were eliminated! Respawning...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
```

#### ✅ Acceptance Criteria:
- [ ] Health bar displays current health
- [ ] K/D stats displayed clearly
- [ ] Timer shown in MM:SS format
- [ ] Score limit displayed
- [ ] Mini leaderboard shows top 5 players
- [ ] Crosshair centered
- [ ] Respawn message when dead
- [ ] All elements positioned properly
- [ ] Smooth transitions

---

### Task 3.3: Tạo Kill Feed Component

**File**: `client/src/components/games/shooter/KillFeed.jsx` (TẠO MỚI)

#### 📝 Mục tiêu:
Hiển thị kill notifications (X killed Y) ở góc màn hình

#### 🔧 Implementation:

```jsx
import React, { useState, useEffect } from 'react';

/**
 * KillFeed - Shows recent kill notifications
 * Displayed in top-right or right-center
 */
export const KillFeed = ({ room }) => {
    const [kills, setKills] = useState([]);

    useEffect(() => {
        if (!room) return;

        const handleKill = (data) => {
            const { victimId, killerId, victimName, killerName } = data;
            
            const killEvent = {
                id: Date.now(),
                victimName: victimName || 'Unknown',
                killerName: killerName || 'Unknown',
                isSuicide: victimId === killerId,
                timestamp: Date.now()
            };

            setKills(prev => [killEvent, ...prev].slice(0, 5)); // Keep last 5

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setKills(prev => prev.filter(k => k.id !== killEvent.id));
            }, 5000);
        };

        room.onMessage('player_killed', handleKill);

        return () => {
            room.removeAllListeners('player_killed');
        };
    }, [room]);

    if (kills.length === 0) return null;

    return (
        <div className="absolute top-20 right-4 space-y-2 pointer-events-none w-72">
            {kills.map((kill) => (
                <div
                    key={kill.id}
                    className="bg-gray-900/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700
                        animate-slide-in-right shadow-lg"
                >
                    {kill.isSuicide ? (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">{kill.victimName}</span>
                            <span className="text-red-400">💀 eliminated themselves</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-400 font-semibold">{kill.killerName}</span>
                            <span className="text-red-400">⚔️</span>
                            <span className="text-gray-400">{kill.victimName}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
```

#### Custom CSS Animation (add to `client/src/style.css`):

```css
@keyframes slide-in-right {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
}
```

#### ✅ Acceptance Criteria:
- [ ] Shows kill notifications in real-time
- [ ] Displays killer and victim names
- [ ] Handles suicide case
- [ ] Auto-removes after 5 seconds
- [ ] Shows max 5 recent kills
- [ ] Slide-in animation
- [ ] Doesn't block gameplay

---

### Task 3.4: Tạo End-Game Scoreboard

**File**: `client/src/components/games/shooter/ShooterScoreboard.jsx` (TẠO MỚI)

#### 📝 Mục tiêu:
Full scoreboard hiển thị khi match kết thúc

#### 🔧 Implementation:

```jsx
import React, { useState, useEffect } from 'react';

/**
 * ShooterScoreboard - End-game scoreboard with full stats
 */
export const ShooterScoreboard = ({ room, gameState, onClose }) => {
    const [players, setPlayers] = useState([]);
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        if (!room || !room.state) return;

        const updateScoreboard = () => {
            const playerList = [];
            room.state.players.forEach((player, id) => {
                playerList.push({
                    id,
                    name: player.name,
                    score: player.score || 0,
                    kills: player.kills || 0,
                    deaths: player.deaths || 0,
                    kd: player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills
                });
            });

            // Sort by score
            playerList.sort((a, b) => b.score - a.score);
            setPlayers(playerList);

            // Get winner
            if (room.state.winner) {
                const winnerPlayer = room.state.players.get(room.state.winner);
                setWinner(winnerPlayer);
            }
        };

        updateScoreboard();

        // Update on changes
        const listener = room.state.listen('gameState', updateScoreboard);

        return () => listener?.clear();
    }, [room, gameState]);

    if (gameState !== 'finished') return null;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl border-2 border-gray-700 p-8 max-w-2xl w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-4xl font-bold text-white mb-2">
                        🏆 Match Ended
                    </h2>
                    {winner && (
                        <p className="text-2xl text-yellow-400 font-bold">
                            Winner: {winner.name}! 🎉
                        </p>
                    )}
                </div>

                {/* Scoreboard Table */}
                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    {/* Table Header */}
                    <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-gray-700 text-xs font-semibold text-gray-300 uppercase">
                        <div className="col-span-2">Player</div>
                        <div className="text-center">Score</div>
                        <div className="text-center">K/D</div>
                        <div className="text-center">Ratio</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-700">
                        {players.map((player, index) => {
                            const isWinner = player.id === room.state.winner;
                            const isMe = player.id === room.sessionId;
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                            return (
                                <div
                                    key={player.id}
                                    className={`grid grid-cols-5 gap-4 px-4 py-3 transition-colors
                                        ${isWinner ? 'bg-yellow-500/10 border-l-4 border-l-yellow-500' : ''}
                                        ${isMe ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''}
                                    `}
                                >
                                    {/* Player Name */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        {medal && <span className="text-xl">{medal}</span>}
                                        <span className={`font-semibold truncate ${isMe ? 'text-blue-400' : 'text-white'}`}>
                                            {player.name}
                                            {isMe && <span className="text-xs ml-1">(You)</span>}
                                        </span>
                                    </div>

                                    {/* Score */}
                                    <div className="text-center">
                                        <span className="text-yellow-400 font-bold text-lg">{player.score}</span>
                                    </div>

                                    {/* K/D */}
                                    <div className="text-center text-sm">
                                        <span className="text-green-400">{player.kills}</span>
                                        <span className="text-gray-500 mx-1">/</span>
                                        <span className="text-red-400">{player.deaths}</span>
                                    </div>

                                    {/* Ratio */}
                                    <div className="text-center">
                                        <span className="text-purple-400 font-semibold">{player.kd}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-400">
                    <p>Waiting for rematch or return to lobby...</p>
                </div>
            </div>
        </div>
    );
};
```

#### ✅ Acceptance Criteria:
- [ ] Shows when game state is 'finished'
- [ ] Displays winner prominently
- [ ] Shows all players sorted by score
- [ ] Displays Score, K/D, K/D Ratio
- [ ] Highlights winner with special styling
- [ ] Highlights current player
- [ ] Shows medals for top 3
- [ ] Clean table layout
- [ ] Responsive design

---

### Task 3.5: Cập Nhật ShooterScene Để Dùng UI Components

**File**: `client/src/games/shooter/ShooterScene.js`

#### 📝 Mục tiêu:
Integrate các React components vào Phaser scene

#### 🔧 Changes:

```javascript
// Add imports at top
import { EventBus } from '../base/EventBus';

// In create() method, after existing setup:
create() {
    this.createArena();
    this.setupInput();
    this.createHUD();
    
    // NEW: Setup server messages for kill feed
    this.setupServerMessages();
}

// NEW: Emit events for React components
setupServerMessages() {
    if (!this.room) return;

    // Listen to kill events and emit to React
    this.room.onMessage('player_killed', (data) => {
        const victim = this.room.state.players.get(data.victim);
        const killer = this.room.state.players.get(data.killer);
        
        EventBus.emit('player_killed', {
            victimId: data.victim,
            killerId: data.killer,
            victimName: victim?.name || 'Unknown',
            killerName: killer?.name || 'Unknown'
        });
    });

    // Listen to respawn events
    this.room.onMessage('player_respawned', (data) => {
        EventBus.emit('player_respawned', data);
    });
}
```

#### Update ShooterRoom (Server) to send player names:

**File**: `server/rooms/shooter/ShooterRoom.js`

```javascript
// In handlePlayerDeath method:
handlePlayerDeath(victimId, killerId) {
    const victim = this.state.players.get(victimId);
    const killer = this.state.players.get(killerId);
    
    if (!victim) return;
    
    victim.isAlive = false;
    victim.deaths++;
    
    if (killer && killerId !== victimId) {
        killer.kills++;
        killer.score++;
    }
    
    console.log(`[Shooter] ${victim.name} killed by ${killer?.name || 'themselves'}`);
    
    // Schedule respawn
    this.clock.setTimeout(() => {
        if (this.state.gameState === 'playing') {
            this.respawnPlayer(victimId);
        }
    }, this.state.respawnDelay * 1000);
    
    // UPDATED: Send with names
    this.broadcast('player_killed', {
        victim: victimId,
        killer: killerId,
        victimName: victim.name,
        killerName: killer?.name || 'Unknown'
    });
}

// In respawnPlayer method:
respawnPlayer(playerId) {
    const player = this.state.players.get(playerId);
    if (!player) return;
    
    this.spawnPlayer(player);
    
    console.log(`[Shooter] ${player.name} respawned`);
    
    // UPDATED: Send with name
    this.broadcast('player_respawned', {
        playerId: playerId,
        playerName: player.name
    });
}
```

#### ✅ Acceptance Criteria:
- [ ] EventBus emits kill events with player names
- [ ] Server sends player names in messages
- [ ] React components receive events properly

---

### Task 3.6: Cập Nhật Game Profile Configuration

**File**: `client/src/config/gameProfiles.js`

#### 📝 Mục tiêu:
Register Shooter components vào game profiles

#### 🔧 Changes:

```javascript
import { 
    CaroRoleBadge, 
    CaroStatusBadge, 
    CaroExtraInfo 
} from '../components/games/caro/CaroPlayerBadges';

// NEW: Import Shooter components
import {
    ShooterRoleBadge,
    ShooterStatusBadge,
    ShooterExtraInfo
} from '../components/games/shooter/ShooterPlayerBadges';

export const GAME_PROFILES = {
    caro: {
        // ... existing caro config
    },
    
    // NEW: Shooter profile
    shooter: {
        minPlayers: 2,
        readyLabel: '⚔️ Ready for Battle',
        statusTexts: {
            waiting: '⏳ Waiting for players to ready up...',
            playing: '🔫 Arena battle in progress',
            finished: '🏁 Match finished - Ready for rematch'
        },
        behaviors: {
            turnBased: false,        // Real-time, not turn-based
            readyStrategy: 'allPlayers',
            allowKicks: true
        },
        components: {
            RoleBadge: ShooterRoleBadge,
            StatusBadge: ShooterStatusBadge,
            ExtraInfo: ShooterExtraInfo
        }
    },
    
    // Test FFA can use shooter components too
    'test-ffa': {
        minPlayers: 2,
        readyLabel: '🧪 Ready for Test',
        statusTexts: {
            waiting: '⏳ Waiting for players...',
            playing: '🧪 Test match in progress',
            finished: '🏁 Test finished'
        },
        behaviors: {
            turnBased: false,
            readyStrategy: 'allPlayers',
            allowKicks: true
        },
        components: {
            RoleBadge: ShooterRoleBadge,
            StatusBadge: ShooterStatusBadge,
            ExtraInfo: ShooterExtraInfo
        }
    }
};
```

#### ✅ Acceptance Criteria:
- [ ] Shooter profile added to GAME_PROFILES
- [ ] All components registered
- [ ] Behaviors configured (turnBased: false)
- [ ] Status texts appropriate for shooter
- [ ] Test FFA also configured

---

### Task 3.7: Integrate Components vào GamePage

**File**: `client/src/pages/GamePage.jsx`

#### 📝 Mục tiêu:
Hiển thị ShooterHUD, KillFeed, Scoreboard trong GamePage

#### 🔧 Changes:

```jsx
// Add imports
import { ShooterHUD } from '../components/games/shooter/ShooterHUD';
import { KillFeed } from '../components/games/shooter/KillFeed';
import { ShooterScoreboard } from '../components/games/shooter/ShooterScoreboard';

// In GamePage component, add state
const [gameState, setGameState] = useState('waiting');

// Add effect to listen to game state
useEffect(() => {
    if (!currentRoom?.state) return;
    
    const listener = currentRoom.state.listen('gameState', (value) => {
        setGameState(value);
    });
    
    return () => listener?.clear();
}, [currentRoom]);

// In JSX, after PlayersList and before game canvas:
{/* Shooter-specific HUD */}
{gameConfig?.id === 'shooter' && (
    <>
        <ShooterHUD room={currentRoom} gameState={gameState} />
        <KillFeed room={currentRoom} />
        <ShooterScoreboard room={currentRoom} gameState={gameState} />
    </>
)}
```

#### Alternative: Conditional Rendering Pattern

```jsx
// More generic approach that works for all games
const renderGameHUD = () => {
    switch(gameConfig?.id) {
        case 'shooter':
            return (
                <>
                    <ShooterHUD room={currentRoom} gameState={gameState} />
                    <KillFeed room={currentRoom} />
                    <ShooterScoreboard room={currentRoom} gameState={gameState} />
                </>
            );
        case 'test-ffa':
            return (
                <>
                    <ShooterHUD room={currentRoom} gameState={gameState} />
                    <KillFeed room={currentRoom} />
                    <ShooterScoreboard room={currentRoom} gameState={gameState} />
                </>
            );
        default:
            return null;
    }
};

// In JSX
{renderGameHUD()}
```

#### ✅ Acceptance Criteria:
- [ ] ShooterHUD shown during gameplay
- [ ] KillFeed shows kill notifications
- [ ] ShooterScoreboard appears when match ends
- [ ] Components only render for shooter game
- [ ] No conflicts with other games

---

### Task 3.8: Visual Polish & Effects

**File**: Various

#### 📝 Mục tiêu:
Add visual feedback, animations, and polish

#### 🔧 Enhancements:

**1. Damage Flash Effect (ShooterScene.js)**

```javascript
// In ShooterScene, add method:
flashDamage(sessionId) {
    const playerObj = this.playerSprites.get(sessionId);
    if (!playerObj) return;
    
    // Flash red
    playerObj.sprite.setTint(0xff0000);
    
    // Reset after 100ms
    this.time.delayedCall(100, () => {
        playerObj.sprite.clearTint();
    });
}

// Listen to damage in setupRoomEvents:
this.room.state.players.forEach((player, sessionId) => {
    player.listen('health', (value, prevValue) => {
        if (value < prevValue) {
            this.flashDamage(sessionId);
        }
    });
});
```

**2. Death Animation (ShooterScene.js)**

```javascript
// In onPlayerRemoved or when isAlive changes:
showDeathAnimation(sessionId) {
    const playerObj = this.playerSprites.get(sessionId);
    if (!playerObj) return;
    
    // Fade out and scale down
    this.tweens.add({
        targets: playerObj.sprite,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
            playerObj.sprite.setVisible(false);
        }
    });
    
    // Show explosion particle effect (simple)
    const particles = this.add.particles(playerObj.sprite.x, playerObj.sprite.y, 'particle', {
        speed: 100,
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 500
    });
    
    this.time.delayedCall(500, () => particles.destroy());
}
```

**3. Respawn Animation (ShooterScene.js)**

```javascript
showRespawnAnimation(sessionId) {
    const playerObj = this.playerSprites.get(sessionId);
    if (!playerObj) return;
    
    // Fade in and pulse
    playerObj.sprite.setAlpha(0);
    playerObj.sprite.setScale(1.5);
    playerObj.sprite.setVisible(true);
    
    this.tweens.add({
        targets: playerObj.sprite,
        alpha: 1,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut'
    });
}
```

**4. Bullet Trail Effect (ShooterScene.js)**

```javascript
// When creating bullet sprite:
const trail = this.add.graphics();
trail.lineStyle(2, 0xffff00, 0.5);

// In update loop, draw trail
updateBulletSprites() {
    // ... existing code
    
    // Add trail behind bullets
    this.room.state.bullets.forEach(bullet => {
        const sprite = this.bulletSprites.get(bullet.id);
        if (sprite && sprite.trail) {
            // Draw line from previous position to current
            // ... trail logic
        }
    });
}
```

**5. Sound Effects (Optional - ShooterScene.js)**

```javascript
preload() {
    // Load sound files (if you have them)
    this.load.audio('shoot', 'assets/sounds/shoot.mp3');
    this.load.audio('hit', 'assets/sounds/hit.mp3');
    this.load.audio('death', 'assets/sounds/death.mp3');
}

create() {
    // Create sounds
    this.shootSound = this.sound.add('shoot', { volume: 0.3 });
    this.hitSound = this.sound.add('hit', { volume: 0.5 });
    this.deathSound = this.sound.add('death', { volume: 0.6 });
}

// Play on events:
handleShoot() {
    // ... existing code
    this.shootSound?.play();
}
```

#### ✅ Acceptance Criteria:
- [ ] Damage flash when hit
- [ ] Death animation on elimination
- [ ] Respawn animation
- [ ] Bullet trails (optional)
- [ ] Sound effects (optional)
- [ ] Smooth transitions

---

## ✅ Verification Plan

### Manual Testing Checklist

#### ✅ Test 1: Lobby UI

1. Create Shooter room
2. Verify in lobby:
   - [ ] Shooter-specific ready button text
   - [ ] ShooterRoleBadge shows K/D if player has stats
   - [ ] ShooterStatusBadge shows ready status
   - [ ] ShooterExtraInfo shows during/after game
   - [ ] All styling consistent

---

#### ✅ Test 2: In-Game HUD

1. Start shooter match
2. Verify HUD elements:
   - [ ] Health bar displays correctly
   - [ ] Health bar color changes (green → yellow → red)
   - [ ] K/D stats update in real-time
   - [ ] Timer counts down smoothly
   - [ ] Score limit shown
   - [ ] Mini leaderboard updates
   - [ ] Crosshair centered and visible
   - [ ] All elements positioned correctly

---

#### ✅ Test 3: Kill Feed

1. Play match and eliminate players
2. Verify kill feed:
   - [ ] Shows kill notifications
   - [ ] Displays correct killer and victim names
   - [ ] Handles suicide (self-kill)
   - [ ] Slides in from right
   - [ ] Auto-removes after 5 seconds
   - [ ] Shows max 5 kills
   - [ ] Doesn't block gameplay

---

#### ✅ Test 4: End-Game Scoreboard

1. Complete a match
2. Verify scoreboard:
   - [ ] Appears when match ends
   - [ ] Shows winner prominently
   - [ ] All players listed with stats
   - [ ] Sorted by score (descending)
   - [ ] Winner highlighted
   - [ ] Current player highlighted
   - [ ] Medals for top 3
   - [ ] K/D ratio calculated correctly

---

#### ✅ Test 5: Visual Effects

1. Play match with effects enabled
2. Verify:
   - [ ] Damage flash when hit
   - [ ] Death animation on elimination
   - [ ] Respawn animation
   - [ ] Effects don't cause lag
   - [ ] Effects enhance gameplay

---

#### ✅ Test 6: Multi-Player Experience

1. Join with 4+ players
2. Verify:
   - [ ] All players visible in leaderboard
   - [ ] Kill feed shows all eliminations
   - [ ] Health bars update for all players
   - [ ] No UI overlap or clipping
   - [ ] Scoreboard fits all players

---

#### ✅ Test 7: Responsiveness

1. Test on different screen sizes
2. Verify:
   - [ ] HUD elements position correctly
   - [ ] No text cutoff
   - [ ] Readable on small screens
   - [ ] Scoreboard responsive

---

#### ✅ Test 8: Game Profile Integration

1. Check lobby behavior
2. Verify:
   - [ ] Shooter behaviors applied (turnBased: false)
   - [ ] Ready strategy works
   - [ ] Status texts correct
   - [ ] Components render in PlayerCard

---

## 📊 Deliverables

### Client Files (8 new + 3 updated)

**New Files:**
- ✅ `components/games/shooter/ShooterPlayerBadges.jsx`
- ✅ `components/games/shooter/ShooterHUD.jsx`
- ✅ `components/games/shooter/KillFeed.jsx`
- ✅ `components/games/shooter/ShooterScoreboard.jsx`

**Updated Files:**
- ✅ `games/shooter/ShooterScene.js`
- ✅ `config/gameProfiles.js`
- ✅ `pages/GamePage.jsx`
- ✅ `style.css` (animations)

### Server Files (1 updated)
- ✅ `rooms/shooter/ShooterRoom.js` (send player names in events)

---

## 🎯 Success Criteria

Phase 3 is **COMPLETE** when:

1. ✅ All React components implemented
2. ✅ All components display correctly
3. ✅ Game profile configured
4. ✅ HUD functional and attractive
5. ✅ Kill feed working
6. ✅ Scoreboard displays properly
7. ✅ Visual effects enhance gameplay
8. ✅ No regression in core gameplay
9. ✅ All manual tests pass
10. ✅ UI polished and professional

---

## 🔄 Future Enhancements (Post-Phase 3)

### UI Improvements:
- Mini-map showing player positions
- Weapon selection UI (when multiple weapons added)
- Power-up indicators
- Hit markers (visual feedback on hit)
- Damage numbers floating above players
- Better death screen with stats
- Match replay system

### UX Improvements:
- Settings menu (sound, graphics, controls)
- Key binding customization
- Tutorial/help overlay
- Spectator mode UI
- Chat system
- Emotes/voice lines

### Polish:
- More particle effects
- Screen shake on damage
- Better animations
- Loading screen for match start
- Victory celebration animation
- Level-up notifications (if progression added)

---

## 💡 Design Principles Recap

### Component Patterns
Following established patterns from Caro:
- **PlayerBadges**: Game-specific lobby UI
- **GameProfile**: Centralized configuration
- **EventBus**: Communication between Phaser and React
- **Conditional Rendering**: Game-specific HUD components

### Separation of Concerns
- ✅ **React**: UI overlays, HUD, scoreboard
- ✅ **Phaser**: Game rendering, sprites, effects
- ✅ **Server**: Game logic, validation, state
- ✅ **Config**: Centralized game settings

### Reusability
- HUD pattern can be reused for other FFA games
- Kill feed generic enough for any combat game
- Scoreboard usable for test-ffa and future games
- Components modular and composable

---

## 📝 Notes

### Performance Considerations
- React components optimized with `useMemo`/`useCallback`
- Kill feed limited to 5 entries
- Leaderboard limited to top 5 players
- Effects use Phaser tweens (GPU accelerated)
- No excessive re-renders

### Accessibility
- High contrast colors for readability
- Clear typography
- Important info prominently displayed
- Colorblind-friendly colors (consider)

### Testing Focus
- Focus on real gameplay experience
- Test with actual network latency
- Verify on different browsers
- Check mobile responsive (if applicable)

---

**PHASE 3 COMPLETE → SHOOTER GAME FULLY POLISHED!** 🎨✨

Next: Play, gather feedback, iterate based on user experience! 🎮🎯

