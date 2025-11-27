import Phaser from 'phaser';
import { FreeForAllGameScene } from '../base/FreeForAllGameScene';

/**
 * ShooterScene - Client-side scene for Arena Shooter game
 * Extends FreeForAllGameScene with shooter-specific rendering and input
 */
export class ShooterScene extends FreeForAllGameScene {
    constructor() {
        super('ShooterScene');

        // Sprite tracking
        this.playerSprites = new Map();  // sessionId -> { sprite, nameText, healthBar }
        this.bulletSprites = new Map();  // bulletId -> sprite

        // Input
        this.keys = {};
        this.isMoving = { up: false, down: false, left: false, right: false };
    }

    init(data) {
        super.init(data);

        // Clear sprite maps
        this.playerSprites.clear();
        this.bulletSprites.clear();

        // Reset movement tracking
        this.currentMoveDirection = null;
    }

    create() {
        this.createArena();
        this.setupInput();
        this.createHUD();
    }

    /**
     * Setup server message listeners
     */
    setupServerMessages() {
        if (!this.room) return;

        // Listen to kill events
        this.room.onMessage('player_killed', (data) => {
            console.log('[ShooterScene] Player killed:', data.victimName, 'by', data.killerName);
            // Future: show kill feed notification
        });

        // Listen to respawn events
        this.room.onMessage('player_respawned', (data) => {
            console.log('[ShooterScene] Player respawned:', data.playerName);
            // Future: show respawn notification
        });
    }

    /**
     * Create arena background and borders
     */
    createArena() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Background
        this.add.rectangle(centerX, centerY, 800, 600, 0x1a1a2e);

        // Arena border
        const border = this.add.rectangle(centerX, centerY, 800, 600);
        border.setStrokeStyle(3, 0x00ff88);

        // Grid lines (optional, for visual reference)
        const gridSize = 50;
        for (let x = 0; x <= 800; x += gridSize) {
            this.add.line(0, 0, x, 0, x, 600, 0x2a2a3e, 0.3)
                .setOrigin(0);
        }
        for (let y = 0; y <= 600; y += gridSize) {
            this.add.line(0, 0, 0, y, 800, y, 0x2a2a3e, 0.3)
                .setOrigin(0);
        }
    }

    /**
     * Setup input handling
     */
    setupInput() {
        // WASD keys
        this.keys.W = this.input.keyboard.addKey('W');
        this.keys.A = this.input.keyboard.addKey('A');
        this.keys.S = this.input.keyboard.addKey('S');
        this.keys.D = this.input.keyboard.addKey('D');

        // Arrow keys (alternative)
        this.keys.UP = this.input.keyboard.addKey('UP');
        this.keys.LEFT = this.input.keyboard.addKey('LEFT');
        this.keys.DOWN = this.input.keyboard.addKey('DOWN');
        this.keys.RIGHT = this.input.keyboard.addKey('RIGHT');

        // Mouse for shooting
        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.handleShoot();
            }
        });

        // Continuous shooting while holding mouse
        this.input.on('pointerup', () => {
            this.isShooting = false;
        });
    }

    /**
     * Create HUD elements
     */
    createHUD() {
        // Timer display (top center)
        this.timerText = this.add.text(400, 20, 'Time: --:--', {
            fontSize: '24px',
            color: '#00ff88',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        // My health bar (bottom left)
        this.myHealthBarBg = this.add.rectangle(100, 580, 200, 20, 0x333333)
            .setOrigin(0, 0.5).setScrollFactor(0);
        this.myHealthBar = this.add.rectangle(100, 580, 200, 20, 0x00ff00)
            .setOrigin(0, 0.5).setScrollFactor(0);

        this.myHealthText = this.add.text(200, 580, '100/100', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        // K/D stats (bottom right)
        this.kdText = this.add.text(700, 580, 'K: 0  D: 0', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        // Leaderboard (top right)
        this.leaderboardText = this.add.text(750, 50, '', {
            fontSize: '12px',
            color: '#ffffff',
            align: 'right'
        }).setOrigin(1, 0).setScrollFactor(0);
    }

    /**
     * Update loop - called every frame
     */
    update() {
        this.handleInput();
        this.updatePlayerSprites();
        this.updateBulletSprites();
        this.updateHUD();
    }

    /**
     * Handle player input
     */
    handleInput() {
        if (!this.room || this.gameState !== 'playing') return;

        const myPlayer = this.room.state.players.get(this.room.sessionId);
        if (!myPlayer || !myPlayer.isAlive) return;

        // Get current key states
        const up = this.keys.W.isDown || this.keys.UP.isDown;
        const down = this.keys.S.isDown || this.keys.DOWN.isDown;
        const left = this.keys.A.isDown || this.keys.LEFT.isDown;
        const right = this.keys.D.isDown || this.keys.RIGHT.isDown;

        // Determine current movement direction based on ALL pressed keys
        let moveDirection = null;

        // Prioritize most recent key presses for diagonal conflicts
        if (up && !down) moveDirection = 'up';
        else if (down && !up) moveDirection = 'down';

        if (left && !right) {
            moveDirection = left && (up || down) ? moveDirection : 'left';
        } else if (right && !left) {
            moveDirection = right && (up || down) ? moveDirection : 'right';
        }

        // Send movement update if direction changed
        if (moveDirection !== this.currentMoveDirection) {
            if (moveDirection) {
                this.room.send('move', { direction: moveDirection });
            } else {
                this.room.send('stop_move');
            }
            this.currentMoveDirection = moveDirection;
        }

        // Aim towards mouse (send every frame for smooth rotation)
        const pointer = this.input.activePointer;
        const rotation = Phaser.Math.Angle.Between(
            myPlayer.x, myPlayer.y,
            pointer.x, pointer.y
        );
        this.room.send('move', { rotation });
    }

    /**
     * Handle shooting
     */
    handleShoot() {
        if (!this.room || this.gameState !== 'playing') return;

        const myPlayer = this.room.state.players.get(this.room.sessionId);
        if (!myPlayer || !myPlayer.isAlive) return;

        const pointer = this.input.activePointer;
        const rotation = Phaser.Math.Angle.Between(
            myPlayer.x, myPlayer.y,
            pointer.x, pointer.y
        );

        this.room.send('shoot', { rotation });
    }

    // ========== FFA Scene Hooks ==========

    onPlayerAdded(player, sessionId) {
        console.log('[ShooterScene] Player added:', {
            name: player.name,
            sessionId,
            position: { x: player.x, y: player.y },
            isAlive: player.isAlive,
            health: player.health
        });

        const isMe = sessionId === this.room.sessionId;
        const color = isMe ? 0x00ff00 : 0xff0000;

        // Create player sprite (circle for now)
        const sprite = this.add.circle(player.x, player.y, 20, color);
        sprite.setStrokeStyle(2, 0xffffff);
        sprite.setDepth(10); // Ensure sprite is above background

        // Add direction indicator (small circle at edge to show rotation)
        const directionIndicator = this.add.circle(player.x + 20, player.y, 5, 0xffffff);
        directionIndicator.setDepth(11);

        // Player name
        const nameText = this.add.text(player.x, player.y - 35, player.name, {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(11);

        // Health bar background
        const healthBarBg = this.add.rectangle(player.x, player.y + 30, 40, 4, 0x333333)
            .setDepth(9);

        // Health bar
        const healthBar = this.add.rectangle(player.x, player.y + 30, 40, 4, 0x00ff00)
            .setOrigin(0, 0.5)
            .setDepth(10);

        this.playerSprites.set(sessionId, {
            sprite,
            directionIndicator,
            nameText,
            healthBarBg,
            healthBar
        });

        console.log('[ShooterScene] Player sprite created:', {
            sessionId,
            spritePosition: { x: sprite.x, y: sprite.y },
            spriteVisible: sprite.visible,
            spriteDepth: sprite.depth
        });
    }

    onPlayerRemoved(sessionId) {
        console.log('[ShooterScene] Player removed:', sessionId);

        const playerObj = this.playerSprites.get(sessionId);
        if (playerObj) {
            playerObj.sprite.destroy();
            playerObj.directionIndicator.destroy();
            playerObj.nameText.destroy();
            playerObj.healthBarBg.destroy();
            playerObj.healthBar.destroy();
            this.playerSprites.delete(sessionId);
        }
    }

    onGameStateChanged(newState) {
        console.log('[ShooterScene] Game state:', newState);
    }

    onTimerUpdate(timeRemaining) {
        if (this.timerText) {
            this.timerText.setText(`Time: ${this.formatTime(timeRemaining)}`);

            // Warning color when < 10 seconds
            if (timeRemaining < 10) {
                this.timerText.setColor('#ff0000');
            } else {
                this.timerText.setColor('#00ff88');
            }
        }
    }

    onScoreChanged(sessionId, newScore) {
        this.updateLeaderboard();
    }

    onKillsChanged(sessionId, newKills) {
        this.updateLeaderboard();
    }

    onMatchEnded(data) {
        console.log('=== MATCH ENDED (CLIENT) ===');
        console.log('Winner ID:', data.winner);
        console.log('Winner Name:', data.winnerName);
        console.log('Winner Score:', data.winnerScore);
        console.log('Final Scores:', data.finalScores);
        console.log('Is Me Winner?', data.winner === this.room.sessionId);
        console.log('============================');

        // Show victory/defeat screen
        this.showEndGameScreen(data);
    }

    /**
     * Display end-game overlay with results
     */
    showEndGameScreen(data) {
        const isWinner = data.winner === this.room.sessionId;
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Nếu đã có overlay rồi thì dọn trước
        if (this.endGameUI) {
            this.hideEndGameScreen();
        }

        // Semi-transparent overlay
        const overlay = this.add.rectangle(centerX, centerY, 800, 600, 0x000000, 0.85);
        overlay.setDepth(1000);
        overlay.setScrollFactor(0);

        // Victory/Defeat title
        const titleText = isWinner ? '🏆 VICTORY! 🏆' : '💀 DEFEAT 💀';
        const titleColor = isWinner ? '#FFD700' : '#FF4444';

        const title = this.add.text(centerX, centerY - 180, titleText, {
            fontSize: '48px',
            fontStyle: 'bold',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

        // Winner announcement
        const winnerText = this.add.text(centerX, centerY - 120,
            `Winner: ${data.winnerName}`, {
            fontSize: '28px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

        const scoreText = this.add.text(centerX, centerY - 85,
            `Score: ${data.winnerScore} kills`, {
            fontSize: '20px',
            color: '#00ff88'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

        // Final Leaderboard
        const leaderboardTitle = this.add.text(centerX, centerY - 40,
            '📊 FINAL STANDINGS', {
            fontSize: '24px',
            color: '#00ff88',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

        // Display top players
        const leaderboardEntries = [];
        let yOffset = centerY + 10;
        data.finalScores.slice(0, 5).forEach((playerData, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            const isMe = playerData.sessionId === this.room.sessionId;
            const nameDisplay = isMe ? `${playerData.name} (You)` : playerData.name;
            const color = isMe ? '#FFD700' : '#FFFFFF';

            const entryText = this.add.text(centerX, yOffset,
                `${medal} ${nameDisplay}: ${playerData.kills} kills`, {
                fontSize: '18px',
                color: color,
                fontStyle: isMe ? 'bold' : 'normal'
            }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

            leaderboardEntries.push(entryText);
            yOffset += 30;
        });

        // Close button
        const buttonBg = this.add.rectangle(centerX, centerY + 200, 250, 50, 0x00ff88);
        buttonBg.setDepth(1001).setScrollFactor(0);
        buttonBg.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(centerX, centerY + 200,
            'Close', {
            fontSize: '20px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

        // Button hover effect
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x00dd66);
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x00ff88);
        });

        // Button click - chỉ đóng overlay
        buttonBg.on('pointerdown', () => {
            this.hideEndGameScreen();
        });

        // Store references for cleanup
        this.endGameUI = {
            overlay,
            title,
            winnerText,
            scoreText,
            leaderboardTitle,
            leaderboardEntries,
            buttonBg,
            buttonText
        };
    }

    hideEndGameScreen() {
        if (!this.endGameUI) return;

        Object.values(this.endGameUI).forEach(obj => {
            if (!obj) return;

            // Nếu là array (ví dụ leaderboardEntries)
            if (Array.isArray(obj)) {
                obj.forEach(child => {
                    if (child && child.destroy) {
                        child.destroy();
                    }
                });
            } else if (obj.destroy) {
                obj.destroy();
            }
        });

        this.endGameUI = null;
    }


    // ========== Update Methods ==========

    updatePlayerSprites() {
        if (!this.room) return;

        this.room.state.players.forEach((player, sessionId) => {
            let playerObj = this.playerSprites.get(sessionId);

            // Auto-create sprite if missing (fallback for missed onPlayerAdded)
            if (!playerObj) {
                console.warn('[ShooterScene] Player sprite missing for:', sessionId, '- creating now (fallback)');
                this.onPlayerAdded(player, sessionId);

                // IMPORTANT: Also setup listeners for score tracking!
                if (this.setupPlayerListeners) {
                    this.setupPlayerListeners(player, sessionId);
                }

                playerObj = this.playerSprites.get(sessionId);

                if (!playerObj) {
                    console.error('[ShooterScene] Failed to create sprite for:', sessionId);
                    return;
                }
            }

            const { sprite, directionIndicator, nameText, healthBarBg, healthBar } = playerObj;

            // Update position
            sprite.setPosition(player.x, player.y);
            nameText.setPosition(player.x, player.y - 35);
            healthBarBg.setPosition(player.x, player.y + 30);
            healthBar.setPosition(player.x - 20, player.y + 30);

            // Update direction indicator position based on rotation
            const indicatorDistance = 20; // Same as player radius
            const indicatorX = player.x + Math.cos(player.rotation) * indicatorDistance;
            const indicatorY = player.y + Math.sin(player.rotation) * indicatorDistance;
            directionIndicator.setPosition(indicatorX, indicatorY);

            // Update health bar
            const healthPercent = Math.max(0, player.health / player.maxHealth);
            healthBar.setDisplaySize(40 * healthPercent, 4);

            // Color based on health
            if (healthPercent > 0.6) {
                healthBar.setFillStyle(0x00ff00);
            } else if (healthPercent > 0.3) {
                healthBar.setFillStyle(0xffaa00);
            } else {
                healthBar.setFillStyle(0xff0000);
            }

            // Update visibility based on alive status
            const visible = player.isAlive;
            sprite.setVisible(visible);
            directionIndicator.setVisible(visible);
            nameText.setVisible(visible);
            healthBarBg.setVisible(visible);
            healthBar.setVisible(visible);

            // Note: We don't rotate the sprite itself anymore since we have direction indicator

            // Debug log for first update
            if (!sprite.getData('logged')) {
                console.log('[ShooterScene] Player sprite update:', {
                    sessionId,
                    position: { x: player.x, y: player.y },
                    rotation: player.rotation,
                    isAlive: player.isAlive,
                    visible: sprite.visible,
                    spriteExists: !!sprite
                });
                sprite.setData('logged', true);
            }
        });
    }

    updateBulletSprites() {
        if (!this.room) return;

        // Remove bullets that no longer exist
        for (const [bulletId, sprite] of this.bulletSprites) {
            const exists = this.room.state.bullets.find(b => b.id === bulletId);
            if (!exists) {
                sprite.destroy();
                this.bulletSprites.delete(bulletId);
            }
        }

        // Add/update bullets
        this.room.state.bullets.forEach(bullet => {
            let sprite = this.bulletSprites.get(bullet.id);

            if (!sprite) {
                // Create new bullet sprite
                sprite = this.add.circle(bullet.x, bullet.y, 5, 0xffff00);
                this.bulletSprites.set(bullet.id, sprite);
            }

            // Update position
            sprite.setPosition(bullet.x, bullet.y);
        });
    }

    updateHUD() {
        if (!this.room) return;

        const myPlayer = this.room.state.players.get(this.room.sessionId);
        if (!myPlayer) return;

        // Update my health bar
        const healthPercent = Math.max(0, myPlayer.health / myPlayer.maxHealth);
        this.myHealthBar.setDisplaySize(200 * healthPercent, 20);
        this.myHealthText.setText(`${Math.floor(myPlayer.health)}/${myPlayer.maxHealth}`);

        // Health bar color
        if (healthPercent > 0.6) {
            this.myHealthBar.setFillStyle(0x00ff00);
        } else if (healthPercent > 0.3) {
            this.myHealthBar.setFillStyle(0xffaa00);
        } else {
            this.myHealthBar.setFillStyle(0xff0000);
        }

        // Update K/D
        this.kdText.setText(`K: ${myPlayer.kills}  D: ${myPlayer.deaths}`);

        // Update leaderboard
        this.updateLeaderboard();
    }

    updateLeaderboard() {
        if (!this.leaderboardText || !this.room) return;

        const leaderboard = this.getLeaderboard(5);

        // Debug: log leaderboard data every update
        if (!this.lastLeaderboardLog || Date.now() - this.lastLeaderboardLog > 5000) {
            console.log('[ShooterScene] Leaderboard data:', {
                totalPlayers: this.room.state.players.size,
                leaderboardEntries: leaderboard.length,
                playerScoresSize: this.playerScores.size,
                playerScores: Array.from(this.playerScores.entries())
            });
            this.lastLeaderboardLog = Date.now();
        }

        if (leaderboard.length === 0) {
            this.leaderboardText.setText('');
            return;
        }

        let text = '📊 LEADERBOARD\n';

        leaderboard.forEach(([sessionId, score], index) => {
            const player = this.room.state.players.get(sessionId);
            const name = player?.name || 'Unknown';
            const kills = player?.kills || 0;
            const isMe = sessionId === this.room.sessionId;

            const prefix = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const nameDisplay = isMe ? `${name} (You)` : name;

            text += `${prefix} ${nameDisplay}: ${kills}\n`;
        });

        this.leaderboardText.setText(text);
    }

    /**
     * Cleanup
     */
    shutdown() {
        // Destroy all sprites
        for (const playerObj of this.playerSprites.values()) {
            playerObj.sprite.destroy();
            playerObj.directionIndicator.destroy();
            playerObj.nameText.destroy();
            playerObj.healthBarBg.destroy();
            playerObj.healthBar.destroy();
        }
        this.playerSprites.clear();

        for (const sprite of this.bulletSprites.values()) {
            sprite.destroy();
        }
        this.bulletSprites.clear();

        // Cleanup end-game UI if exists
        if (this.endGameUI) {
            Object.values(this.endGameUI).forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.endGameUI = null;
        }

        super.shutdown();
    }
}
