import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    Grid,
    CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { registerUser, AuthResponse } from '../../services/api';
import { initializeSession } from '../../utils/sessionHandler';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Enhanced validation
        if (!formData.firstName.trim()) {
            setError('First name is required');
            return;
        }
        
        if (!formData.lastName.trim()) {
            setError('Last name is required');
            return;
        }
        
        if (!formData.email) {
            setError('Email is required');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        if (!formData.password) {
            setError('Password is required');
            return;
        }
        
        // Password strength validation
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        
        // Check for password complexity
        const hasUpperCase = /[A-Z]/.test(formData.password);
        const hasLowerCase = /[a-z]/.test(formData.password);
        const hasNumbers = /\d/.test(formData.password);
        
        if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
            setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Phone validation (optional field)
        if (formData.phone.trim() !== '') {
            // Remove all non-digit characters to count actual digits
            const digitsOnly = formData.phone.replace(/\D/g, '');
            if (digitsOnly.length !== 10) {
                setError('Phone number must be exactly 10 digits');
                return;
            }
            
            const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
            if (!phoneRegex.test(formData.phone.trim())) {
                setError('Please enter a valid phone number');
                return;
            }
        }

        setLoading(true);

        try {
            console.log('📤 Sending registration request with:', { email: formData.email });
            
            // Call the registration API and get full response
            const response = await registerUser(
                formData.email, 
                formData.password, 
                formData.firstName,
                formData.lastName,
                formData.phone,
                formData.address
            );
            console.log('✅ Registration successful. User ID:', response.userId);
            
            // Store token and other user info - localStorage.setItem in registerUser already handles this
            // Initialize session 
            initializeSession();
            
            // Show success message
            setError('');
            setSuccess('Registration successful! Redirecting to login page...');
            
            // Redirect after a short delay so the user can see the success message
            setTimeout(() => {
                navigate('/login', { 
                    state: { 
                        registrationSuccess: true,
                        message: 'Account created successfully! Please log in with your credentials.'
                    } 
                });
            }, 2000);
        } catch (error: any) {
            console.error('❌ Registration failed:', error.message);
            setError(error.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                        Create an Account
                    </Typography>
                </Box>
                
                {error && (
                    <Typography 
                        color="error" 
                        align="center" 
                        sx={{ 
                            mt: 2,
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: 'rgba(244, 67, 54, 0.1)'
                        }}
                    >
                        {error}
                    </Typography>
                )}
                
                {success && (
                    <Typography 
                        color="success.main" 
                        align="center" 
                        sx={{ 
                            mt: 2,
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: 'rgba(76, 175, 80, 0.1)'
                        }}
                    >
                        {success}
                    </Typography>
                )}
                
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                autoComplete="given-name"
                                fullWidth
                                name="firstName"
                                label="First Name"
                                value={formData.firstName}
                                onChange={handleChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                autoComplete="family-name"
                                fullWidth
                                name="lastName"
                                label="Last Name"
                                value={formData.lastName}
                                onChange={handleChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="email"
                                label="Email Address"
                                type="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Confirm Password"
                                type="password"
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                                helperText={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                name="phone"
                                label="Phone"
                                type="tel"
                                autoComplete="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                inputProps={{ 
                                    maxLength: 15,
                                    pattern: '[0-9+\\-\\s()]{10,15}'
                                }}
                                helperText="Phone number must be exactly 10 digits"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                name="address"
                                label="Address"
                                value={formData.address}
                                onChange={handleChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '8px',
                                        bgcolor: '#F5F8FA'
                                    }
                                }}
                            />
                        </Grid>
                    </Grid>
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
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Register'}
                    </Button>
                    <Button
                        onClick={() => navigate('/login')}
                        fullWidth
                        variant="outlined"
                        sx={{ 
                            borderRadius: '8px',
                            borderColor: '#9C27B0',
                            color: '#9C27B0',
                            '&:hover': {
                                borderColor: '#7B1FA2',
                                backgroundColor: 'rgba(156, 39, 176, 0.04)'
                            }
                        }}
                    >
                        Already have an account? Login
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default Register;