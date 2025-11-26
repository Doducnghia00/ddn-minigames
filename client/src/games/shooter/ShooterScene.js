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
    }

    create() {
        this.createArena();
        this.setupInput();
        this.createHUD();
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

        // Movement input
        const wasMoving = { ...this.isMoving };

        this.isMoving.up = this.keys.W.isDown || this.keys.UP.isDown;
        this.isMoving.down = this.keys.S.isDown || this.keys.DOWN.isDown;
        this.isMoving.left = this.keys.A.isDown || this.keys.LEFT.isDown;
        this.isMoving.right = this.keys.D.isDown || this.keys.RIGHT.isDown;

        // Send movement messages when state changes
        if (this.isMoving.up && !wasMoving.up) {
            this.room.send('move', { direction: 'up' });
        } else if (!this.isMoving.up && wasMoving.up) {
            this.room.send('stop_move');
        }

        if (this.isMoving.down && !wasMoving.down) {
            this.room.send('move', { direction: 'down' });
        } else if (!this.isMoving.down && wasMoving.down) {
            this.room.send('stop_move');
        }

        if (this.isMoving.left && !wasMoving.left) {
            this.room.send('move', { direction: 'left' });
        } else if (!this.isMoving.left && wasMoving.left) {
            this.room.send('stop_move');
        }

        if (this.isMoving.right && !wasMoving.right) {
            this.room.send('move', { direction: 'right' });
        } else if (!this.isMoving.right && wasMoving.right) {
            this.room.send('stop_move');
        }

        // Aim towards mouse
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
        console.log('[ShooterScene] Match ended!', data);
    }

    // ========== Update Methods ==========

    updatePlayerSprites() {
        if (!this.room) return;

        this.room.state.players.forEach((player, sessionId) => {
            const playerObj = this.playerSprites.get(sessionId);
            if (!playerObj) {
                console.warn('[ShooterScene] Player sprite not found for:', sessionId);
                return;
            }

            const { sprite, nameText, healthBarBg, healthBar } = playerObj;

            // Update position
            sprite.setPosition(player.x, player.y);
            nameText.setPosition(player.x, player.y - 35);
            healthBarBg.setPosition(player.x, player.y + 30);
            healthBar.setPosition(player.x - 20, player.y + 30);

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
            nameText.setVisible(visible);
            healthBarBg.setVisible(visible);
            healthBar.setVisible(visible);

            // Rotate player sprite to face aim direction
            sprite.setRotation(player.rotation);

            // Debug log for first update
            if (!sprite.getData('logged')) {
                console.log('[ShooterScene] Player sprite update:', {
                    sessionId,
                    position: { x: player.x, y: player.y },
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
            playerObj.nameText.destroy();
            playerObj.healthBarBg.destroy();
            playerObj.healthBar.destroy();
        }
        this.playerSprites.clear();

        for (const sprite of this.bulletSprites.values()) {
            sprite.destroy();
        }
        this.bulletSprites.clear();

        super.shutdown();
    }
}
