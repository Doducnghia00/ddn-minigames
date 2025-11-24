import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to={user ? "/lobby" : "/"} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 transition-all">
                            <span className="text-2xl">🎮</span>
                        </div>
                        <span className="text-xl font-bold gradient-text hidden sm:block">DDN Games</span>
                    </Link>

                    {/* Desktop Navigation */}
                    {user && (
                        <nav className="hidden md:flex items-center gap-6">
                            <Link 
                                to="/lobby" 
                                className="text-gray-300 hover:text-white font-medium transition-colors"
                            >
                                Lobby
                            </Link>
                            <a 
                                href="#" 
                                className="text-gray-300 hover:text-white font-medium transition-colors"
                            >
                                Leaderboard
                            </a>
                            <a 
                                href="#" 
                                className="text-gray-300 hover:text-white font-medium transition-colors"
                            >
                                About
                            </a>
                        </nav>
                    )}

                    {/* User Profile / Auth */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <img 
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff`}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full border-2 border-green-500"
                                        referrerPolicy="no-referrer"
                                    />
                                    <span className="hidden sm:block text-sm font-medium text-white">{user.name}</span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Profile Dropdown */}
                                {profileMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 animate-scale-in">
                                        <div className="px-4 py-2 border-b border-slate-700">
                                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setProfileMenuOpen(false);
                                                // Navigate to profile
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 transition-colors"
                                        >
                                            Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                setProfileMenuOpen(false);
                                                // Navigate to settings
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 transition-colors"
                                        >
                                            Settings
                                        </button>
                                        <div className="border-t border-slate-700 mt-2 pt-2">
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/"
                                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5"
                            >
                                Sign In
                            </Link>
                        )}

                        {/* Mobile Menu Button */}
                        {user && (
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Menu */}
                {user && mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-slate-700 animate-slide-down">
                        <nav className="flex flex-col gap-2">
                            <Link 
                                to="/lobby" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Lobby
                            </Link>
                            <a 
                                href="#" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Leaderboard
                            </a>
                            <a 
                                href="#" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                About
                            </a>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
