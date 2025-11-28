import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { initGameRegistry } from './config/gameRegistry';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return user ? children : <Navigate to="/" replace />;
};

// Public Route Component (redirect to lobby if already logged in)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return user ? <Navigate to="/lobby" replace /> : children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={
                <PublicRoute>
                    <Layout>
                        <LoginPage />
                    </Layout>
                </PublicRoute>
            } />
            <Route path="/lobby" element={
                <ProtectedRoute>
                    <Layout>
                        <LobbyPage />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/game" element={
                <ProtectedRoute>
                    <Layout>
                        <GamePage />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    const [registryReady, setRegistryReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadGameRegistry() {
            try {
                await initGameRegistry();
                setRegistryReady(true);
            } catch (err) {
                console.error('[App] Failed to load game registry:', err);
                setError('Failed to load games from server. Please refresh.');
            }
        }
        
        loadGameRegistry();
    }, []);

    // Loading screen while fetching game registry
    if (!registryReady && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-500 mx-auto mb-6"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Loading Game Registry</h2>
                    <p className="text-gray-400">Fetching available games from server...</p>
                </div>
            </div>
        );
    }

    // Error screen
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <AuthProvider>
                <GameProvider>
                    <AppRoutes />
                </GameProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
