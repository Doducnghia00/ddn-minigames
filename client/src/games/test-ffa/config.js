import Phaser from 'phaser';

export const TEST_FFA_CONFIG = {
    id: 'test-ffa',
    name: 'Test FFA',
    description: 'Test Free-For-All Mode - Verify FFA infrastructure',
    minPlayers: 2,
    maxPlayers: 8,
    phaserConfig: {
        type: Phaser.CANVAS,
        width: 800,
        height: 600,
        backgroundColor: '#1a1a2e'
    }
};
