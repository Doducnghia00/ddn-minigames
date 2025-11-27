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

// Shooter components
import {
    ShooterRoleBadge,
    ShooterStatusBadge,
    ShooterExtraInfo
} from '../components/games/shooter/ShooterPlayerBadges';

export const DEFAULT_GAME_PROFILE = {
    minPlayers: 2,
    readyLabel: '✋ Ready',
    statusTexts: {
        waiting: '⏳ Waiting for players...',
        playing: '🎮 Game in progress',
        finished: '🏁 Game finished - Ready to continue'
    },
    behaviors: {
        turnBased: false,
        readyStrategy: 'allPlayers',
        allowKicks: true
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
        behaviors: {
            turnBased: true,
            readyStrategy: 'allPlayers',
            allowKicks: true
        },
        components: {
            RoleBadge: CaroRoleBadge,
            StatusBadge: CaroStatusBadge,
            ExtraInfo: CaroExtraInfo
        }
    },
    
    // Shooter - Arena FFA shooter game
    shooter: {
        minPlayers: 2,
        readyLabel: '⚔️ Ready for Battle',
        statusTexts: {
            waiting: '⏳ Preparing for arena combat...',
            playing: '🔫 Arena battle in progress',
            finished: '🏁 Match finished - Ready for rematch'
        },
        behaviors: {
            turnBased: false,        // Real-time game
            readyStrategy: 'allPlayers',
            allowKicks: true
        },
        components: {
            RoleBadge: ShooterRoleBadge,
            StatusBadge: ShooterStatusBadge,
            ExtraInfo: ShooterExtraInfo
        }
    },
    
    // Test FFA - reuse shooter components
    'test-ffa': {
        minPlayers: 2,
        readyLabel: '🧪 Ready for Test',
        statusTexts: {
            waiting: '⏳ Waiting for players...',
            playing: '🧪 Test match in progress',
            finished: '🏁 Test finished'
        },
        behaviors: {
            turnBased: false,
            readyStrategy: 'allPlayers',
            allowKicks: true
        },
        components: {
            RoleBadge: ShooterRoleBadge,
            StatusBadge: ShooterStatusBadge,
            ExtraInfo: ShooterExtraInfo
        }
    }
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
        },
        behaviors: {
            ...DEFAULT_GAME_PROFILE.behaviors,
            ...(gameProfile.behaviors || {})
        }
    };
};

