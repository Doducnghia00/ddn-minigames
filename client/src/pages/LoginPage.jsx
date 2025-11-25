import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { AUTH_CONFIG } from '../config/auth';
import { SITE_CONFIG } from '../config/siteConfig';

const LoginPage = () => {
    const navigate = useNavigate();
    const { guestLogin } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [guestUsername, setGuestUsername] = useState('');
    const [guestLoading, setGuestLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);

        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken();

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // AuthContext will handle the redirect
                navigate('/lobby');
            } else {
                // Parse error response from server
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Server authentication failed (${response.status})`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Google login failed', error);
            // Show user-friendly error message
            if (error.code === 'auth/popup-closed-by-user') {
                setError('Sign-in cancelled');
            } else if (error.code === 'auth/network-request-failed') {
                setError('Network error. Please check your connection');
            } else {
                setError(error.message || 'Failed to sign in with Google');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async (e) => {
        e.preventDefault();
        setError('');
        setGuestLoading(true);

        const result = await guestLogin(guestUsername);

        if (result.success) {
            navigate('/lobby');
        } else {
            setError(result.error || 'Guest login failed');
        }

        setGuestLoading(false);
    };

    return (
        <div className="flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo and Title */}
                <div className="text-center mb-8 animate-slide-down">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl shadow-2xl shadow-green-500/30 mb-6">
                        <span className="text-5xl">{SITE_CONFIG.brand.logo}</span>
                    </div>
                    <h1 className="text-5xl font-black mb-3">
                        <span className="gradient-text">{SITE_CONFIG.brand.name}</span>
                    </h1>
                    <p className="text-gray-400 text-lg">{SITE_CONFIG.brand.tagline}</p>
                </div>

                {/* Login Card */}
                <div className="glass-effect rounded-2xl p-8 shadow-2xl animate-scale-in">
                    <div className="flex flex-col gap-6">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 animate-slide-up">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Guest Login Form - Only show if enabled */}
                        {AUTH_CONFIG.enableGuestLogin && (
                            <form onSubmit={handleGuestLogin} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter your username (2-20 characters)"
                                        value={guestUsername}
                                        onChange={(e) => setGuestUsername(e.target.value)}
                                        disabled={guestLoading}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        minLength={2}
                                        maxLength={20}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Letters, numbers, spaces, hyphens and underscores only
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={guestLoading || !guestUsername.trim()}
                                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {guestLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Entering...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl">👤</span>
                                            <span>Play as Guest</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Divider - Only show if both methods are enabled */}
                        {AUTH_CONFIG.enableGuestLogin && AUTH_CONFIG.enableGoogleLogin && (
                            <div className="relative my-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-slate-800/50 text-gray-400 font-medium">
                                        Or continue with
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Google Sign In Button - Only show if enabled */}
                        {AUTH_CONFIG.enableGoogleLogin && (
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span>Sign in with Google</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    By signing in, you agree to our{' '}
                    <a href="#" className="text-green-400 hover:text-green-300 transition-colors">
                        Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="#" className="text-green-400 hover:text-green-300 transition-colors">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div >
    );
};

export default LoginPage;
