const { ArraySchema, type } = require('@colyseus/schema');
const { TurnBasedRoomState } = require('../base/states/TurnBasedRoomState');
const { CARO_CONFIG } = require('./caro-config');

class CaroState extends TurnBasedRoomState {
    constructor(boardSize = CARO_CONFIG.board.size, winCondition = CARO_CONFIG.board.winCondition) {
        super();
        this.board = new ArraySchema();
        this.boardSize = boardSize;           // Store board size for clients
        this.winCondition = winCondition;     // Store win condition for display

        // Create board with dynamic size
        const cellCount = boardSize * boardSize;
        for (let i = 0; i < cellCount; i++) {
            this.board.push(0);
        }
    }
}

type(["number"])(CaroState.prototype, "board");
type("number")(CaroState.prototype, "boardSize");
type("number")(CaroState.prototype, "winCondition");
// Note: players field is inherited from BaseRoomState and uses base Player type by default
// CaroPlayer type is enforced by CaroRoom.createPlayer() method

module.exports = { CaroState };

