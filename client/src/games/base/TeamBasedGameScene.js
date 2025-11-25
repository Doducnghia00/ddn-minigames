import { BaseGameScene } from './BaseGameScene';

/**
 * TeamBasedGameScene
 *
 * Base layer for any game that needs to organize players into teams
 * and keep shared team stats (scores, objectives, etc.).
 *
 * Designed to mirror the future `TeamRoom` server mode so both sides share
 * the same concepts.
 */
export class TeamBasedGameScene extends BaseGameScene {
    constructor(sceneKey) {
        super(sceneKey);
        this.teamAssignments = new Map(); // playerId -> teamId
        this.teamScores = new Map(); // teamId -> number
    }

    init(data) {
        super.init(data);
        this.teamAssignments.clear();
        this.teamScores.clear();
    }

    /**
     * Attach team metadata from the authoritative room state
     * Expects each player entry to optionally expose `teamId`
     */
    syncTeamsFromState(statePlayers) {
        if (!statePlayers) return;
        const currentTeams = new Map();

        statePlayers.forEach((player, id) => {
            const teamId = player.teamId || 'solo';
            currentTeams.set(id, teamId);
        });

        this.teamAssignments = currentTeams;
        this.handleTeamsUpdated();
    }

    /**
     * Update the score of a given team
     */
    setTeamScore(teamId, score) {
        this.teamScores.set(teamId, score);
        this.handleTeamScoreChanged(teamId, score);
    }

    /**
     * Convenience helper to increment team score
     */
    addTeamScore(teamId, delta = 1) {
        const current = this.teamScores.get(teamId) || 0;
        this.setTeamScore(teamId, current + delta);
    }

    /**
     * Override in subclasses to react whenever team list changes
     */
    handleTeamsUpdated() {
        // no-op
    }

    /**
     * Override in subclasses to update HUD/scoreboard when a team score changes
     */
    handleTeamScoreChanged() {
        // no-op
    }

    /**
     * Utility to fetch the team metadata of a player
     */
    getPlayerTeam(playerId) {
        return this.teamAssignments.get(playerId) || null;
    }
}

