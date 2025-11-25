const { Schema, type } = require('@colyseus/schema');

class Player extends Schema {
    constructor() {
        super();
        this.id = "";
        this.name = "Player";
        this.avatar = "";
        this.isOwner = false;
        this.isReady = false;
        this.symbol = 0;
    }
}

type("string")(Player.prototype, "id");
type("string")(Player.prototype, "name");
type("string")(Player.prototype, "avatar");
type("boolean")(Player.prototype, "isOwner");
type("boolean")(Player.prototype, "isReady");
type("number")(Player.prototype, "symbol");

module.exports = { Player };

