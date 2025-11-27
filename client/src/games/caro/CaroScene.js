import Phaser from 'phaser';
import { TurnBasedGameScene } from '../base/TurnBasedGameScene';
import { CARO_CONFIG } from './config';

export class CaroScene extends TurnBasedGameScene {
    constructor() {
        super('CaroScene');
    }

    init(data) {
        super.init(data);

        // Caro-specific initialization
        this.cellSize = CARO_CONFIG.rules.cellSize;
        this.boardSize = CARO_CONFIG.rules.boardSize;
        this.offsetX = (CARO_CONFIG.phaserConfig.width - this.cellSize * this.boardSize) / 2;
        this.offsetY = (CARO_CONFIG.phaserConfig.height - this.cellSize * this.boardSize) / 2;
        this.boardMarks = new Map();
    }

    create() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x111827);

        this.createBoard();
        this.createGameUI();

        // Cleanup on scene shutdown
        this.events.on('shutdown', this.cleanup, this);
    }

    // Method to set room from GamePage
    setRoom(room) {
        // Call base class setRoom which will call setupRoomEvents
        super.setRoom(room);
    }

    cleanup() {
        if (this.room) {
            this.room.removeAllListeners();
        }
        // Clean up DOM elements
        if (this.turnIndicator) {
            this.turnIndicator.remove();
            this.turnIndicator = null;
            this.statusDot = null;
            this.statusText = null;
        }

        // Fallback: remove any orphaned turn indicator
        const orphanedIndicator = document.getElementById('caro-turn-indicator');
        if (orphanedIndicator) {
            orphanedIndicator.remove();
        }

        if (this.gameOverModal) this.gameOverModal.destroy();
        if (this.boardMarks) {
            this.boardMarks.forEach(mark => mark.destroy());
            this.boardMarks.clear();
        }
    }

    setupRoomEvents() {
        // console.log("CaroScene: Room connected", this.room.sessionId);

        // Listen to state changes
        this.room.onStateChange((state) => {
            this.updateBoard(state.board);

            // Update game state
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
            this.players = playerMap;
            this.roomOwner = state.roomOwner;
            this.setCurrentTurn(state.currentTurn);

            // Only update gameState if not finished
            if (this.gameState !== 'finished') {
                this.gameState = state.gameState;
            }

            this.updateGameUI();
        });

        // Listen to game start
        this.room.onMessage("start_game", (message) => {
            // console.log("Game started!", message);
            this.gameState = 'playing';
            this.hideGameOverModal();
            this.updateGameUI();
        });

        // Listen to game over
        this.room.onMessage("game_over", (message) => {
            // console.log("Game over!", message);
            this.gameState = 'finished';
            this.showGameOverModal(message.winner);
            this.updateGameUI();
        });

    }

    createGameUI() {
        const existingIndicator = document.getElementById('caro-turn-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create turn indicator container
        this.turnIndicator = document.createElement('div');
        this.turnIndicator.id = 'caro-turn-indicator';
        this.turnIndicator.style.position = 'absolute';
        this.turnIndicator.style.top = '16px';
        this.turnIndicator.style.left = '50%';
        this.turnIndicator.style.transform = 'translateX(-50%)';
        this.turnIndicator.style.zIndex = '1000';
        this.turnIndicator.style.pointerEvents = 'none';
        this.turnIndicator.innerHTML = `
            <div style="
                background: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(148, 163, 184, 0.3);
                border-radius: 9999px;
                padding: 12px 24px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-family: Inter, system-ui, sans-serif;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.35);
            ">
                <div data-role="status-dot" style="
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #eab308;
                "></div>
                <span data-role="status-text" style="
                    font-size: 16px;
                    font-weight: bold;
                    color: #f1f5f9;
                ">⏳ Waiting for opponent...</span>
            </div>
        `;
        document.body.appendChild(this.turnIndicator);
        this.statusDot = this.turnIndicator.querySelector('[data-role="status-dot"]');
        this.statusText = this.turnIndicator.querySelector('[data-role="status-text"]');
    }

    updateGameUI() {
        const statusDot = this.statusDot;
        const statusText = this.statusText;
        if (!statusDot || !statusText) return;

        if (this.gameState === 'waiting') {
            statusDot.style.background = '#eab308';
            statusDot.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
            statusText.innerHTML = '⏳ Waiting for opponent...';
            statusText.style.color = '#fbbf24';
        } else if (this.gameState === 'playing') {
            const currentPlayer = this.players.get(this.currentTurn);
            const isMyTurn = this.isMyTurn();

            statusDot.style.background = isMyTurn ? '#10b981' : '#ef4444';
            statusDot.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';

            if (isMyTurn) {
                statusText.innerHTML = '🎮 Your turn';
                statusText.style.color = '#10b981';
            } else if (currentPlayer) {
                statusText.innerHTML = `🎮 ${currentPlayer.name}'s turn`;
                statusText.style.color = '#ef4444';
            }
        } else if (this.gameState === 'finished') {
            statusDot.style.background = '#8b5cf6';
            statusDot.style.animation = 'none';
            statusText.innerHTML = '🏁 The game is over - please Ready up';
            statusText.style.color = '#a78bfa';
        }
    }

    showGameOverModal(winner) {
        const isWinner = winner === this.room?.sessionId;
        const isDraw = winner === 'draw';

        const modalHTML = `
            <div style="
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 50;
                animation: fadeIn 0.3s ease-out;
            ">
                <div style="
                    background: #0f172a;
                    padding: 40px;
                    border-radius: 24px;
                    border: 1px solid #334155;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    max-width: 400px;
                    animation: scaleIn 0.3s ease-out;
                ">
                    <div style="font-size: 64px; margin-bottom: 16px;">
                        ${isWinner ? '🏆' : isDraw ? '🤝' : '💀'}
                    </div>
                    <h2 style="
                        font-size: 48px;
                        font-weight: 900;
                        font-style: italic;
                        margin-bottom: 8px;
                        color: ${isWinner ? '#10b981' : isDraw ? '#9ca3af' : '#ef4444'};
                        font-family: Inter, sans-serif;
                    ">
                        ${isWinner ? 'VICTORY!' : isDraw ? 'DRAW' : 'DEFEAT'}
                    </h2>
                    <p style="
                        color: #9ca3af;
                        margin-bottom: 32px;
                        font-size: 18px;
                        font-family: Inter, sans-serif;
                    ">
                        ${isWinner ? 'You dominated the arena.' : isDraw ? 'A perfectly matched battle.' : 'Better luck next time.'}
                    </p>
                    <button id="close-modal-btn" style="
                        padding: 12px 40px;
                        background: linear-gradient(to right, #2563eb, #3b82f6);
                        color: white;
                        font-weight: bold;
                        border-radius: 12px;
                        border: none;
                        cursor: pointer;
                        transition: transform 0.2s;
                        font-family: Inter, sans-serif;
                        font-size: 16px;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        OK
                    </button>
                </div>
            </div>
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
        `;

        this.gameOverModal = this.add.dom(400, 300).createFromHTML(modalHTML);

        // Add event listeners
        setTimeout(() => {
            const closeBtn = document.getElementById('close-modal-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideGameOverModal());
            }
        }, 100);
    }

    hideGameOverModal() {
        if (this.gameOverModal) {
            this.gameOverModal.destroy();
            this.gameOverModal = null;
        }
    }

    createBoard() {
        // Board Container
        const boardBg = this.add.graphics();
        boardBg.fillStyle(0x1f2937, 1); // Gray-800
        boardBg.fillRoundedRect(
            this.offsetX - 20,
            this.offsetY - 20,
            this.boardSize * this.cellSize + 40,
            this.boardSize * this.cellSize + 40,
            16
        );
        boardBg.lineStyle(2, 0x374151, 1); // Gray-700
        boardBg.strokeRoundedRect(
            this.offsetX - 20,
            this.offsetY - 20,
            this.boardSize * this.cellSize + 40,
            this.boardSize * this.cellSize + 40,
            16
        );

        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x374151); // Faint grid lines

        // Draw grid
        for (let i = 0; i <= this.boardSize; i++) {
            graphics.moveTo(this.offsetX, this.offsetY + i * this.cellSize);
            graphics.lineTo(
                this.offsetX + this.boardSize * this.cellSize,
                this.offsetY + i * this.cellSize
            );
            graphics.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
            graphics.lineTo(
                this.offsetX + i * this.cellSize,
                this.offsetY + this.boardSize * this.cellSize
            );
        }
        graphics.strokePath();

        // Interactive Zone
        this.add
            .zone(400, 300, 800, 600)
            .setInteractive()
            .on('pointerdown', (pointer) => {
                if (!this.room || this.gameState !== 'playing') {
                    return;
                }

                // Only allow moves on your turn
                if (!this.isMyTurn()) {
                    return;
                }

                const x = Math.floor((pointer.x - this.offsetX) / this.cellSize);
                const y = Math.floor((pointer.y - this.offsetY) / this.cellSize);

                if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
                    this.room.send("move", { x, y });
                }
            });
    }

    updateBoard(board) {
        if (!this.boardMarks) {
            this.boardMarks = new Map();
        }

        board.forEach((value, index) => {
            const existingMark = this.boardMarks.get(index);

            if (value === 0) {
                if (existingMark) {
                    existingMark.destroy();
                    this.boardMarks.delete(index);
                }
                return;
            }

            // If the mark already exists with the same symbol, no need to recreate
            if (existingMark && existingMark.getData('symbol') === value) {
                return;
            }

            if (existingMark) {
                existingMark.destroy();
                this.boardMarks.delete(index);
            }

            const x = index % this.boardSize;
            const y = Math.floor(index / this.boardSize);
            const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
            const py = this.offsetY + y * this.cellSize + this.cellSize / 2;

            const text = this.add.text(px, py, value === 1 ? '✕' : '◯', {
                fontSize: '28px',
                fill: value === 1 ? '#ef4444' : '#3b82f6',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            text.setData('symbol', value);

            this.tweens.add({
                targets: text,
                scale: { from: 0, to: 1 },
                duration: 200,
                ease: 'Back.out'
            });

            this.boardMarks.set(index, text);
        });
    }

    shutdown() {
        this.cleanup();
    }
}
