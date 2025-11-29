# Phân tích Xung đột & Dư thừa Game Config

**Ngày tạo**: 2025-11-29  
**Phạm vi**: Caro & Shooter games  
**Mục đích**: Phân tích tình trạng cấu hình game để tối ưu hóa kiến trúc

---

## 📋 Tổng quan

Hiện tại hệ thống có **2 game chính đang hoạt động**:
- **Caro** (`caro`) - Turn-based board game
- **Arena Shooter** (`shooter`) - Free-for-all shooter

Mỗi game có nhiều file config nằm rải rác ở các vị trí khác nhau, dẫn đến **xung đột và dư thừa**.

---

## 🔍 Cấu trúc Config hiện tại

### 1. Server-side Configs

#### **Caro Game**
| File | Đường dẫn | Nội dung |
|------|-----------|----------|
| `caro-config.js` | `/server/rooms/caro/` | Chi tiết config gameplay (board, turn, match, render) |
| `game-registry.js` | `/server/config/` | Config đơn giản hóa cho API (match, arena) |

**File chi tiết**: [caro-config.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/caro/caro-config.js)
```javascript
const CARO_CONFIG = {
    board: {
        size: 15,
        winCondition: 5,
    },
    turn: {
        timeLimit: 0,
        allowUndo: false,
    },
    match: {
        minPlayers: 2,
        maxPlayers: 2,
    },
    render: {  // ⚠️ DƯ THỪA
        cellSize: 40,
        canvasWidth: 800,   // TODO: Trùng với game-registry.js
        canvasHeight: 600,  // TODO: Trùng với game-registry.js
    }
}
```

**File registry**: [game-registry.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/config/game-registry.js#L38-L54)
```javascript
caro: {
    id: 'caro',
    enabled: true,
    roomClass: CaroRoom,
    config: {
        match: { minPlayers: 2, maxPlayers: 2 },  // ⚠️ TRÙNG LẶP
        arena: { width: 800, height: 800 }        // ⚠️ KHÔNG KHỚP (600 vs 800)
    },
    metadata: { ... }
}
```

#### **Shooter Game**
| File | Đường dẫn | Nội dung |
|------|-----------|----------|
| `shooter-config.js` | `/server/rooms/shooter/` | Chi tiết config gameplay (match, arena, player, weapon) |
| `game-registry.js` | `/server/config/` | Tham chiếu đến `shooter-config.js` (✅ tốt hơn Caro) |

**File chi tiết**: [shooter-config.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/shooter/shooter-config.js)
```javascript
const SHOOTER_CONFIG = {
    match: {
        scoreLimit: 5,
        matchDuration: 300,
        patchRate: 16.67,
        minPlayers: 2,
        maxPlayers: 8,
    },
    arena: {
        width: 800,
        height: 600,
    },
    player: { ... },
    weapon: { ... }
}
```

**File registry**: [game-registry.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/config/game-registry.js#L17-L36)
```javascript
shooter: {
    id: 'shooter',
    enabled: true,
    roomClass: ShooterRoom,
    config: SHOOTER_CONFIG,  // ✅ Tham chiếu trực tiếp (single source of truth)
    metadata: { ... }
}
```

---

### 2. Client-side Configs

#### **Client Game Registry**
**File**: [gameRegistry.js](file:///Users/gksoftware/Downloads/Github/ddn-games/client/src/config/gameRegistry.js)

```javascript
// PHASER CONFIG TEMPLATES (Client-specific)
const PHASER_CONFIG_TEMPLATES = {
    'caro': (width, height) => ({
        type: Phaser.AUTO,
        width: width,      // Lấy từ server API: game.uiConfig.arenaWidth
        height: height,    // Lấy từ server API: game.uiConfig.arenaHeight
        backgroundColor: '#1a1a2e'
    }),
    
    'shooter': (width, height) => ({
        type: Phaser.AUTO,
        width: width,
        height: height,
        backgroundColor: '#1a1a2e',
        physics: { ... }
    })
}
```

**Luồng dữ liệu**:
1. Server `/api/games` trả về `uiConfig.arenaWidth/Height`
2. Client dùng giá trị đó để khởi tạo Phaser canvas
3. ✅ **Không có hard-coded dimensions ở client**

---

## ⚠️ Các vấn đề hiện tại

### 🔴 **Vấn đề 1: Caro config bị DUP + CONFLICT**

**Vị trí xung đột**:
- [`caro-config.js`](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/caro/caro-config.js#L30-L31): `canvasWidth: 800, canvasHeight: 600`
- [`game-registry.js`](file:///Users/gksoftware/Downloads/Github/ddn-games/server/config/game-registry.js#L45): `arena: { width: 800, height: 800 }`

**Kết quả**: 
- Server API trả về `800x800`
- Config gốc định nghĩa `800x600`
- ❌ **Không rõ giá trị nào đúng**

**Impact**:
- Client nhận `800x800` từ API
- Nhưng CaroScene tự tính toán layout dựa trên `this.scale.width/height`
- ➡️ Khả năng UI bị sai lệch nếu thay đổi config

---

### 🟡 **Vấn đề 2: Caro render config DƯ THỪA**

**File**: [caro-config.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/caro/caro-config.js#L27-L32)

```javascript
render: {
    cellSize: 40,          // ❓ Client không dùng
    canvasWidth: 800,      // ❌ Trùng với game-registry
    canvasHeight: 600,     // ❌ Trùng với game-registry
}
```

**Thực tế**:
- `cellSize`: [CaroScene.js](file:///Users/gksoftware/Downloads/Github/ddn-games/client/src/games/caro/CaroScene.js) tự tính dynamic:
  ```javascript
  const cellSize = Math.min(
      availableWidth / this.boardSize,
      availableHeight / this.boardSize,
      60  // Max cell size
  );
  ```
- `canvasWidth/Height`: Client lấy từ API `/api/games` rồi init Phaser
- ➡️ **Cả 3 giá trị đều KHÔNG được sử dụng**

---

### 🟢 **Vấn đề 3: Shooter config TƯƠNG ĐỐI TỐT**

**Ưu điểm**:
- ✅ Game registry tham chiếu `SHOOTER_CONFIG` trực tiếp
- ✅ Single source of truth cho server-side
- ✅ Config được dùng xuyên suốt codebase

**Sử dụng**:
```javascript
// ShooterRoom.js
const { SHOOTER_CONFIG } = require('./shooter-config');
this.setPatchRate(SHOOTER_CONFIG.match.patchRate);

// ShooterPlayer.js
this.health = SHOOTER_CONFIG.player.startHealth;

// ShooterState.js
this.arenaWidth = SHOOTER_CONFIG.arena.width;
this.arenaHeight = SHOOTER_CONFIG.arena.height;

// Bullet.js
this.damage = SHOOTER_CONFIG.weapon.bulletDamage;
```

**Vẫn có nhược điểm nhỏ**:
- ⚠️ Không có validation cho config values
- ⚠️ Comments chưa đầy đủ về dependencies giữa các values

---

### 🟡 **Vấn đề 4: minPlayers/maxPlayers bị DUP**

**Caro**: Định nghĩa ở 2 nơi
- [`caro-config.js`](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/caro/caro-config.js#L22-L25):
  ```javascript
  match: {
      minPlayers: 2,
      maxPlayers: 2,
  }
  ```
- [`game-registry.js`](file:///Users/gksoftware/Downloads/Github/ddn-games/server/config/game-registry.js#L44):
  ```javascript
  config: {
      match: { minPlayers: 2, maxPlayers: 2 },
  }
  ```

**Shooter**: Chỉ 1 nơi (tốt)
- [`shooter-config.js`](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/shooter/shooter-config.js#L15-L16)
- Registry tham chiếu trực tiếp: `config: SHOOTER_CONFIG`

---

## 📊 So sánh cấu trúc Config

| Khía cạnh | Caro | Shooter | Ghi chú |
|-----------|------|---------|---------|
| **Config file riêng** | ✅ Có | ✅ Có | Cả 2 đều có |
| **Registry tham chiếu** | ❌ Tạo mới | ✅ Import trực tiếp | Shooter tốt hơn |
| **DUP minPlayers** | ❌ Có | ✅ Không | Caro bị trùng |
| **DUP arena size** | ❌ Có | ✅ Không | Caro: 600 vs 800 |
| **Client render config** | ❌ Dư thừa | ✅ Không có | Caro có section vô dụng |
| **Config được dùng** | 🟡 Một phần | ✅ Đầy đủ | CaroRoom không dùng hết |
| **Single source of truth** | ❌ Không | ✅ Có | Shooter tốt hơn |

---

## 🛠️ Khuyến nghị

### 📌 **Priority 1: Sửa Caro config**

> [!IMPORTANT]
> Caro cần refactor theo mô hình của Shooter để đảm bảo consistency

#### **Bước 1**: Cập nhật `caro-config.js`
```javascript
// Xóa section render (dư thừa)
const CARO_CONFIG = {
    board: {
        size: 15,
        winCondition: 5,
    },
    turn: {
        timeLimit: 0,
        allowUndo: false,
    },
    match: {
        minPlayers: 2,
        maxPlayers: 2,
    },
    arena: {
        width: 800,   // THÊM MỚI: Định nghĩa rõ ràng
        height: 800,  // Chọn 800x800 để board vuông
    }
}
```

#### **Bước 2**: Cập nhật `game-registry.js`
```javascript
const { CARO_CONFIG } = require('../rooms/caro/caro-config');

caro: {
    id: 'caro',
    enabled: true,
    roomClass: CaroRoom,
    config: CARO_CONFIG,  // Tham chiếu trực tiếp thay vì tạo mới
    metadata: { ... }
}
```

#### **Bước 3**: Verify CaroRoom
- Đảm bảo CaroRoom import và dùng `CARO_CONFIG` đúng cách
- Kiểm tra không còn hard-coded values

---

### 📌 **Priority 2: Chuẩn hóa cấu trúc Config**

**Mẫu chuẩn cho mọi game**:
```javascript
const GAME_CONFIG = {
    match: {
        minPlayers: number,
        maxPlayers: number,
        // Game-specific match settings
    },
    arena: {
        width: number,   // REQUIRED cho API
        height: number,  // REQUIRED cho API
    },
    // Game-specific sections (player, weapon, board, etc.)
}
```

**Quy tắc**:
- ✅ Mọi config phải có `match` và `arena`
- ✅ Registry PHẢI tham chiếu config gốc, không tạo mới
- ✅ Client KHÔNG hard-code dimensions
- ❌ KHÔNG thêm client-only config vào server files

---

### 📌 **Priority 3: Validation & Documentation**

#### **Thêm validation**
```javascript
// Example: shooter-config.js
const SHOOTER_CONFIG = { ... };

// Validate config on load
function validateConfig(config) {
    if (config.player.maxHealth <= 0) {
        throw new Error('Invalid maxHealth');
    }
    if (config.weapon.bulletDamage > config.player.maxHealth) {
        console.warn('Bullet damage > max health: instant kill enabled');
    }
    // ... more validations
}

validateConfig(SHOOTER_CONFIG);
module.exports = { SHOOTER_CONFIG };
```

#### **Improve documentation**
- Thêm JSDoc cho mọi config value
- Giải thích dependencies (ví dụ: `bulletSpeed` liên quan `arena.width`)
- Document breaking changes khi thay đổi config

---

## 🎯 Kế hoạch thực hiện

### **Phase 1: Quick Fixes** (1-2 hours)
- [ ] Xóa `render` section trong `caro-config.js`
- [ ] Thêm `arena: { width, height }` vào `CARO_CONFIG`
- [ ] Sửa `game-registry.js` để import `CARO_CONFIG`
- [ ] Test lại Caro game để đảm bảo không break

### **Phase 2: Documentation** (1 hour)
- [ ] Thêm JSDoc cho `CARO_CONFIG` và `SHOOTER_CONFIG`
- [ ] Tạo `docs/config-guidelines.md`
- [ ] Document template cho games tương lai

### **Phase 3: Validation** (2 hours)
- [ ] Implement config validation functions
- [ ] Add unit tests cho config validation
- [ ] Setup CI check để catch invalid configs

---

## 📝 Checklist cho games mới

Khi thêm game mới, đảm bảo:

- [ ] Tạo `{game}-config.js` trong `/server/rooms/{game}/`
- [ ] Config phải có `match` và `arena` sections
- [ ] Export constant có tên `{GAME}_CONFIG`
- [ ] Import config vào `game-registry.js` (không copy-paste)
- [ ] Không thêm client-only settings vào server config
- [ ] Thêm validation cho config values
- [ ] Document tất cả config options với JSDoc

---

## 🔗 References

### Server Configs
- [shooter-config.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/shooter/shooter-config.js)
- [caro-config.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/caro/caro-config.js)
- [game-registry.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/config/game-registry.js)

### Client Configs
- [gameRegistry.js](file:///Users/gksoftware/Downloads/Github/ddn-games/client/src/config/gameRegistry.js)

### Usage Examples
- [ShooterRoom.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/shooter/ShooterRoom.js)
- [CaroRoom.js](file:///Users/gksoftware/Downloads/Github/ddn-games/server/rooms/caro/CaroRoom.js)
- [ShooterScene.js](file:///Users/gksoftware/Downloads/Github/ddn-games/client/src/games/shooter/ShooterScene.js)
- [CaroScene.js](file:///Users/gksoftware/Downloads/Github/ddn-games/client/src/games/caro/CaroScene.js)

---

**Tài liệu này được tạo tự động dựa trên phân tích codebase hiện tại.**  
**Last updated**: 2025-11-29
