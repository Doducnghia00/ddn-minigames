const { Schema, type } = require('@colyseus/schema');

/**
 * Player - Base player schema for all games
 * Contains only common fields shared across all game types
 * 
 * Game-specific Player extensions:
 * - CaroPlayer: adds 'symbol' field
 * - FFAPlayer: adds 'score', 'kills', 'deaths' fields
 */
class Player extends Schema {
    constructor() {
        super();
        this.id = "";
        this.name = "Player";
        this.avatar = "";
        this.isOwner = false;
        this.isReady = false;
    }
}

type("string")(Player.prototype, "id");
type("string")(Player.prototype, "name");
type("string")(Player.prototype, "avatar");
type("boolean")(Player.prototype, "isOwner");
type("boolean")(Player.prototype, "isReady");

module.exports = { Player };

