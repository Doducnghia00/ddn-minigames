import Phaser from 'phaser';
import { auth } from '../firebase';
import { onAuthStateChanged } from "firebase/auth";

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Preload assets here
        // this.load.image('logo', 'assets/logo.png');
    }

    create() {
        console.log('BootScene created');

        // Check for existing session
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("User already logged in:", user.email);
                try {
                    const token = await user.getIdToken();
                    // Verify with server again to be sure
                    const response = await fetch('http://localhost:2567/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const userData = {
                            ...data.user,
                            name: user.displayName || data.user.name || data.user.email,
                            avatar: user.photoURL || "",
                        }
                        this.scene.start('LobbyScene', { user: userData });
                    } else {
                        this.scene.start('LoginScene');
                    }
                } catch (e) {
                    console.error("Auto-login failed", e);
                    this.scene.start('LoginScene');
                }
            } else {
                this.scene.start('LoginScene');
            }
        });
    }
}
