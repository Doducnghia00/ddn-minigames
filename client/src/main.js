import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { LoginScene } from './scenes/LoginScene';
import { CaroScene } from './games/caro/CaroScene';
import './style.css';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'app',
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, LoginScene, LobbyScene, CaroScene]
};

const game = new Phaser.Game(config);
