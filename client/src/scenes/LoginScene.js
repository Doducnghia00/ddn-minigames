import Phaser from 'phaser';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth";

export class LoginScene extends Phaser.Scene {
    constructor() {
        super('LoginScene');
    }

    create() {
        console.log('LoginScene created');

        // Create HTML Login Form
        const element = this.add.dom(400, 300).createFromHTML(`
            <div class="w-full max-w-md bg-gray-900/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700/50 text-center">
                <div class="mb-8">
                    <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">DDN Games</h1>
                    <p class="text-gray-400 text-sm">Enter the arena of mini-games</p>
                </div>
                
                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 ml-1">Email</label>
                        <input type="email" id="email" placeholder="name@example.com" 
                            class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white placeholder-gray-500 transition-all">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 ml-1">Password</label>
                        <input type="password" id="password" placeholder="••••••••" 
                            class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-white placeholder-gray-500 transition-all">
                    </div>
                </div>
                
                <div id="errorMsg" class="text-red-500 mt-4 text-sm min-h-[20px] font-medium"></div>

                <button id="loginBtn" 
                    class="w-full mt-6 py-3.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5 active:translate-y-0">
                    Sign In
                </button>
                
                <div class="relative my-6">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-700"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-2 bg-gray-900 text-gray-500">Or continue with</span>
                    </div>
                </div>
                
                <button id="googleBtn" 
                    class="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-lg shadow-lg flex items-center justify-center gap-3 transition-colors">
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                </button>
            </div>
        `);

        element.addListener('click');

        element.on('click', async (event) => {
            const errorMsg = element.getChildByID('errorMsg');
            errorMsg.innerText = "";

            if (event.target.id === 'loginBtn') {
                errorMsg.innerText = "Email/password login is temporarily disabled. Please use Google Sign-In.";
                errorMsg.classList.add('text-yellow-500');
                errorMsg.classList.remove('text-red-500');
                return;

                // Disabled code below
                /*
                const email = element.getChildByID('email').value;
                const password = element.getChildByID('password').value;

                if (email && password) {
                    try {
                        const userCredential = await signInWithEmailAndPassword(auth, email, password);
                        console.log("Logged in with Email");
                        const token = await userCredential.user.getIdToken();
                        await this.authenticateWithServer(token);
                    } catch (error) {
                        console.error("Login failed", error);
                        errorMsg.innerText = error.message;
                    }
                } else {
                    errorMsg.innerText = "Please enter email and password";
                }
                */
            } else if (event.target.closest('#googleBtn')) {
                const provider = new GoogleAuthProvider();
                try {
                    const result = await signInWithPopup(auth, provider);
                    console.log("Logged in with Google");
                    const token = await result.user.getIdToken();
                    await this.authenticateWithServer(token);
                } catch (error) {
                    console.error("Google login failed", error);
                    errorMsg.innerText = error.message;
                }
            }
        });
    }

    async authenticateWithServer(token) {
        try {
            const response = await fetch('http://localhost:2567/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Server auth success:", data);

                // Get current Firebase user for additional info
                const currentUser = auth.currentUser;
                const userData = {
                    ...data.user,
                    name: currentUser?.displayName || data.user.name || data.user.email,
                    avatar: currentUser?.photoURL || "",
                    sessionId: null // Will be set by Colyseus
                };
                console.log("currentUser:", currentUser);
                console.log("User data:", userData);

                this.scene.start('LobbyScene', { user: userData });
            } else {
                throw new Error('Server authentication failed');
            }
        } catch (error) {
            console.error("Server auth error:", error);
            const element = this.children.list.find(child => child.node?.tagName === 'DIV');
            if (element) {
                const errorMsg = element.getChildByID('errorMsg');
                if (errorMsg) errorMsg.innerText = "Authentication failed: " + error.message;
            }
        }
    }
}
