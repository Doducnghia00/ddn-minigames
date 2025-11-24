// Game UI Manager - handles UI elements outside Phaser canvas
export class GameUIManager {
    constructor() {
        this.headerElement = document.getElementById('game-header');
        this.players = new Map();
        this.roomOwner = null;
        this.currentUser = null;
        this.onLeaveCallback = null;
        this.onKickCallback = null;
        this.onPasswordChangeCallback = null;
    }

    showGameHeader(roomName, currentUser, onLeave) {
        if (!this.headerElement) return;

        this.currentUser = currentUser;
        this.onLeaveCallback = onLeave;

        this.headerElement.innerHTML = `
            <div class="flex justify-between items-center max-w-6xl mx-auto gap-8">
                <!-- Room Info -->
                <div class="bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-xl px-4 py-3 shadow-lg">
                    <div class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Room</div>
                    <div class="text-lg font-bold text-white flex items-center gap-2">
                        <span>${roomName || 'Game Room'}</span>
                        <span class="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Live</span>
                    </div>
                </div>

                <!-- Player List -->
                <div id="player-list-container" class="flex-grow bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-xl px-4 py-3 shadow-lg">
                    <div class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Players</div>
                    <div id="player-list" class="flex gap-3"></div>
                </div>

                <!-- Leave Button -->
                <button id="game-leave-btn" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-lg font-bold transition backdrop-blur-md cursor-pointer whitespace-nowrap">
                    Leave Match
                </button>
            </div>
        `;

        this.headerElement.classList.remove('hidden');

        // Attach event listener
        const leaveBtn = document.getElementById('game-leave-btn');
        if (leaveBtn && onLeave) {
            leaveBtn.addEventListener('click', onLeave);
        }
    }

    updatePlayers(players, roomOwner) {
        this.players = players;
        this.roomOwner = roomOwner;
        this.renderPlayerList();
    }

    renderPlayerList() {
        const container = document.getElementById('player-list');
        if (!container) return;

        container.innerHTML = Array.from(this.players.values()).map(player => {
            const isOwner = player.id === this.roomOwner;
            const isCurrentUser = player.id === this.currentUser?.sessionId;

            return `
                <div class="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg ${isCurrentUser ? 'ring-2 ring-green-500/50' : ''}">
                    ${player.avatar ?
                    `<img src="${player.avatar}" referrerpolicy="no-referrer" class="w-8 h-8 rounded-full" alt="${player.name}"/>` :
                    `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">${player.name[0]?.toUpperCase()}</div>`
                }
                    <div class="flex flex-col">
                        <div class="text-sm font-bold text-white flex items-center gap-1">
                            ${player.name}
                            ${isOwner ? '<span class="text-yellow-400">👑</span>' : ''}
                        </div>
                        <div class="text-xs text-gray-400">${player.symbol === 1 ? 'X' : 'O'}</div>
                    </div>
                    ${isOwner && this.currentUser?.sessionId === this.roomOwner && !isCurrentUser ?
                    `<button class="kick-btn ml-2 text-red-400 hover:text-red-300 text-xs" data-player-id="${player.id}">Kick</button>` :
                    ''
                }
                </div>
            `;
        }).join('');

        // Attach kick button listeners
        container.querySelectorAll('.kick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                if (this.onKickCallback) {
                    this.onKickCallback(playerId);
                }
            });
        });
    }

    setKickCallback(callback) {
        this.onKickCallback = callback;
    }

    setPasswordChangeCallback(callback) {
        this.onPasswordChangeCallback = callback;
    }

    hideGameHeader() {
        if (!this.headerElement) return;

        // Remove all event listeners by cloning and replacing
        const newHeader = this.headerElement.cloneNode(false);
        this.headerElement.parentNode.replaceChild(newHeader, this.headerElement);
        this.headerElement = newHeader;

        this.headerElement.classList.add('hidden');
        this.headerElement.innerHTML = '';
        this.players.clear();
        this.roomOwner = null;
        this.onLeaveCallback = null;
        this.onKickCallback = null;
    }
}

