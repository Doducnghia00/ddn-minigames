/**
 * InputBuffer - Throttles and batches player inputs to reduce message spam
 * 
 * Problem: Clients send input messages every frame (60 msg/s)
 * Solution: Buffer inputs and only process the latest one every N milliseconds
 * 
 * Benefits:
 * - Reduces message processing overhead
 * - Decreases bandwidth usage by ~70%
 * - Still maintains responsiveness (20-30 updates/s is enough)
 * 
 * Usage:
 *   this.inputBuffer = new InputBuffer(50); // Process every 50ms (20 msg/s)
 *   this.inputBuffer.addInput(sessionId, inputData);
 *   
 *   // In game loop:
 *   this.inputBuffer.processInputs((sessionId, input) => {
 *       this.handlePlayerInput(sessionId, input);
 *   });
 */

class InputBuffer {
    /**
     * @param {number} throttleInterval - Minimum ms between processing inputs per player
     */
    constructor(throttleInterval = 50) {
        this.throttleInterval = throttleInterval;
        
        // Store latest input per player
        // Map<sessionId, {input: Object, timestamp: number}>
        this.inputQueue = new Map();
        
        // Track last process time per player
        // Map<sessionId, number>
        this.lastProcessTime = new Map();
    }

    /**
     * Add or update input for a player
     * Only the latest input is kept (previous inputs are discarded)
     */
    addInput(sessionId, input) {
        this.inputQueue.set(sessionId, {
            input,
            timestamp: Date.now()
        });
    }

    /**
     * Process all pending inputs that are ready (past throttle interval)
     * @param {Function} callback - Called with (sessionId, input) for each ready input
     */
    processInputs(callback) {
        const now = Date.now();

        for (const [sessionId, data] of this.inputQueue.entries()) {
            const lastProcessed = this.lastProcessTime.get(sessionId) || 0;
            const timeSinceLastProcess = now - lastProcessed;

            // Check if enough time has passed since last process
            if (timeSinceLastProcess >= this.throttleInterval) {
                // Process this input
                callback(sessionId, data.input);

                // Update last process time
                this.lastProcessTime.set(sessionId, now);

                // Remove from queue
                this.inputQueue.delete(sessionId);
            }
        }
    }

    /**
     * Clear all inputs for a player (e.g., when they leave)
     */
    clearPlayer(sessionId) {
        this.inputQueue.delete(sessionId);
        this.lastProcessTime.delete(sessionId);
    }

    /**
     * Clear all inputs
     */
    clear() {
        this.inputQueue.clear();
        this.lastProcessTime.clear();
    }

    /**
     * Get number of pending inputs
     */
    getPendingCount() {
        return this.inputQueue.size;
    }
}

module.exports = { InputBuffer };

