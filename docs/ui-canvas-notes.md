Below is a **clean, professional Markdown guide** written exactly as a documentation file for your team.
No “buddy talk,” no casual phrasing — this is a proper engineering reference.

---

# Canvas UI Design Guidelines for Phaser Games

*Version 1.0*

This document provides best-practice guidelines for building responsive, maintainable, and scalable game UI inside a Phaser canvas.
It is intended for developers working on Caro, Shooter, and other canvas-based games within a React or web-embedded environment.

---

## 1. Never Hard-Code Canvas Dimensions

### Incorrect

```js
this.add.rectangle(400, 300, 800, 600);
this.add.zone(400, 300, 800, 600).setInteractive();
```

Using fixed dimensions causes UI misalignment when the canvas is resized by CSS or embedded inside a layout.

### Correct

Always retrieve actual canvas size:

```js
const width = this.cameras.main.width;
const height = this.cameras.main.height;
const centerX = width / 2;
const centerY = height / 2;

this.add.rectangle(centerX, centerY, width, height);
```

> Rule: *Canvas size comes from Phaser, not assumptions.*

---

## 2. Enable Proper Scaling and Handle Resize Events

When a Phaser canvas is embedded in a responsive layout, it must adapt to container size.

**Phaser config:**

```js
scale: {
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.CENTER_BOTH
}
```

**Scene-side handling:**

```js
this.scale.on('resize', (gameSize) => {
  this.canvasWidth = gameSize.width;
  this.canvasHeight = gameSize.height;

  this.calculateBoardLayout?.();
  this.recreateBoard?.();
  this.repositionGameUI?.();
});
```

If resize is not handled, the canvas grows but the internal content stays small.

---

## 3. Layout Calculation Must Be Based on Paddings and Available Space

Hard-coded cell sizes or board offsets lead to inconsistent visuals.

Example layout pattern (Caro board):

```js
const minEdgePadding = 30;
const indicatorHeight = 36;
const indicatorGap = 36;

const topReserved = minEdgePadding + indicatorHeight + indicatorGap;
const availableWidth = this.canvasWidth - minEdgePadding * 2;
const availableHeight = this.canvasHeight - topReserved - minEdgePadding;

const rawCell = Math.min(availableWidth, availableHeight) / this.boardSize;
this.cellSize = Math.floor(Math.max(rawCell, 28)); // minimum cell size
```

> Think in terms of *margins and sections*, not arbitrary pixel values.

---

## 4. Interactive Zones Should Match the Play Area

Do **not** make the entire canvas clickable unless the game requires it.

### Incorrect

```js
this.add.zone(centerX, centerY, canvasWidth, canvasHeight).setInteractive();
```

### Correct

Limit interactions to the actual board / arena:

```js
this.add.zone(
  this.offsetX + boardWidth / 2,
  this.offsetY + boardHeight / 2,
  boardWidth,
  boardHeight
).setInteractive();
```

This improves player accuracy and prevents confusing “dead zones.”

---

## 5. HUD and Overlay Must Use Camera Dimensions

All persistent UI (timer, health, leaderboard, crosshair) should be anchored to the viewport, not gameplay world.

Example:

```js
const width = this.cameras.main.width;
const height = this.cameras.main.height;

this.add.text(width / 2, 32, '00:00')
  .setScrollFactor(0)
  .setDepth(101);
```

Always apply:

* `setScrollFactor(0)` → ensures UI does not move with the game camera
* high `depth` → ensures UI stays above gameplay elements

---

## 6. Avoid Tiny, Fixed Font Sizes

Fonts like `11px` become unreadable on larger screens.
Recommended baseline:

* Small labels: **12–14px**
* Standard HUD text: **14–18px**
* Headers / scoreboard: **20px+**

Optional dynamic scaling:

```js
const scale = Math.max(0.8, Math.min(1.3, this.cameras.main.width / 1280));
const fontNormal = 14 * scale;
```

---

## 7. Dynamic Panel / Pill Widths (No Hard-Coded 240px Bars)

UI elements containing text should resize automatically based on content length.

General pattern:

```js
const paddingX = 16;
const paddingDot = 14;
const minWidth = 200;

const contentWidth = this.statusText.width + paddingDot + paddingX * 2;
const width = Math.max(contentWidth, minWidth);
const height = 36;

this.turnIndicatorBg.fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
```

Avoid placing text into fixed-size containers.

---

## 8. Separate React UI and Phaser UI

Use the correct layer for the correct job:

### React (DOM)

* Lobby UI
* Player list
* Room settings
* Chat
* Matchmaking

### Phaser (Canvas)

* In-game HUD
* Crosshair
* Timers, HP, kill feed
* Game-over overlays
* In-canvas modals (if required)

Mixing DOM overlays with gameplay elements should be minimized except for special modals.

---

## 9. Proper Cleanup When Scenes Restart or Shutdown

Every object created in the scene must be cleaned up.

Checklist:

* Sprites
* Graphics objects
* Text objects
* DOM elements (`add.dom`)
* Tweens
* Interpolators / timers
* Event listeners
* Kill feed entries
* End-game UI panels

Example cleanup pattern:

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

  super.shutdown?.();
}
```

If cleanup is incomplete, ghost UI elements remain after restarting a match.

---

## 10. Use Feedback Cues to Improve Usability

Good UI must communicate what is happening.

Recommended elements:

### For Caro

* Hover highlight on target cell
* Highlight last move
* Highlight winning line

### For Shooter

* Damage flash
* Respawn animation
* Crosshair visible only when playing
* Muzzle flash triggered by server bullet creation
* Kill feed fade-in/out with animations

UI feedback dramatically improves game feel.

---

## 11. Core “Golden Rules”

1. **Never use fixed canvas sizes. Always read from `cameras.main`.**
2. **Handle resize events** and recalculate all layout values.
3. **Interactive zones should match the gameplay area**, not the canvas.
4. **HUD should be static** (`scrollFactor = 0`) and sized using viewport dimensions.
5. **All layout values come from paddings and ratios**, not arbitrary constants.
6. **Panels resize based on text**, not vice-versa.
7. **React for meta-UI, Phaser for game-UI.**
8. **Complete cleanup on shutdown / restart.**
9. **Consistent depth hierarchy** for UI vs gameplay.
10. **Use visual feedback** for interaction and state changes.

---

## End of Document

This guide should be followed whenever implementing or revising UI logic inside a Phaser canvas.
Maintaining consistency across all games reduces bugs, improves scalability, and ensures a cohesive user experience.
