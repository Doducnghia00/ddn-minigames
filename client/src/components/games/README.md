# Game Components Architecture

This pattern is designed based on how major mini game platforms like **Y8** and **CrazyGames** organize their code.

## Structure

```
components/games/
├── PlayerCard.jsx          # Shared component for displaying players (reusable)
└── [game-name]/            # Separate folder for each game
    └── [Game]PlayerBadges.jsx  # Game-specific badges and components
```

## Pattern

### 1. **PlayerCard Component (Reusable)**
- Shared component for all games
- Displays: avatar, name, owner badge, ready badge, turn indicator
- Receives props from game profile to render game-specific components

### 2. **Game-Specific Components**
Each game has its own folder with components:
- **RoleBadge**: Displays player role/team/character (e.g., Piece X/O in Caro)
- **StatusBadge**: Displays status in game (e.g., "Your Turn")
- **ExtraInfo**: Additional information (e.g., scores, statistics)

### 3. **Game Profile System**
File `config/gameProfiles.js` defines:
- Metadata: minPlayers, readyLabel, statusTexts
- Components: RoleBadge, StatusBadge, ExtraInfo
- GameHUD: (optional) Game-specific HUD component

## Example: Adding a New Game

### Step 1: Create game-specific components

```jsx
// components/games/tictactoe/TicTacToePlayerBadges.jsx
export const TicTacToeRoleBadge = ({ player }) => {
    // Logic to display role
};

export const TicTacToeStatusBadge = ({ player, gameState, isMyTurn }) => {
    // Logic to display status
};
```

### Step 2: Register in gameProfiles.js

```js
import { 
    TicTacToeRoleBadge, 
    TicTacToeStatusBadge 
} from '../components/games/tictactoe/TicTacToePlayerBadges';

export const GAME_PROFILES = {
    // ... existing games
    tictactoe: {
        minPlayers: 2,
        readyLabel: '✋ Ready to play Tic Tac Toe',
        statusTexts: { ... },
        components: {
            RoleBadge: TicTacToeRoleBadge,
            StatusBadge: TicTacToeStatusBadge,
            ExtraInfo: null
        }
    }
};
```

### Step 3: Server metadata

Ensure server room sets metadata:
```js
this.setMetadata({
    gameId: "tictactoe",
    gameName: "Tic Tac Toe"
});
```

## Benefits

✅ **Scalable**: Easy to add new games without modifying shared code  
✅ **Maintainable**: Each game has its own code, easy to maintain  
✅ **Consistent**: Consistent UI/UX across games  
✅ **Flexible**: Each game can customize UI as needed  

## Best Practices

1. **Always export components** from game folder for easy import
2. **Use TypeScript** (if available) for type safety
3. **Reuse PlayerCard** instead of creating new component
4. **Documentation**: Clear comments for each component
5. **Testing**: Test game-specific components separately
