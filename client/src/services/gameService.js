/**
 * Game Service - API layer for fetching game data from server
 */

const SERVER_URL = import.meta.env.VITE_API_URL;

/**
 * Fetch available games from server
 * @returns {Promise<Array>} List of enabled games from server
 */
export async function fetchAvailableGames() {
    try {
        const response = await fetch(`${SERVER_URL}/api/games`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.games || !Array.isArray(data.games)) {
            throw new Error('Invalid response format from server');
        }
        
        console.log(`[GameService] Fetched ${data.games.length} games from server`);
        return data.games;
        
    } catch (error) {
        console.error('[GameService] Failed to fetch games:', error);
        
        // Return empty array on error - caller should handle
        return [];
    }
}
