const { ArraySchema, type } = require('@colyseus/schema');
const { TurnBasedRoomState } = require('../base/states/TurnBasedRoomState');

class CaroState extends TurnBasedRoomState {
    constructor() {
        super();
        this.board = new ArraySchema();

        for (let i = 0; i < 225; i++) {
            this.board.push(0);
        }
    }
}

type(["number"])(CaroState.prototype, "board");
module.exports = { CaroState };

