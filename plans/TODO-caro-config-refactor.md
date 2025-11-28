# TODO: Caro Config Refactor - Extract Hard-coded Values

**Status:** 📋 Planning  
**Priority:** 🔴 High (Blocking `TODO-host-room-settings.md`)  
**Estimated Effort:** ~3-4 hours

---

## Vấn đề hiện tại

Game Caro có nhiều thông số đang bị **hard-coded** trong code, khiến:
1. ❌ Không thể tùy chỉnh game settings per-room
2. ❌ Khó maintain khi muốn thay đổi balance
3. ❌ Không thống nhất với Shooter (đã có config file)

### Hard-coded Values

#### Server-side (`server/rooms/caro/CaroRoom.js`)

```javascript
// Line 108-109: Board size hard-coded
const index = y * 15 + x;  // ← 15 = board size
if (index < 0 || index >= this.state.board.length) return;

// Line 115: Board size in move validation
this.state.board[index] = player.symbol;

// Line 176, 192: Win condition hard-coded
for (let i = 1; i < 5; i++) {  // ← 5 = win condition (5 in a row)

// Line 179-180, 188: Board bounds hard-coded
if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) break;  // ← 15 = board size

// Line 193: Win check
if (count >= 5) {  // ← 5 = win condition
    return true;
}
```

#### Server-side (`server/rooms/caro/CaroState.js`)

```javascript
// Line 9: Board array size hard-coded
for (let i = 0; i < 225; i++) {  // ← 225 = 15x15
    this.board.push(0);
}
```

#### Client-side (`client/src/games/caro/CaroScene.js`)

```javascript
// Line 4-9: Board constants hard-coded
const BOARD_CONSTANTS = {
    cellSize: 40,       // ← Cell size in pixels
    boardSize: 15,      // ← Board size
    width: 800,         // ← Canvas width
    height: 600         // ← Canvas height
};
```

---

## Mục tiêu Refactor

### 1. Tạo Config File

Tạo `server/rooms/caro/caro-config.js` tương tự Shooter:

```javascript
/**
 * Caro Game Configuration
 * Central place for all game settings
 */

const CARO_CONFIG = {
    // ===== BOARD SETTINGS =====
    board: {
        size: 15,                   // Board width/height (10-20)
        cellCount: 225,             // Calculated: size * size
        winCondition: 5,            // Consecutive marks to win (4-6)
    },

    // ===== TURN SETTINGS =====
    turn: {
        timeLimit: 30,              // Seconds per turn (0 = unlimited)
        allowUndo: false,           // Can player undo last move
    },

    // ===== MATCH SETTINGS =====
    match: {
        minPlayers: 2,              // Always 2 for Caro
        maxPlayers: 2,              // Always 2 for Caro
    },

    // ===== RENDER SETTINGS =====
    render: {
        cellSize: 40,               // Cell size in pixels (client-side)
        canvasWidth: 800,           // Canvas width
        canvasHeight: 600,          // Canvas height
    },

    // ===== BALANCE NOTES =====
    // 
    // Board Sizes:
    // - 10x10: Quick game (~5-10 minutes)
    // - 15x15: Standard (default)
    // - 20x20: Long game (~20-30 minutes)
    //
    // Win Conditions:
    // - 4 in a row: Easier, faster games
    // - 5 in a row: Standard (classic Gomoku)
    // - 6 in a row: Harder, longer games
};

// Helper function to calculate board cell count
CARO_CONFIG.board.cellCount = CARO_CONFIG.board.size * CARO_CONFIG.board.size;

module.exports = { CARO_CONFIG };
```

### 2. Refactor Server

#### 2.1. Update `CaroState.js`

**BEFORE:**
```javascript
class CaroState extends TurnBasedRoomState {
    constructor() {
        super();
        this.board = new ArraySchema();

        for (let i = 0; i < 225; i++) {  // ← Hard-coded
            this.board.push(0);
        }
    }
}
```

**AFTER:**
```javascript
const { CARO_CONFIG } = require('./caro-config');

class CaroState extends TurnBasedRoomState {
    constructor(boardSize = CARO_CONFIG.board.size) {
        super();
        this.board = new ArraySchema();
        this.boardSize = boardSize;  // Store for reference

        // Use config value
        const cellCount = boardSize * boardSize;
        for (let i = 0; i < cellCount; i++) {
            this.board.push(0);
        }
    }
}

// Add boardSize to schema
type("number")(CaroState.prototype, "boardSize");
```

#### 2.2. Update `CaroRoom.js`

**BEFORE (handleMove):**
```javascript
handleMove(client, { x, y }) {
    // ...
    const index = y * 15 + x;  // ← Hard-coded
    if (index < 0 || index >= this.state.board.length) return;
    // ...
}
```

**AFTER:**
```javascript
const { CARO_CONFIG } = require('./caro-config');

class CaroRoom extends TurnBasedRoom {
    onCreate(options) {
        super.onCreate(options);
        
        // Room-specific config (can be overridden by host)
        this.gameConfig = {
            boardSize: CARO_CONFIG.board.size,
            winCondition: CARO_CONFIG.board.winCondition,
            timePerTurn: CARO_CONFIG.turn.timeLimit,
            allowUndo: CARO_CONFIG.turn.allowUndo
        };
        
        // Apply rate limiting
        this.onMessage("move", (client, message = {}) => {
            if (!this.checkRateLimit(client)) return;
            this.handleMove(client, message);
        });
    }
    
    createInitialState() {
        return new CaroState(this.gameConfig.boardSize);
    }
    
    handleMove(client, { x, y }) {
        // ...
        const boardSize = this.gameConfig.boardSize;
        const index = y * boardSize + x;  // ← Use config
        if (index < 0 || index >= this.state.board.length) return;
        // ...
        
        if (this.checkWin(x, y, player.symbol)) {
            this.finishGame(client.sessionId);
        } else {
            this.advanceTurn();
        }
    }
    
    checkWin(x, y, symbol) {
        const boardSize = this.gameConfig.boardSize;
        const winCondition = this.gameConfig.winCondition;
        
        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];

        for (const [dx, dy] of directions) {
            let count = 1;

            // Check positive direction
            for (let i = 1; i < winCondition; i++) {  // ← Use config
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;  // ← Use config
                if (this.state.board[ny * boardSize + nx] === symbol) count++;  // ← Use config
                else break;
            }

            // Check negative direction
            for (let i = 1; i < winCondition; i++) {  // ← Use config
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;  // ← Use config
                if (this.state.board[ny * boardSize + nx] === symbol) count++;  // ← Use config
                else break;
            }

            if (count >= winCondition) {  // ← Use config
                return true;
            }
        }

        return false;
    }
}
```

### 3. Refactor Client

#### 3.1. Update `CaroScene.js`

**BEFORE:**
```javascript
const BOARD_CONSTANTS = {
    cellSize: 40,
    boardSize: 15,  // ← Hard-coded
    width: 800,
    height: 600
};

export class CaroScene extends TurnBasedGameScene {
    init(data) {
        super.init(data);
        
        this.cellSize = BOARD_CONSTANTS.cellSize;
        this.boardSize = BOARD_CONSTANTS.boardSize;  // ← Hard-coded
        // ...
    }
}
```

**AFTER:**
```javascript
// Remove hard-coded constants, will get from server

export class CaroScene extends TurnBasedGameScene {
    init(data) {
        super.init(data);
        
        // Will be set from server state
        this.cellSize = 40;  // Default, can adjust based on board size
        this.boardSize = 15;  // Will be updated from room.state.boardSize
        this.canvasWidth = 800;
        this.canvasHeight = 600;
    }
    
    setupRoomEvents() {
        // Listen to board size from server
        this.room.state.listen('boardSize', (value) => {
            this.boardSize = value;
            
            // Recalculate cell size to fit canvas
            const maxSize = Math.min(
                (this.canvasWidth - 100) / value,
                (this.canvasHeight - 100) / value
            );
            this.cellSize = Math.floor(maxSize);
            
            // Recalculate offsets
            this.offsetX = (this.canvasWidth - this.cellSize * this.boardSize) / 2;
            this.offsetY = (this.canvasHeight - this.cellSize * this.boardSize) / 2;
            
            // Recreate board with new size
            if (this.boardGraphics) {
                this.boardGraphics.destroy();
            }
            this.createBoard();
        });
        
        // ... rest of setup
    }
}
```

---

## Implementation Plan

### Phase 1: Create Config File (30 min)

- [ ] Create `server/rooms/caro/caro-config.js`
- [ ] Define all configurable values
- [ ] Add documentation comments

### Phase 2: Refactor Server (1.5 hours)

- [ ] Update `CaroState.js` to accept dynamic board size
- [ ] Add `boardSize` to state schema
- [ ] Update `CaroRoom.js`:
  - [ ] Import config
  - [ ] Store room-specific config
  - [ ] Use config in `handleMove()`
  - [ ] Use config in `checkWin()`
- [ ] Test with default values

### Phase 3: Refactor Client (1 hour)

- [ ] Update `CaroScene.js`:
  - [ ] Remove hard-coded constants
  - [ ] Listen to `boardSize` from server state
  - [ ] Dynamically calculate cell size
  - [ ] Recreate board when size changes
- [ ] Test with different board sizes (10, 15, 20)

### Phase 4: Add Win Condition to State (30 min)

- [ ] Add `winCondition` to `CaroState`
- [ ] Sync from server config
- [ ] Client can display: "5 in a row to win"

### Phase 5: Testing & Validation (30 min)

- [ ] Test với board size 10x10
- [ ] Test với board size 15x15 (default)
- [ ] Test với board size 20x20
- [ ] Test với win condition 4, 5, 6
- [ ] Verify không có hard-coded values còn sót

---

## Files cần thay đổi

```plaintext
server/
  rooms/
    caro/
      caro-config.js          (NEW)
      CaroState.js            (UPDATE: dynamic board size)
      CaroRoom.js             (UPDATE: use config)
      
client/
  src/
    games/
      caro/
        CaroScene.js          (UPDATE: dynamic rendering)
```

---

## Testing Checklist

### Server
- [ ] Board size 10x10: 100 cells created
- [ ] Board size 15x15: 225 cells created (default)
- [ ] Board size 20x20: 400 cells created
- [ ] Win condition 4: Win với 4 consecutive marks
- [ ] Win condition 5: Win với 5 consecutive marks (default)
- [ ] Win condition 6: Win với 6 consecutive marks
- [ ] Move validation works với mọi board size
- [ ] Win detection works với mọi board size

### Client
- [ ] Board renders correctly với board size từ server
- [ ] Cell size tự động adjust để fit canvas
- [ ] Board offsets đúng (centered)
- [ ] Click detection works với mọi board size
- [ ] Win condition hiển thị đúng

### Edge Cases
- [ ] Board size < 10: Reject hoặc clamp to min
- [ ] Board size > 20: Reject hoặc clamp to max
- [ ] Win condition > board size: Invalid, should reject
- [ ] Client join giữa match: Nhận đúng board size

---

## Benefits sau khi refactor

1. ✅ **Ready for Host Settings**: Có thể implement per-room config
2. ✅ **Maintainable**: Tất cả config ở 1 chỗ
3. ✅ **Flexible**: Dễ add thêm game modes (3x3 tic-tac-toe, 19x19 Go)
4. ✅ **Consistent**: Giống với Shooter architecture
5. ✅ **Testable**: Dễ test với different configs

---

## Sau khi hoàn thành

✅ Có thể proceed với `TODO-host-room-settings.md`  
✅ Host có thể customize Caro game settings  
✅ Architecture nhất quán giữa các games

---

**Last Updated:** 2025-11-28  
**Created By:** AI Assistant  
**Status:** Ready for Implementation 🎮

