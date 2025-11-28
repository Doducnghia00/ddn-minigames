const { type } = require('@colyseus/schema');
const { BaseRoomState } = require('../BaseRoomState');

/**
 * FreeForAllRoomState - State for FFA game modes
 * Extends BaseRoomState with FFA-specific state like timer and score limit
 */
class FreeForAllRoomState extends BaseRoomState {
    constructor() {
        super();
        this.matchTimer = 0;       // Countdown timer in seconds
        this.scoreLimit = 20;      // Win condition: first to reach this score
        this.maxPlayers = 8;       // Max players in FFA
    }
}

type('number')(FreeForAllRoomState.prototype, 'matchTimer');
type('number')(FreeForAllRoomState.prototype, 'scoreLimit');
type('number')(FreeForAllRoomState.prototype, 'maxPlayers');

// Note: players field is inherited from BaseRoomState and uses base Player type by default
// FFAPlayer type is enforced by FreeForAllRoom.createPlayer() method

module.exports = { FreeForAllRoomState };
