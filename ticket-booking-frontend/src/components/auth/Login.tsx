import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    CircularProgress,
    Alert
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ErrorAlert from '../common/ErrorAlert';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loading: authLoading } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [sessionExpired, setSessionExpired] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check for session expiration message in query params
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const expired = queryParams.get('expired');
        if (expired === 'true') {
            setSessionExpired(true);
        }

        // Check for password reset success message in location state
        const state = location.state as { 
            passwordResetSuccess?: boolean; 
            registrationSuccess?: boolean;
            message?: string 
        } | undefined;
        
        if (state?.passwordResetSuccess) {
            setSuccessMessage(state.message || 'Password reset successful!');
            // Clean up the location state to prevent showing the message again on refresh
            window.history.replaceState({}, document.title);
        }
        
        // Check for registration success message
        if (state?.registrationSuccess) {
            setSuccessMessage(state.message || 'Registration successful! Please log in.');
            // Clean up the location state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSessionExpired(false);

        // Enhanced validation
        if (!email) {
            setError('Email is required');
            return;
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!password) {
            setError('Password is required');
            return;
        }
        
        // Minimum password length check
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            console.log('📤 Attempting login with:', { email });
            
            // Use the login function from AuthContext
            const success = await login(email, password);
            
            if (success) {
                console.log('✅ Login successful.');
                
                // Redirect to either the requested page or flights listing
                const { from } = location.state as { from?: string } || {};
                navigate(from || '/flights');
            } else {
                throw new Error('Login failed');
            }
        } catch (error: any) {  // Use `any` to fix TypeScript error
            console.error('❌ Login failed:', error.message);
            
            // Provide more user-friendly error messages
            if (error.status === 401) {
                setError('Invalid email or password. Please try again.');
            } else if (error.status === 403) {
                setError('Your account is locked. Please contact support.');
            } else if (!navigator.onLine) {
                setError('No internet connection. Please check your network and try again.');
            } else {
                setError(error.message || 'Login failed. Please try again.'); 
            }
        } finally {
            setLoading(false);
        }
    };

    // Combine local and auth loading states
    const isLoading = loading || authLoading;

    return (
        <Container component="main" maxWidth="xs">
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    mt: 8, 
                    borderRadius: '8px',
                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
                }}
            >
                <Box sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'linear-gradient(45deg, #E33069 30%, #9C27B0 90%)',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <Typography component="h1" variant="h5">
                        Login to Your Account
                    </Typography>
                </Box>

                {sessionExpired && (
                    <Alert 
                        severity="warning" 
                        sx={{ 
                            mb: 3,
                            borderRadius: '8px'
                        }}
                    >
                        Your session has expired. Please log in again.
                    </Alert>
                )}

                <ErrorAlert 
                    error={error}
                    onClose={() => setError('')}
                />

                {successMessage && (
                    <Alert 
                        severity="success" 
                        sx={{ 
                            mb: 3,
                            borderRadius: '8px'
                        }}
                        onClose={() => setSuccessMessage(null)}
                    >
                        {successMessage}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!error && !email}
                        disabled={isLoading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                bgcolor: '#F5F8FA'
                            }
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!error && !password}
                        disabled={isLoading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                bgcolor: '#F5F8FA'
                            }
                        }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ 
                            mt: 3, 
                            mb: 2,
                            bgcolor: '#FF7F23',
                            '&:hover': {
                                bgcolor: '#E67D2E'
                            },
                            borderRadius: '8px'
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                    </Button>
                    <Button
                        onClick={() => navigate('/register')}
                        fullWidth
                        variant="outlined"
                        sx={{ 
                            mt: 1,
                            borderRadius: '8px',
                            borderColor: '#9C27B0',
                            color: '#9C27B0',
                            '&:hover': {
                                borderColor: '#7B1FA2',
                                backgroundColor: 'rgba(156, 39, 176, 0.04)'
                            }
                        }}
                        disabled={isLoading}
                    >
                        Don't have an account? Register
                    </Button>
                    
                    <Button
                        onClick={() => navigate('/forgot-password')}
                        fullWidth
                        variant="text"
                        size="small"
                        sx={{ 
                            mt: 2,
                            color: '#9C27B0'
                        }}
                        disabled={isLoading}
                    >
                        Forgot Password?
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default Login;
