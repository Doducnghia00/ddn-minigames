const { Player } = require('../Player');
const { type } = require('@colyseus/schema');

/**
 * FFAPlayer - Player schema for Free-For-All games
 * Extends base Player with FFA-specific data like scores, kills, deaths
 * 
 * Usage:
 * - Shooter games
 * - Racing games
 * - Battle royale games
 * - Any competitive FFA mode
 */
class FFAPlayer extends Player {
    constructor() {
        super();
        this.score = 0;    // Generic score/points
        this.kills = 0;    // For combat games
        this.deaths = 0;   // For combat games
    }
}

type('number')(FFAPlayer.prototype, 'score');
type('number')(FFAPlayer.prototype, 'kills');
type('number')(FFAPlayer.prototype, 'deaths');

module.exports = { FFAPlayer };
