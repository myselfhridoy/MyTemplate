import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for persisted user
        const storedUser = localStorage.getItem('hmtutoring_user');
        if (storedUser) {
            try {
                let parsedUser = JSON.parse(storedUser);
                // Fix: Ensure Master Admin has an ID if missing (for legacy sessions)
                if (parsedUser.username === 'Master Admin' && !parsedUser._id) {
                    parsedUser._id = 'master-admin';
                    localStorage.setItem('hmtutoring_user', JSON.stringify(parsedUser));
                }
                setUser(parsedUser);
            } catch (error) {
                console.error("Failed to parse stored user", error);
                localStorage.removeItem('hmtutoring_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('hmtutoring_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('hmtutoring_user');
    };

    const isAdmin = () => {
        return user && user.isAdmin === true;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
