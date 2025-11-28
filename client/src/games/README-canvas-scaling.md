# Canvas Scaling & Layout Guide

Hướng dẫn về cách các game scene xử lý kích thước canvas và layout responsive.

## Vấn đề gốc

Trước đây, các game scene bị **hardcode** kích thước canvas `800x600`, dẫn đến:

1. Board/UI không scale khi canvas size thay đổi
2. Các giá trị như `400, 300` (center) bị cố định
3. Interactive zone không cover đúng canvas
4. Modal hiển thị sai vị trí

## Giải pháp

### 1. Lấy kích thước canvas thật từ Phaser

```javascript
init(data) {
    super.init(data);
    
    // ✅ ĐÚNG: Dùng Phaser scale manager
    this.canvasWidth = this.scale.width;
    this.canvasHeight = this.scale.height;
    
    // ❌ SAI: Hardcode giá trị
    // this.canvasWidth = 800;
    // this.canvasHeight = 600;
}
```

### 2. Tính toán layout động

Ví dụ với CaroScene:

```javascript
calculateBoardLayout() {
    // Minimum padding từ viền canvas
    const minEdgePadding = 30;
    
    // Space cho UI elements (turn indicator)
    const indicatorHeight = 36;
    const indicatorGap = 16;
    
    // Tính available space
    const topReserved = minEdgePadding + indicatorHeight + indicatorGap;
    const bottomReserved = minEdgePadding;
    const horizontalReserved = minEdgePadding * 2;
    
    const availableWidth = this.canvasWidth - horizontalReserved;
    const availableHeight = this.canvasHeight - topReserved - bottomReserved;
    
    // Tính cell size tối ưu
    const maxCellWidth = availableWidth / this.boardSize;
    const maxCellHeight = availableHeight / this.boardSize;
    this.cellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));
    
    // Center board trong available space
    const boardWidth = this.cellSize * this.boardSize;
    const boardHeight = this.cellSize * this.boardSize;
    this.offsetX = (this.canvasWidth - boardWidth) / 2;
    this.offsetY = topReserved + (availableHeight - boardHeight) / 2;
}
```

### 3. Sử dụng giá trị động cho tất cả UI elements

```javascript
create() {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    // Background - full canvas
    this.add.rectangle(centerX, centerY, this.canvasWidth, this.canvasHeight, 0x111827);
}

createBoard() {
    // Interactive zone - cover full canvas
    this.add
        .zone(this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth, this.canvasHeight)
        .setInteractive();
}

showGameOverModal() {
    // Modal ở center của canvas
    this.gameOverModal = this.add.dom(
        this.canvasWidth / 2, 
        this.canvasHeight / 2
    ).createFromHTML(modalHTML);
}
```

### 4. Scale font size theo element size

```javascript
updateBoard(board) {
    // Font size = 70% của cell size
    const fontSize = Math.floor(this.cellSize * 0.7);
    
    const text = this.add.text(px, py, symbol, {
        fontSize: `${fontSize}px`,
        // ...
    });
}
```

## Layout Structure (CaroScene)

```
┌─────────────────────────────────────────┐
│              minEdgePadding (30px)      │
├─────────────────────────────────────────┤
│          [Turn Indicator - 36px]        │
├─────────────────────────────────────────┤
│              indicatorGap (16px)        │
├─────────────────────────────────────────┤
│                                         │
│    ┌─────────────────────────────┐      │
│    │                             │      │
│    │         GAME BOARD          │      │
│    │    (centered in available   │      │
│    │          space)             │      │
│    │                             │      │
│    └─────────────────────────────┘      │
│                                         │
├─────────────────────────────────────────┤
│              minEdgePadding (30px)      │
└─────────────────────────────────────────┘

← minEdgePadding →          ← minEdgePadding →
```

## Checklist khi tạo game scene mới

- [ ] Dùng `this.scale.width` / `this.scale.height` thay vì hardcode
- [ ] Background rectangle dùng `canvasWidth` x `canvasHeight`
- [ ] Interactive zone cover full canvas
- [ ] Modal/popup đặt ở `canvasWidth/2`, `canvasHeight/2`
- [ ] Có minimum padding từ viền canvas (≥30px)
- [ ] Font size scale theo element size
- [ ] Có method `calculateBoardLayout()` tách riêng để dễ gọi lại khi resize

## Games đã được fix

| Game | File | Status |
|------|------|--------|
| Caro | `client/src/games/caro/CaroScene.js` | ✅ Fixed |
| Shooter | `client/src/games/shooter/ShooterScene.js` | ⚠️ Cần kiểm tra |

## Xử lý resize (nếu cần)

Nếu game cần support resize window:

```javascript
create() {
    // ... other setup
    
    // Listen to resize events
    this.scale.on('resize', this.handleResize, this);
}

handleResize(gameSize) {
    this.canvasWidth = gameSize.width;
    this.canvasHeight = gameSize.height;
    
    this.calculateBoardLayout();
    this.recreateBoard();
    this.repositionGameUI();
}

cleanup() {
    this.scale.off('resize', this.handleResize, this);
    // ... other cleanup
}
```

## Tham khảo

- Phaser 3 Scale Manager: https://photonstorm.github.io/phaser3-docs/Phaser.Scale.ScaleManager.html
- `this.scale.width` / `this.scale.height` - kích thước canvas hiện tại
- `this.game.config.width` / `height` - kích thước config ban đầu

