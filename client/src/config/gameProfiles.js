/**
 * Game Profiles Configuration
 * Pattern similar to Y8/CrazyGames: each game has its own metadata and UI components
 * 
 * Each profile defines:
 * - minPlayers: Minimum number of players
 * - readyLabel: Text for Ready button
 * - statusTexts: Game status texts
 * - components: Game-specific React components
 *   - PlayerCard: Custom player card renderer (optional)
 *   - RoleBadge: Component to display player role/team
 *   - StatusBadge: Component to display status in game
 *   - ExtraInfo: Component to display additional information
 * - GameHUD: Game-specific HUD component (optional)
 */

import { 
    CaroRoleBadge, 
    CaroStatusBadge, 
    CaroExtraInfo 
} from '../components/games/caro/CaroPlayerBadges';

export const DEFAULT_GAME_PROFILE = {
    minPlayers: 2,
    readyLabel: '✋ Ready',
    statusTexts: {
        waiting: '⏳ Waiting for players...',
        playing: '🎮 Game in progress',
        finished: '🏁 Game finished - Ready to continue'
    },
    components: {
        RoleBadge: null,
        StatusBadge: null,
        ExtraInfo: null
    }
};

export const GAME_PROFILES = {
    caro: {
        minPlayers: 2,
        readyLabel: '✋ Ready to play Caro',
        statusTexts: {
            waiting: '⏳ Waiting for opponent...',
            playing: '🎮 Caro match in progress',
            finished: '🏁 Caro match finished - Ready to play again'
        },
        components: {
            RoleBadge: CaroRoleBadge,
            StatusBadge: CaroStatusBadge,
            ExtraInfo: CaroExtraInfo
        }
    },
    // Example for another game:
    // tictactoe: {
    //     minPlayers: 2,
    //     readyLabel: '✋ Ready to play Tic Tac Toe',
    //     statusTexts: { ... },
    //     components: {
    //         RoleBadge: TicTacToeRoleBadge,
    //         StatusBadge: TicTacToeStatusBadge,
    //         ExtraInfo: null
    //     }
    // }
};

/**
 * Get game profile by gameId
 */
export const getGameProfile = (gameId) => {
    return GAME_PROFILES[gameId] || {};
};

/**
 * Merge game profile with default profile
 */
export const getMergedGameProfile = (gameId) => {
    const gameProfile = getGameProfile(gameId);
    return {
        ...DEFAULT_GAME_PROFILE,
        ...gameProfile,
        statusTexts: {
            ...DEFAULT_GAME_PROFILE.statusTexts,
            ...(gameProfile.statusTexts || {})
        },
        components: {
            ...DEFAULT_GAME_PROFILE.components,
            ...(gameProfile.components || {})
        }
    };
};

