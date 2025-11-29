# TODO: Host Room Settings - Per-Room Game Configuration

**Status:** 📋 Planning  
**Priority:** 🟢 High (Quality of Life Feature)  
**Estimated Effort:** ~6-8 hours  
**Prerequisite:** ⚠️ Cần hoàn thành `TODO-config-refactor.md` trước

---

## Mục tiêu

Cho phép **chủ phòng (host)** có thể tùy chỉnh các thông số game **chỉ cho phòng hiện tại**, khi game đang **không ở trạng thái playing** (tức `waiting` hoặc `finished`).

### Scope

🎮 **Feature này áp dụng cho TẤT CẢ MỌI GAME**, không chỉ Shooter:
- ✅ **Shooter**: Score limit, time, damage, fire rate, speeds, etc.
- ✅ **Caro**: Board size, win condition, time per turn, etc.
- ✅ **Future games**: Mỗi game sẽ có config riêng

### Use Cases

1. **Host muốn chơi match nhanh**: Giảm scoreLimit từ 15 xuống 5, giảm time từ 5 phút xuống 3 phút
2. **Host muốn match dài hơn**: Tăng scoreLimit lên 30, tăng time lên 10 phút
3. **Host muốn test balance**: Thử nghiệm với damage/fire rate khác nhau
4. **Host muốn chơi custom rules**: Tăng respawn delay để game khó hơn

---

## Thiết kế UI

### Vị trí hiển thị

**Settings Button** sẽ xuất hiện ở **PlayerCard sidebar**, ngay dưới danh sách players:

```
┌─────────────────────────────┐
│ 👥 Players (2/8)            │
│ ┌─────────────────────────┐ │
│ │ 🎮 Player 1 (You) - HOST│ │
│ │ ⚔️ K/D: 5/3             │ │
│ │ ✅ Ready                 │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🎮 Player 2              │ │
│ │ ⚔️ K/D: 3/5             │ │
│ │ ❌ Not Ready             │ │
│ └─────────────────────────┘ │
│                             │
│ [⚙️ Game Settings]  ← NEW  │  (Chỉ hiển thị cho host)
└─────────────────────────────┘
```

### Settings Modal/Panel

Click vào "⚙️ Game Settings" sẽ hiện modal:

```
┌────────────────────────────────────────┐
│ ⚙️ GAME SETTINGS                   [✕] │
├────────────────────────────────────────┤
│                                        │
│ 🎯 Victory Condition                   │
│ ┌──────────────────────────────────┐  │
│ │ Score Limit:  [15] ⚔️            │  │
│ │ Slider: ├─────●─────┤            │  │
│ │         5         30              │  │
│ └──────────────────────────────────┘  │
│                                        │
│ ⏱️ Match Duration                      │
│ ┌──────────────────────────────────┐  │
│ │ Time Limit:   [5:00] minutes     │  │
│ │ Slider: ├─────●─────┤            │  │
│ │         2m        10m             │  │
│ └──────────────────────────────────┘  │
│                                        │
│ ⚔️ Combat Settings                     │
│ ┌──────────────────────────────────┐  │
│ │ Bullet Damage:    [20] HP        │  │
│ │ Fire Rate:        [300] ms       │  │
│ │ Respawn Delay:    [3] seconds    │  │
│ └──────────────────────────────────┘  │
│                                        │
│ 🏃 Movement                             │
│ ┌──────────────────────────────────┐  │
│ │ Player Speed:     [200] px/s     │  │
│ │ Bullet Speed:     [400] px/s     │  │
│ └──────────────────────────────────┘  │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ [Reset to Default]  [Apply ✓]    │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Quyền truy cập

- **Chỉ Host** mới thấy button "⚙️ Game Settings"
- **Tất cả players** đều thấy settings hiện tại (có thể hiển thị dưới dạng info panel)
- Settings **chỉ có thể thay đổi** khi `gameState === 'waiting'` hoặc `gameState === 'finished'`
- Khi game đang `playing`, button bị disable

---

## Phân tích kỹ thuật

### 1. Configurable Settings

⚠️ **Lưu ý**: Trước khi implement feature này, cần refactor Caro config trước (xem `TODO-caro-config-refactor.md`)

#### Shooter Settings

Các settings có thể điều chỉnh (theo `server/rooms/shooter/shooter-config.js`):

#### Match Settings
```javascript
{
    scoreLimit: 15,           // Range: 5-50, Step: 5
    matchDuration: 300,       // Range: 120-600 (2-10 mins), Step: 60
}
```

#### Player Settings
```javascript
{
    moveSpeed: 200,           // Range: 150-300, Step: 10
    respawnDelay: 3,          // Range: 1-10, Step: 1
}
```

#### Weapon Settings
```javascript
{
    fireRate: 300,            // Range: 100-1000, Step: 50
    bulletSpeed: 400,         // Range: 200-800, Step: 50
    bulletDamage: 20,         // Range: 10-50, Step: 5
}
```

#### Arena Settings (Future)
```javascript
{
    arenaSize: 'medium',      // Options: 'small', 'medium', 'large'
    // Map selection khi có nhiều maps
}
```

#### Caro Settings

Các settings có thể điều chỉnh (sau khi refactor - xem `TODO-caro-config-refactor.md`):

```javascript
{
    boardSize: 15,            // Range: 10-20, Step: 1
    winCondition: 5,          // Range: 4-6, Step: 1
    timePerTurn: 30,          // Range: 15-120 (seconds), Step: 5
    allowUndo: false,         // Boolean: enable/disable undo
}
```

### 2. Constraints & Validation

**Server-side validation** là bắt buộc để chống cheat:

```javascript
const SETTINGS_CONSTRAINTS = {
    scoreLimit: { min: 5, max: 50, step: 5, default: 15 },
    matchDuration: { min: 120, max: 600, step: 60, default: 300 },
    moveSpeed: { min: 150, max: 300, step: 10, default: 200 },
    respawnDelay: { min: 1, max: 10, step: 1, default: 3 },
    fireRate: { min: 100, max: 1000, step: 50, default: 300 },
    bulletSpeed: { min: 200, max: 800, step: 50, default: 400 },
    bulletDamage: { min: 10, max: 50, step: 5, default: 20 }
};
```

### 3. State Management

Settings được lưu ở **room-level**, không persist vào database:

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
const SETTINGS_CONSTRAINTS = {
    scoreLimit: { min: 5, max: 50, step: 5, default: 15 },
    matchDuration: { min: 120, max: 600, step: 60, default: 300 },
    moveSpeed: { min: 150, max: 300, step: 10, default: 200 },
    respawnDelay: { min: 1, max: 10, step: 1, default: 3 },
    fireRate: { min: 100, max: 1000, step: 50, default: 300 },
    bulletSpeed: { min: 200, max: 800, step: 50, default: 400 },
    bulletDamage: { min: 10, max: 50, step: 5, default: 20 }
};

function validateSetting(key, value) {
    const constraint = SETTINGS_CONSTRAINTS[key];
    if (!constraint) return { valid: false, error: 'Unknown setting' };
    
    const numValue = Number(value);
    if (isNaN(numValue)) return { valid: false, error: 'Not a number' };
    
    if (numValue < constraint.min || numValue > constraint.max) {
        return { 
            valid: false, 
            error: `Value must be between ${constraint.min} and ${constraint.max}` 
        };
    }
    
    // Check step alignment
    if ((numValue - constraint.min) % constraint.step !== 0) {
        return { 
            valid: false, 
            error: `Value must be in steps of ${constraint.step}` 
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
    SETTINGS_CONSTRAINTS, 
    validateSetting, 
    validateAllSettings 
};
```

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

#### 2.1. Settings Panel Component

**File:** `client/src/components/room/RoomSettings.jsx` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import { FiSettings, FiX } from 'react-icons/fi';

export function RoomSettingsButton({ room, isHost }) {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState({});
    const [gameState, setGameState] = useState('waiting');
    
    useEffect(() => {
        if (!room) return;
        
        // Listen to game state
        room.state.listen('gameState', (value) => {
            setGameState(value);
        });
        
        // Listen to settings changes
        const listeners = [
            room.state.listen('cfg_scoreLimit', (v) => 
                setSettings(s => ({ ...s, scoreLimit: v }))),
            room.state.listen('cfg_matchDuration', (v) => 
                setSettings(s => ({ ...s, matchDuration: v }))),
            room.state.listen('cfg_moveSpeed', (v) => 
                setSettings(s => ({ ...s, moveSpeed: v }))),
            // ... other settings
        ];
        
        return () => listeners.forEach(l => l());
    }, [room]);
    
    // Only show button if host
    if (!isHost) return null;
    
    // Disable if playing
    const canEdit = gameState !== 'playing';
    
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                disabled={!canEdit}
                className="settings-button"
            >
                <FiSettings /> Game Settings
            </button>
            
            {isOpen && (
                <RoomSettingsModal
                    room={room}
                    settings={settings}
                    canEdit={canEdit}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}

function RoomSettingsModal({ room, settings, canEdit, onClose }) {
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    
    const handleChange = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };
    
    const handleReset = () => {
        // Reset to defaults
        setLocalSettings({
            scoreLimit: 15,
            matchDuration: 300,
            moveSpeed: 200,
            respawnDelay: 3,
            fireRate: 300,
            bulletSpeed: 400,
            bulletDamage: 20
        });
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        
        try {
            // Send to server
            room.send('update_settings', { settings: localSettings });
            
            // Wait for confirmation
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject('Timeout'), 5000);
                
                room.onMessage('settings_updated', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                
                room.onMessage('settings_error', (data) => {
                    clearTimeout(timeout);
                    reject(data.error || data.errors);
                });
            });
            
            // Success - close modal
            onClose();
        } catch (err) {
            setError(err.toString());
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="modal-overlay">
            <div className="modal-panel settings-panel">
                <div className="modal-header">
                    <h2>⚙️ Game Settings</h2>
                    <button onClick={onClose}><FiX /></button>
                </div>
                
                <div className="modal-body">
                    {/* Victory Condition */}
                    <SettingGroup title="🎯 Victory Condition">
                        <SettingSlider
                            label="Score Limit"
                            value={localSettings.scoreLimit}
                            onChange={(v) => handleChange('scoreLimit', v)}
                            min={5}
                            max={50}
                            step={5}
                            unit="⚔️"
                            disabled={!canEdit}
                        />
                    </SettingGroup>
                    
                    {/* Match Duration */}
                    <SettingGroup title="⏱️ Match Duration">
                        <SettingSlider
                            label="Time Limit"
                            value={localSettings.matchDuration}
                            onChange={(v) => handleChange('matchDuration', v)}
                            min={120}
                            max={600}
                            step={60}
                            unit="seconds"
                            format={(v) => `${Math.floor(v/60)}:${(v%60).toString().padStart(2,'0')}`}
                            disabled={!canEdit}
                        />
                    </SettingGroup>
                    
                    {/* Combat Settings */}
                    <SettingGroup title="⚔️ Combat">
                        <SettingSlider
                            label="Bullet Damage"
                            value={localSettings.bulletDamage}
                            onChange={(v) => handleChange('bulletDamage', v)}
                            min={10}
                            max={50}
                            step={5}
                            unit="HP"
                            disabled={!canEdit}
                        />
                        <SettingSlider
                            label="Fire Rate"
                            value={localSettings.fireRate}
                            onChange={(v) => handleChange('fireRate', v)}
                            min={100}
                            max={1000}
                            step={50}
                            unit="ms"
                            disabled={!canEdit}
                        />
                        <SettingSlider
                            label="Respawn Delay"
                            value={localSettings.respawnDelay}
                            onChange={(v) => handleChange('respawnDelay', v)}
                            min={1}
                            max={10}
                            step={1}
                            unit="seconds"
                            disabled={!canEdit}
                        />
                    </SettingGroup>
                    
                    {/* Movement */}
                    <SettingGroup title="🏃 Movement">
                        <SettingSlider
                            label="Player Speed"
                            value={localSettings.moveSpeed}
                            onChange={(v) => handleChange('moveSpeed', v)}
                            min={150}
                            max={300}
                            step={10}
                            unit="px/s"
                            disabled={!canEdit}
                        />
                        <SettingSlider
                            label="Bullet Speed"
                            value={localSettings.bulletSpeed}
                            onChange={(v) => handleChange('bulletSpeed', v)}
                            min={200}
                            max={800}
                            step={50}
                            unit="px/s"
                            disabled={!canEdit}
                        />
                    </SettingGroup>
                    
                    {error && (
                        <div className="error-message">{error}</div>
                    )}
                </div>
                
                <div className="modal-footer">
                    <button 
                        onClick={handleReset}
                        disabled={!canEdit || isSaving}
                        className="btn-secondary"
                    >
                        Reset to Default
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!canEdit || isSaving}
                        className="btn-primary"
                    >
                        {isSaving ? 'Saving...' : 'Apply ✓'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper components
function SettingGroup({ title, children }) {
    return (
        <div className="setting-group">
            <h3>{title}</h3>
            {children}
        </div>
    );
}

function SettingSlider({ 
    label, value, onChange, min, max, step, unit, 
    format = (v) => v, disabled 
}) {
    return (
        <div className="setting-slider">
            <label>{label}</label>
            <div className="slider-container">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    disabled={disabled}
                />
                <span className="value-display">
                    {format(value)} {unit}
                </span>
            </div>
        </div>
    );
}
```

#### 2.2. Integration vào GamePage

**File:** `client/src/pages/GamePage.jsx`

```jsx
import { RoomSettingsButton } from '../components/room/RoomSettings';

// ...

// In sidebar, below player list:
<div className="room-controls">
    <RoomSettingsButton 
        room={room} 
        isHost={room?.sessionId === room?.state.hostId}
    />
</div>
```

#### 2.3. Settings Info Display (for all players)

**Component hiển thị settings hiện tại** cho tất cả players xem:

```jsx
function CurrentSettingsInfo({ room }) {
    const [settings, setSettings] = useState({});
    
    // Listen to settings
    useEffect(() => { /* ... */ }, [room]);
    
    return (
        <div className="current-settings-info">
            <h4>📊 Current Settings</h4>
            <ul>
                <li>🎯 Score Limit: {settings.scoreLimit}</li>
                <li>⏱️ Duration: {formatTime(settings.matchDuration)}</li>
                <li>⚔️ Damage: {settings.bulletDamage} HP</li>
                <li>🔫 Fire Rate: {settings.fireRate} ms</li>
            </ul>
        </div>
    );
}
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

- [ ] Smooth animations khi mở/đóng modal
- [ ] Tooltips giải thích từng setting
- [ ] Preview changes (ví dụ: "5 bullets to kill" khi damage = 20)
- [ ] Confirmation khi reset to default
- [ ] Toast notification khi settings saved
- [ ] Show who changed settings ("Settings updated by PlayerX")

---

## File Structure

```plaintext
server/
  rooms/
    shooter/
      ShooterRoom.js          (UPDATE: add settings handlers)
      ShooterState.js         (UPDATE: add cfg_* fields)
      settings-validator.js   (NEW: validation logic)
      shooter-config.js       (EXISTING: default values)

client/
  src/
    components/
      room/
        RoomSettings.jsx      (NEW: settings UI)
        RoomSettings.css      (NEW: styling)
    pages/
      GamePage.jsx            (UPDATE: add RoomSettingsButton)
```

---

## Milestones

### Milestone 1: Server Foundation (2-3h)
- [ ] Add cfg_* fields to ShooterState
- [ ] Create settings-validator.js
- [ ] Add update_settings message handler
- [ ] Add validation & broadcast logic
- [ ] Test với Postman/curl

### Milestone 2: Basic UI (2-3h)
- [ ] Create RoomSettingsButton component
- [ ] Create basic modal with sliders
- [ ] Integrate vào GamePage
- [ ] Test end-to-end với 2 clients

### Milestone 3: Polish & Edge Cases (2h)
- [ ] Add styling, animations
- [ ] Add error handling
- [ ] Add tooltips & help text
- [ ] Test all edge cases
- [ ] Add CurrentSettingsInfo display

---

## Architecture Pattern

### Game-Agnostic Settings System

Settings system được thiết kế để work với **bất kỳ game nào**:

```javascript
// Each game defines its own configurable settings
const GAME_SETTINGS_SCHEMA = {
    'shooter': {
        scoreLimit: { type: 'number', min: 5, max: 50, step: 5 },
        matchDuration: { type: 'number', min: 120, max: 600, step: 60 },
        bulletDamage: { type: 'number', min: 10, max: 50, step: 5 },
        // ...
    },
    'caro': {
        boardSize: { type: 'number', min: 10, max: 20, step: 1 },
        winCondition: { type: 'number', min: 4, max: 6, step: 1 },
        timePerTurn: { type: 'number', min: 15, max: 120, step: 5 },
        // ...
    },
    // Future games...
};
```

UI component sẽ **dynamically render** settings dựa trên game type:

```jsx
<RoomSettingsModal 
    gameType={room.metadata.gameType}  // 'shooter' or 'caro'
    settings={getGameSettings(room.metadata.gameType)}
/>
```

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

- Settings chỉ tồn tại trong room lifetime, không persist vào DB
- Nếu cần persist: thêm `roomSettings` vào database `rooms` table
- Consider rate limiting để tránh spam
- Settings changes được log cho debugging

---

**Last Updated:** 2025-11-28  
**Created By:** AI Assistant  
**Status:** Ready for Implementation 🚀

