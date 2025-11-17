import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CardContent,
    CircularProgress,
    Container,
    Divider,
    Typography,
    Paper
} from '@mui/material';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRazorpay } from '../../contexts/RazorpayContext';

interface RazorpayCheckoutProps {
    bookingId: string;
    amount: number;
    currency?: string;
    description?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
    bookingId,
    amount,
    currency = 'INR',
    description = 'Flight Booking',
    onSuccess,
    onCancel
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated } = useAuth();
    const { razorpayLoaded, razorpayKey, isLoading: razorpayLoading, error: razorpayError } = useRazorpay();
    const navigate = useNavigate();

    const handleCheckout = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!razorpayLoaded || !razorpayKey) {
            setError('Payment system is not ready. Please try again later.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('You must be logged in to make a payment');
            }

            // Create order through our API
            const orderData = await createRazorpayOrder(bookingId, token);
            
            // Configure Razorpay options
            const options = {
                key: razorpayKey,
                amount: orderData.amount,
                currency: orderData.currency || currency,
                name: "WingWayz",
                description: description,
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    try {
                        // Verify payment with backend
                        const result = await verifyRazorpayPayment(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature,
                            bookingId,
                            token
                        );
                        
                        if (result.success) {
                            if (onSuccess) {
                                onSuccess();
                            } else {
                                // Navigate to success page
                                navigate(`/booking-confirmation/${bookingId}`);
                            }
                        } else {
                            setError('Payment verification failed. Please contact customer support.');
                        }
                    } catch (err) {
                        console.error('Payment verification error:', err);
                        setError(err instanceof Error ? err.message : 'Failed to verify payment');
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: orderData.prefill || {},
                notes: orderData.notes || {},
                theme: {
                    color: '#9C27B0'
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                        if (onCancel) {
                            onCancel();
                        }
                    }
                }
            };
            
            // Open Razorpay checkout
            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Failed to process payment');
            setLoading(false);
        }
    };

    if (razorpayLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (razorpayError) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                Payment system error: {razorpayError}
            </Alert>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Complete Your Booking
                    </Typography>
                </Box>
                
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Booking Summary
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body1">
                            {description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Booking ID: {bookingId}
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1">Amount:</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {currency === 'INR' ? '₹' : '$'}{amount.toFixed(2)}
                        </Typography>
                    </Box>
                    
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button 
                            variant="outlined" 
                            color="inherit"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={loading || !razorpayLoaded}
                            onClick={handleCheckout}
                            sx={{ 
                                minWidth: '150px',
                                bgcolor: 'primary.main',
                                '&:hover': {
                                    bgcolor: 'primary.dark',
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                `Pay ${currency === 'INR' ? '₹' : '$'}${amount.toFixed(2)}`
                            )}
                        </Button>
                    </Box>
                </CardContent>
            </Paper>
        </Container>
    );
};

export default RazorpayCheckout; 