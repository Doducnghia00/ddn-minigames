import Phaser from 'phaser';
import { FreeForAllGameScene } from '../base/FreeForAllGameScene';

export class TestFFAScene extends FreeForAllGameScene {
    constructor() {
        super('TestFFAScene');
    }

    create() {
        // Background
        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.createGameUI();
    }

    createGameUI() {
        const centerX = this.cameras.main.width / 2;

        // Title
        this.add.text(centerX, 30, 'Test FFA Mode', {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Timer display
        this.timerText = this.add.text(centerX, 80, 'Time: --:--', {
            fontSize: '24px',
            color: '#00ff88'
        }).setOrigin(0.5);

        // Score limit display
        this.scoreLimitText = this.add.text(centerX, 110, 'First to: --', {
            fontSize: '18px',
            color: '#888888'
        }).setOrigin(0.5);

        // Leaderboard
        this.leaderboardText = this.add.text(centerX, 200, '', {
            fontSize: '18px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Test button (only shown during match)
        this.addScoreBtn = this.add.text(centerX, 450, '🎯 Add Score (+1)', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#4CAF50',
            padding: { x: 20, y: 10 }
        })
            .setOrigin(0.5)
            .setInteractive()
            .setVisible(false);

        this.addScoreBtn.on('pointerdown', () => {
            this.room.send('add_score', { amount: 1 });
        });

        this.addScoreBtn.on('pointerover', () => {
            this.addScoreBtn.setBackgroundColor('#45a049');
        });

        this.addScoreBtn.on('pointerout', () => {
            this.addScoreBtn.setBackgroundColor('#4CAF50');
        });

        // Game state text
        this.stateText = this.add.text(centerX, 520, 'Waiting for players...', {
            fontSize: '16px',
            color: '#ffaa00'
        }).setOrigin(0.5);

        // Initialize displays
        this.updateScoreLimitDisplay();
        this.updateLeaderboard();
    }

    // ========== FFA Scene Hooks ==========

    onGameStateChanged(newState) {
        if (newState === 'playing') {
            this.stateText.setText('Match in progress!');
            this.addScoreBtn.setVisible(true);
        } else if (newState === 'finished') {
            this.stateText.setText('Match ended!');
            this.addScoreBtn.setVisible(false);
        } else {
            this.stateText.setText('Waiting for players...');
            this.addScoreBtn.setVisible(false);
        }
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

    onPlayerAdded(player, sessionId) {
        this.updateLeaderboard();
    }

    onPlayerRemoved(sessionId) {
        this.updateLeaderboard();
    }

    onMatchStarted(data) {
        console.log('[TestFFA] Match started!', data);
        this.updateScoreLimitDisplay();
    }

    onMatchEnded(data) {
        console.log('[TestFFA] Match ended!', data);

        const winnerPlayer = this.room.state.players.get(data.winner);
        const winnerName = winnerPlayer?.name || 'Unknown';

        this.stateText.setText(`🏆 Winner: ${winnerName}!`);
        this.stateText.setColor('#ffd700');
    }

    // ========== UI Update Methods ==========

    updateScoreLimitDisplay() {
        if (this.scoreLimitText) {
            this.scoreLimitText.setText(`First to: ${this.scoreLimit}`);
        }
    }

    updateLeaderboard() {
        if (!this.leaderboardText || !this.room) return;

        const leaderboard = this.getLeaderboard(5);

        if (leaderboard.length === 0) {
            this.leaderboardText.setText('No players yet');
            return;
        }

        let text = '📊 Leaderboard 📊\n\n';

        leaderboard.forEach(([sessionId, score], index) => {
            const player = this.room.state.players.get(sessionId);
            const name = player?.name || 'Unknown';
            const isMe = sessionId === this.room.sessionId;

            const prefix = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const nameDisplay = isMe ? `${name} (You)` : name;

            text += `${prefix} ${nameDisplay}: ${score}\n`;
        });

        this.leaderboardText.setText(text);
    }
}
