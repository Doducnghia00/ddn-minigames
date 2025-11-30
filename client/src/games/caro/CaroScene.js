import Phaser from 'phaser';
import { TurnBasedGameScene } from '../base/TurnBasedGameScene';


export class CaroScene extends TurnBasedGameScene {
    constructor() {
        super('CaroScene');
    }

    init(data) {
        super.init(data);

        // Canvas dimensions - get from Phaser scale manager
        this.canvasWidth = this.scale.width;
        this.canvasHeight = this.scale.height;

        // Board configuration (will be set from server state)
        this.boardSize = 15;        // Default, will update from server
        this.winCondition = 5;      // Default, will update from server
        this.cellSize = 40;         // Will recalculate based on board size
        this.minCellSize = 28;      // Minimum cell size to keep marks readable
        
        // Calculate offsets (will recalculate when board size changes)
        this.calculateBoardLayout();
        
        // Board marks tracking
        this.boardMarks = new Map();
        this.lastMoveIndex = -1;    // Track last move for highlighting
        
        // Track timeout for modal delay
        this.gameOverTimeout = null;
    }

    /**
     * Calculate board layout based on current board size
     * 
     * Layout structure (top to bottom):
     * - Top margin (minEdgePadding)
     * - Turn indicator (indicatorHeight + indicatorGap)
     * - Board
     * - Bottom margin (minEdgePadding)
     */
    calculateBoardLayout() {
        // Minimum padding from canvas edges
        const minEdgePadding = 30;
        
        // Turn indicator space
        const indicatorHeight = 36;
        const indicatorGap = 36; // Gap between indicator and board
        
        // Calculate available space for board
        const topReserved = minEdgePadding + indicatorHeight + indicatorGap;
        const bottomReserved = minEdgePadding;
        const horizontalReserved = minEdgePadding * 2;
        
        const availableWidth = this.canvasWidth - horizontalReserved;
        const availableHeight = this.canvasHeight - topReserved - bottomReserved;
        
        // Calculate optimal cell size with minimum constraint
        const maxCellWidth = availableWidth / this.boardSize;
        const maxCellHeight = availableHeight / this.boardSize;
        const rawCellSize = Math.min(maxCellWidth, maxCellHeight);
        
        // Enforce minimum cell size to keep marks readable
        this.cellSize = Math.floor(Math.max(rawCellSize, this.minCellSize));
        
        // Calculate board dimensions
        const boardWidth = this.cellSize * this.boardSize;
        const boardHeight = this.cellSize * this.boardSize;
        
        // Center horizontally, position vertically with indicator space
        this.offsetX = (this.canvasWidth - boardWidth) / 2;
        this.offsetY = topReserved + (availableHeight - boardHeight) / 2;
        
        // Store indicator position for createGameUI
        this.indicatorY = minEdgePadding + indicatorHeight / 2;
    }

    create() {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;

        // Background - full canvas size
        this.add.rectangle(centerX, centerY, this.canvasWidth, this.canvasHeight, 0x111827);

        this.createBoard();
        this.createGameUI();

        // Listen to resize events for responsive scaling
        this.scale.on('resize', this.handleResize, this);

        // Cleanup on scene shutdown
        this.events.on('shutdown', this.cleanup, this);
    }

    handleResize(gameSize) {
        // Only recreate if size actually changed
        if (this.canvasWidth === gameSize.width && this.canvasHeight === gameSize.height) {
            return;
        }
        
        console.log('[CaroScene] Handling resize:', gameSize.width, 'x', gameSize.height);
        
        this.canvasWidth = gameSize.width;
        this.canvasHeight = gameSize.height;
        
        this.calculateBoardLayout();
        this.recreateBoard();
        this.repositionGameUI();
    }

    // Method to set room from GamePage
    setRoom(room) {
        // Call base class setRoom which will call setupRoomEvents
        super.setRoom(room);
    }

    cleanup() {
        // Remove resize listener
        this.scale.off('resize', this.handleResize, this);
        
        // Clear game over timeout
        if (this.gameOverTimeout) {
            clearTimeout(this.gameOverTimeout);
            this.gameOverTimeout = null;
        }
        
        if (this.room) {
            this.room.removeAllListeners();
        }
        
        // Clean up turn indicator Phaser objects
        if (this.turnIndicatorBg) {
            this.turnIndicatorBg.destroy();
            this.turnIndicatorBg = null;
        }
        if (this.statusDot) {
            this.statusDot.destroy();
            this.statusDot = null;
        }
        if (this.statusText) {
            this.statusText.destroy();
            this.statusText = null;
        }

        // Clean up hover highlight
        if (this.hoverGraphics) {
            this.hoverGraphics.destroy();
            this.hoverGraphics = null;
        }

        if (this.gameOverModal) this.gameOverModal.destroy();
        if (this.boardMarks) {
            this.boardMarks.forEach(mark => mark.destroy());
            this.boardMarks.clear();
        }
    }

    setupRoomEvents() {
        // Listen to board size changes from server
        this.room.state.listen('boardSize', (value) => {
            if (this.boardSize !== value) {
                console.log('[CaroScene] Board size changed:', this.boardSize, '->', value);
                this.boardSize = value;
                this.calculateBoardLayout();
                this.recreateBoard();
            }
        });

        // Listen to win condition changes from server
        this.room.state.listen('winCondition', (value) => {
            console.log('[CaroScene] Win condition changed:', this.winCondition, '->', value);
            this.winCondition = value;
            // Update UI to show win condition if needed
        });

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
            // Clear any pending game over modal timeout
            if (this.gameOverTimeout) {
                clearTimeout(this.gameOverTimeout);
                this.gameOverTimeout = null;
            }

            this.gameState = 'playing';
            this.hideGameOverModal();
            this.updateGameUI();
        });

        // Listen to game over
        this.room.onMessage("game_over", (message) => {
            this.gameState = 'finished';
            this.updateGameUI();
            
            // Clear any existing timeout
            if (this.gameOverTimeout) {
                clearTimeout(this.gameOverTimeout);
            }
            
            // Delay modal to let last move animation complete and be visible
            this.gameOverTimeout = setTimeout(() => {
                this.showGameOverModal(message.winner);
                this.gameOverTimeout = null;
            }, 800); // 300ms animation + 500ms appreciation time
        });

    }

    createGameUI() {
        // Use stored indicator position from calculateBoardLayout
        const indicatorX = this.canvasWidth / 2;
        const indicatorY = this.indicatorY;

        // Create background pill shape (will be redrawn when text changes)
        this.turnIndicatorBg = this.add.graphics();

        // Create status dot (circle)
        this.statusDot = this.add.circle(0, indicatorY, 5, 0xeab308);

        // Create status text
        this.statusText = this.add.text(0, indicatorY, '⏳ Waiting for opponent...', {
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontStyle: 'bold',
            color: '#fbbf24'
        }).setOrigin(0, 0.5);

        // Initial draw of background and positioning
        this.updateIndicatorLayout();

        // Add pulse animation to dot
        this.tweens.add({
            targets: this.statusDot,
            alpha: { from: 1, to: 0.5 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Update indicator layout based on text width (dynamic pill sizing)
     */
    updateIndicatorLayout() {
        if (!this.statusText || !this.turnIndicatorBg || !this.statusDot) return;

        const indicatorX = this.canvasWidth / 2;
        const indicatorY = this.indicatorY;

        // Calculate dynamic width based on text
        const paddingX = 20;
        const dotSize = 10;
        const gapAfterDot = 12;
        const textWidth = this.statusText.width;
        const contentWidth = paddingX + dotSize + gapAfterDot + textWidth + paddingX;
        const pillWidth = Math.max(contentWidth, 200); // minimum 200px
        const pillHeight = 36;

        // Draw pill background
        this.turnIndicatorBg.clear();
        this.turnIndicatorBg.fillStyle(0x0f172a, 0.95);
        this.turnIndicatorBg.fillRoundedRect(
            indicatorX - pillWidth / 2, 
            indicatorY - pillHeight / 2, 
            pillWidth, 
            pillHeight, 
            pillHeight / 2
        );
        this.turnIndicatorBg.lineStyle(1, 0x94a3b8, 0.3);
        this.turnIndicatorBg.strokeRoundedRect(
            indicatorX - pillWidth / 2, 
            indicatorY - pillHeight / 2, 
            pillWidth, 
            pillHeight, 
            pillHeight / 2
        );

        // Position dot and text relative to pill
        const leftX = indicatorX - pillWidth / 2;
        this.statusDot.setPosition(leftX + paddingX + dotSize / 2, indicatorY);
        this.statusText.setPosition(this.statusDot.x + dotSize / 2 + gapAfterDot, indicatorY);
    }

    updateGameUI() {
        if (!this.statusDot || !this.statusText) return;

        if (this.gameState === 'waiting') {
            this.statusDot.setFillStyle(0xeab308);
            this.statusText.setText('⏳ Waiting for opponent...');
            this.statusText.setColor('#fbbf24');
        } else if (this.gameState === 'playing') {
            const currentPlayer = this.players.get(this.currentTurn);
            const isMyTurn = this.isMyTurn();

            this.statusDot.setFillStyle(isMyTurn ? 0x10b981 : 0xef4444);

            if (isMyTurn) {
                this.statusText.setText('🎮 Your turn');
                this.statusText.setColor('#10b981');
            } else if (currentPlayer) {
                this.statusText.setText(`🎮 ${currentPlayer.name}'s turn`);
                this.statusText.setColor('#ef4444');
            }
        } else if (this.gameState === 'finished') {
            this.statusDot.setFillStyle(0x8b5cf6);
            this.statusText.setText('🏁 Game over - Ready up!');
            this.statusText.setColor('#a78bfa');
        }

        // Redraw pill background with new text width
        this.updateIndicatorLayout();
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

        this.gameOverModal = this.add.dom(this.canvasWidth / 2, this.canvasHeight / 2).createFromHTML(modalHTML);

        // Add event listeners
        setTimeout(() => {
            const closeBtn = document.getElementById('close-modal-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideGameOverModal());
            }
        }, 100);
    }

    hideGameOverModal() {
        // Clear any pending game over modal timeout
        if (this.gameOverTimeout) {
            clearTimeout(this.gameOverTimeout);
            this.gameOverTimeout = null;
        }
        
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

        // Store graphics for cleanup
        this.boardGraphics = [boardBg, graphics];

        // Hover highlight graphics
        this.hoverGraphics = this.add.graphics();

        // Interactive Zone - only cover the board area (not full canvas)
        const boardWidth = this.boardSize * this.cellSize;
        const boardHeight = this.boardSize * this.cellSize;
        const boardCenterX = this.offsetX + boardWidth / 2;
        const boardCenterY = this.offsetY + boardHeight / 2;

        this.boardZone = this.add
            .zone(boardCenterX, boardCenterY, boardWidth, boardHeight)
            .setInteractive()
            .on('pointermove', (pointer) => {
                // Only show hover if game is playing and it's my turn
                if (!this.room || this.gameState !== 'playing' || !this.isMyTurn()) {
                    this.hoverGraphics.clear();
                    return;
                }

                const x = Math.floor((pointer.x - this.offsetX) / this.cellSize);
                const y = Math.floor((pointer.y - this.offsetY) / this.cellSize);

                this.hoverGraphics.clear();
                
                // Check if cell is valid and empty
                if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
                    const index = y * this.boardSize + x;
                    
                    // Check if cell is empty (no mark exists for this index)
                    const isEmpty = !this.boardMarks.has(index);
                    
                    if (isEmpty) {
                        // Draw hover highlight
                        this.hoverGraphics.lineStyle(2, 0x4ade80, 0.6);
                        this.hoverGraphics.strokeRect(
                            this.offsetX + x * this.cellSize + 2,
                            this.offsetY + y * this.cellSize + 2,
                            this.cellSize - 4,
                            this.cellSize - 4
                        );
                    }
                }
            })
            .on('pointerout', () => {
                this.hoverGraphics.clear();
            })
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
                    this.lastMoveIndex = y * this.boardSize + x;
                    this.room.send("move", { x, y });
                }
            });
    }

    /**
     * Recreate board when size changes
     */
    recreateBoard() {
        console.log('[CaroScene] Recreating board with size:', this.boardSize);
        
        // Destroy old board graphics
        if (this.boardGraphics) {
            this.boardGraphics.forEach(g => g.destroy());
            this.boardGraphics = null;
        }
        
        // Destroy hover graphics
        if (this.hoverGraphics) {
            this.hoverGraphics.destroy();
            this.hoverGraphics = null;
        }

        // Destroy board zone
        if (this.boardZone) {
            this.boardZone.destroy();
            this.boardZone = null;
        }
        
        // Clear all marks
        if (this.boardMarks) {
            this.boardMarks.forEach(mark => mark.destroy());
            this.boardMarks.clear();
        }
        
        // Recreate board with new size
        this.createBoard();
        
        // Reposition turn indicator
        this.repositionGameUI();
        
        // Restore marks from current state
        if (this.room && this.room.state && this.room.state.board) {
            this.updateBoard(this.room.state.board);
        }
    }

    /**
     * Reposition turn indicator when board layout changes
     */
    repositionGameUI() {
        // Update layout with new canvas dimensions
        this.updateIndicatorLayout();
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

            // Scale font size based on cell size (roughly 70% of cell)
            const fontSize = Math.floor(this.cellSize * 0.7);
            const text = this.add.text(px, py, value === 1 ? '✕' : '◯', {
                fontSize: `${fontSize}px`,
                fill: value === 1 ? '#ef4444' : '#3b82f6',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            text.setData('symbol', value);

            // Special animation for last move
            const isLastMove = index === this.lastMoveIndex;
            
            if (isLastMove) {
                // Bigger bounce animation for last move
                this.tweens.add({
                    targets: text,
                    scale: { from: 0, to: 1.15 },
                    duration: 300,
                    ease: 'Back.out',
                    yoyo: true,
                    repeat: 0,
                    onComplete: () => {
                        text.setScale(1);
                    }
                });
            } else {
                // Normal animation
            this.tweens.add({
                targets: text,
                scale: { from: 0, to: 1 },
                duration: 200,
                ease: 'Back.out'
            });
            }

            this.boardMarks.set(index, text);
        });
    }

    shutdown() {
        this.cleanup();
    }
}
