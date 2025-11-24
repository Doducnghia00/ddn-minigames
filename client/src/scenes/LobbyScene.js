import Phaser from 'phaser';
import * as Colyseus from 'colyseus.js';
import { auth } from '../firebase';
import { signOut } from "firebase/auth";

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create(data) {
        console.log('LobbyScene created', data);
        this.user = data.user || { email: 'Guest' };
        this.lobbyRoom = null;
        this.availableRooms = [];
        this.pendingJoinRoomId = null; // To store roomId when password modal is open

        // Create HTML Lobby UI
        this.element = this.add.dom(400, 300).createFromHTML(`
            <div class="w-full h-full bg-gray-900 text-white font-sans flex overflow-hidden">
                <!-- Sidebar -->
                <aside class="w-64 bg-gray-800/50 border-r border-gray-700 flex flex-col p-6">
                    <div class="mb-8">
                        <h1 class="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">DDN Games</h1>
                    </div>
                    
                    <div class="flex-grow">
                        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Menu</div>
                        <nav class="space-y-2">
                            <a href="#" class="block px-4 py-2 bg-gray-700/50 text-white rounded-lg font-medium">Lobby</a>
                            <a href="#" class="block px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/30 rounded-lg transition">Profile</a>
                            <a href="#" class="block px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/30 rounded-lg transition">Settings</a>
                        </nav>
                    </div>

                    <div class="mt-auto pt-6 border-t border-gray-700">
                        <div class="flex items-center gap-3 mb-4">
                            <img src="${this.user.avatar}" referrerpolicy="no-referrer" alt="User Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-gray-600">
                            <div class="overflow-hidden">
                                <div class="text-sm font-bold truncate">${this.user.name}</div>
                                <div class="text-xs text-gray-400 truncate">Online</div>
                            </div>
                        </div>
                        <button id="logoutBtn" class="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition">
                            Sign Out
                        </button>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="flex-grow flex flex-col p-8 overflow-hidden relative">
                    <!-- Header -->
                    <header class="flex justify-between items-center mb-8">
                        <div>
                            <h2 class="text-3xl font-bold text-white">Game Lobby</h2>
                            <p class="text-gray-400">Join a room or create your own.</p>
                        </div>
                        <button id="createRoomBtn" class="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 transform transition hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                            <span>+ Create Room</span>
                        </button>
                    </header>

                    <div class="flex gap-8 h-full overflow-hidden">
                        <!-- Game Selection (Left) -->
                        <div class="w-1/3 flex flex-col gap-4">
                            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">Featured Games</div>
                            
                            <!-- Caro Card -->
                            <div class="group relative bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-green-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-green-900/10">
                                <div class="absolute top-4 right-4 bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">Active</div>
                                <div class="h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl mb-4 flex items-center justify-center text-5xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                                    ⭕❌
                                </div>
                                <h3 class="text-xl font-bold text-white mb-1">Caro Online</h3>
                                <p class="text-gray-400 text-sm">Classic 5-in-a-row strategy game.</p>
                            </div>
                        </div>

                        <!-- Room List (Right) -->
                        <div class="w-2/3 flex flex-col bg-gray-800/30 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div class="p-4 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/50">
                                <h3 class="font-bold text-gray-200">Active Rooms</h3>
                                <div class="text-xs text-gray-500">Real-time updates</div>
                            </div>
                            
                            <div id="roomList" class="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                <div class="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                                    <div>Connecting to Lobby...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <!-- Create Room Modal -->
                <div id="createRoomModal" class="hidden absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-200">
                    <div class="bg-gray-800 p-8 rounded-2xl w-96 border border-gray-700 shadow-2xl transform scale-95 transition-transform duration-200">
                        <h3 class="text-2xl font-bold text-white mb-6">Create Room</h3>
                        
                        <div class="space-y-4 mb-8">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 ml-1">Room Name</label>
                                <input id="newRoomName" type="text" placeholder="e.g. Pro Arena" 
                                    class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-white">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 ml-1">Password (Optional)</label>
                                <input id="newRoomPassword" type="password" placeholder="Leave empty for public" 
                                    class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-white">
                            </div>
                        </div>

                        <div class="flex justify-end gap-3">
                            <button id="cancelCreateBtn" class="px-5 py-2.5 text-gray-400 hover:text-white font-medium transition">Cancel</button>
                            <button id="confirmCreateBtn" class="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition">Create Room</button>
                        </div>
                    </div>
                </div>

                <!-- Password Modal -->
                <div id="passwordModal" class="hidden absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 opacity-0 transition-opacity duration-200">
                    <div class="bg-gray-800 p-8 rounded-2xl w-96 border border-gray-700 shadow-2xl transform scale-95 transition-transform duration-200">
                        <div class="text-center mb-6">
                            <div class="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
                            <h3 class="text-xl font-bold text-white">Private Room</h3>
                            <p class="text-gray-400 text-sm">Enter password to join</p>
                        </div>
                        
                        <input id="joinRoomPassword" type="password" placeholder="Password" 
                            class="w-full mb-8 p-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500 text-white text-center tracking-widest">
                        
                        <div class="flex justify-end gap-3">
                            <button id="cancelPasswordBtn" class="px-5 py-2.5 text-gray-400 hover:text-white font-medium transition">Cancel</button>
                            <button id="confirmPasswordBtn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition">Join Room</button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        this.element.addListener('click');
        this.element.on('click', (event) => this.handleUIClick(event));

        this.connectToLobby();
    }

    async connectToLobby() {
        const client = new Colyseus.Client('ws://localhost:2567');
        try {
            this.lobbyRoom = await client.joinOrCreate("lobby");
            console.log("Joined Lobby Room");

            this.lobbyRoom.onMessage("rooms", (rooms) => {
                this.availableRooms = rooms;
                this.renderRoomList();
            });

            this.lobbyRoom.onMessage("+", ([roomId, room]) => {
                const existingIndex = this.availableRooms.findIndex(r => r.roomId === roomId);
                if (existingIndex !== -1) {
                    this.availableRooms[existingIndex] = room;
                } else {
                    this.availableRooms.push(room);
                }
                this.renderRoomList();
            });

            this.lobbyRoom.onMessage("-", (roomId) => {
                this.availableRooms = this.availableRooms.filter(r => r.roomId !== roomId);
                this.renderRoomList();
            });

        } catch (e) {
            console.error("Lobby join error", e);
            const listContainer = this.element.getChildByID('roomList');
            if (listContainer) {
                listContainer.innerHTML = `<div class="text-red-500 text-center mt-10">Failed to connect to lobby: ${e.message}</div>`;
            }
        }
    }

    renderRoomList() {
        const listContainer = this.element.getChildByID('roomList');
        if (!listContainer) return;

        if (this.availableRooms.length === 0) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-500">
                    <div class="text-4xl mb-2">📭</div>
                    <div>No active rooms</div>
                    <div class="text-sm text-gray-600">Be the first to create one!</div>
                </div>`;
            return;
        }

        listContainer.innerHTML = this.availableRooms.map(room => `
            <div class="group bg-gray-700/40 hover:bg-gray-700/80 border border-gray-700/50 hover:border-gray-600 p-4 rounded-xl flex justify-between items-center transition-all duration-200">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl shadow-inner">
                        ${room.metadata?.isLocked ? '🔒' : '🌍'}
                    </div>
                    <div>
                        <div class="font-bold text-white group-hover:text-green-400 transition-colors">
                            ${room.metadata?.roomName || room.roomId}
                        </div>
                        <div class="text-xs text-gray-400 flex items-center gap-2">
                            <span>ID: ${room.roomId.slice(0, 6)}...</span>
                            <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span class="${room.clients >= room.maxClients ? 'text-red-400' : 'text-green-400'}">
                                ${room.clients} / ${room.maxClients} Players
                            </span>
                        </div>
                    </div>
                </div>
                <button class="join-btn px-4 py-2 bg-blue-600/90 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0" 
                    data-id="${room.roomId}" data-locked="${room.metadata?.isLocked}">
                    Join
                </button>
            </div>
        `).join('');

        // Re-attach listeners for dynamic buttons
        const joinBtns = listContainer.querySelectorAll('.join-btn');
        joinBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = e.target.dataset.id;
                const isLocked = e.target.dataset.locked === 'true';
                this.handleJoinRequest(roomId, isLocked);
            });
        });
    }

    handleUIClick(event) {
        const target = event.target;

        const logoutBtn = target.closest('#logoutBtn');
        const createRoomBtn = target.closest('#createRoomBtn');
        const cancelCreateBtn = target.closest('#cancelCreateBtn');
        const confirmCreateBtn = target.closest('#confirmCreateBtn');
        const cancelPasswordBtn = target.closest('#cancelPasswordBtn');
        const confirmPasswordBtn = target.closest('#confirmPasswordBtn');

        if (logoutBtn) {
            signOut(auth).then(() => this.scene.start('LoginScene'));
        } else if (createRoomBtn) {
            const modal = this.element.getChildByID('createRoomModal');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        } else if (cancelCreateBtn) {
            const modal = this.element.getChildByID('createRoomModal');
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                this.element.getChildByID('newRoomName').value = '';
                this.element.getChildByID('newRoomPassword').value = '';
            }, 200);
        } else if (confirmCreateBtn) {
            const name = this.element.getChildByID('newRoomName').value;
            const password = this.element.getChildByID('newRoomPassword').value;
            this.createRoom(name, password);
            const modal = this.element.getChildByID('createRoomModal');
            modal.classList.add('hidden');
        } else if (cancelPasswordBtn) {
            const modal = this.element.getChildByID('passwordModal');
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                this.element.getChildByID('joinRoomPassword').value = '';
                this.pendingJoinRoomId = null;
            }, 200);
        } else if (confirmPasswordBtn) {
            const password = this.element.getChildByID('joinRoomPassword').value;
            this.joinRoom(this.pendingJoinRoomId, password);
            const modal = this.element.getChildByID('passwordModal');
            modal.classList.add('hidden');
            this.element.getChildByID('joinRoomPassword').value = '';
            this.pendingJoinRoomId = null;
        }
    }

    handleJoinRequest(roomId, isLocked) {
        if (isLocked) {
            this.pendingJoinRoomId = roomId;
            const modal = this.element.getChildByID('passwordModal');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
            }, 10);
        } else {
            this.joinRoom(roomId);
        }
    }

    async createRoom(name, password) {
        const client = new Colyseus.Client('ws://localhost:2567');
        try {
            const room = await client.joinOrCreate("caro", {
                roomName: name || `${this.user.name || this.user.email}'s Room`,
                password: password,
                name: this.user.name || this.user.email,
                avatar: this.user.avatar || ""
            });
            this.scene.start('CaroScene', { user: this.user, room: room });
        } catch (e) {
            console.error("Create error", e);
            alert("Failed to create room: " + e.message);
        }
    }

    async joinRoom(roomId, password) {
        const client = new Colyseus.Client('ws://localhost:2567');
        try {
            const room = await client.joinById(roomId, {
                password: password,
                name: this.user.name || this.user.email,
                avatar: this.user.avatar || ""
            });
            this.scene.start('CaroScene', { user: this.user, room: room });
        } catch (e) {
            console.error("Join error", e);
            alert("Failed to join room: " + e.message);
        }
    }
}
