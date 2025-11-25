const { Schema, MapSchema, type } = require('@colyseus/schema');
const { Player } = require('./Player');

class BaseRoomState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.rematchVotes = new MapSchema();
        this.gameState = "waiting";
        this.roomOwner = "";
        this.winner = "";
    }
}

type({ map: Player })(BaseRoomState.prototype, "players");
type({ map: "boolean" })(BaseRoomState.prototype, "rematchVotes");
type("string")(BaseRoomState.prototype, "gameState");
type("string")(BaseRoomState.prototype, "roomOwner");
type("string")(BaseRoomState.prototype, "winner");

module.exports = { BaseRoomState };

