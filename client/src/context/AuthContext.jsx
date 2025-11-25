import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

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

        // Check for existing guest session first
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

        // Listen for Firebase auth changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Clear any guest session when Firebase user signs in
                localStorage.removeItem(GUEST_STORAGE_KEY);
                isGuestSession = false;

                try {
                    const token = await firebaseUser.getIdToken();
                    const response = await fetch('http://localhost:2567/api/login', {
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
    }, []);

    const guestLogin = async (username) => {
        try {
            const response = await fetch('http://localhost:2567/api/guest-login', {
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
            if (auth.currentUser) {
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
