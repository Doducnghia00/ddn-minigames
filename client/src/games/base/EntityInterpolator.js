/**
 * EntityInterpolator - Smooth entity movement between server updates
 * 
 * Problem: Server sends updates at 30 FPS, but client renders at 60 FPS
 *          Without interpolation, entities jump/stutter between positions
 * 
 * Solution: Buffer server snapshots and interpolate between them
 *           Render slightly in the past (~100ms) to have future positions to lerp to
 * 
 * Benefits:
 * - Smooth 60 FPS rendering with 30 FPS server updates
 * - Hides minor network jitter
 * - Reduces perceived lag
 * 
 * Usage:
 *   const interpolator = new EntityInterpolator(100); // 100ms render delay
 *   
 *   // When server update arrives:
 *   interpolator.addSnapshot(entity.id, { x, y, rotation });
 *   
 *   // Each frame:
 *   const interpolated = interpolator.getInterpolated(entity.id);
 *   sprite.setPosition(interpolated.x, interpolated.y);
 */

export class EntityInterpolator {
    /**
     * @param {number} renderDelay - How far in the past to render (ms). Higher = smoother but more lag
     */
    constructor(renderDelay = 100) {
        this.renderDelay = renderDelay;
        
        // Store snapshots per entity
        // Map<entityId, Array<{timestamp, data}>>
        this.snapshots = new Map();
        
        // Maximum snapshots to keep per entity (prevent memory leak)
        this.maxSnapshotsPerEntity = 5;
    }

    /**
     * Add a new snapshot for an entity
     * @param {string} entityId - Unique entity identifier
     * @param {Object} data - Entity state (x, y, rotation, etc.)
     */
    addSnapshot(entityId, data) {
        if (!this.snapshots.has(entityId)) {
            this.snapshots.set(entityId, []);
        }

        const snapshots = this.snapshots.get(entityId);
        
        // Add snapshot with timestamp
        snapshots.push({
            timestamp: Date.now(),
            data: { ...data }
        });

        // Remove old snapshots
        if (snapshots.length > this.maxSnapshotsPerEntity) {
            snapshots.shift();
        }
    }

    /**
     * Get interpolated position for an entity
     * @param {string} entityId - Entity to interpolate
     * @returns {Object|null} Interpolated data or null if not enough snapshots
     */
    getInterpolated(entityId) {
        const snapshots = this.snapshots.get(entityId);
        
        if (!snapshots || snapshots.length < 2) {
            // Not enough data - return latest snapshot or null
            if (snapshots && snapshots.length === 1) {
                return { ...snapshots[0].data };
            }
            return null;
        }

        // Current render time (in the past)
        const renderTime = Date.now() - this.renderDelay;

        // Find two snapshots to interpolate between
        let snapshot0 = null;
        let snapshot1 = null;

        for (let i = 0; i < snapshots.length - 1; i++) {
            const snap0 = snapshots[i];
            const snap1 = snapshots[i + 1];

            // Find the bracket around render time
            if (snap0.timestamp <= renderTime && renderTime <= snap1.timestamp) {
                snapshot0 = snap0;
                snapshot1 = snap1;
                break;
            }
        }

        // If we couldn't find a bracket, use the two most recent
        if (!snapshot0 || !snapshot1) {
            snapshot0 = snapshots[snapshots.length - 2];
            snapshot1 = snapshots[snapshots.length - 1];
        }

        // Calculate interpolation factor (0 to 1)
        const timeDelta = snapshot1.timestamp - snapshot0.timestamp;
        const t = timeDelta > 0 
            ? Math.max(0, Math.min(1, (renderTime - snapshot0.timestamp) / timeDelta))
            : 1;

        // Interpolate all numeric properties
        const interpolated = {};
        
        for (const key in snapshot1.data) {
            const value0 = snapshot0.data[key];
            const value1 = snapshot1.data[key];

            if (typeof value1 === 'number' && typeof value0 === 'number') {
                // Lerp numeric values
                interpolated[key] = this.lerp(value0, value1, t);
            } else {
                // Non-numeric values - just use latest
                interpolated[key] = value1;
            }
        }

        return interpolated;
    }

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Remove all snapshots for an entity (when it's destroyed)
     */
    removeEntity(entityId) {
        this.snapshots.delete(entityId);
    }

    /**
     * Clear all snapshots
     */
    clear() {
        this.snapshots.clear();
    }

    /**
     * Get statistics for debugging
     */
    getStats() {
        let totalSnapshots = 0;
        
        for (const snapshots of this.snapshots.values()) {
            totalSnapshots += snapshots.length;
        }

        return {
            entities: this.snapshots.size,
            totalSnapshots,
            avgSnapshotsPerEntity: this.snapshots.size > 0 
                ? (totalSnapshots / this.snapshots.size).toFixed(2) 
                : 0,
            renderDelay: this.renderDelay
        };
    }
}

