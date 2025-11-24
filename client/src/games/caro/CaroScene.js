import Phaser from 'phaser';

export class CaroScene extends Phaser.Scene {
    constructor() {
        super('CaroScene');
    }

    init(data) {
        this.room = null;
        this.user = data?.user || null;
        this.cellSize = 40;
        this.boardSize = 15;
        this.offsetX = (800 - this.cellSize * this.boardSize) / 2;
        this.offsetY = (600 - this.cellSize * this.boardSize) / 2;
    }

    create() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x111827);

        this.createBoard();

        // Cleanup on scene shutdown
        this.events.on('shutdown', this.cleanup, this);
    }

    // Method to set room from GamePage
    setRoom(room) {
        this.room = room;
        if (this.room) {
            this.setupRoomEvents();
        }
    }

    cleanup() {
        if (this.room) {
            this.room.removeAllListeners();
        }
    }

    setupRoomEvents() {
        console.log("CaroScene: Room connected", this.room.sessionId);

        this.room.onStateChange((state) => {
            this.updateBoard(state.board);
        });
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
                console.log("Click detected at:", pointer.x, pointer.y);
                if (!this.room) {
                    console.log("No room connected!");
                    return;
                }
                const x = Math.floor((pointer.x - this.offsetX) / this.cellSize);
                const y = Math.floor((pointer.y - this.offsetY) / this.cellSize);
                console.log("Cell clicked:", x, y);
                if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
                    console.log("Sending move to server:", x, y);
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

    shutdown() {
        this.cleanup();
    }
}
