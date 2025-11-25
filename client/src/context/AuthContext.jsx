import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { AUTH_CONFIG } from '../config/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

const GUEST_STORAGE_KEY = 'ddn_guest_user';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isGuestSession = false;

        // Check for existing guest session first (if guest login is enabled)
        if (AUTH_CONFIG.enableGuestLogin) {
            const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
            if (storedGuest) {
                try {
                    const guestUser = JSON.parse(storedGuest);
                    setUser(guestUser);
                    isGuestSession = true;
                } catch (error) {
                    console.error('Failed to parse guest user:', error);
                    localStorage.removeItem(GUEST_STORAGE_KEY);
                }
            }
        }

        // Listen for Firebase auth changes (only if Google login is enabled)
        if (AUTH_CONFIG.enableGoogleLogin && auth) {
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    // Clear any guest session when Firebase user signs in
                    localStorage.removeItem(GUEST_STORAGE_KEY);
                    isGuestSession = false;

                    try {
                        const token = await firebaseUser.getIdToken();
                        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            setUser({
                                ...data.user,
                                name: firebaseUser.displayName || data.user.name || data.user.email,
                                avatar: firebaseUser.photoURL || "",
                                email: firebaseUser.email,
                                isGuest: false
                            });
                        } else {
                            // Parse error response
                            const errorData = await response.json().catch(() => ({}));
                            console.error('Server authentication failed:', errorData.error || response.statusText);
                            setUser(null);
                        }
                    } catch (error) {
                        console.error('Auth error:', error);
                        setUser(null);
                    }
                    setLoading(false);
                } else {
                    // Only clear user if not a guest session
                    if (!isGuestSession) {
                        setUser(null);
                    }
                    setLoading(false);
                }
            });

            return () => unsubscribe();
        } else {
            // No Firebase listener, just finish loading
            setLoading(false);
            return () => { };
        }
    }, []);

    const guestLogin = async (username) => {
        // Check if guest login is enabled
        if (!AUTH_CONFIG.enableGuestLogin) {
            return {
                success: false,
                error: 'Guest login is disabled'
            };
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/guest-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Guest login failed');
            }

            const data = await response.json();
            const guestUser = data.user;

            // Store in localStorage
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
            setUser(guestUser);

            return { success: true };
        } catch (error) {
            console.error('Guest login error:', error);
            return { success: false, error: error.message };
        }
    };

    const signOut = async () => {
        try {
            // Clear guest session
            localStorage.removeItem(GUEST_STORAGE_KEY);

            // Sign out from Firebase if applicable
            if (AUTH_CONFIG.enableGoogleLogin && auth && auth.currentUser) {
                await firebaseSignOut(auth);
            }

            setUser(null);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const value = {
        user,
        loading,
        signOut,
        guestLogin
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
