/**
 * SpatialGrid - Grid-based spatial partitioning for efficient collision detection
 * 
 * Problem: Checking collisions between N bullets and M players is O(N×M)
 *          With 50 bullets and 8 players = 400 checks per frame
 * 
 * Solution: Divide world into grid cells. Only check collisions within same cell.
 *           Typical case: O(N+M) instead of O(N×M)
 * 
 * Performance: 5-10x faster for typical scenarios
 * 
 * Usage:
 *   const grid = new SpatialGrid(800, 600, 100); // 800x600 world, 100px cells
 *   
 *   // Each frame:
 *   grid.clear();
 *   grid.insert(bullet.x, bullet.y, bullet.radius, 'bullet', bullet);
 *   grid.insert(player.x, player.y, player.radius, 'player', player);
 *   
 *   // Query nearby entities
 *   const nearby = grid.query(x, y, radius);
 */

class SpatialGrid {
    /**
     * @param {number} worldWidth - Width of game world
     * @param {number} worldHeight - Height of game world
     * @param {number} cellSize - Size of each grid cell (larger = fewer cells but more entities per cell)
     */
    constructor(worldWidth, worldHeight, cellSize = 100) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.cellSize = cellSize;
        
        // Calculate grid dimensions
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        
        // Grid storage: Map<cellKey, Array<Entity>>
        // cellKey format: "x,y" (e.g., "0,0", "1,2")
        this.grid = new Map();
        
        console.log(`[SpatialGrid] Created ${this.cols}x${this.rows} grid (${this.cols * this.rows} cells)`);
    }

    /**
     * Convert world position to grid cell coordinates
     */
    worldToGrid(x, y) {
        return {
            col: Math.floor(x / this.cellSize),
            row: Math.floor(y / this.cellSize)
        };
    }

    /**
     * Convert grid coordinates to cell key
     */
    getCellKey(col, row) {
        return `${col},${row}`;
    }

    /**
     * Insert an entity into the grid
     * Entities spanning multiple cells will be inserted into all relevant cells
     * 
     * @param {number} x - Entity X position
     * @param {number} y - Entity Y position
     * @param {number} radius - Entity collision radius
     * @param {string} type - Entity type (e.g., 'bullet', 'player')
     * @param {Object} data - Entity data to store
     */
    insert(x, y, radius, type, data) {
        // Calculate bounding box
        const minX = x - radius;
        const maxX = x + radius;
        const minY = y - radius;
        const maxY = y + radius;

        // Get grid cell range
        const minCell = this.worldToGrid(minX, minY);
        const maxCell = this.worldToGrid(maxX, maxY);

        // Clamp to grid bounds
        minCell.col = Math.max(0, minCell.col);
        minCell.row = Math.max(0, minCell.row);
        maxCell.col = Math.min(this.cols - 1, maxCell.col);
        maxCell.row = Math.min(this.rows - 1, maxCell.row);

        // Insert into all cells the entity overlaps
        for (let row = minCell.row; row <= maxCell.row; row++) {
            for (let col = minCell.col; col <= maxCell.col; col++) {
                const key = this.getCellKey(col, row);
                
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                
                this.grid.get(key).push({
                    x, y, radius, type, data
                });
            }
        }
    }

    /**
     * Query all entities near a position
     * Returns entities in the same and adjacent cells
     * 
     * @param {number} x - Query X position
     * @param {number} y - Query Y position
     * @param {number} radius - Query radius
     * @param {string} filterType - Optional: only return entities of this type
     * @returns {Array} Array of entities
     */
    query(x, y, radius, filterType = null) {
        const results = [];
        const seen = new Set(); // Prevent duplicates

        // Calculate bounding box
        const minX = x - radius;
        const maxX = x + radius;
        const minY = y - radius;
        const maxY = y + radius;

        // Get grid cell range
        const minCell = this.worldToGrid(minX, minY);
        const maxCell = this.worldToGrid(maxX, maxY);

        // Clamp to grid bounds
        minCell.col = Math.max(0, minCell.col);
        minCell.row = Math.max(0, minCell.row);
        maxCell.col = Math.min(this.cols - 1, maxCell.col);
        maxCell.row = Math.min(this.rows - 1, maxCell.row);

        // Query all relevant cells
        for (let row = minCell.row; row <= maxCell.row; row++) {
            for (let col = minCell.col; col <= maxCell.col; col++) {
                const key = this.getCellKey(col, row);
                const entities = this.grid.get(key);
                
                if (!entities) continue;

                for (const entity of entities) {
                    // Skip if we've already seen this entity
                    if (seen.has(entity.data)) continue;
                    
                    // Filter by type if specified
                    if (filterType && entity.type !== filterType) continue;
                    
                    seen.add(entity.data);
                    results.push(entity);
                }
            }
        }

        return results;
    }

    /**
     * Get all entities in a specific cell (for debugging)
     */
    getCell(col, row) {
        const key = this.getCellKey(col, row);
        return this.grid.get(key) || [];
    }

    /**
     * Clear all entities from the grid
     * Call this at the start of each frame before re-inserting entities
     */
    clear() {
        this.grid.clear();
    }

    /**
     * Get statistics about grid usage (for debugging/optimization)
     */
    getStats() {
        let totalEntities = 0;
        let nonEmptyCells = 0;
        let maxEntitiesPerCell = 0;

        for (const entities of this.grid.values()) {
            if (entities.length > 0) {
                nonEmptyCells++;
                totalEntities += entities.length;
                maxEntitiesPerCell = Math.max(maxEntitiesPerCell, entities.length);
            }
        }

        return {
            totalCells: this.cols * this.rows,
            nonEmptyCells,
            totalEntities,
            maxEntitiesPerCell,
            avgEntitiesPerCell: nonEmptyCells > 0 ? (totalEntities / nonEmptyCells).toFixed(2) : 0
        };
    }
}

module.exports = { SpatialGrid };

