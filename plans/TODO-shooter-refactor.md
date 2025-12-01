# TODO: ShooterScene Refactoring

**Objective:** Refactor `ShooterScene.js` (1553 lines) into modular, maintainable components following Single Responsibility Principle

**Status:** 📋 Planning  
**Priority:** High  
**Estimated Effort:** 6-8 hours  
**Created:** 2025-12-01

---

## 📊 Overview

### Current State
- ❌ Single monolithic file: 1553 lines
- ❌ Multiple responsibilities mixed together
- ❌ Hard to maintain and extend
- ❌ Difficult to test individual features

### Target State
- ✅ Modular architecture with clear separation of concerns
- ✅ Each module < 300 lines
- ✅ Easy to find and fix bugs
- ✅ Reusable components
- ✅ Team-friendly for parallel development

---

## 🎯 Target Architecture

```
client/src/games/shooter/
├── ShooterScene.js           # Orchestrator (~150 lines)
├── managers/
│   ├── ShooterInput.js       # Input handling & prediction (~180 lines)
│   ├── ShooterPlayerView.js  # Player sprite management (~250 lines)
│   ├── ShooterBulletView.js  # Bullet sprite management (~80 lines)
│   └── ShooterEffects.js     # Visual effects (~250 lines)
└── ui/
    ├── ShooterHUD.js         # Health, timer, leaderboard (~250 lines)
    ├── ShooterKillFeed.js    # Kill notifications (~120 lines)
    └── ShooterEndGameUI.js   # End-game scoreboard (~250 lines)
```

---

## ✅ Checklist

### Phase 1: Preparation
- [ ] Create directory structure (`managers/`, `ui/`)
- [ ] Back up current `ShooterScene.js`
- [ ] Create test plan document
- [ ] Review dependencies between modules

### Phase 2: Extract Effects Module (Start with simplest)
- [ ] Create `managers/ShooterEffects.js`
- [ ] Move methods:
  - [ ] `flashDamage()`
  - [ ] `showDeathAnimation()`
  - [ ] `showRespawnAnimation()`
  - [ ] `showMuzzleFlash()`
- [ ] Update `ShooterScene` to use `this.effects.methodName()`
- [ ] Test all visual effects still work

### Phase 3: Extract KillFeed Module
- [ ] Create `ui/ShooterKillFeed.js`
- [ ] Move methods:
  - [ ] `createKillFeed()`
  - [ ] `showKillNotification()`
  - [ ] `removeKillNotification()`
  - [ ] `repositionKillFeed()`
- [ ] Move properties: `killFeedEntries`, `maxKillFeedEntries`
- [ ] Update event listener in `setupServerMessages()`
- [ ] Test kill feed notifications

### Phase 4: Extract EndGame UI Module
- [ ] Create `ui/ShooterEndGameUI.js`
- [ ] Move methods:
  - [ ] `showEndGameScreen()`
  - [ ] `hideEndGameScreen()`
- [ ] Move property: `endGameUI`
- [ ] Update `onMatchEnded()` to call `this.endGameUI.show(data)`
- [ ] Test end-game screen display and close button

### Phase 5: Extract HUD Module
- [ ] Create `ui/ShooterHUD.js`
- [ ] Move methods:
  - [ ] `createHUD()`
  - [ ] `updateHUD()`
  - [ ] `updateLeaderboard()`
  - [ ] `updateCrosshair()`
- [ ] Move HUD-related properties (health bar, timer, leaderboard, crosshair)
- [ ] Update `update()` loop to call `this.hud.update()`
- [ ] Update `onTimerUpdate()` to delegate to HUD
- [ ] Test HUD rendering and updates

### Phase 6: Extract BulletView Module
- [ ] Create `managers/ShooterBulletView.js`
- [ ] Move methods:
  - [ ] `updateBulletSprites()`
- [ ] Move properties: `bulletSprites`, `bulletInterpolator`
- [ ] Handle bullet lifecycle (add/remove)
- [ ] Test bullet rendering and interpolation

### Phase 7: Extract PlayerView Module
- [ ] Create `managers/ShooterPlayerView.js`
- [ ] Move methods:
  - [ ] `onPlayerAdded()`
  - [ ] `onPlayerRemoved()`
  - [ ] `updatePlayerSprites()`
  - [ ] `setupPlayerListeners()`
  - [ ] `cleanupAllSprites()`
- [ ] Move properties: `playerSprites`, `playerInterpolator`
- [ ] Link with `ShooterEffects` for damage/death/respawn
- [ ] Test player rendering, health bars, name tags

### Phase 8: Extract Input Module
- [ ] Create `managers/ShooterInput.js`
- [ ] Move methods:
  - [ ] `setupInput()`
  - [ ] `handleInput()`
  - [ ] `handleShoot()`
- [ ] Move input-related properties:
  - [ ] `keys`, `isMoving`, `currentMoveDirection`
  - [ ] `enablePrediction`, `predictedPosition`, `lastServerPosition`, `predictionVelocity`
  - [ ] `lastInputSent`, `inputSendRate`
- [ ] Test movement, shooting, client-side prediction

### Phase 9: Refactor ShooterScene (Orchestrator)
- [ ] Keep only orchestration logic in `ShooterScene.js`
- [ ] `create()` - Initialize all managers
- [ ] `update()` - Call manager updates
- [ ] Event handlers - Delegate to appropriate managers
- [ ] Ensure clean initialization order
- [ ] Test full game flow

### Phase 10: Testing & Validation
- [ ] Full gameplay test - Movement
- [ ] Full gameplay test - Shooting
- [ ] Full gameplay test - Taking damage
- [ ] Full gameplay test - Death & respawn
- [ ] Full gameplay test - Kill feed
- [ ] Full gameplay test - Leaderboard updates
- [ ] Full gameplay test - End-game screen
- [ ] Full gameplay test - Game restart
- [ ] Performance check - No FPS drops
- [ ] Memory check - No leaks on repeated games

### Phase 11: Cleanup & Documentation
- [ ] Remove old commented code
- [ ] Add JSDoc comments to each module
- [ ] Update README with new architecture
- [ ] Create architecture diagram (Mermaid)
- [ ] Document dependencies between modules
- [ ] Code review with team

---

## 🔧 Implementation Notes

### Module Dependencies
```
ShooterScene (orchestrator)
├── ShooterInput (depends on: room)
├── ShooterEffects (depends on: scene)
├── ShooterPlayerView (depends on: room, effects)
├── ShooterBulletView (depends on: room)
├── ShooterHUD (depends on: room)
├── ShooterKillFeed (depends on: scene)
└── ShooterEndGameUI (depends on: scene, room)
```

### Constructor Pattern
```javascript
// Example: ShooterEffects.js
export class ShooterEffects {
    constructor(scene) {
        this.scene = scene;
    }
    
    flashDamage(sessionId) { /* ... */ }
    showDeathAnimation(sessionId) { /* ... */ }
    // ...
}

// Usage in ShooterScene.js
create() {
    this.effects = new ShooterEffects(this);
    this.playerView = new ShooterPlayerView(this, this.room, this.effects);
    // ...
}
```

### Testing Strategy
1. **After each phase:** Test the specific feature thoroughly
2. **Regression test:** Ensure no existing features broke
3. **Performance test:** Check FPS and memory usage
4. **Edge cases:** Game restart, mid-game join, disconnection

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Test thoroughly after each phase |
| Circular dependencies | Medium | Plan dependency graph carefully |
| Performance degradation | Low | Profile before/after refactor |
| Event listener leaks | Medium | Ensure proper cleanup in shutdown() |
| Initialization order bugs | Medium | Document and test init sequence |

---

## 📈 Success Criteria

- ✅ All existing features work identically
- ✅ No performance regression (maintain 60 FPS)
- ✅ Each module file < 300 lines
- ✅ ShooterScene.js orchestrator < 200 lines
- ✅ Clear separation of concerns
- ✅ Easy to add new features without touching multiple files
- ✅ Code passes review by team

---

## 📚 References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- Existing similar structure: `FreeForAllGameScene` base class
- Entity interpolation: `client/src/games/base/EntityInterpolator.js`

---

## 🔄 Progress Tracking

**Started:** Not yet  
**Current Phase:** Phase 1 - Preparation  
**Completed Phases:** 0/11  
**Overall Progress:** 0%

**Next Action:** Review and approve this plan, then start Phase 1

---

## 💡 Future Enhancements (Post-Refactor)

- [ ] Add unit tests for each module
- [ ] Extract arena rendering to `ShooterArena.js`
- [ ] Create `ShooterConfig.js` for magic numbers
- [ ] Add TypeScript type definitions
- [ ] Performance profiling dashboard
- [ ] Add module hot-reload for development
