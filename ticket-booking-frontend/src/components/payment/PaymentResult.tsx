import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, Button, Container, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';

const PaymentResult: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { bookingId } = useParams<{ bookingId: string }>();
    
    useEffect(() => {
        // Parse URL parameters
        const searchParams = new URLSearchParams(location.search);
        const isSuccess = searchParams.get('success') === 'true';
        const errorMsg = searchParams.get('error');
        
        // Set the state based on URL parameters
        setSuccess(isSuccess);
        if (errorMsg) {
            setError(decodeURIComponent(errorMsg));
        }
        
        // Simulate loading time to prevent flickering
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [location]);
    
    const handleViewBooking = () => {
        if (bookingId) {
            navigate(`/booking-confirmation/${bookingId}`);
        } else {
            navigate('/my-bookings');
        }
    };
    
    const handleRetryPayment = () => {
        if (bookingId) {
            navigate(`/booking-confirmation/${bookingId}`);
        } else {
            navigate('/my-bookings');
        }
    };
    
    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }
    
    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    borderRadius: 2,
                    bgcolor: success ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)'
                }}
            >
                {success ? (
                    <CheckCircleOutlineIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                ) : (
                    <CancelIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                )}
                
                <Typography variant="h4" component="h1" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                    {success ? 'Payment Successful!' : 'Payment Failed'}
                </Typography>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                    {success 
                        ? 'Your payment has been processed successfully. Your booking is now confirmed.'
                        : 'We were unable to process your payment. You can try again or contact our support team for assistance.'}
                </Typography>
                
                {error && (
                    <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                        {error}
                    </Alert>
                )}
                
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <Button 
                        variant="contained" 
                        color={success ? 'primary' : 'inherit'}
                        onClick={handleViewBooking}
                        sx={{ minWidth: '150px' }}
                    >
                        {success ? 'View Booking' : 'My Bookings'}
                    </Button>
                    
                    {!success && (
                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={handleRetryPayment}
                            sx={{ minWidth: '150px' }}
                        >
                            Try Again
                        </Button>
                    )}
                </Box>
            </Paper>
        </Container>
    );
};

export default PaymentResult; 