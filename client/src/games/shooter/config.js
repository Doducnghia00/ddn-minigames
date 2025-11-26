import Phaser from 'phaser';

export const SHOOTER_CONFIG = {
    id: 'shooter',
    name: 'Arena Shooter',
    description: 'Top-down multiplayer shooter - Dominate the arena!',
    minPlayers: 2,
    maxPlayers: 8,
    phaserConfig: {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: '#1a1a2e',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        }
    }
};
