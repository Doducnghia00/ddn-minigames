const { type } = require('@colyseus/schema');
const { BaseRoomState } = require('../BaseRoomState');

class TurnBasedRoomState extends BaseRoomState {
    constructor() {
        super();
        this.currentTurn = "";
    }
}

type("string")(TurnBasedRoomState.prototype, "currentTurn");

module.exports = { TurnBasedRoomState };

