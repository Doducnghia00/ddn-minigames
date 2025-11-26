const { Player } = require('../base/Player');
const { type } = require('@colyseus/schema');

/**
 * CaroPlayer - Player schema specific to Caro game
 * Extends base Player with Caro-specific data
 */
class CaroPlayer extends Player {
    constructor() {
        super();
        this.symbol = 0; // 0 = none, 1 = X, 2 = O
    }
}

type('number')(CaroPlayer.prototype, 'symbol');

module.exports = { CaroPlayer };
