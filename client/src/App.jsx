import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

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
