import Phaser from 'phaser';
import * as Colyseus from 'colyseus.js';
import { GameUIManager } from '../../utils/GameUIManager';

export class CaroScene extends Phaser.Scene {
    constructor() {
        super('CaroScene');
    }

    init(data) {
        this.client = new Colyseus.Client('ws://localhost:2567');
        this.room = null;
        this.user = data.user;
        this.cellSize = 40;
        this.boardSize = 15;
        this.offsetX = (800 - this.cellSize * this.boardSize) / 2;
        this.offsetY = (600 - this.cellSize * this.boardSize) / 2;

        // Initialize UI Manager
        this.uiManager = new GameUIManager();
    }

    async create() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x111827); // Gray-900

        this.createBoard();
        this.createUI();

        if (this.scene.settings.data.room) {
            this.room = this.scene.settings.data.room;
            this.setupRoomEvents();
        } else {
            try {
                this.room = await this.client.joinOrCreate("caro", {
                    name: this.user?.name || "Guest",
                    avatar: this.user?.avatar || ""
                });
                this.setupRoomEvents();
            } catch (e) {
                console.error("Join error", e);
                // Show error in UI
            }
        }

        // Ensure cleanup on scene shutdown
        this.events.on('shutdown', this.cleanup, this);
    }

    cleanup() {
        if (this.uiManager) {
            this.uiManager.hideGameHeader();
        }
        if (this.room) {
            this.room.removeAllListeners();
        }
    }

    setupRoomEvents() {
        console.log("Joined Caro room", this.room.sessionId);

        this.room.onStateChange((state) => {
            this.updateBoard(state.board);
            this.updateStatus(state);
            this.updatePlayerList(state);
        });

        this.room.onMessage("game_over", (message) => {
            this.handleGameOver(message);
        });

        this.room.onMessage("game_reset", () => {
            console.log("Game reset for rematch");
            // Board will be updated via state change
        });
    }

    updatePlayerList(state) {
        const players = new Map();
        state.players.forEach((player, id) => {
            players.set(id, {
                id: player.id,
                name: player.name,
                avatar: player.avatar,
                symbol: player.symbol,
                isOwner: player.isOwner
            });
        });
        this.uiManager.updatePlayers(players, state.roomOwner);
    }

    createBoard() {
        // Board Container
        const boardBg = this.add.graphics();
        boardBg.fillStyle(0x1f2937, 1); // Gray-800
        boardBg.fillRoundedRect(this.offsetX - 20, this.offsetY - 20, this.boardSize * this.cellSize + 40, this.boardSize * this.cellSize + 40, 16);
        boardBg.lineStyle(2, 0x374151, 1); // Gray-700
        boardBg.strokeRoundedRect(this.offsetX - 20, this.offsetY - 20, this.boardSize * this.cellSize + 40, this.boardSize * this.cellSize + 40, 16);

        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x374151); // Faint grid lines

        // Draw grid
        for (let i = 0; i <= this.boardSize; i++) {
            graphics.moveTo(this.offsetX, this.offsetY + i * this.cellSize);
            graphics.lineTo(this.offsetX + this.boardSize * this.cellSize, this.offsetY + i * this.cellSize);
            graphics.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
            graphics.lineTo(this.offsetX + i * this.cellSize, this.offsetY + this.boardSize * this.cellSize);
        }
        graphics.strokePath();

        // Interactive Zone
        this.add.zone(400, 300, 800, 600).setInteractive().on('pointerdown', (pointer) => {
            if (!this.room) return;
            const x = Math.floor((pointer.x - this.offsetX) / this.cellSize);
            const y = Math.floor((pointer.y - this.offsetY) / this.cellSize);
            if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
                this.room.send("move", { x, y });
            }
        });
    }

    updateBoard(board) {
        if (this.marks) this.marks.forEach(m => m.destroy());
        this.marks = [];

        board.forEach((value, index) => {
            if (value === 0) return;
            const x = index % 15;
            const y = Math.floor(index / 15);
            const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
            const py = this.offsetY + y * this.cellSize + this.cellSize / 2;

            // Improved X/O visuals
            const text = this.add.text(px, py, value === 1 ? '✕' : '◯', {
                fontSize: '28px',
                fill: value === 1 ? '#ef4444' : '#3b82f6', // Red-500 / Blue-500
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // Add pop animation
            this.tweens.add({
                targets: text,
                scale: { from: 0, to: 1 },
                duration: 200,
                ease: 'Back.out'
            });

            this.marks.push(text);
        });
    }

    updateStatus(state) {
        if (!this.statusBadge) return;

        const statusText = this.statusBadge.getChildByID('statusText');
        const statusDot = this.statusBadge.getChildByID('statusDot');
        const statusBadgeDiv = this.statusBadge.getChildByID('statusBadge');

        if (!statusText) return;

        if (state.gameState === "waiting") {
            statusText.innerHTML = '<span>Waiting for opponent...</span>';
            statusDot.className = "w-3 h-3 rounded-full bg-yellow-500 animate-pulse";
            statusBadgeDiv.className = "bg-gray-800/90 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-full shadow-xl flex items-center gap-3";
        } else if (state.gameState === "playing") {
            const currentPlayer = state.players.get(state.currentTurn);
            if (currentPlayer) {
                const isMyTurn = state.currentTurn === this.room.sessionId;
                const avatarHtml = currentPlayer.avatar ?
                    `<img src="${currentPlayer.avatar}" referrerpolicy="no-referrer" class="w-6 h-6 rounded-full" alt="${currentPlayer.name}"/>` :
                    `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">${currentPlayer.name[0]?.toUpperCase()}</div>`;

                statusText.innerHTML = `
                    ${avatarHtml}
                    <span>${currentPlayer.name}'s turn</span>
                `;
                statusDot.className = `w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500' : 'bg-red-500'} animate-pulse`;
                statusBadgeDiv.className = `bg-gray-800/90 backdrop-blur-md border ${isMyTurn ? 'border-green-500/50' : 'border-red-500/30'} px-6 py-3 rounded-full shadow-xl flex items-center gap-3 transition-all duration-300`;
            }
        }
    }

    handleGameOver(message) {
        let title = "";
        let subtitle = "";
        let colorClass = "";

        if (message.winner === this.room.sessionId) {
            title = "VICTORY!";
            subtitle = "You dominated the arena.";
            colorClass = "text-green-400";
        } else if (message.winner === "draw") {
            title = "DRAW";
            subtitle = "A perfectly matched battle.";
            colorClass = "text-gray-400";
        } else if (message.winner === "opponent_left") {
            title = "VICTORY!";
            subtitle = "Opponent forfeited.";
            colorClass = "text-green-400";
        } else {
            title = "DEFEAT";
            subtitle = "Better luck next time.";
            colorClass = "text-red-500";
        }

        this.gameOverOverlay = this.add.dom(400, 300).createFromHTML(`
            <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                <div class="bg-gray-900 p-10 rounded-3xl border border-gray-700 shadow-2xl text-center transform scale-95 animate-pop-in">
                    <div class="text-6xl mb-4">${message.winner === this.room.sessionId ? '🏆' : '💀'}</div>
                    <h2 class="text-5xl font-black italic mb-2 ${colorClass}">${title}</h2>
                    <p class="text-gray-400 mb-8 text-lg">${subtitle}</p>
                    
                    <div id="rematch-status" class="mb-4 text-sm text-gray-400"></div>
                    
                    <div class="flex gap-3 justify-center">
                        <button id="rematchBtn" class="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition transform hover:-translate-y-1 shadow-lg">
                            Rematch
                        </button>
                        <button id="backBtn" class="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition transform hover:-translate-y-1 shadow-lg">
                            Leave
                        </button>
                    </div>
                </div>
            </div>
        `);

        this.gameOverOverlay.addListener('click');
        this.gameOverOverlay.on('click', (event) => {
            if (event.target.id === 'rematchBtn') {
                this.room.send('rematch');
                this.updateRematchStatus(true);
            } else if (event.target.id === 'backBtn') {
                this.room.leave();
                this.scene.start('LobbyScene', { user: this.user });
            }
        });

        // Listen for rematch votes
        this.room.state.rematchVotes.onAdd = (value, key) => {
            this.updateRematchStatus(this.room.state.rematchVotes.has(this.room.sessionId));
        };
    }

    updateRematchStatus(hasVoted) {
        if (!this.gameOverOverlay) return;
        const statusDiv = this.gameOverOverlay.getChildByID('rematch-status');
        const rematchBtn = this.gameOverOverlay.getChildByID('rematchBtn');

        if (statusDiv) {
            const voteCount = this.room.state.rematchVotes.size;
            const totalPlayers = this.room.state.players.size;

            if (hasVoted) {
                statusDiv.innerText = `Waiting for opponent... (${voteCount}/${totalPlayers})`;
                if (rematchBtn) {
                    rematchBtn.disabled = true;
                    rematchBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            } else {
                statusDiv.innerText = '';
            }
        }
    }

    createUI() {
        // Show game header outside Phaser canvas
        this.uiManager.showGameHeader('Caro Arena', this.user, () => {
            if (this.room) this.room.leave();
            this.scene.start('LobbyScene', { user: this.user });
        });

        // Set kick callback
        this.uiManager.setKickCallback((playerId) => {
            if (this.room) {
                this.room.send('kick_player', { targetId: playerId });
            }
        });

        // Status Badge - Bottom Center (still in Phaser for dynamic updates)
        this.statusBadge = this.add.dom(400, 570, 'div').setOrigin(0.5, 1).createFromHTML(`
            <div id="statusBadge" class="bg-gray-800/90 backdrop-blur-md border border-gray-700 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 transition-all">
                <div id="statusDot" class="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                <span id="statusText" class="font-bold text-gray-200 flex items-center gap-2">
                    <span>Waiting for opponent...</span>
                </span>
            </div>
        `);
    }

    shutdown() {
        // Cleanup is handled by the 'shutdown' event listener
        this.cleanup();
    }
}
