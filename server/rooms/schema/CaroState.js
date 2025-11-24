const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const MapSchema = schema.MapSchema;
const ArraySchema = schema.ArraySchema;
const type = schema.type;

class Player extends Schema {
}
type("string")(Player.prototype, "id");
type("string")(Player.prototype, "name");
type("string")(Player.prototype, "avatar"); // Google photo URL
type("number")(Player.prototype, "symbol"); // 1: X, 2: O
type("boolean")(Player.prototype, "isOwner");
type("boolean")(Player.prototype, "isReady");

class CaroState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.board = new ArraySchema();
        this.rematchVotes = new MapSchema();

        // Initialize 15x15 board with 0
        for (let i = 0; i < 225; i++) {
            this.board.push(0);
        }
    }
}
type({ map: Player })(CaroState.prototype, "players");
type(["number"])(CaroState.prototype, "board");
type("string")(CaroState.prototype, "currentTurn");
type("string")(CaroState.prototype, "winner");
type("string")(CaroState.prototype, "gameState"); // "waiting", "playing", "finished"
type("string")(CaroState.prototype, "roomOwner"); // Session ID of room owner
type({ map: "boolean" })(CaroState.prototype, "rematchVotes"); // Track who voted for rematch

exports.CaroState = CaroState;
exports.Player = Player;
