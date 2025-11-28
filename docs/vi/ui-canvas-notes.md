# Hướng Dẫn Thiết Kế UI Cho Game Canvas (Phaser)

*Phiên bản 1.0*

Tài liệu này mô tả các nguyên tắc và thực hành tốt nhất khi xây dựng UI trong canvas cho các game dùng Phaser, bao gồm Caro, Shooter và các game khác chạy trong môi trường React hoặc web responsive.

---

## 1. Không Bao Giờ Hard-Code Kích Thước Canvas

### Sai

```js
this.add.rectangle(400, 300, 800, 600);
```

Dùng kích thước cố định sẽ gây lỗi khi canvas được responsive theo trình duyệt hoặc theo layout React.

### Đúng

```js
const width = this.cameras.main.width;
const height = this.cameras.main.height;
const centerX = width / 2;
const centerY = height / 2;

this.add.rectangle(centerX, centerY, width, height);
```

> Nguyên tắc: **Kích thước chỉ lấy từ Phaser, không được “đoán” hay gắn cứng.**

---

## 2. Bật Chế Độ Scale Đúng & Xử Lý Resize

Canvas trong UI web luôn cần co giãn theo container.

**Phaser config:**

```js
scale: {
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.CENTER_BOTH
}
```

**Trong scene:**

```js
this.scale.on('resize', (gameSize) => {
  this.canvasWidth = gameSize.width;
  this.canvasHeight = gameSize.height;

  this.calculateBoardLayout?.();
  this.recreateBoard?.();
  this.repositionGameUI?.();
});
```

Nếu không xử lý resize, canvas sẽ thay đổi kích thước nhưng nội dung vẫn bé ở giữa.

---

## 3. Tính Layout Dựa Trên Padding & Không Gian Khả Dụng

Tránh giá trị cố định cho cell, lề, offset…

Ví dụ cho bàn Caro:

```js
const minEdgePadding = 30;
const indicatorHeight = 36;
const indicatorGap = 36;

const topReserved = minEdgePadding + indicatorHeight + indicatorGap;
const availableWidth = this.canvasWidth - minEdgePadding * 2;
const availableHeight = this.canvasHeight - topReserved - minEdgePadding;

const rawCell = Math.min(availableWidth, availableHeight) / this.boardSize;
this.cellSize = Math.floor(Math.max(rawCell, 28)); // cell tối thiểu
```

> UI tốt = layout tính toán động → không phụ thuộc vào số cứng.

---

## 4. Interactive Zone Phải Khớp Với Vùng Chơi

### Sai

```js
this.add.zone(centerX, centerY, canvasWidth, canvasHeight).setInteractive();
```

### Đúng

```js
this.add.zone(
  this.offsetX + boardWidth / 2,
  this.offsetY + boardHeight / 2,
  boardWidth,
  boardHeight
).setInteractive();
```

Giúp hạn chế click nhầm và phù hợp UX hơn.

---

## 5. HUD & Overlay Phải Căn Theo Camera, Không Phải World

Tất cả UI cố định (HP, timer, leaderboard…) phải đứng yên dù camera di chuyển.

```js
this.add.text(width / 2, 32, '00:00')
  .setScrollFactor(0)
  .setDepth(101);
```

* `scrollFactor = 0` → UI tĩnh
* `depth` cao → UI luôn ở trên

---

## 6. Tránh Font Quá Nhỏ Hoặc Cố Định

Font 10–11px sẽ rất nhỏ trên màn hình lớn.

Khuyến nghị:

* Label nhỏ: **12–14px**
* HUD chính: **14–18px**
* Header / Scoreboard: **20px+**

Có thể scale theo chiều rộng:

```js
const scale = Math.max(0.8, Math.min(1.3, width / 1280));
```

---

## 7. Panel / Thanh UI Không Nên Có Chiều Rộng Cố Định

Size panel phải dựa trên nội dung.

Ví dụ:

```js
const paddingX = 16;
const paddingDot = 14;
const minWidth = 200;

const contentWidth = this.statusText.width + paddingDot + paddingX * 2;
const width = Math.max(contentWidth, minWidth);
```

Panels nên tự dãn thay vì cố ép chiều rộng 240px.

---

## 8. Phân Tách UI React và UI Trong Canvas

### React (DOM) nên xử lý:

* Lobby
* Danh sách người chơi
* Nút rời phòng, cài đặt phòng
* Chat
* Matchmaking

### Phaser (Canvas) nên xử lý:

* In-game HUD
* Crosshair
* Kill feed
* Timer
* Hiệu ứng và overlay kết thúc trận

Không trộn DOM vào gameplay trừ khi cần modal đặc biệt.

---

## 9. Dọn Sạch Mọi UI Khi Scene Restart Hoặc Shutdown

Mỗi object tạo ra phải được hủy:

* Sprites
* Graphics
* Text
* DOM (`add.dom`)
* Tween
* Timer
* Interpolator
* Kill feed entries
* End-game overlay

Ví dụ đúng:

```js
shutdown() {
  this.tweens.killAll();

  for (const obj of this.playerSprites.values()) {
    obj.sprite.destroy();
    obj.nameText.destroy();
  }
  this.playerSprites.clear();

  if (this.endGameUI) {
    Object.values(this.endGameUI).forEach(el => el?.destroy?.());
    this.endGameUI = null;
  }
}
```

Nếu không cleanup → UI bị “ám ảnh” từ trận cũ.

---

## 10. UI Phải Có Phản Hồi Trực Quan (Feedback)

Feedback trực quan giúp game mượt và dễ hiểu.

### Đối với Caro

* Highlight ô đang hover
* Highlight nước vừa đánh
* Highlight đường thắng

### Đối với Shooter

* Flash khi trúng đạn
* Muzzle flash
* Hiệu ứng chết / hồi sinh
* Kill feed có animation
* Crosshair chỉ hiện khi đang playing

---

## 11. Bộ Quy Tắc “Vàng”

1. **Không hard-code kích thước canvas.**
2. **Phải bật RESIZE và xử lý resize.**
3. **Interactive zone = vùng chơi thực tế.**
4. **HUD phải cố định bằng scrollFactor = 0.**
5. **Layout tính từ padding & tỷ lệ, không dùng số cứng.**
6. **Panel tự động giãn theo nội dung.**
7. **UI meta ở React, UI gameplay ở canvas.**
8. **Cleanup đầy đủ khi restart.**
9. **Duy trì depth hierarchy rõ ràng.**
10. **Luôn có hiệu ứng phản hồi cho người chơi.**

---

## Kết Luận

Các nguyên tắc trong tài liệu này nhằm đảm bảo mọi UI trong canvas:

* nhất quán,
* dễ bảo trì,
* hoạt động chính xác trong môi trường responsive,
* và có trải nghiệm người dùng tốt.

Áp dụng đồng nhất cho tất cả game chạy trên Phaser trong hệ thống.

