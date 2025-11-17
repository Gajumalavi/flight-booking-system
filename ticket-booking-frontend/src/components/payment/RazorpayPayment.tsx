import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography, Alert, Card, CardContent, Divider, Grid } from '@mui/material';
import { createRazorpayOrder, verifyRazorpayPayment, getBookingById, handlePaymentFailure } from '../../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import FlightIcon from '@mui/icons-material/Flight';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface RazorpayPaymentProps {
  bookingId: number;
  amount: number;
  onSuccess: () => void;
  onFailure: (error: string) => void;
}

interface BookingDetails {
  id: number;
  flightId: string;
  airline?: string;
  flightNumber?: string;
  origin?: string;
  originCity?: string;
  destination?: string;
  destinationCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  price?: number;
  seatIds?: number[];
  seatNumbers?: string[];
  status?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({ bookingId, amount, onSuccess, onFailure }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const navigate = useNavigate();

  // Format date to display in a user-friendly format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time to display in a user-friendly format
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Fetch booking details on component load
  useEffect(() => {
    const fetchBookingDetails = async () => {
      setLoadingBooking(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          return;
        }

        const bookingData = await getBookingById(bookingId.toString(), token);
        if (bookingData) {
          console.log('Booking details fetched for payment:', bookingData);
          setBookingDetails(bookingData);
        } else {
          setError('Booking not found');
        }
      } catch (err) {
        console.error('Failed to load booking details:', err);
        setError('Could not load booking details. Please try again.');
      } finally {
        setLoadingBooking(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  const initPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      // Validate before proceeding with payment
      if (!bookingId) {
        throw new Error('Invalid booking information');
        return;
      }
      
      // Ensure amount is valid
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
        return;
      }
      
      // Check if booking details are loaded
      if (!bookingDetails) {
        throw new Error('Booking details not available');
        return;
      }

      // Create a Razorpay order
      const orderResponse = await createRazorpayOrder(bookingId.toString(), token);
      console.log('Order created:', orderResponse);

      // Load the Razorpay script if not already loaded
      if (!window.Razorpay) {
        await loadRazorpayScript();
      }

      // Configure Razorpay
      const options = {
        key: orderResponse.keyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Flight Booking',
        description: `Booking ID: ${bookingId}`,
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
          try {
            console.log('Payment successful, verifying...', response);
            const verificationResponse = await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              bookingId.toString(),
              token
            );

            if (verificationResponse.success) {
              console.log('Payment verification successful');
              
              // Immediately complete the payment process without artificial delay
              onSuccess();
            } else {
              console.error('Payment verification failed');
              onFailure('Payment verification failed');
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            onFailure('Error verifying payment');
          }
        },
        prefill: {
          name: localStorage.getItem('userFirstName') || 'User',
          email: localStorage.getItem('userEmail') || '',
          contact: localStorage.getItem('userPhone') || '',
        },
        theme: {
          color: '#FF7F23',
        },
        modal: {
          ondismiss: function () {
            console.log('Payment dismissed');
            setLoading(false);
          }
        }
      };

      // Initialize Razorpay
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setError(error.message || 'Failed to initialize payment');
      setLoading(false);
      
      // Notify parent component about the payment failure if it's a critical error
      if (error.message === 'User not authenticated' || error.message.includes('Order creation failed')) {
        onFailure(error.message || 'Payment initialization failed');
      }
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      document.body.appendChild(script);
    });
  };

  // Handle payment cancellation
  const handleCancel = async () => {
    console.log('Payment cancelled by user');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call API to handle payment failure
      const result = await handlePaymentFailure(bookingId.toString(), token);
      console.log('Payment cancellation result:', result);
      
      if (result.success) {
        // Clear any seat information from sessionStorage to prevent conflicts
        try {
          // Clear potential seat selections from session storage to prevent conflicts
          const storageKeys = [
            'selectedSeats',
            'selectedSeatNumbers',
            'flightId_selectedSeats',
            'flightId_selectedSeatNumbers',
          ];
          
          storageKeys.forEach(key => {
            if (sessionStorage.getItem(key)) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Error clearing sessionStorage:', e);
        }
        
        // Notify parent component about cancellation
        onFailure('Payment cancelled by user');
        
        // Get flight ID if available
        const flightId = bookingDetails?.flightId;
        
        // Force a full page reload rather than using React Router navigation
        // This ensures all state is properly reset
        if (flightId) {
          window.location.href = `/flights/${flightId}/seats`;
        } else {
          window.location.href = '/flights';
        }
      } else {
        setError('Failed to cancel booking: ' + result.message);
        onFailure(result.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      console.error('Error cancelling payment:', error);
      setError(error.message || 'Failed to cancel payment');
      onFailure(error.message || 'Error processing cancellation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ textAlign: 'left', p: 0, mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {loadingBooking ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress sx={{ color: '#9C27B0' }} />
        </Box>
      ) : (
        <>
          {/* Flight Information Card */}
          {bookingDetails && (
            <Card sx={{ 
              mb: 3, 
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)', 
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                bgcolor: '#f5f1f9', 
                p: 2, 
                borderBottom: '1px solid rgba(156, 39, 176, 0.12)'
              }}>
                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                  <AirplanemodeActiveIcon sx={{ mr: 1, color: '#9C27B0' }} />
                  Flight Details
                </Typography>
              </Box>
              
              <CardContent sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={5}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        {bookingDetails.origin || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {bookingDetails.originCity || ''}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>
                        {formatTime(bookingDetails.departureTime)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatDate(bookingDetails.departureTime)}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={2} sx={{ position: 'relative' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}>
                      <Box sx={{ 
                        width: '100%', 
                        borderTop: '2px dashed #bdbdbd',
                        position: 'relative',
                        my: 2
                      }} />
                      <FlightIcon sx={{ 
                        transform: 'rotate(90deg)', 
                        color: '#9C27B0',
                        position: 'absolute'
                      }} />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={5}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        {bookingDetails.destination || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {bookingDetails.destinationCity || ''}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>
                        {formatTime(bookingDetails.arrivalTime)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatDate(bookingDetails.arrivalTime)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AirplanemodeActiveIcon sx={{ 
                        mr: 1, 
                        color: '#9C27B0',
                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                        padding: '4px',
                        borderRadius: '50%',
                        fontSize: '1.2rem'
                      }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Flight
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {bookingDetails.airline} {bookingDetails.flightNumber}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AirlineSeatReclineNormalIcon sx={{ 
                        mr: 1, 
                        color: '#9C27B0',
                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                        padding: '4px',
                        borderRadius: '50%',
                        fontSize: '1.2rem'
                      }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Seats
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {bookingDetails.seatIds?.length || 0} {bookingDetails.seatIds?.length === 1 ? 'seat' : 'seats'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card sx={{ 
            mb: 3, 
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)', 
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              bgcolor: '#f5f1f9', 
              p: 2, 
              borderBottom: '1px solid rgba(156, 39, 176, 0.12)'
            }}>
              <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalOfferIcon sx={{ mr: 1, color: '#9C27B0' }} />
                Payment Summary
              </Typography>
            </Box>
            
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Booking ID</Typography>
                <Typography variant="body2" fontWeight="medium">{bookingId}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Number of Seats</Typography>
                <Typography variant="body2" fontWeight="medium">{bookingDetails?.seatIds?.length || 0}</Typography>
              </Box>
              
              <Divider sx={{ my: 1.5 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Total Amount</Typography>
                <Typography variant="subtitle1" fontWeight="bold" color="primary.main">₹{amount}</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Payment Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                borderRadius: '8px',
                borderColor: '#9C27B0',
                color: '#9C27B0',
                px: 3,
                py: 1,
                '&:hover': {
                  borderColor: '#7B1FA2',
                  backgroundColor: 'rgba(156, 39, 176, 0.04)'
                }
              }}
            >
              Cancel
            </Button>
            
            <Button
              variant="contained"
              onClick={initPayment}
              disabled={loading}
              sx={{
                borderRadius: '8px',
                bgcolor: '#FF7F23',
                px: 4,
                py: 1,
                '&:hover': {
                  bgcolor: '#E67D2E'
                }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Proceed to Pay ₹' + amount}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default RazorpayPayment; 