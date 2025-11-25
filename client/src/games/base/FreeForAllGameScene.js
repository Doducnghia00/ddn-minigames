import { BaseGameScene } from './BaseGameScene';

/**
 * FreeForAllGameScene
 *
 * Base class for large lobbies / FFA modes where each player has their own
 * score, rank or status. Mirroring the server-side FreeForAllRoom.
 */
export class FreeForAllGameScene extends BaseGameScene {
    constructor(sceneKey) {
        super(sceneKey);
        this.playerScores = new Map(); // playerId -> score number
    }

    init(data) {
        super.init(data);
        this.playerScores.clear();
    }

    /**
     * Synchronize any score metadata coming from state.players.
     * Looks for `score` or `kills` fields on player objects by convention.
     */
    syncScoresFromState(statePlayers) {
        if (!statePlayers) return;

        statePlayers.forEach((player, id) => {
            if (typeof player.score === 'number') {
                this.setPlayerScore(id, player.score);
            } else if (typeof player.kills === 'number') {
                this.setPlayerScore(id, player.kills);
            }
        });
    }

    setPlayerScore(playerId, value) {
        this.playerScores.set(playerId, value);
        this.handleScoreChanged(playerId, value);
    }

    addPlayerScore(playerId, delta = 1) {
        const current = this.playerScores.get(playerId) || 0;
        this.setPlayerScore(playerId, current + delta);
    }

    /**
     * Hook for subclasses to update HUD/leaderboard when a score changes
     */
    handleScoreChanged() {
        // override in concrete scene
    }

    getLeaderboard(limit = 10) {
        return Array.from(this.playerScores.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);
    }
}

