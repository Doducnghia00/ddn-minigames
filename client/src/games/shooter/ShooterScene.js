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
        this.createKillFeed();
    }

    /**
     * Setup server message listeners
     */
    setupServerMessages() {
        if (!this.room) return;

        // Listen to kill events
        this.room.onMessage('player_killed', (data) => {
            console.log('[ShooterScene] Player killed:', data);
            this.showKillNotification(data);
        });

        // Listen to respawn events
        this.room.onMessage('player_respawned', (data) => {
            console.log('[ShooterScene] Player respawned:', data.playerName);
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
     * Create HUD elements with enhanced styling
     */
    createHUD() {
        const centerX = this.cameras.main.width / 2;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // ====== TOP CENTER: TIMER + SCORE LIMIT ======
        
        // Timer text with icon (no background panel - cleaner look)
        // Centered both horizontally and vertically for alignment
        this.timerIcon = this.add.text(centerX - 50, 32, '⏱️', {
            fontSize: '20px'
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(101);

        this.timerText = this.add.text(centerX, 32, '--:--', {
            fontSize: '22px',
            color: '#00ff88',
            fontStyle: 'bold',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(101);

        // Score limit below timer (First to X)
        this.scoreLimitText = this.add.text(centerX, 55, '🎯 First to: 0', {
            fontSize: '14px',
            color: '#ffaa00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(101);

        // ====== TOP LEFT: PLAYER HEALTH + K/D ======
        
        // Health panel background
        const healthPanelBg = this.add.rectangle(20, 20, 250, 90, 0x1a1a2e, 0.95)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        
        const healthPanelBorder = this.add.rectangle(20, 20, 250, 90)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100)
            .setStrokeStyle(2, 0x00ff88, 0.5);

        // Health label
        this.add.text(30, 30, '❤️ HEALTH', {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

        // Health bar background
        this.myHealthBarBg = this.add.rectangle(30, 55, 200, 16, 0x333333)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(101);
        
        // Health bar border
        this.add.rectangle(30, 55, 200, 16)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(101)
            .setStrokeStyle(2, 0x666666);

        // Health bar fill
        this.myHealthBar = this.add.rectangle(32, 57, 196, 12, 0x00ff00)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(102);

        // Health text (100/100)
        this.myHealthText = this.add.text(130, 63, '100/100', {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(103);

        // K/D stats
        this.kdText = this.add.text(30, 82, '⚔️ 0  💀 0', {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

        // ====== TOP RIGHT: LEADERBOARD ======
        
        // Leaderboard background (same height as health panel for balance)
        const leaderboardBg = this.add.rectangle(width - 20, 20, 200, 90, 0x1a1a2e, 0.95)
            .setOrigin(1, 0).setScrollFactor(0).setDepth(100);
        
        const leaderboardBorder = this.add.rectangle(width - 20, 20, 200, 90)
            .setOrigin(1, 0).setScrollFactor(0).setDepth(100)
            .setStrokeStyle(2, 0x00ff88, 0.5);

        // Leaderboard title
        this.add.text(width - 110, 30, '🏆 TOP 3', {
            fontSize: '11px',
            color: '#00ff88',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

        // Leaderboard entries - only top 3 for compact display
        this.leaderboardEntries = [];
        for (let i = 0; i < 3; i++) {
            // Panel left edge: (width-20) - 200 = width-220
            // Add 10px padding from left edge
            const entry = this.add.text(width - 210, 50 + i * 18, '', {
                fontSize: '11px',
                color: '#ffffff',
                fontFamily: 'monospace'
            }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);
            
            this.leaderboardEntries.push(entry);
        }

        // ====== CENTER: CROSSHAIR (dynamic - follows mouse) ======
        
        this.crosshair = this.add.graphics();
        this.crosshair.setDepth(1000).setScrollFactor(0);

        // ====== BOTTOM CENTER: RESPAWN MESSAGE (hidden by default) ======
        
        this.respawnMessageBg = this.add.rectangle(centerX, height - 100, 400, 50, 0x8b0000, 0.95)
            .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(200).setVisible(false);
        
        this.respawnMessageBorder = this.add.rectangle(centerX, height - 100, 400, 50)
            .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(200)
            .setStrokeStyle(3, 0xff0000).setVisible(false);
        
        this.respawnMessage = this.add.text(centerX, height - 100, '💀 ELIMINATED - Respawning...', {
            fontSize: '18px',
            color: '#ffcccc',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    }

    /**
     * Create kill feed container
     */
    createKillFeed() {
        this.killFeedEntries = []; // Array of kill notifications
        this.maxKillFeedEntries = 5;
    }

    /**
     * Show kill notification with animation
     */
    showKillNotification(data) {
        const { victimName, killerName, victim: victimId, killer: killerId } = data;
        const isSuicide = victimId === killerId;
        
        const width = this.cameras.main.width;
        const baseY = 120; // Below leaderboard (leaderboard ends at 110)
        
        // Calculate Y position (stack from top)
        const yPos = baseY + this.killFeedEntries.length * 30;
        
        // Create text (no background panel - cleaner look)
        let message;
        if (isSuicide) {
            message = `${victimName} 💀 eliminated themselves`;
        } else {
            message = `${killerName} ⚔️ ${victimName}`;
        }

        const text = this.add.text(width - 30, yPos, message, {
            fontSize: '13px',
            color: '#ffcccc',
            fontStyle: 'bold',
            stroke: '#8b0000',
            strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(151);

        // Store entry
        const entry = {
            text,
            createdAt: Date.now()
        };
        
        this.killFeedEntries.push(entry);

        // Slide-in animation
        text.setX(width + 50);
        
        this.tweens.add({
            targets: text,
            x: width - 30,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Auto-remove after 5 seconds
        this.time.delayedCall(5000, () => {
            this.removeKillNotification(entry);
        });

        // Remove oldest if > max
        if (this.killFeedEntries.length > this.maxKillFeedEntries) {
            const oldest = this.killFeedEntries.shift();
            this.removeKillNotification(oldest);
        }
    }

    /**
     * Remove kill notification with fade animation
     */
    removeKillNotification(entry) {
        if (!entry) return;

        // Check if already removed
        if (!entry.text || !entry.text.scene) return;

        // Fade out animation
        this.tweens.add({
            targets: entry.text,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                // Safely destroy if still exists
                if (entry.text && entry.text.destroy) entry.text.destroy();
                
                // Remove from array
                const index = this.killFeedEntries.indexOf(entry);
                if (index > -1) {
                    this.killFeedEntries.splice(index, 1);
                }
                
                // Reposition remaining entries
                this.repositionKillFeed();
            }
        });
    }

    /**
     * Reposition kill feed entries after removal
     */
    repositionKillFeed() {
        const baseY = 120;
        
        this.killFeedEntries.forEach((entry, index) => {
            if (!entry.text || !entry.text.scene) return;
            
            const targetY = baseY + index * 30;
            
            this.tweens.add({
                targets: entry.text,
                y: targetY,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });
    }

    /**
     * Update loop - called every frame
     */
    update() {
        this.handleInput();
        this.updatePlayerSprites();
        this.updateBulletSprites();
        this.updateHUD();
        this.updateCrosshair();
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
        
        // Show muzzle flash effect
        this.showMuzzleFlash(myPlayer.x, myPlayer.y, rotation);
    }

    // ========== FFA Scene Hooks ==========

    onPlayerAdded(player, sessionId) {
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

        // Setup listeners for visual effects
        this.setupPlayerListeners(player, sessionId);
    }

    /**
     * Setup player state listeners for visual effects and UI updates
     */
    setupPlayerListeners(player, sessionId) {
        // Listen to health changes - detect damage
        player.listen('health', (value, prevValue) => {
            if (value < prevValue) {
                // Took damage
                this.flashDamage(sessionId);
            }
        });

        // Listen to isAlive changes - detect death/respawn
        player.listen('isAlive', (value, prevValue) => {
            if (!value && prevValue) {
                // Just died
                this.showDeathAnimation(sessionId);
            } else if (value && !prevValue) {
                // Just respawned
                this.showRespawnAnimation(sessionId);
            }
        });

        // Listen to score changes - update leaderboard
        player.listen('score', (value) => {
            this.onScoreChanged(sessionId, value);
        });

        // Listen to kills changes - update leaderboard
        player.listen('kills', (value) => {
            this.onKillsChanged(sessionId, value);
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

    onGameStateChanged(newState, oldState) {
        // console.log('[ShooterScene] Game state:', newState);
        this.gameState = newState;
        
        // Hide end-game scoreboard when game restarts
        if (newState === 'playing' && this.endGameUI) {
            this.hideEndGameScreen();
        }
        
        // Manage cursor visibility based on game state
        if (newState === 'playing') {
            // Hide system cursor when playing - use crosshair only
            this.input.setDefaultCursor('none');
        } else {
            // Show system cursor when not playing (waiting/finished) - need it for buttons
            this.input.setDefaultCursor('default');
        }
    }

    onTimerUpdate(timeRemaining) {
        if (!this.timerText) return;
        
        const formatted = this.formatTime(timeRemaining);
        this.timerText.setText(formatted);
        
        // Warning color khi < 10s
        if (timeRemaining < 10) {
            this.timerText.setColor('#ff0000');
            this.timerIcon.setText('⚠️');
            
            // Pulse effect
            const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
            this.timerText.setScale(scale);
            this.timerIcon.setScale(scale);
        } else {
            this.timerText.setColor('#00ff88');
            this.timerIcon.setText('⏱️');
            this.timerText.setScale(1);
            this.timerIcon.setScale(1);
        }
    }

    onScoreChanged(sessionId, newScore) {
        this.updateLeaderboard();
    }

    onKillsChanged(sessionId, newKills) {
        this.updateLeaderboard();
    }

    onStateSync() {
        if (this.room && this.room.state && this.scoreLimitText) {
            this.scoreLimitText.setText(`🎯 First to: ${this.room.state.scoreLimit || 0}`);
        }
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
     * Display enhanced end-game overlay with detailed scoreboard
     */
    showEndGameScreen(data) {
        const isWinner = data.winner === this.room.sessionId;
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Clear existing if any
        if (this.endGameUI) {
            this.hideEndGameScreen();
        }

        // Semi-transparent dark overlay
        const overlay = this.add.rectangle(centerX, centerY, 800, 600, 0x000000, 0.90);
        overlay.setDepth(1000).setScrollFactor(0);

        // Main panel background
        const panelBg = this.add.rectangle(centerX, centerY, 600, 500, 0x1a1a2e, 0.98);
        panelBg.setDepth(1001).setScrollFactor(0);
        
        const panelBorder = this.add.rectangle(centerX, centerY, 600, 500);
        panelBorder.setDepth(1001).setScrollFactor(0);
        panelBorder.setStrokeStyle(4, isWinner ? 0xFFD700 : 0x666666);

        // ====== TITLE ======
        
        const titleText = isWinner ? '🏆 VICTORY! 🏆' : '💀 DEFEAT 💀';
        const titleColor = isWinner ? '#FFD700' : '#FF4444';

        const title = this.add.text(centerX, centerY - 200, titleText, {
            fontSize: '48px',
            fontStyle: 'bold',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

        // Pulse animation for title
        this.tweens.add({
            targets: title,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ====== WINNER INFO ======
        
        const winnerText = this.add.text(centerX, centerY - 140,
            `Winner: ${data.winnerName}`, {
            fontSize: '24px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

        const winnerScoreText = this.add.text(centerX, centerY - 110,
            `Final Score: ${data.winnerScore} kills`, {
            fontSize: '18px',
            color: '#00ff88'
        }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

        // ====== SCOREBOARD HEADER ======
        
        const scoreboardTitle = this.add.text(centerX, centerY - 60,
            '📊 FINAL STANDINGS', {
            fontSize: '20px',
            color: '#00ff88',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

        // Scoreboard header background
        const headerBg = this.add.rectangle(centerX, centerY - 20, 550, 30, 0x2a2a3e);
        headerBg.setDepth(1002).setScrollFactor(0);

        // Column headers
        const headerRank = this.add.text(centerX - 240, centerY - 20, 'RANK', {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setDepth(1003).setScrollFactor(0);

        const headerPlayer = this.add.text(centerX - 170, centerY - 20, 'PLAYER', {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setDepth(1003).setScrollFactor(0);

        const headerScore = this.add.text(centerX + 80, centerY - 20, 'SCORE', {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setDepth(1003).setScrollFactor(0);

        const headerKD = this.add.text(centerX + 160, centerY - 20, 'K/D', {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setDepth(1003).setScrollFactor(0);

        const headerRatio = this.add.text(centerX + 230, centerY - 20, 'RATIO', {
            fontSize: '12px',
            color: '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5).setDepth(1003).setScrollFactor(0);

        // ====== PLAYER ENTRIES ======
        
        const leaderboardEntries = [];
        let yOffset = centerY + 15;
        
        data.finalScores.slice(0, 8).forEach((playerData, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            const isMe = playerData.id === this.room.sessionId;
            const isWinnerRow = playerData.id === data.winner;
            
            // Row background (highlight winner and me)
            let rowBg = null;
            if (isWinnerRow) {
                rowBg = this.add.rectangle(centerX, yOffset, 550, 28, 0xFFD700, 0.15);
                rowBg.setDepth(1002).setScrollFactor(0);
            } else if (isMe) {
                rowBg = this.add.rectangle(centerX, yOffset, 550, 28, 0x4444FF, 0.15);
                rowBg.setDepth(1002).setScrollFactor(0);
            }

            // Separator line
            const separator = this.add.rectangle(centerX, yOffset + 14, 550, 1, 0x333333);
            separator.setDepth(1002).setScrollFactor(0);

            const textColor = isMe ? '#FFD700' : '#FFFFFF';
            const fontStyle = isMe ? 'bold' : 'normal';

            // Rank
            const rankText = this.add.text(centerX - 240, yOffset, medal, {
                fontSize: '16px',
                color: textColor,
                fontStyle: fontStyle
            }).setOrigin(0, 0.5).setDepth(1003).setScrollFactor(0);

            // Player name
            const nameDisplay = isMe ? `${playerData.name} (You)` : playerData.name;
            const playerName = this.add.text(centerX - 170, yOffset, nameDisplay.substring(0, 20), {
                fontSize: '14px',
                color: textColor,
                fontStyle: fontStyle
            }).setOrigin(0, 0.5).setDepth(1003).setScrollFactor(0);

            // Score
            const scoreText = this.add.text(centerX + 80, yOffset, playerData.score || 0, {
                fontSize: '16px',
                color: '#FFD700',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setDepth(1003).setScrollFactor(0);

            // K/D
            const kdDisplay = `${playerData.kills || 0}/${playerData.deaths || 0}`;
            const kdText = this.add.text(centerX + 160, yOffset, kdDisplay, {
                fontSize: '13px',
                color: '#00ff88'
            }).setOrigin(0.5, 0.5).setDepth(1003).setScrollFactor(0);

            // Ratio
            const ratio = playerData.deaths > 0 
                ? (playerData.kills / playerData.deaths).toFixed(2)
                : (playerData.kills || 0);
            const ratioText = this.add.text(centerX + 230, yOffset, ratio, {
                fontSize: '14px',
                color: '#aa88ff',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setDepth(1003).setScrollFactor(0);

            leaderboardEntries.push({
                rowBg,
                separator,
                rankText,
                playerName,
                scoreText,
                kdText,
                ratioText
            });

            yOffset += 35;
        });

        // ====== CLOSE BUTTON ======
        
        const buttonBg = this.add.rectangle(centerX, centerY + 210, 200, 45, 0x00ff88);
        buttonBg.setDepth(1002).setScrollFactor(0);
        buttonBg.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(centerX, centerY + 210,
            'Close', {
            fontSize: '18px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);

        // Button hover effect
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x00dd66);
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x00ff88);
        });

        // Button click - close overlay
        buttonBg.on('pointerdown', () => {
            this.hideEndGameScreen();
        });

        // ====== Store UI references ======
        
        this.endGameUI = {
            overlay,
            panelBg,
            panelBorder,
            title,
            winnerText,
            winnerScoreText,
            scoreboardTitle,
            headerBg,
            headerRank,
            headerPlayer,
            headerScore,
            headerKD,
            headerRatio,
            leaderboardEntries,
            buttonBg,
            buttonText
        };
    }

    hideEndGameScreen() {
        if (!this.endGameUI) return;

        Object.values(this.endGameUI).forEach(obj => {
            if (!obj) return;

            // Nếu là array (ví dụ leaderboardEntries - array of objects)
            if (Array.isArray(obj)) {
                obj.forEach(entry => {
                    if (!entry) return;
                    
                    // If entry is an object with multiple properties
                    if (typeof entry === 'object' && !entry.destroy) {
                        Object.values(entry).forEach(item => {
                            if (item && item.destroy) {
                                item.destroy();
                            }
                        });
                    } else if (entry && entry.destroy) {
                        // If entry is a simple Phaser object
                        entry.destroy();
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
            // Debug logging for this specific player update
            // console.log('[ShooterScene] Player sprite update:', {
            //     sessionId,
            //     position: { x: player.x, y: player.y },
            //     rotation: player.rotation,
            //     isAlive: player.isAlive,
            //     visible: sprite.visible,
            //     depth: sprite.depth
            // });
            if (!sprite.getData('logged')) {
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
        if (!this.room || !this.room.state) return;

        const myPlayer = this.room.state.players.get(this.room.sessionId);
        if (!myPlayer) return;

        // Update health bar
        const healthPercent = Math.max(0, Math.min(1, myPlayer.health / myPlayer.maxHealth));
        this.myHealthBar.setDisplaySize(196 * healthPercent, 12);
        this.myHealthText.setText(`${Math.round(myPlayer.health)}/${myPlayer.maxHealth}`);
        
        // Health bar color
        if (healthPercent > 0.6) {
            this.myHealthBar.setFillStyle(0x00ff00); // Green
        } else if (healthPercent > 0.3) {
            this.myHealthBar.setFillStyle(0xffaa00); // Orange
        } else {
            this.myHealthBar.setFillStyle(0xff0000); // Red
        }

        // Update K/D
        this.kdText.setText(`⚔️ ${myPlayer.kills || 0}  💀 ${myPlayer.deaths || 0}`);

        // Update respawn message visibility - CHỈ hiển thị khi đang playing VÀ dead
        const shouldShowRespawnMsg = this.gameState === 'playing' && !myPlayer.isAlive;
        this.respawnMessageBg.setVisible(shouldShowRespawnMsg);
        this.respawnMessageBorder.setVisible(shouldShowRespawnMsg);
        this.respawnMessage.setVisible(shouldShowRespawnMsg);
        
        // Pulse effect when dead
        if (shouldShowRespawnMsg) {
            const alpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
            this.respawnMessage.setAlpha(alpha);
        }
    }

    updateLeaderboard() {
        if (!this.room || !this.room.state || !this.leaderboardEntries) return;

        const players = [];
        this.room.state.players.forEach((player, id) => {
            players.push({
                id,
                name: player.name,
                score: player.score || 0,
                kills: player.kills || 0
            });
        });

        // Sort by score
        players.sort((a, b) => b.score - a.score);

        // Always show top 3 players (even if score is 0)
        const topPlayers = players.slice(0, 3);
        
        topPlayers.forEach((player, index) => {
            const entry = this.leaderboardEntries[index];
            if (!entry) return;

            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const isMe = player.id === this.room.sessionId;
            const displayName = player.name.substring(0, 10); // Truncate long names
            
            entry.setText(`${medal} ${displayName}: ${player.score}`);
            entry.setColor(isMe ? '#FFD700' : '#ffffff'); // Gold for me
            entry.setFontStyle(isMe ? 'bold' : 'normal');
            entry.setVisible(true);
        });

        // Hide remaining entries if less than 3 players
        for (let i = topPlayers.length; i < 3; i++) {
            if (this.leaderboardEntries[i]) {
                this.leaderboardEntries[i].setVisible(false);
            }
        }
    }

    /**
     * Update crosshair position to follow mouse - only when playing
     */
    updateCrosshair() {
        if (!this.crosshair || !this.input.activePointer) return;

        // Clear previous drawing
        this.crosshair.clear();

        // Only draw crosshair when playing (using system cursor otherwise)
        if (this.gameState !== 'playing') return;

        // Get mouse position
        const cx = this.input.activePointer.x;
        const cy = this.input.activePointer.y;

        // Draw crosshair at mouse position
        this.crosshair.lineStyle(2, 0xffffff, 0.7);
        this.crosshair.lineBetween(cx - 12, cy, cx - 4, cy);
        this.crosshair.lineBetween(cx + 4, cy, cx + 12, cy);
        this.crosshair.lineBetween(cx, cy - 12, cx, cy - 4);
        this.crosshair.lineBetween(cx, cy + 4, cx, cy + 12);
        
        this.crosshair.fillStyle(0xff0000, 0.8);
        this.crosshair.fillCircle(cx, cy, 2);
    }

    /**
     * Flash damage effect - red overlay
     */
    flashDamage(sessionId) {
        const playerObj = this.playerSprites.get(sessionId);
        if (!playerObj) return;

        // Create red overlay flash (since circles don't support tint)
        const flashOverlay = this.add.circle(
            playerObj.sprite.x, 
            playerObj.sprite.y, 
            22, // Slightly larger than player
            0xff0000, 
            0.6
        );
        flashOverlay.setDepth(12); // Above player sprite (depth 10)
        
        // Fade out and remove
        this.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => flashOverlay.destroy()
        });
    }

    /**
     * Death animation - fade out with particle explosion
     */
    showDeathAnimation(sessionId) {
        const playerObj = this.playerSprites.get(sessionId);
        if (!playerObj) return;

        const x = playerObj.sprite.x;
        const y = playerObj.sprite.y;

        // Fade out and scale down
        this.tweens.add({
            targets: [playerObj.sprite, playerObj.directionIndicator],
            alpha: 0,
            scale: 0.3,
            duration: 400,
            ease: 'Power2'
        });

        // Simple particle explosion effect
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const particle = this.add.circle(x, y, 4, 0xff4444);
            particle.setDepth(50);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 50,
                y: y + Math.sin(angle) * 50,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }

        // Flash effect
        const flash = this.add.circle(x, y, 30, 0xffffff, 0.8);
        flash.setDepth(51);
        this.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });
    }

    /**
     * Respawn animation - fade in with pulse and ring effect
     */
    showRespawnAnimation(sessionId) {
        const playerObj = this.playerSprites.get(sessionId);
        if (!playerObj) return;

        // Get actual respawn position from player state (not old sprite position)
        const player = this.room.state.players.get(sessionId);
        if (!player) return;
        
        const spawnX = player.x;
        const spawnY = player.y;

        // Reset visibility
        playerObj.sprite.setVisible(true);
        playerObj.directionIndicator.setVisible(true);
        playerObj.sprite.setAlpha(0);
        playerObj.directionIndicator.setAlpha(0);
        playerObj.sprite.setScale(2);
        playerObj.directionIndicator.setScale(2);

        // Fade in and scale down to normal
        this.tweens.add({
            targets: [playerObj.sprite, playerObj.directionIndicator],
            alpha: 1,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Spawn flash at NEW respawn position
        const flash = this.add.circle(spawnX, spawnY, 40, 0x00ff88, 0.6);
        flash.setDepth(51);
        this.tweens.add({
            targets: flash,
            scale: 1.5,
            alpha: 0,
            duration: 400,
            onComplete: () => flash.destroy()
        });

        // Ring pulse at NEW respawn position
        const ring = this.add.circle(spawnX, spawnY, 20);
        ring.setStrokeStyle(3, 0x00ff88, 1);
        ring.setDepth(51);
        this.tweens.add({
            targets: ring,
            scale: 3,
            alpha: 0,
            duration: 600,
            ease: 'Sine.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    /**
     * Muzzle flash effect when shooting
     */
    showMuzzleFlash(x, y, rotation) {
        // Flash at gun position (front of player)
        const flashX = x + Math.cos(rotation) * 25;
        const flashY = y + Math.sin(rotation) * 25;

        const flash = this.add.circle(flashX, flashY, 8, 0xffaa00, 0.9);
        flash.setDepth(15);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 100,
            onComplete: () => flash.destroy()
        });
    }

    /**
     * Cleanup
     */
    shutdown() {
        // Restore system cursor when leaving game
        if (this.input) {
            this.input.setDefaultCursor('default');
        }

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

        // Cleanup kill feed entries
        if (this.killFeedEntries) {
            this.killFeedEntries.forEach(entry => {
                if (entry.text && entry.text.destroy) entry.text.destroy();
            });
            this.killFeedEntries = [];
        }

        super.shutdown();
    }
}
