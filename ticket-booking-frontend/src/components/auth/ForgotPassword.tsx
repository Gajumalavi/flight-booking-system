import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    CircularProgress,
    Alert,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset, verifyOtpAndResetPassword } from '../../services/api';

// Steps in the password reset process
const steps = ['Request OTP', 'Verify OTP', 'Reset Password'];

const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle requesting OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            const response = await requestPasswordReset(email);
            if (response.success) {
                setSuccess(response.message);
                setActiveStep(1);
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to request OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP verification and password reset
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!otp) {
            setError('Please enter the OTP sent to your email');
            return;
        }

        if (activeStep === 2) {
            if (!newPassword) {
                setError('Please enter a new password');
                return;
            }

            if (newPassword.length < 8) {
                setError('Password must be at least 8 characters long');
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }

        setLoading(true);
        try {
            if (activeStep === 1) {
                // Move to password reset step after verifying OTP
                setActiveStep(2);
                setLoading(false);
                return;
            }

            // Reset password with OTP
            const response = await verifyOtpAndResetPassword(email, otp, newPassword);
            if (response.success) {
                setSuccess('Your password has been reset successfully!');
                // Navigate immediately to login page with success message
                navigate('/login', { 
                    state: { 
                        passwordResetSuccess: true,
                        message: 'Your password has been reset successfully! You can now login with your new password.'
                    } 
                });
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Reset to first step
    const handleReset = () => {
        setActiveStep(0);
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
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
                        Reset Your Password
                    </Typography>
                </Box>

                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 3,
                            borderRadius: '8px'
                        }}
                        onClose={() => setError('')}
                    >
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert 
                        severity="success" 
                        sx={{ 
                            mb: 3,
                            borderRadius: '8px'
                        }}
                    >
                        {success}
                    </Alert>
                )}

                {activeStep === 0 && (
                    <Box component="form" onSubmit={handleRequestOtp}>
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
                            disabled={loading}
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
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Send OTP'}
                        </Button>
                        <Button
                            onClick={() => navigate('/login')}
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
                        >
                            Back to Login
                        </Button>
                    </Box>
                )}

                {activeStep === 1 && (
                    <Box component="form" onSubmit={handleVerifyOtp}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="otp"
                            label="Enter OTP"
                            name="otp"
                            autoFocus
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            disabled={loading}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    bgcolor: '#F5F8FA'
                                }
                            }}
                            inputProps={{ maxLength: 6 }}
                            placeholder="Enter 6-digit OTP"
                        />
                        <Typography variant="body2" sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
                            Enter the 6-digit OTP sent to your email: {email}
                        </Typography>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ 
                                mt: 1, 
                                mb: 2,
                                bgcolor: '#FF7F23',
                                '&:hover': {
                                    bgcolor: '#E67D2E'
                                },
                                borderRadius: '8px'
                            }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
                        </Button>
                        <Button
                            onClick={handleReset}
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
                            Back
                        </Button>
                    </Box>
                )}

                {activeStep === 2 && (
                    <Box component="form" onSubmit={handleVerifyOtp}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="newPassword"
                            label="New Password"
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
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
                            name="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
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
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                        </Button>
                        <Button
                            onClick={() => setActiveStep(1)}
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
                            Back
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default ForgotPassword; 