import React, { createContext, useContext, useEffect, useState } from 'react';
import { getRazorpayConfig } from '../services/api';
import { useAuth } from './AuthContext';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface RazorpayContextType {
    razorpayLoaded: boolean;
    razorpayKey: string | null;
    isLoading: boolean;
    error: string | null;
}

const RazorpayContext = createContext<RazorpayContextType>({
    razorpayLoaded: false,
    razorpayKey: null,
    isLoading: true,
    error: null
});

export const useRazorpay = () => useContext(RazorpayContext);

export const RazorpayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [razorpayLoaded, setRazorpayLoaded] = useState<boolean>(false);
    const [razorpayKey, setRazorpayKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated } = useAuth();

    // Load Razorpay script
    useEffect(() => {
        const loadRazorpayScript = () => {
            return new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.async = true;
                script.onload = () => {
                    setRazorpayLoaded(true);
                    resolve();
                };
                script.onerror = () => {
                    setError('Failed to load Razorpay checkout script');
                    reject(new Error('Failed to load Razorpay checkout script'));
                };
                document.body.appendChild(script);
            });
        };

        loadRazorpayScript()
            .catch(err => console.error('Error loading Razorpay script:', err));
    }, []);

    // Get Razorpay API key
    useEffect(() => {
        const loadRazorpayKey = async () => {
            if (!isAuthenticated) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found');
                }

                const config = await getRazorpayConfig(token);
                setRazorpayKey(config.keyId);
            } catch (err) {
                console.error('Failed to load Razorpay key:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize payment system');
            } finally {
                setIsLoading(false);
            }
        };

        loadRazorpayKey();
    }, [isAuthenticated]);

    return (
        <RazorpayContext.Provider
            value={{
                razorpayLoaded,
                razorpayKey,
                isLoading,
                error
            }}
        >
            {children}
        </RazorpayContext.Provider>
    );
};

export default RazorpayProvider; 