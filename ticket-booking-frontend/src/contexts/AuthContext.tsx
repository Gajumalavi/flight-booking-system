import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import jwt_decode from 'jwt-decode';
import { loginUser, AuthResponse } from '../services/api';
import { 
    initializeSession, 
    clearSession, 
    isSessionExpired 
} from '../utils/sessionHandler';

interface User {
    id?: number;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
}

interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: false,
    login: async () => false,
    logout: () => {},
    checkAuth: () => false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    // Define checkAuth with useCallback to safely use in useEffect dependency array
    const checkAuth = useCallback((): boolean => {
        const token = localStorage.getItem('token');
        
        // No token means not authenticated
        if (!token) {
            console.log('AuthContext: No token found');
            setIsAuthenticated(false);
            setUser(null);
            return false;
        }
        
        // Check session expiration
        if (isSessionExpired()) {
            console.log('AuthContext: Session expired');
            clearSession();
            setIsAuthenticated(false);
            setUser(null);
            return false;
        }
        
        // Check token expiration
        try {
            const decoded = jwt_decode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;
            
            if (decoded.exp < currentTime) {
                // Token expired
                console.log('AuthContext: Token expired');
                clearSession();
                setIsAuthenticated(false);
                setUser(null);
                return false;
            }
            
            // If we have no user data yet, try to set it from localStorage first, then fall back to token
            if (!user || !isAuthenticated) {
                console.log('AuthContext: Setting user data');
                
                // Try to get user data from localStorage (set during login)
                const userId = localStorage.getItem('userId');
                const userEmail = localStorage.getItem('userEmail');
                const userRole = localStorage.getItem('userRole');
                const firstName = localStorage.getItem('userFirstName');
                const lastName = localStorage.getItem('userLastName');
                
                if (userId && userEmail && userRole) {
                    console.log('AuthContext: Setting user from localStorage, role:', userRole);
                    setUser({
                        id: parseInt(userId),
                        email: userEmail,
                        role: userRole,
                        firstName: firstName || undefined,
                        lastName: lastName || undefined
                    });
                } else {
                    // Fallback to token data
                    console.log('AuthContext: Setting user from token, role:', decoded.role);
                    setUser({
                        email: decoded.email,
                        role: decoded.role
                    });
                }
                
                setIsAuthenticated(true);
            }
            
            return true;
        } catch (error) {
            console.error('Invalid token:', error);
            clearSession();
            setIsAuthenticated(false);
            setUser(null);
            return false;
        }
    }, [user, isAuthenticated]);

    // Fetch user data from token only - no API call to prevent 404 errors
    const fetchUserDataFromToken = (token: string): boolean => {
        try {
            const decoded = jwt_decode<JwtPayload>(token);
            
            // First try getting user info from localStorage (more complete)
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            const userRole = localStorage.getItem('userRole');
            const firstName = localStorage.getItem('userFirstName');
            const lastName = localStorage.getItem('userLastName');
            
            if (userId && userEmail && userRole) {
                console.log('Setting user from localStorage with ID:', userId);
                setUser({
                    id: parseInt(userId),
                    email: userEmail,
                    role: userRole,
                    firstName: firstName || undefined,
                    lastName: lastName || undefined
                });
            } else {
                // Fallback to token data if localStorage doesn't have the info
                console.log('Setting user from token data');
                setUser({
                    email: decoded.email,
                    role: decoded.role
                });
            }
            
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            console.error('Failed to decode JWT:', error);
            setIsAuthenticated(false);
            setUser(null);
            return false;
        }
    };

    useEffect(() => {
        const checkTokenOnMount = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setIsAuthenticated(false);
                    return;
                }
                
                // Just use token data directly instead of API call
                fetchUserDataFromToken(token);
            } catch (error) {
                console.error('Authentication check failed:', error);
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkTokenOnMount();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        setLoading(true);
        try {
            const response = await loginUser(email, password);
            
            // Store token and initialize session monitoring
            localStorage.setItem('token', response.token);
            initializeSession();
            
            // Set user directly from API response data
            setUser({
                id: response.userId,
                email: response.email,
                role: response.role,
                firstName: response.firstName,
                lastName: response.lastName
            });
            
            setIsAuthenticated(true);
            console.log('Login successful. User role:', response.role, 'User ID:', response.userId);
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            setIsAuthenticated(false);
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        clearSession();
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            loading,
            login, 
            logout, 
            checkAuth 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider; 