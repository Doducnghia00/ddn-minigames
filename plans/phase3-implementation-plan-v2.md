# Phase 3: UI/UX Polish & Visual Effects - Implementation Plan v2

> **Mục tiêu Phase 3**: Nâng cấp UI/UX TRONG CANVAS cho Arena Shooter với Phaser rendering
> 
> **Nguyên tắc thiết kế**: Game phải độc lập, portable, self-contained - có thể embed anywhere
> 
> **Thời gian ước tính**: 4-6 ngày (part-time)

---

## 🎯 **Nguyên Tắc Thiết Kế Canvas-First**

### **✅ TRONG CANVAS** (Phaser rendering)
- ✅ All game objects (players, bullets, effects)
- ✅ All game HUD (health, timer, K/D, leaderboard)
- ✅ Kill feed notifications
- ✅ End-game scoreboard
- ✅ Crosshair
- ✅ Visual effects (damage, death, respawn)

### **❌ BÊN NGOÀI CANVAS** (React - chỉ khi cần thiết)
- ✅ Player cards sidebar (đã có pattern, giữ nguyên)
- ✅ Player badges (RoleBadge, StatusBadge, ExtraInfo) - vì thuộc PlayerCard
- ❌ **KHÔNG** có React overlays cho game UI

### **Lợi ích:**
1. ✅ Game độc lập - có thể embed vào bất kỳ trang nào
2. ✅ Consistent rendering - tất cả UI dùng Phaser style
3. ✅ Better performance - không có React re-renders
4. ✅ Easier to port - có thể export game ra ngoài project
5. ✅ Single source of truth - Phaser quản lý toàn bộ game state

---

## 📊 **Hiện Trạng ShooterScene**

### **✅ Đã có (nhưng đơn giản, cần nâng cấp):**

```javascript
createHUD() {
    // Timer - simple text
    this.timerText = this.add.text(400, 20, 'Time: --:--', {...});
    
    // My health bar - simple rectangle
    this.myHealthBarBg = this.add.rectangle(100, 580, 200, 20, 0x333333);
    this.myHealthBar = this.add.rectangle(100, 580, 200, 20, 0x00ff00);
    this.myHealthText = this.add.text(200, 580, '100/100', {...});
    
    // K/D stats - simple text
    this.kdText = this.add.text(700, 580, 'K: 0  D: 0', {...});
    
    // Leaderboard - simple text list
    this.leaderboardText = this.add.text(750, 50, '', {...});
}

showEndGameScreen(data) {
    // Overlay with winner + leaderboard
    const overlay = this.add.rectangle(centerX, centerY, 800, 600, 0x000000, 0.85);
    const title = this.add.text(centerX, centerY - 180, titleText, {...});
    // ... leaderboard entries
}
```

### **❌ Chưa có:**
- Kill feed notifications (real-time kill messages)
- Crosshair
- Visual effects (damage flash, death animation, respawn pulse)
- Polish UI (backgrounds, borders, icons)

---

## 🎯 **Phase 3: Chi Tiết Tasks**

### **Task 3.1: Nâng Cấp PlayerBadges** (React - NGOÀI canvas)

**File**: `client/src/components/games/shooter/ShooterPlayerBadges.jsx` (TẠO MỚI)

#### 📝 Mục tiêu:
Tạo badges cho PlayerCard sidebar (duy nhất phần React cần thêm)

#### 🔧 Implementation:

```jsx
import React from 'react';

/**
 * Shooter-specific player badges - hiển thị trong PlayerCard sidebar
 * Đây là DUY NHẤT phần React UI cần thêm cho Shooter
 */

// Role Badge - Hiển thị K/D ratio
export const ShooterRoleBadge = ({ player, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    if (!fullPlayer) return null;

    const hasStats = fullPlayer.kills > 0 || fullPlayer.deaths > 0;
    if (!hasStats) return null;

    const kd = fullPlayer.deaths > 0 
        ? (fullPlayer.kills / fullPlayer.deaths).toFixed(2) 
        : fullPlayer.kills;

    return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full
            bg-purple-500/20 border border-purple-500/40 text-purple-400
            flex items-center gap-1"
            title={`K/D Ratio: ${kd}`}>
            <span>⚔️</span>
            <span>{kd} K/D</span>
        </span>
    );
};

// Status Badge - Ready/Alive/Dead status
export const ShooterStatusBadge = ({ player, gameState, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    if (!fullPlayer) return null;

    // Waiting state
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

    // Playing state - alive/dead
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

// Extra Info - Stats during/after game
export const ShooterExtraInfo = ({ player, currentRoom }) => {
    const fullPlayer = currentRoom?.state?.players?.get(player.id);
    if (!fullPlayer) return null;

    const gameState = currentRoom?.state?.gameState;

    // Chỉ hiển thị khi playing hoặc finished
    if (gameState === 'playing' || gameState === 'finished') {
        return (
            <div className="flex items-center gap-3 text-xs mt-1">
                {/* Score */}
                <div className="flex items-center gap-1">
                    <span className="text-yellow-400">🏆</span>
                    <span className="text-white font-bold">{fullPlayer.score || 0}</span>
                </div>
                
                {/* Kills */}
                <div className="flex items-center gap-1">
                    <span className="text-green-400">⚔️</span>
                    <span className="text-green-300 font-bold">{fullPlayer.kills || 0}</span>
                </div>
                
                {/* Deaths */}
                <div className="flex items-center gap-1">
                    <span className="text-red-400">💀</span>
                    <span className="text-red-300 font-bold">{fullPlayer.deaths || 0}</span>
                </div>

                {/* Health (nếu đang chơi và còn sống) */}
                {gameState === 'playing' && fullPlayer.isAlive && (
                    <div className="flex items-center gap-1">
                        <span className="text-blue-400">❤️</span>
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
- [ ] ShooterRoleBadge hiển thị K/D ratio
- [ ] ShooterStatusBadge hiển thị trạng thái ready/alive/dead
- [ ] ShooterExtraInfo hiển thị stats (score, kills, deaths, health)
- [ ] Components render đúng trong PlayerCard sidebar

---

### **Task 3.2: Nâng Cấp HUD TRONG Canvas** (Phaser)

**File**: `client/src/games/shooter/ShooterScene.js`

#### 📝 Mục tiêu:
Thay thế HUD đơn giản bằng version đẹp hơn với backgrounds, borders, icons

#### 🔧 Implementation:

```javascript
/**
 * Tạo HUD với styling đẹp hơn - TẤT CẢ TRONG PHASER
 */
createHUD() {
    const centerX = this.cameras.main.width / 2;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ====== TOP CENTER: TIMER + SCORE LIMIT ======
    
    // Timer background panel
    const timerBg = this.add.rectangle(centerX, 20, 220, 40, 0x1a1a2e, 0.95)
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    
    const timerBorder = this.add.rectangle(centerX, 20, 220, 40)
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(100)
        .setStrokeStyle(2, 0x00ff88, 0.8);

    // Timer icon + text
    this.timerIcon = this.add.text(centerX - 90, 30, '⏱️', {
        fontSize: '20px'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.timerText = this.add.text(centerX - 60, 30, '--:--', {
        fontSize: '20px',
        color: '#00ff88',
        fontStyle: 'bold',
        fontFamily: 'monospace'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Score limit (First to X)
    this.scoreLimitText = this.add.text(centerX + 20, 30, '🎯 First to: 0', {
        fontSize: '14px',
        color: '#ffaa00'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

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
    
    // Leaderboard background
    const leaderboardBg = this.add.rectangle(width - 20, 20, 200, 200, 0x1a1a2e, 0.95)
        .setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    
    const leaderboardBorder = this.add.rectangle(width - 20, 20, 200, 200)
        .setOrigin(1, 0).setScrollFactor(0).setDepth(100)
        .setStrokeStyle(2, 0x00ff88, 0.5);

    // Leaderboard title
    this.add.text(width - 110, 32, '🏆 LEADERBOARD', {
        fontSize: '12px',
        color: '#00ff88',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Leaderboard entries (will be updated dynamically)
    this.leaderboardEntries = [];
    for (let i = 0; i < 5; i++) {
        const entry = this.add.text(width - 210, 60 + i * 25, '', {
            fontSize: '11px',
            color: '#ffffff',
            fontFamily: 'monospace'
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);
        
        this.leaderboardEntries.push(entry);
    }

    // ====== CENTER: CROSSHAIR ======
    
    this.crosshair = this.add.graphics();
    this.crosshair.setDepth(1000).setScrollFactor(0);
    
    // Static center crosshair
    const cx = centerX;
    const cy = height / 2;
    
    this.crosshair.lineStyle(2, 0xffffff, 0.7);
    this.crosshair.lineBetween(cx - 12, cy, cx - 4, cy);
    this.crosshair.lineBetween(cx + 4, cy, cx + 12, cy);
    this.crosshair.lineBetween(cx, cy - 12, cx, cy - 4);
    this.crosshair.lineBetween(cx, cy + 4, cx, cy + 12);
    
    this.crosshair.fillStyle(0xff0000, 0.8);
    this.crosshair.fillCircle(cx, cy, 2);

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
 * Update HUD every frame
 */
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

    // Update respawn message visibility
    const isDead = !myPlayer.isAlive;
    this.respawnMessageBg.setVisible(isDead);
    this.respawnMessageBorder.setVisible(isDead);
    this.respawnMessage.setVisible(isDead);
    
    // Pulse effect when dead
    if (isDead) {
        const alpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
        this.respawnMessage.setAlpha(alpha);
    }
}

/**
 * Timer update từ FFA hooks
 */
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

/**
 * Update leaderboard - enhanced version
 */
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

    // Update leaderboard entries
    players.slice(0, 5).forEach((player, index) => {
        const entry = this.leaderboardEntries[index];
        if (!entry) return;

        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const isMe = player.id === this.room.sessionId;
        const displayName = player.name.substring(0, 12); // Truncate long names
        
        entry.setText(`${medal} ${displayName}: ${player.score}`);
        entry.setColor(isMe ? '#FFD700' : '#ffffff'); // Gold for me
        entry.setFontStyle(isMe ? 'bold' : 'normal');
        entry.setVisible(true);
    });

    // Hide unused entries
    for (let i = players.length; i < 5; i++) {
        if (this.leaderboardEntries[i]) {
            this.leaderboardEntries[i].setVisible(false);
        }
    }
}

/**
 * Update score limit display
 */
onStateSync() {
    if (this.room && this.room.state && this.scoreLimitText) {
        this.scoreLimitText.setText(`🎯 First to: ${this.room.state.scoreLimit || 0}`);
    }
}
```

#### ✅ Acceptance Criteria:
- [ ] Health bar với background panel đẹp
- [ ] Timer với icon và warning effect khi < 10s
- [ ] K/D stats rõ ràng
- [ ] Leaderboard với medals (🥇🥈🥉)
- [ ] Score limit hiển thị
- [ ] Crosshair ở giữa màn hình
- [ ] Respawn message khi chết (với pulse effect)
- [ ] Tất cả elements có backgrounds và borders

---

### **Task 3.3: Kill Feed Notifications** (Phaser)

**File**: `client/src/games/shooter/ShooterScene.js`

#### 📝 Mục tiêu:
Hiển thị kill notifications trong game (TRONG canvas)

#### 🔧 Implementation:

```javascript
/**
 * Setup trong create()
 */
create() {
    this.createArena();
    this.setupInput();
    this.createHUD();
    this.createKillFeed(); // NEW
}

/**
 * Tạo kill feed container
 */
createKillFeed() {
    this.killFeedEntries = []; // Array of kill notifications
    this.maxKillFeedEntries = 5;
}

/**
 * Setup trong setupServerMessages()
 */
setupServerMessages() {
    if (!this.room) return;

    // Listen to kill events
    this.room.onMessage('player_killed', (data) => {
        console.log('[ShooterScene] Player killed:', data);
        this.showKillNotification(data); // NEW
    });

    // Listen to respawn events
    this.room.onMessage('player_respawned', (data) => {
        console.log('[ShooterScene] Player respawned:', data.playerName);
    });
}

/**
 * Hiển thị kill notification
 */
showKillNotification(data) {
    const { victimName, killerName, victimId, killerId } = data;
    const isSuicide = victimId === killerId;
    
    const width = this.cameras.main.width;
    const baseY = 140; // Below leaderboard
    
    // Calculate Y position (stack from top)
    const yPos = baseY + this.killFeedEntries.length * 35;
    
    // Create notification panel
    const panelWidth = 280;
    const panelHeight = 30;
    
    const bg = this.add.rectangle(width - 20, yPos, panelWidth, panelHeight, 0x1a1a2e, 0.95)
        .setOrigin(1, 0).setScrollFactor(0).setDepth(150);
    
    const border = this.add.rectangle(width - 20, yPos, panelWidth, panelHeight)
        .setOrigin(1, 0).setScrollFactor(0).setDepth(150)
        .setStrokeStyle(2, 0xff4444, 0.8);

    // Create text
    let message;
    if (isSuicide) {
        message = `${victimName} 💀 eliminated themselves`;
    } else {
        message = `${killerName} ⚔️ ${victimName}`;
    }

    const text = this.add.text(width - 160, yPos + 15, message, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151);

    // Store entry
    const entry = {
        bg,
        border,
        text,
        createdAt: Date.now()
    };
    
    this.killFeedEntries.push(entry);

    // Slide-in animation
    bg.setX(width + 50);
    border.setX(width + 50);
    text.setX(width + 50);
    
    this.tweens.add({
        targets: [bg, border, text],
        x: '-=70',
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
 * Remove kill notification
 */
removeKillNotification(entry) {
    if (!entry) return;

    // Fade out animation
    this.tweens.add({
        targets: [entry.bg, entry.border, entry.text],
        alpha: 0,
        duration: 200,
        onComplete: () => {
            entry.bg.destroy();
            entry.border.destroy();
            entry.text.destroy();
            
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
    const baseY = 140;
    
    this.killFeedEntries.forEach((entry, index) => {
        const targetY = baseY + index * 35;
        
        this.tweens.add({
            targets: [entry.bg, entry.border, entry.text],
            y: targetY,
            duration: 200,
            ease: 'Sine.easeOut'
        });
    });
}
```

#### ✅ Acceptance Criteria:
- [ ] Kill notifications hiển thị real-time
- [ ] Format: "Killer ⚔️ Victim" hoặc "Player 💀 eliminated themselves"
- [ ] Slide-in animation từ phải
- [ ] Auto-remove sau 5 giây
- [ ] Max 5 notifications
- [ ] Stack từ trên xuống
- [ ] Reposition khi có entry bị remove

---

### **Task 3.4: Nâng Cấp End-Game Scoreboard** (Phaser)

**File**: `client/src/games/shooter/ShooterScene.js`

#### 📝 Mục tiêu:
Làm đẹp màn hình kết thúc với scoreboard chi tiết hơn

#### 🔧 Implementation:

```javascript
/**
 * Enhanced end-game screen
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

    // ====== FOOTER MESSAGE ======
    
    const footerText = this.add.text(centerX, centerY + 210,
        'Waiting for rematch or return to lobby...', {
        fontSize: '13px',
        color: '#888888'
    }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

    // Pulse footer
    this.tweens.add({
        targets: footerText,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1
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
        footerText
    };
}
```

#### ✅ Acceptance Criteria:
- [ ] Full-screen overlay với dark background
- [ ] Victory/Defeat title với pulse animation
- [ ] Winner info prominent
- [ ] Scoreboard table với headers
- [ ] Columns: Rank, Player, Score, K/D, Ratio
- [ ] Medals cho top 3 (🥇🥈🥉)
- [ ] Highlight winner row (gold background)
- [ ] Highlight current player row (blue background)
- [ ] Clean layout với separators
- [ ] Footer message với pulse

---

### **Task 3.5: Visual Effects** (Phaser)

**File**: `client/src/games/shooter/ShooterScene.js`

#### 📝 Mục tiêu:
Thêm visual feedback khi damage, death, respawn

#### 🔧 Implementation:

```javascript
/**
 * Setup player health listener để detect damage
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
}

/**
 * Damage flash effect - tint red briefly
 */
flashDamage(sessionId) {
    const playerObj = this.playerSprites.get(sessionId);
    if (!playerObj) return;

    // Flash red
    playerObj.sprite.setTint(0xff0000);
    
    // Reset after 100ms
    this.time.delayedCall(100, () => {
        if (playerObj.sprite && playerObj.sprite.clearTint) {
            playerObj.sprite.clearTint();
        }
    });

    // Screen shake for my player
    if (sessionId === this.room.sessionId) {
        this.cameras.main.shake(100, 0.005);
    }
}

/**
 * Death animation - fade out and explode
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
 * Respawn animation - fade in with pulse
 */
showRespawnAnimation(sessionId) {
    const playerObj = this.playerSprites.get(sessionId);
    if (!playerObj) return;

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

    // Spawn flash
    const flash = this.add.circle(playerObj.sprite.x, playerObj.sprite.y, 40, 0x00ff88, 0.6);
    flash.setDepth(51);
    this.tweens.add({
        targets: flash,
        scale: 1.5,
        alpha: 0,
        duration: 400,
        onComplete: () => flash.destroy()
    });

    // Ring pulse
    const ring = this.add.circle(playerObj.sprite.x, playerObj.sprite.y, 20);
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
 * Muzzle flash when shooting
 */
showMuzzleFlash(x, y, rotation) {
    // Flash at gun position
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
 * Call muzzle flash when player shoots
 * Update trong handleShoot()
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
```

#### ✅ Acceptance Criteria:
- [ ] Damage flash (red tint) khi bị hit
- [ ] Screen shake khi my player bị hit
- [ ] Death animation (fade out + particles explosion)
- [ ] Respawn animation (fade in + pulse + ring effect)
- [ ] Muzzle flash khi shoot
- [ ] Smooth animations không lag
- [ ] Effects không che khuất gameplay

---

### **Task 3.6: Update Game Profile** (React Config)

**File**: `client/src/config/gameProfiles.js`

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
            waiting: '⏳ Preparing for arena combat...',
            playing: '🔫 Arena battle in progress',
            finished: '🏁 Match finished - Ready for rematch'
        },
        behaviors: {
            turnBased: false,        // Real-time game
            readyStrategy: 'allPlayers',
            allowKicks: true
        },
        components: {
            RoleBadge: ShooterRoleBadge,
            StatusBadge: ShooterStatusBadge,
            ExtraInfo: ShooterExtraInfo
        }
    },
    
    // Test FFA - reuse shooter components
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
- [ ] Shooter profile added
- [ ] Components registered correctly
- [ ] Behaviors configured (turnBased: false)
- [ ] Status texts phù hợp
- [ ] Test-ffa cũng được config

---

### **Task 3.7: Server Message Enhancement** (Server)

**File**: `server/rooms/shooter/ShooterRoom.js`

#### 📝 Mục tiêu:
Đảm bảo server gửi đầy đủ thông tin cho client (đã có sẵn, chỉ verify)

#### ✅ Verify:

```javascript
// In handlePlayerDeath - ALREADY IMPLEMENTED
this.broadcast('player_killed', {
    victim: victimId,
    killer: killerId,
    victimName: victim.name,
    killerName: killer?.name || 'Unknown'
});

// In respawnPlayer - ALREADY IMPLEMENTED
this.broadcast('player_respawned', {
    playerId: playerId,
    playerName: player.name
});
```

#### ✅ Acceptance Criteria:
- [x] Server gửi player names trong messages (đã có)
- [x] Kill events có đầy đủ info (đã có)
- [x] Respawn events có player name (đã có)

---

## ✅ **Verification Plan**

### Test 1: HUD Display
1. Start shooter match
2. Verify:
   - [ ] Health bar hiển thị đúng và update real-time
   - [ ] Health bar color changes (green → orange → red)
   - [ ] K/D stats update correctly
   - [ ] Timer counts down smoothly
   - [ ] Timer turns red when < 10s
   - [ ] Leaderboard shows top 5 players
   - [ ] Leaderboard highlights my player
   - [ ] Score limit displayed
   - [ ] Crosshair visible ở center
   - [ ] All panels có backgrounds và borders

### Test 2: Kill Feed
1. Play match và eliminate players
2. Verify:
   - [ ] Kill notifications appear immediately
   - [ ] Correct format: "Killer ⚔️ Victim"
   - [ ] Suicide shows different message
   - [ ] Slide-in animation smooth
   - [ ] Auto-remove sau 5 giây
   - [ ] Max 5 notifications
   - [ ] Stack position correct
   - [ ] Reposition khi entry removed

### Test 3: Visual Effects
1. Take damage, die, respawn
2. Verify:
   - [ ] Damage flash red tint
   - [ ] Screen shake khi my player hit
   - [ ] Death animation (fade + particles)
   - [ ] Death flash effect
   - [ ] Respawn animation (fade in + pulse)
   - [ ] Respawn ring effect
   - [ ] Muzzle flash khi shoot
   - [ ] No performance issues

### Test 4: End-Game Scoreboard
1. Complete match
2. Verify:
   - [ ] Scoreboard appears với dark overlay
   - [ ] Victory/Defeat title correct
   - [ ] Winner info prominent
   - [ ] Full stats table
   - [ ] Top 3 medals (🥇🥈🥉)
   - [ ] Winner row highlighted (gold)
   - [ ] My player row highlighted (blue)
   - [ ] K/D ratio calculated correctly
   - [ ] Clean layout

### Test 5: PlayerBadges (React)
1. Join lobby và play match
2. Verify:
   - [ ] ShooterRoleBadge shows K/D
   - [ ] StatusBadge shows correct status
   - [ ] ExtraInfo shows stats during game
   - [ ] All badges render in PlayerCard

### Test 6: Game Independence
1. Embed game vào trang test khác
2. Verify:
   - [ ] Game runs independently
   - [ ] Tất cả UI render TRONG canvas
   - [ ] Không có missing React components
   - [ ] Game portable và self-contained

---

## 📊 **Deliverables**

### **New Files:**
- ✅ `client/src/components/games/shooter/ShooterPlayerBadges.jsx`

### **Updated Files:**
- ✅ `client/src/games/shooter/ShooterScene.js` (major updates)
  - Enhanced HUD
  - Kill feed
  - Visual effects
  - Better scoreboard
- ✅ `client/src/config/gameProfiles.js`

### **No Changes Needed:**
- ✅ `server/rooms/shooter/ShooterRoom.js` (already sends names in messages)
- ✅ `client/src/pages/GamePage.jsx` (chỉ cần PlayerBadges, không cần HUD overlays)

---

## 🎯 **Success Criteria**

Phase 3 COMPLETE khi:

1. ✅ ShooterPlayerBadges implemented và hoạt động
2. ✅ HUD trong canvas đẹp và functional
3. ✅ Kill feed hiển thị real-time
4. ✅ Visual effects enhance gameplay
5. ✅ End-game scoreboard professional
6. ✅ Game hoàn toàn độc lập (canvas-first)
7. ✅ Có thể embed game ở bất kỳ đâu
8. ✅ All manual tests pass
9. ✅ No React overlays for game UI
10. ✅ Performance good (60 FPS)

---

## 💡 **Design Principles**

### **Canvas-First Architecture:**
- ✅ Game = Self-contained Phaser scene
- ✅ All game UI rendered by Phaser
- ✅ Portable và embeddable
- ✅ No dependency on parent React page
- ✅ Single source of truth (Phaser scene)

### **Separation of Concerns:**
- ✅ **Phaser Canvas**: Game + UI + Effects (100% of game)
- ✅ **React Sidebar**: Player management only (PlayerCard)
- ✅ **React Badges**: Player metadata for sidebar

### **Benefits:**
- ✅ Easier to maintain (UI logic in one place)
- ✅ Better performance (no React re-renders for game UI)
- ✅ Truly portable (can export game standalone)
- ✅ Consistent styling (all Phaser-rendered)

---

**PHASE 3 v2 - CANVAS-FIRST APPROACH** 🎮✨

Làm xong Phase 3 này, Shooter Game sẽ:
- ✅ 100% độc lập trong canvas
- ✅ Professional UI polish
- ✅ Smooth visual effects
- ✅ Có thể embed anywhere
- ✅ Production-ready!

