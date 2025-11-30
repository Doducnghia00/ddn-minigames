# TODO: Host Room Settings - Per-Room Game Configuration

**Status:** 📋 Planning  
**Priority:** 🟢 High (Quality of Life Feature)  
**Estimated Effort:** ~4-6 hours  
**Prerequisite:** ✅ Config refactor hoàn thành - `SHOOTER_CUSTOMIZABLE_SETTINGS` và `CARO_CUSTOMIZABLE_SETTINGS` đã được implement

---

## Mục tiêu

Cho phép **chủ phòng (host)** có thể tùy chỉnh các thông số game **chỉ cho phòng hiện tại**, khi game đang **không ở trạng thái playing** (tức `waiting` hoặc `finished`).

### Scope

🎮 **Feature này áp dụng cho TẤT CẢ MỌI GAME**, không chỉ Shooter:
- ✅ **Shooter**: Score limit (7 settings), time, damage, fire rate, speeds, etc.
- ✅ **Caro**: Board size (3 settings), win condition, time per turn, etc.
- ✅ **Future games**: Mỗi game sẽ có config riêng

### Use Cases

1. **Host muốn chơi match nhanh**: Giảm scoreLimit từ 5 xuống 5, giảm time từ 5 phút xuống 2 phút
2. **Host muốn match dài hơn**: Tăng scoreLimit lên 30, tăng time lên 10 phút
3. **Host muốn test balance**: Thử nghiệm với damage/fire rate khác nhau
4. **Host muốn chơi custom rules**: Tăng respawn delay để game khó hơn

---

## Thiết kế UI

### Vị trí hiển thị

**Settings Panel** sẽ xuất hiện ở **RIGHT COLUMN** của GamePage, thay thế placeholder hiện tại:

```
┌─────────────── GAME PAGE ───────────────┐
│ LEFT COL        CENTER           RIGHT   │
│ ┌─────────┐   ┌────────┐   ┌──────────┐ │
│ │Room Info│   │ Canvas │   │  Queue   │ │
│ │Players  │   │ Phaser │   │ Ready    │ │
│ │         │   │  Game  │   │ Progress │ │
│ │         │   │        │   ├──────────┤ │
│ │         │   │        │   │⚙️ GAME   │ │
│ │         │   │        │   │ SETTINGS │ │ ← INLINE PANEL
│ │         │   │        │   │          │ │   (Host only)
│ │         │   │        │   │ [Slider] │ │
│ │         │   │        │   │ [Slider] │ │
│ │         │   │        │   │ [Apply]  │ │
│ └─────────┘   └────────┘   └──────────┘ │
└──────────────────────────────────────────┘
```

**Current placeholder** (lines 417-425 trong GamePage.jsx):
```jsx
<div className="glass-effect rounded-xl p-4 shadow-lg min-h-[120px] border border-dashed border-slate-600/70">
    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
        Game Settings
    </div>
    <p className="text-sm text-slate-400">
        Coming soon...
    </p>
</div>
```

### Settings Panel Design

**Không dùng modal popup**, thay vào đó là **inline collapsible panel** trong RIGHT column:

```
┌────────────────────────────────────┐
│ ⚙️ GAME SETTINGS         [▼]      │ ← Header (collapsible)
├────────────────────────────────────┤
│                                    │
│ 🎯 Victory                         │
│ Score: [15] ⚔️                     │
│ ├─────●─────┤ 5-50                │
│                                    │
│ ⏱️ Duration                        │
│ Time: [5:00]                       │
│ ├─────●─────┤ 2m-10m              │
│                                    │
│ ⚔️ Combat                          │
│ Damage: [25] HP                    │
│ Fire Rate: [800] ms                │
│ Respawn: [3] sec                   │
│                                    │
│ 🏃 Movement                         │
│ Player: [200] px/s                 │
│ Bullet: [500] px/s                 │
│                                    │
│ [Reset]  [Apply ✓]                │
└────────────────────────────────────┘
```

### Quyền truy cập

- **Chỉ Host** mới thấy panel này (replace "Coming soon" placeholder)
- **Non-host players** vẫn thấy "Coming soon" hoặc view-only info
- Settings **chỉ có thể thay đổi** khi `gameState === 'waiting'` hoặc `gameState === 'finished'`
- Khi game đang `playing`, tất cả inputs bị disable (readonly mode)

---

### Configurable Settings Metadata

✅ **Config đã được refactor** với metadata-based approach!

#### Shooter Settings (7 customizable)

Được định nghĩa trong `SHOOTER_CUSTOMIZABLE_SETTINGS` (xem `server/rooms/shooter/shooter-config.js`):

```javascript
const { SHOOTER_CUSTOMIZABLE_SETTINGS } = require('./shooter-config');

// ✅ Metadata đã có sẵn:
SHOOTER_CUSTOMIZABLE_SETTINGS = {
    scoreLimit: {
        path: 'match.scoreLimit',
        min: 5, max: 50, step: 5, default: 5,
        editable: true,
        label: 'Score Limit',
        description: 'Kills needed to win the match',
        category: 'victory',
        unit: 'kills'
    },
    matchDuration: {
        path: 'match.matchDuration',
        min: 120, max: 600, step: 60, default: 300,
        editable: true,
        label: 'Match Duration',
        description: 'Time limit for the match',
        category: 'match',
        unit: 'seconds',
        format: (v) => `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`
    },
    moveSpeed: { 
        path: 'player.moveSpeed',
        min: 150, max: 300, step: 10, default: 200,
        editable: true,
        label: 'Player Speed',
        category: 'movement',
        unit: 'px/s'
    },
    respawnDelay: { 
        path: 'player.respawnDelay',
        min: 1, max: 10, step: 1, default: 3,
        editable: true,
        label: 'Respawn Delay',
        category: 'gameplay',
        unit: 'seconds'
    },
    fireRate: { 
        path: 'weapon.fireRate',
        min: 100, max: 1000, step: 50, default: 800,
        editable: true,
        label: 'Fire Rate',
        category: 'combat',
        unit: 'ms'
    },
    bulletSpeed: { 
        path: 'weapon.bulletSpeed',
        min: 200, max: 800, step: 50, default: 500,
        editable: true,
        label: 'Bullet Speed',
        category: 'combat',
        unit: 'px/s'
    },
    bulletDamage: { 
        path: 'weapon.bulletDamage',
        min: 10, max: 50, step: 5, default: 25,
        editable: true,
        label: 'Bullet Damage',
        category: 'combat',
        unit: 'HP'
    }
};
```

**Locked Settings** (KHÔNG được customize):
- ❌ `match.minPlayers` / `match.maxPlayers` - Game logic, định nghĩa lobby behavior
- ❌ `match.patchRate` - Server performance, network bandwidth
- ❌ `arena.width` / `arena.height` - Client đã init canvas với size này
- ❌ `player.maxHealth`, `player.hitboxRadius` - Core mechanics
- ❌ `weapon.bulletLifetime` - Auto-calculated từ arena size

#### Caro Settings (3 customizable)

Được định nghĩa trong `CARO_CUSTOMIZABLE_SETTINGS` (xem `server/rooms/caro/caro-config.js`):

```javascript
const { CARO_CUSTOMIZABLE_SETTINGS } = require('./caro-config');

// ✅ Metadata đã có sẵn:
CARO_CUSTOMIZABLE_SETTINGS = {
    boardSize: {
        path: 'board.size',
        min: 10, max: 20, step: 1, default: 15,
        editable: true,
        label: 'Board Size',
        description: 'Width and height of the game board',
        category: 'board',
        unit: 'cells'
    },
    winCondition: {
        path: 'board.winCondition',
        min: 4, max: 6, step: 1, default: 5,
        editable: true,
        label: 'Win Condition',
        description: 'Consecutive marks needed to win',
        category: 'rules',
        unit: 'in a row'
    },
    timePerTurn: {
        path: 'turn.timeLimit',
        min: 0, max: 120, step: 5, default: 0,
        editable: true,
        label: 'Time Per Turn',
        description: 'Seconds per turn (0 = unlimited)',
        category: 'timing',
        unit: 'seconds'
    }
};
```

**Locked Settings** (KHÔNG được customize):
- ❌ `match.minPlayers` / `match.maxPlayers` - Game-specific (always 2 for Caro)
- ❌ `arena.width` / `arena.height` - Client đã init canvas với size này

```javascript
// server/rooms/shooter/ShooterRoom.js
class ShooterRoom extends FreeForAllRoom {
    onCreate(options) {
        // ...
        
        // Room-specific settings (override default config)
        this.roomSettings = {
            scoreLimit: SHOOTER_CONFIG.match.scoreLimit,
            matchDuration: SHOOTER_CONFIG.match.matchDuration,
            moveSpeed: SHOOTER_CONFIG.player.moveSpeed,
            respawnDelay: SHOOTER_CONFIG.player.respawnDelay,
            fireRate: SHOOTER_CONFIG.weapon.fireRate,
            bulletSpeed: SHOOTER_CONFIG.weapon.bulletSpeed,
            bulletDamage: SHOOTER_CONFIG.weapon.bulletDamage
        };
        
        // Sync to state for clients to display
        this.syncSettingsToState();
    }
}
```

---

## Implementation Plan

### Phase 1: Server-side Foundation

#### 1.1. Settings Schema & State

**File:** `server/rooms/shooter/ShooterState.js`

```javascript
import { Schema, type } from '@colyseus/schema';

class ShooterState extends Schema {
    // ... existing fields
    
    // Room-specific configurable settings
    @type("number") cfg_scoreLimit;
    @type("number") cfg_matchDuration;
    @type("number") cfg_moveSpeed;
    @type("number") cfg_respawnDelay;
    @type("number") cfg_fireRate;
    @type("number") cfg_bulletSpeed;
    @type("number") cfg_bulletDamage;
}
```

**Lý do prefix `cfg_`**: Phân biệt rõ với các state khác, dễ filter trong client.

#### 1.2. Settings Validation

**File:** `server/rooms/shooter/settings-validator.js` (NEW)

```javascript
// ✅ KHÔNG CẦN tạo SETTINGS_CONSTRAINTS riêng!
// Sử dụng metadata có sẵn từ config
const { SHOOTER_CUSTOMIZABLE_SETTINGS } = require('./shooter-config');

function validateSetting(key, value) {
    const setting = SHOOTER_CUSTOMIZABLE_SETTINGS[key];
    
    // 1. Check if setting exists and is editable
    if (!setting || !setting.editable) {
        return { 
            valid: false, 
            error: `Setting '${key}' is not customizable` 
        };
    }
    
    // 2. Validate type and range
    const numValue = Number(value);
    if (isNaN(numValue)) {
        return { valid: false, error: 'Not a number' };
    }
    
    if (numValue < setting.min || numValue > setting.max) {
        return { 
            valid: false, 
            error: `Must be between ${setting.min} and ${setting.max}` 
        };
    }
    
    // 3. Validate step alignment
    if ((numValue - setting.min) % setting.step !== 0) {
        return { 
            valid: false, 
            error: `Must be in steps of ${setting.step}` 
        };
    }
    
    return { valid: true, value: numValue };
}

function validateAllSettings(settings) {
    const validated = {};
    const errors = [];
    
    for (const [key, value] of Object.entries(settings)) {
        const result = validateSetting(key, value);
        if (result.valid) {
            validated[key] = result.value;
        } else {
            errors.push({ key, error: result.error });
        }
    }
    
    return { validated, errors };
}

module.exports = { 
    validateSetting, 
    validateAllSettings 
};
```

**Ưu điểm**: Single source of truth - metadata dùng cho cả validation và UI generation!

#### 1.3. Settings Message Handler

**File:** `server/rooms/shooter/ShooterRoom.js`

```javascript
onMessage(client, type, data) {
    super.onMessage(client, type, data);
    
    if (type === 'update_settings') {
        this.handleUpdateSettings(client, data);
    }
}

handleUpdateSettings(client, data) {
    // 1. Check if sender is host
    if (client.sessionId !== this.hostId) {
        client.send('settings_error', { error: 'Only host can change settings' });
        return;
    }
    
    // 2. Check if game is not playing
    if (this.state.gameState === 'playing') {
        client.send('settings_error', { error: 'Cannot change settings during match' });
        return;
    }
    
    // 3. Validate settings
    const { validated, errors } = validateAllSettings(data.settings);
    
    if (errors.length > 0) {
        client.send('settings_error', { errors });
        return;
    }
    
    // 4. Apply settings
    this.applySettings(validated);
    
    // 5. Broadcast success
    this.broadcast('settings_updated', { 
        settings: this.getCurrentSettings(),
        updatedBy: client.userData.name || 'Host'
    });
    
    console.log(`[ShooterRoom] Settings updated by ${client.userData.name}:`, validated);
}

applySettings(settings) {
    // Update room settings
    Object.assign(this.roomSettings, settings);
    
    // Sync to state for clients
    this.syncSettingsToState();
    
    // If match is finished, these will apply to next match
    // If waiting, will apply when match starts
}

syncSettingsToState() {
    this.state.cfg_scoreLimit = this.roomSettings.scoreLimit;
    this.state.cfg_matchDuration = this.roomSettings.matchDuration;
    this.state.cfg_moveSpeed = this.roomSettings.moveSpeed;
    this.state.cfg_respawnDelay = this.roomSettings.respawnDelay;
    this.state.cfg_fireRate = this.roomSettings.fireRate;
    this.state.cfg_bulletSpeed = this.roomSettings.bulletSpeed;
    this.state.cfg_bulletDamage = this.roomSettings.bulletDamage;
}

getCurrentSettings() {
    return { ...this.roomSettings };
}

// Use room settings instead of default config
startMatch() {
    // ...
    
    // Use room-specific settings
    this.state.scoreLimit = this.roomSettings.scoreLimit;
    this.matchDuration = this.roomSettings.matchDuration;
    
    // Apply to new players
    // Apply to bullets, etc.
}
```

### Phase 2: Client-side UI

#### 2.1. Settings Panel Component (Inline, No Modal)

**File:** `client/src/components/room/GameSettingsPanel.jsx` (NEW)

**Design**: Inline panel trong RIGHT column, replace "Coming soon" placeholder

```jsx
import React, { useState, useEffect, useMemo } from 'react';

/**
 * Game Settings Panel - Inline component for RIGHT column
 * - Replaces placeholder in GamePage.jsx lines 417-425
 * - Only visible to host
 * - Collapsible to save space
 * - Uses Tailwind CSS (no separate .css file)
 */
export function GameSettingsPanel({ room, isHost, gameId }) {
    const [settings, setSettings] = useState({});
    const [gameState, setGameState] = useState('waiting');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    
    // Get game-specific settings metadata
    // TODO: Fetch from API or config based on gameId
    const settingsMetadata = useMemo(() => {
        // For now, hardcoded for shooter
        // Later: fetch from server or import from shared config
        if (gameId === 'shooter') {
            return {
                scoreLimit: { min: 5, max: 50, step: 5, default: 5, label: 'Score', unit: 'kills' },
                matchDuration: { min: 120, max: 600, step: 60, default: 300, label: 'Time', unit: 's', 
                    format: (v) => `${Math.floor(v/60)}:${(v%60).toString().padStart(2,'0')}` },
                bulletDamage: { min: 10, max: 50, step: 5, default: 25, label: 'Damage', unit: 'HP' },
                fireRate: { min: 100, max: 1000, step: 50, default: 800, label: 'Fire Rate', unit: 'ms' },
                respawnDelay: { min: 1, max: 10, step: 1, default: 3, label: 'Respawn', unit: 's' },
                moveSpeed: { min: 150, max: 300, step: 10, default: 200, label: 'Speed', unit: 'px/s' },
                bulletSpeed: { min: 200, max: 800, step: 50, default: 500, label: 'Bullet', unit: 'px/s' }
            };
        } else if (gameId === 'caro') {
            return {
                boardSize: { min: 10, max: 20, step: 1, default: 15, label: 'Board', unit: 'cells' },
                winCondition: { min: 4, max: 6, step: 1, default: 5, label: 'Win', unit: 'row' },
                timePerTurn: { min: 0, max: 120, step: 5, default: 0, label: 'Turn', unit: 's' }
            };
        }
        return {};
    }, [gameId]);
    
    useEffect(() => {
        if (!room) return;
        
        const listeners = [];
        
        // Listen to game state
        const gameStateListener = room.state.listen('gameState', (value) => {
            setGameState(value);
        });
        listeners.push(gameStateListener);
        
        // Listen to all cfg_* fields
        Object.keys(settingsMetadata).forEach(key => {
            const listener = room.state.listen(`cfg_${key}`, (value) => {
                setSettings(prev => ({ ...prev, [key]: value }));
            });
            listeners.push(listener);
        });
        
        // Listen for server responses
        room.onMessage('settings_updated', () => {
            setIsSaving(false);
            setError(null);
        });
        
        room.onMessage('settings_error', (data) => {
            setIsSaving(false);
            setError(data.error || 'Failed to update settings');
        });
        
        return () => listeners.forEach(l => l());
    }, [room, settingsMetadata]);
    
    // Only show if host
    if (!isHost) {
        return (
            <div className="glass-effect rounded-xl p-4 shadow-lg min-h-[120px] border border-dashed border-slate-600/70">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                    Game Settings
                </div>
                <p className="text-sm text-slate-400">
                    Only host can modify settings
                </p>
            </div>
        );
    }
    
    const canEdit = gameState !== 'playing';
    
    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    
    const handleReset = () => {
        const defaults = {};
        Object.entries(settingsMetadata).forEach(([key, meta]) => {
            defaults[key] = meta.default;
        });
        setSettings(defaults);
    };
    
    const handleApply = () => {
        setIsSaving(true);
        setError(null);
        room.send('update_settings', { settings });
    };
    
    return (
        <div className="glass-effect rounded-xl shadow-lg border border-slate-700/60 overflow-hidden">
            {/* Header (collapsible) */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition"
            >
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                    ⚙️ Game Settings
                </div>
                <span className="text-slate-400 text-sm">
                    {isExpanded ? '▲' : '▼'}
                </span>
            </button>
            
            {/* Collapsible content */}
            {isExpanded && (
                <div className="p-4 pt-0 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                    {Object.entries(settingsMetadata).map(([key, meta]) => (
                        <SettingSlider
                            key={key}
                            label={meta.label}
                            value={settings[key] || meta.default}
                            onChange={(v) => handleChange(key, v)}
                            min={meta.min}
                            max={meta.max}
                            step={meta.step}
                            unit={meta.unit}
                            format={meta.format}
                            disabled={!canEdit}
                        />
                    ))}
                    
                    {error && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
                            {error}
                        </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                        <button
                            onClick={handleReset}
                            disabled={!canEdit || isSaving}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg
                                     bg-slate-700/60 text-slate-300 border border-slate-600/50
                                     hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                                     transition"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={!canEdit || isSaving}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg
                                     bg-green-600 text-white hover:bg-green-500
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition"
                        >
                            {isSaving ? 'Saving...' : 'Apply ✓'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component: Compact slider for settings
function SettingSlider({ label, value, onChange, min, max, step, unit, format, disabled }) {
    const displayValue = format ? format(value) : value;
    
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="text-green-400 font-mono">
                    {displayValue} <span className="text-slate-500">{unit}</span>
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-3
                         [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-green-500
                         [&::-webkit-slider-thumb]:cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}
```

#### 2.2. Integration vào GamePage

**File:** `client/src/pages/GamePage.jsx`

**Replace lines 417-425** (placeholder) với:

```jsx
import { GameSettingsPanel } from '../components/room/GameSettingsPanel';

// ...

{/* RIGHT COLUMN: Queue + Settings */}
<div className="flex flex-col gap-4 animate-slide-up order-3" style={{ animationDelay: '150ms' }}>
    {/* Queue Card */}
    <div className="glass-effect rounded-xl p-4 shadow-lg">
        {/* ... existing queue content ... */}
    </div>

    {/* Game Settings Panel - replaces "Coming soon" */}
    <GameSettingsPanel 
        room={currentRoom}
        isHost={currentRoom?.sessionId === roomOwner}
        gameId={activeGameId}
    />
</div>
```

### Phase 3: Testing & Polish

#### 3.1. Testing Checklist

- [ ] Chỉ host mới thấy Settings button
- [ ] Settings button disabled khi game đang playing
- [ ] Validation server-side hoạt động đúng
- [ ] Settings được áp dụng vào match tiếp theo
- [ ] Settings được broadcast đến tất cả clients
- [ ] UI responsive, slider mượt
- [ ] Reset to default hoạt động
- [ ] Error handling khi server reject
- [ ] Settings persist trong cùng room session
- [ ] Settings reset khi room bị dispose

#### 3.2. Edge Cases

1. **Host disconnects giữa chừng**
   - Transfer host quyền → player mới là host → thấy Settings button
   
2. **Settings change trong lúc countdown**
   - Nếu game đã countdown → reject change (add check `isCountingDown`)
   
3. **Multiple clients spam update**
   - Server debounce/throttle requests từ cùng 1 client
   
4. **Invalid values từ hacked client**
   - Server validation bắt tất cả

#### 3.3. UI/UX Polish

- [ ] Smooth transitions khi expand/collapse panel
- [ ] Tooltips giải thích từng setting (optional)
- [ ] Preview changes (ví dụ: "4 shots to kill" khi damage = 25, maxHealth = 100)
- [ ] Confirmation khi reset to default (optional)
- [ ] Toast/banner notification khi settings saved (optional)
- [ ] Show who changed settings to all players ("Settings updated by PlayerX")
- [ ] Compact design cho RIGHT column (không chiếm quá nhiều space)
- [ ] Readable sliders với clear min/max labels

---

## File Structure

```plaintext
server/
  rooms/
    shooter/
      ShooterRoom.js            (UPDATE: add settings handlers)
      ShooterState.js           (UPDATE: add cfg_* fields)
      settings-validator.js     (NEW: validation logic)
      shooter-config.js         (EXISTING: metadata already defined)
    
    caro/
      CaroRoom.js               (UPDATE: add settings handlers)
      CaroState.js              (UPDATE: add cfg_* fields)
      settings-validator.js     (NEW: validation logic)
      caro-config.js            (EXISTING: metadata already defined)

client/
  src/
    components/
      room/
        GameSettingsPanel.jsx   (NEW: inline settings panel, NO .css file)
    
    pages/
      GamePage.jsx              (UPDATE: replace placeholder with GameSettingsPanel)
```

**Notes:**
- ✅ No `.css` files - sử dụng Tailwind CSS
- ✅ Config metadata đã tồn tại trong `*-config.js` files
- ✅ Settings panel là inline component, không phải modal
- ✅ Pattern tương tự cho mọi game (shooter, caro, future)

---

## Milestones

### Milestone 1: Server Foundation (2h)
- [ ] Add `cfg_*` fields to `ShooterState.js` và `CaroState.js`
- [ ] Create `settings-validator.js` cho mỗi game (reuse metadata từ config)
- [ ] Add `update_settings` message handler trong Room classes
- [ ] Add validation & broadcast logic
- [ ] Test với Postman/manual test tool

### Milestone 2: Client UI (2-3h)
- [ ] Create `GameSettingsPanel.jsx` - inline component
- [ ] Implement collapsible panel với sliders
- [ ] Style với Tailwind CSS (compact design cho RIGHT column)
- [ ] Integrate vào `GamePage.jsx` (replace placeholder)
- [ ] Fetch metadata from server or config
- [ ] Test end-to-end với 2 clients

### Milestone 3: Polish & Testing (1-2h)
- [ ] Add error handling (server validation errors)
- [ ] Add loading states (isSaving)
- [ ] Test edge cases (disconnect, game state changes, non-host access)
- [ ] Add responsive behavior (collapse on mobile?)
- [ ] Toast notification khi settings updated?
- [ ] Optional: Add view-only info panel for non-host players

---

## Architecture Pattern

### Game-Agnostic Settings System

Settings system được thiết kế để work với **bất kỳ game nào**:

**Server-side**: Mỗi game định nghĩa metadata trong `*-config.js`:

```javascript
// server/rooms/shooter/shooter-config.js
const SHOOTER_CUSTOMIZABLE_SETTINGS = {
    scoreLimit: { 
        path: 'match.scoreLimit',
        min: 5, max: 50, step: 5, default: 5,
        editable: true,
        label: 'Score Limit',
        unit: 'kills'
    },
    // ... 7 settings total
};

// server/rooms/caro/caro-config.js
const CARO_CUSTOMIZABLE_SETTINGS = {
    boardSize: { 
        path: 'board.size',
        min: 10, max: 20, step: 1, default: 15,
        editable: true,
        label: 'Board Size',
        unit: 'cells'
    },
    // ... 3 settings total
};
```

**Client-side**: UI component **dynamically renders** settings dựa trên gameId:

```jsx
// GamePage.jsx
<GameSettingsPanel 
    room={currentRoom}
    isHost={isHost}
    gameId={activeGameId}  // 'shooter', 'caro', etc.
/>

// GameSettingsPanel.jsx sẽ:
// 1. Fetch metadata based on gameId (from server API hoặc hardcoded)
// 2. Dynamically render sliders/inputs
// 3. Listen to cfg_* state fields
// 4. Send update_settings message
```

**Benefits:**
- ✅ Thêm game mới chỉ cần define metadata trong config
- ✅ UI tự động render dựa trên metadata
- ✅ Validation reuse metadata (DRY principle)
- ✅ Single source of truth

---

## Future Enhancements

1. **Preset Configurations**
   - Quick Match (low score, short time)
   - Standard Match (default)
   - Epic Battle (high score, long time)
   - Sniper Mode (low fire rate, high damage)

2. **Map Selection**
   - Khi có nhiều maps, host chọn map

3. **Game Modes**
   - Team Deathmatch
   - Capture the Flag
   - King of the Hill

4. **Advanced Settings**
   - Enable/disable health regeneration
   - Powerups spawn rate
   - Friendly fire on/off

5. **Save/Load Presets**
   - Host có thể save settings thành preset
   - Load preset từ previous games

---

## Notes

### Design Decisions

1. **Inline Panel vs Modal**: Chọn inline panel vì:
   - GamePage đã có placeholder sẵn ở RIGHT column
   - Tiết kiệm clicks (không cần mở modal)
   - Settings vẫn visible khi đang chơi (readonly mode)
   - Fit với layout 3-column hiện tại

2. **Tailwind CSS only**: Không tạo `.css` files vì:
   - Dự án đã dùng Tailwind CSS 4
   - Consistency với các components khác
   - Easier maintenance

3. **Collapsible Panel**: Save space trong RIGHT column
   - Default: collapsed (chỉ hiện header)
   - Click để expand → hiện sliders
   - Fit nhiều settings mà không làm UI quá dài

4. **Settings Metadata**: Single source of truth
   - Server: `*-config.js` files (đã có sẵn)
   - Client: Fetch hoặc hardcode (tùy implementation)
   - Validation dùng chung metadata

### Future Considerations

- Settings hiện tại chỉ tồn tại trong room lifetime, không persist vào DB
- Nếu cần persist: thêm `roomSettings` vào database `rooms` table
- Consider rate limiting để tránh spam
- Settings changes được log cho debugging
- Có thể thêm API endpoint `/api/games/:gameId/settings` để fetch metadata

---

**Last Updated:** 2025-11-30  
**Status:** Ready for Implementation 🚀  
**Updated:** Aligned with current codebase (Tailwind CSS, inline panel design)

