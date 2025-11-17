import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Paper, Typography, Box, Button, Divider, Chip,
    Stepper, Step, StepLabel, Grid, Card, CardContent,
    CircularProgress, Alert, List, ListItem, ListItemText,
    Snackbar, Avatar
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import PersonIcon from '@mui/icons-material/Person';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import { Booking, getBookingById, downloadTicket, emailTicket, cancelBooking } from '../../services/api';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FlightIcon from '@mui/icons-material/Flight';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import InfoIcon from '@mui/icons-material/Info';
import { formatPrice } from '../../utils/formatters';
import RazorpayCheckout from '../payment/RazorpayCheckout';
import PaymentIcon from '@mui/icons-material/Payment';
import RazorpayPayment from '../payment/RazorpayPayment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SendIcon from '@mui/icons-material/Send';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CancelIcon from '@mui/icons-material/Cancel';
import RefundIcon from '@mui/icons-material/MoneyOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Dialog from '@mui/material/Dialog';

const BookingConfirmation = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPayment, setShowPayment] = useState<boolean>(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

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

    const calculateDuration = (departureTimeStr?: string, arrivalTimeStr?: string) => {
        if (!departureTimeStr || !arrivalTimeStr) return 'N/A';
        
        const departureTime = new Date(departureTimeStr);
        const arrivalTime = new Date(arrivalTimeStr);
        
        const durationMs = arrivalTime.getTime() - departureTime.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    };

    useEffect(() => {
        const fetchBookingDetails = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('You must be logged in to view booking details');
                    navigate('/login');
                    return;
                }
                
                // Fetch booking from API
                const bookingData = await getBookingById(bookingId || '', token);
                if (bookingData) {
                    console.log('Booking details fetched:', bookingData);
                    setBooking(bookingData);
                } else {
                setError('Booking not found');
            }
        } catch (err) {
                console.error('Failed to load booking details:', err);
                setError('Could not load booking details. Please try again.');
        } finally {
            setLoading(false);
        }
        };
        
        fetchBookingDetails();
    }, [bookingId, navigate]);

    const steps = [
        'Flight Selected',
        'Seats Booked',
        'Booking Confirmed'
    ];

    const handleDownloadTicket = async () => {
        try {
            setDownloadLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to download a ticket');
                return;
            }
            
            await downloadTicket(bookingId || '', token);
            setSuccessMessage('Ticket downloaded successfully');
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to download ticket. Please try again.');
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleEmailTicket = async () => {
        try {
            setEmailLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to email a ticket');
                return;
            }
            const response = await emailTicket(bookingId || '', token);
            setSuccessMessage(response.message || 'Ticket has been sent to your email');
        } catch (err: any) {
            console.error('Email error:', err);
            // Show specific backend error message if available
            if (err && err.message) {
                setError(err.message);
            } else if (err && err.status === 403) {
                setError('You do not have permission to email this ticket.');
            } else if (err && err.status === 404) {
                setError('Booking not found.');
            } else {
                setError('Failed to send email. Please try again.');
            }
        } finally {
            setEmailLoading(false);
        }
    };

    // Function to render flight status chip based on status string
    const getFlightStatusChip = (status?: string) => {
        if (!status) return null;
        
        switch (status.toUpperCase()) {
            case 'SCHEDULED':
                return <Chip label="Scheduled" color="primary" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'IN_FLIGHT':
                return <Chip label="In Flight" color="info" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'ARRIVED':
                return <Chip label="Arrived" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'DELAYED':
                return <Chip label="Delayed" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'CANCELLED':
                return <Chip label="Cancelled" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
            default:
                return <Chip label={status} color="default" size="small" />;
        }
    };

    // Format booking status for display and payment logic
    const isBookingPaid = booking?.status?.toLowerCase() === 'paid';
    const isBookingConfirmed = booking?.status?.toLowerCase() === 'confirmed';
    const isBookingPending = booking?.status?.toLowerCase() === 'pending';
    const isBookingCancelled = booking?.status?.toLowerCase() === 'cancelled';

    // Function to determine booking status chip
    const getBookingStatusChip = (status?: string) => {
        if (!status) return null;
        
        switch (status.toLowerCase()) {
            case 'pending':
                return <Chip label="Pending Payment" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'confirmed':
                return <Chip label="Confirmed" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'paid':
                return <Chip label="Paid" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
            case 'cancelled':
                return <Chip label="Cancelled" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
            default:
                return <Chip label={status} color="default" size="small" />;
        }
    };

    // Add this function to handle "Pay Now" button click
    const handlePayNow = () => {
        setShowPayment(true);
    };

    // Add this function to handle payment cancellation
    const handlePaymentCancel = () => {
        setShowPayment(false);
    };

    // Add this function to handle payment success
    const handlePaymentSuccess = () => {
        // Refresh booking data by re-fetching booking details
        const fetchAndRefresh = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('You must be logged in to view booking details');
                    return;
                }
                
                // Fetch booking from API
                const bookingData = await getBookingById(bookingId || '', token);
                if (bookingData) {
                    console.log('Booking details refreshed after payment:', bookingData);
                    setBooking(bookingData);
                }
            } catch (err) {
                console.error('Failed to refresh booking details:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchAndRefresh();
        setShowPayment(false);
        setSuccessMessage('Payment successful! Your booking is now confirmed.');
    };

    // Add this function to handle payment failure
    const handlePaymentFailure = (errorMessage: string) => {
        setError(`Payment failed: ${errorMessage}`);
        setShowPayment(false);
        
        // Update booking status to CANCELLED on payment failure
        const cancelBookingAfterFailure = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token || !bookingId) {
                    console.error('Unable to cancel booking: Missing token or booking ID');
                    return;
                }
                
                // Make API call to cancel booking
                const response = await fetch(`http://localhost:8080/api/bookings/${bookingId}/payment-failed`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log('Booking cancelled due to payment failure');
                    // Refresh booking details to show cancelled status
                    const bookingData = await getBookingById(bookingId, token);
                    if (bookingData) {
                        setBooking(bookingData);
                    }
                } else {
                    console.error('Failed to cancel booking after payment failure');
                }
            } catch (err) {
                console.error('Error cancelling booking after payment failure:', err);
            }
        };
        
        cancelBookingAfterFailure();
    };

    // Add this function to handle cancel dialog open
    const handleCancelDialogOpen = () => {
        setCancelDialogOpen(true);
    };
    
    // Add this function to handle cancel dialog close
    const handleCancelDialogClose = () => {
        setCancelDialogOpen(false);
    };
    
    // Add this function to handle booking cancellation
    const handleCancelBooking = async () => {
        if (!booking || !booking.id) {
            setError('Cannot cancel booking: booking information not available');
            setCancelDialogOpen(false);
            return;
        }
        
        setCancelLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to cancel bookings');
                setCancelDialogOpen(false);
                navigate('/login');
                return;
            }
            
            const result = await cancelBooking(booking.id.toString(), token);
            console.log('Cancellation result:', result);
            
            // Close the dialog before updating UI to avoid the dialog staying open
            setCancelDialogOpen(false);
            
            // Update booking status locally
            setBooking({
                ...booking,
                status: 'cancelled'
            });
            
            setSuccessMessage('Booking cancelled successfully! Your refund will be processed within 3-4 business days.');
        } catch (err: any) {
            console.error('Error cancelling booking:', err);
            setError('Failed to cancel booking. Please try again later.');
            // Also close the dialog on error
            setCancelDialogOpen(false);
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
                <Paper sx={{ 
                    p: 4, 
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                }}>
                    <CircularProgress size={60} sx={{ color: '#9C27B0', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">
                        Loading booking details...
                    </Typography>
                </Paper>
            </Container>
        );
    }

    if (error || !booking) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                }}>
                    <Box sx={{ color: 'error.main', fontSize: '4rem', mb: 2 }}>
                        <WarningAmberIcon fontSize="inherit" />
                    </Box>
                    <Typography variant="h5" color="error" gutterBottom fontWeight="medium">
                        {error || 'Booking Not Found'}
                    </Typography>
                    <Typography variant="body1" color="textSecondary" paragraph>
                        We couldn't find the booking information you're looking for.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/flights')}
                        sx={{ 
                            mt: 2,
                            backgroundColor: '#FF7F23',
                            '&:hover': {
                                backgroundColor: '#E67D2E'
                            },
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(255, 127, 35, 0.2)',
                            borderRadius: '8px',
                            py: 1
                        }}
                    >
                        Return to Flights
                    </Button>
                </Paper>
            </Container>
        );
    }

    // Check if this booking has passenger information (safe to access as we've checked booking is not null)
    const hasPassengerInfo = booking.passengers && booking.passengers.length > 0;
    const hasFlightInfo = booking.flightId && booking.origin && booking.destination;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ 
                p: { xs: 2, sm: 4 }, 
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
            }}>
                <Stepper 
                    activeStep={isBookingPaid || isBookingConfirmed ? 2 : (isBookingPending ? 1 : 0)} 
                    alternativeLabel 
                    sx={{ 
                        mb: 4, 
                        display: { xs: 'none', sm: 'flex' },
                        '& .MuiStepLabel-root .Mui-completed': {
                            color: '#4caf50',
                        },
                        '& .MuiStepLabel-root .Mui-active': {
                            color: isBookingPaid || isBookingConfirmed ? '#4caf50' : '#9C27B0',
                        }
                    }}
                >
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ 
                    p: 2, 
                    borderRadius: '8px', 
                    bgcolor: '#f3f4f6', 
                    mb: 3, 
                    display: { xs: 'block', sm: 'none' } 
                }}>
                    <Typography align="center" variant="subtitle1" fontWeight="bold">
                        Booking Confirmation: Step {isBookingPaid || isBookingConfirmed ? '3' : (isBookingPending ? '2' : '1')} of 3
                    </Typography>
                </Box>

                {/* Success message */}
                <Snackbar
                    open={!!successMessage}
                    autoHideDuration={6000}
                    onClose={() => setSuccessMessage(null)}
                    message={successMessage}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    sx={{
                        '& .MuiSnackbarContent-root': {
                            backgroundColor: '#4caf50',
                            color: 'white'
                        }
                    }}
                />

                <Box sx={{ 
                    textAlign: 'center', 
                    mb: 4, 
                    p: { xs: 2, sm: 3 },
                    background: 'linear-gradient(45deg, #E33069 30%, #9C27B0 90%)',
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(156, 39, 176, 0.25)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0.1,
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")',
                    }}/>
                    <Box position="relative" zIndex="1">
                        <Avatar sx={{ 
                            width: 70, 
                            height: 70, 
                            bgcolor: 'rgba(255, 255, 255, 0.2)', 
                            margin: '0 auto 16px',
                            border: '4px solid rgba(255, 255, 255, 0.3)'
                        }}>
                            <CheckCircleIcon sx={{ fontSize: 40, color: 'white' }} />
                        </Avatar>
                        <Typography variant="h4" gutterBottom fontWeight="medium">
                            {isBookingPaid 
                                ? 'Payment Complete!'
                                : isBookingPending
                                    ? 'Booking Created!' 
                                    : 'Booking Confirmed!'}
                        </Typography>
                        <Typography variant="subtitle1">
                            {isBookingPaid 
                                ? 'Your booking has been paid and confirmed'
                                : isBookingPending
                                    ? 'Please complete payment to secure your seats'
                                    : 'Your booking has been successfully completed'}
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card sx={{ 
                            borderRadius: '12px',
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                            height: '100%',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)'
                            },
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ 
                                bgcolor: '#f5f1f9', 
                                p: 2, 
                                borderBottom: '1px solid rgba(156, 39, 176, 0.12)'
                            }}>
                                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <FlightTakeoffIcon sx={{ mr: 1, color: '#9C27B0' }} />
                                    Flight Details
                                </Typography>
                            </Box>
                            <CardContent sx={{ p: '1.5rem' }}>
                                {hasFlightInfo ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Grid container>
                                            <Grid item xs={5} sx={{ position: 'relative' }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography variant="h5" color="primary.main" fontWeight="bold">
                                                        {booking?.origin}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {booking?.originCity || ''}
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ mt: 1 }}>
                                                        {formatTime(booking?.departureTime)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {formatDate(booking?.departureTime)}
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
                                                    <Typography variant="caption" sx={{ 
                                                        mt: 4, 
                                                        color: 'text.secondary',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {calculateDuration(booking?.departureTime, booking?.arrivalTime)}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={5} sx={{ position: 'relative' }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography variant="h5" color="primary.main" fontWeight="bold">
                                                        {booking?.destination}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {booking?.destinationCity || ''}
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ mt: 1 }}>
                                                        {formatTime(booking?.arrivalTime)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {formatDate(booking?.arrivalTime)}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ mt: 3 }}>
                                            <Divider sx={{ mb: 2 }} />
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
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
                                                                {booking?.airline} {booking?.flightNumber}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <LocalOfferIcon sx={{ 
                                                            mr: 1, 
                                                            color: '#9C27B0',
                                                            backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                            padding: '4px',
                                                            borderRadius: '50%',
                                                            fontSize: '1.2rem'
                                                        }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Class
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {booking?.seatClass || 'Economy'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                        <ConfirmationNumberIcon sx={{ 
                                                            mr: 1, 
                                                            color: '#9C27B0',
                                                            backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                            padding: '4px',
                                                            borderRadius: '50%',
                                                            fontSize: '1.2rem'
                                                        }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Booking ID
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {booking?.id}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                        <InfoIcon sx={{ 
                                                            mr: 1, 
                                                            color: '#9C27B0',
                                                            backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                            padding: '4px',
                                                            borderRadius: '50%',
                                                            fontSize: '1.2rem'
                                                        }} />
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Status
                                                            </Typography>
                                                            {getBookingStatusChip(booking?.status)}
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                {booking?.flightStatus && (
                                                    <Grid item xs={12}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                            <FlightIcon sx={{ 
                                                                mr: 1, 
                                                                color: '#9C27B0',
                                                                backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                                padding: '4px',
                                                                borderRadius: '50%',
                                                                fontSize: '1.2rem'
                                                            }} />
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Flight Status
                                                                </Typography>
                                                                {getFlightStatusChip(booking?.flightStatus)}
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Alert severity="info" sx={{ mt: 2, borderRadius: '8px' }}>
                                        Flight details not available
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card sx={{ 
                            borderRadius: '12px',
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                            height: '100%',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)'
                            },
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ 
                                bgcolor: '#f5f1f9', 
                                p: 2, 
                                borderBottom: '1px solid rgba(156, 39, 176, 0.12)'
                            }}>
                                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AirlineSeatReclineNormalIcon sx={{ mr: 1, color: '#9C27B0' }} />
                                    Seat & Fare Details
                                </Typography>
                            </Box>
                            <CardContent sx={{ p: '1.5rem' }}>
                                <Box>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Box sx={{ 
                                                p: 2, 
                                                bgcolor: '#f8f9fa', 
                                                borderRadius: '8px',
                                                height: '100%'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <AirlineSeatReclineNormalIcon sx={{ 
                                                        mr: 1, 
                                                        color: '#9C27B0',
                                                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                        padding: '4px',
                                                        borderRadius: '50%',
                                                        fontSize: '1.2rem'
                                                    }} />
                                                    <Typography variant="subtitle2">Seat Details</Typography>
                                                </Box>
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Number of Seats
                                                    </Typography>
                                                    <Typography variant="h5" fontWeight="medium" color="primary.main">
                                                        {booking.seatIds.length}
                                                    </Typography>
                                                </Box>
                                    
                                                {/* Show seat numbers first if available */}
                                                {hasPassengerInfo && booking.passengers?.some(p => p.seatNumber) ? (
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Seat Numbers
                                                        </Typography>
                                                        <Typography variant="body1" fontWeight="medium">
                                                            {booking.passengers
                                                                ?.filter(p => p.seatNumber)
                                                                .map(p => p.seatNumber)
                                                                .join(', ')}
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Seat IDs
                                                        </Typography>
                                                        <Typography variant="body1" fontWeight="medium">
                                                            {booking.seatIds.join(', ')}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Grid>
                                        
                                        <Grid item xs={6}>
                                            {booking.price && (
                                                <Box sx={{ 
                                                    p: 2, 
                                                    bgcolor: '#f8f9fa', 
                                                    borderRadius: '8px',
                                                    height: '100%'
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        <ReceiptIcon sx={{ 
                                                            mr: 1, 
                                                            color: '#9C27B0',
                                                            backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                            padding: '4px',
                                                            borderRadius: '50%',
                                                            fontSize: '1.2rem'
                                                        }} />
                                                        <Typography variant="subtitle2">Fare Details</Typography>
                                                    </Box>
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Base fare (per seat)
                                                        </Typography>
                                                        <Typography variant="body1" fontWeight="medium">
                                                            {formatPrice(booking.price)}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    <Divider sx={{ my: 1.5 }} />
                                                    
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography variant="subtitle2">
                                                            Total amount
                                                        </Typography>
                                                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                                                            {formatPrice(booking.price * booking.seatIds.length)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                        </Grid>
                                    </Grid>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card sx={{ 
                            borderRadius: '12px',
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)'
                            },
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ 
                                bgcolor: '#f5f1f9', 
                                p: 2, 
                                borderBottom: '1px solid rgba(156, 39, 176, 0.12)'
                            }}>
                                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PersonIcon sx={{ mr: 1, color: '#9C27B0' }} />
                                    Passenger Information
                                </Typography>
                            </Box>
                            <CardContent sx={{ p: '1.5rem' }}>
                                {hasPassengerInfo ? (
                                    <List sx={{ py: 0 }}>
                                        {booking.passengers?.map((passenger, index) => (
                                            <ListItem 
                                                key={index}
                                                divider={index < (booking.passengers?.length || 0) - 1}
                                                sx={{ 
                                                    flexDirection: 'column', 
                                                    alignItems: 'flex-start', 
                                                    py: 2,
                                                    px: 0
                                                }}
                                            >
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    width: '100%', 
                                                    mb: 1, 
                                                    alignItems: 'center', 
                                                    flexWrap: 'wrap',
                                                    pb: 1,
                                                    borderBottom: '1px dashed rgba(0, 0, 0, 0.1)'
                                                }}>
                                                    <Avatar 
                                                        sx={{ 
                                                            bgcolor: 'primary.light', 
                                                            color: 'white',
                                                            mr: 1.5,
                                                            width: 36,
                                                            height: 36,
                                                            fontSize: '1rem'
                                                        }}
                                                    >
                                                        {passenger.firstName ? passenger.firstName[0] : 'P'}
                                                    </Avatar>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1, wordBreak: 'break-word' }}>
                                                        {passenger.firstName} {passenger.lastName}
                                                    </Typography>
                                                    {index === 0 && (
                                                        <Chip 
                                                            label="Primary" 
                                                            size="small" 
                                                            color="primary" 
                                                            sx={{ ml: 1 }}
                                                        />
                                                    )}
                                                </Box>
                                                
                                                <Grid container spacing={2} sx={{ mt: 0 }}>
                                                    {passenger.email && (
                                                    <Grid item xs={12}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                                            <EmailIcon fontSize="small" sx={{ 
                                                                mr: 1.5, 
                                                                color: '#9C27B0',
                                                                backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                                padding: '4px',
                                                                borderRadius: '50%',
                                                                fontSize: '1.2rem' 
                                                            }} />
                                                            <Typography variant="body2" sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                                {passenger.email}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    )}
                                                
                                                    <Grid item container spacing={2}>
                                                        {passenger.phone && (
                                                            <Grid item xs={12} sm={4}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <PhoneIcon fontSize="small" sx={{ 
                                                                        mr: 1, 
                                                                        color: '#9C27B0',
                                                                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                                        padding: '4px',
                                                                        borderRadius: '50%',
                                                                        fontSize: '1.2rem'
                                                                    }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Phone
                                                                        </Typography>
                                                                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                                            {passenger.phone}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                        )}
                                                    
                                                        {passenger.age && (
                                                            <Grid item xs={12} sm={4}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <PersonIcon fontSize="small" sx={{ 
                                                                        mr: 1, 
                                                                        color: '#9C27B0',
                                                                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                                        padding: '4px',
                                                                        borderRadius: '50%',
                                                                        fontSize: '1.2rem'
                                                                    }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Age
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            {passenger.age} years
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                        )}
                                                    
                                                        {passenger.seatId && (
                                                            <Grid item xs={12} sm={4}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <AirlineSeatReclineNormalIcon fontSize="small" sx={{ 
                                                                        mr: 1, 
                                                                        color: '#9C27B0',
                                                                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                                                        padding: '4px',
                                                                        borderRadius: '50%',
                                                                        fontSize: '1.2rem'
                                                                    }} />
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Seat
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            {passenger.seatNumber || passenger.seatId}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Grid>
                                                        )}
                                                    </Grid>
                                                </Grid>
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Alert severity="info" sx={{ mt: 2, borderRadius: '8px' }}>
                                        Passenger details not available
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Payment Section */}
                {isBookingPending && (
                    <Box sx={{ 
                        mt: 4, 
                        mb: 2, 
                        p: 3, 
                        border: '1px solid rgba(251, 192, 45, 0.2)', 
                        borderRadius: '12px', 
                        bgcolor: 'rgba(251, 192, 45, 0.05)',
                        boxShadow: '0 4px 12px rgba(251, 192, 45, 0.1)'
                    }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                            <WarningAmberIcon sx={{ mr: 1, color: 'warning.main', verticalAlign: 'middle' }} />
                            Important: Reserved seats will be released if payment is not completed within 30 minutes.
                        </Typography>
                        
                        {showPayment ? (
                            <RazorpayPayment
                                bookingId={booking.id}
                                amount={booking.price ? booking.price * (booking.seatIds?.length || 0) : 0}
                                onSuccess={handlePaymentSuccess}
                                onFailure={handlePaymentFailure}
                            />
                        ) : (
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={handlePayNow}
                                startIcon={<PaymentIcon />}
                                sx={{
                                    mt: 2,
                                    bgcolor: '#FF7F23',
                                    '&:hover': {
                                        bgcolor: '#E67D2E',
                                    },
                                    borderRadius: '8px',
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    boxShadow: '0 4px 12px rgba(255, 127, 35, 0.2)'
                                }}
                            >
                                Pay Now ₹{formatPrice((booking.price || 0) * booking.seatIds.length).replace('₹', '')}
                            </Button>
                        )}
                    </Box>
                )}

                {/* Action Buttons */}
                <Grid container spacing={2} sx={{ mt: 3 }}>
                    <Grid item xs={12} sm={4}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate('/bookings')}
                            sx={{
                                borderRadius: '8px',
                                py: 1.5,
                                borderColor: '#9C27B0',
                                color: '#9C27B0',
                                '&:hover': {
                                    borderColor: '#7B1FA2',
                                    backgroundColor: 'rgba(156, 39, 176, 0.04)'
                                },
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                fontWeight: 500
                            }}
                        >
                            View All Bookings
                        </Button>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => navigate('/flights')}
                            sx={{
                                borderRadius: '8px',
                                py: 1.5,
                                bgcolor: '#FF7F23',
                                '&:hover': {
                                    bgcolor: '#E67D2E'
                                },
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                boxShadow: '0 4px 12px rgba(255, 127, 35, 0.2)'
                            }}
                        >
                            Book Another Flight
                        </Button>
                    </Grid>
                    
                    {/* Only show download ticket button for confirmed/paid bookings and upcoming flights */}
                    {(isBookingPaid || isBookingConfirmed) && booking.arrivalTime && (new Date(booking.arrivalTime) > new Date()) && (
                        <Grid item xs={12} sm={4}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={handleDownloadTicket}
                                disabled={downloadLoading}
                                startIcon={downloadLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                                sx={{
                                    borderRadius: '8px',
                                    py: 1.5,
                                    backgroundColor: '#FF7F23',
                                    '&:hover': {
                                        backgroundColor: '#E67D2E'
                                    },
                                    textTransform: 'none',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    boxShadow: '0 4px 12px rgba(255, 127, 35, 0.2)'
                                }}
                            >
                                Download Ticket
                            </Button>
                        </Grid>
                    )}
                    
                    {/* Add Cancel Booking button for paid bookings */}
                    {isBookingPaid && booking.departureTime && (new Date(booking.departureTime) > new Date()) && (
                        <Grid item xs={12} sm={4}>
                            <Button
                                variant="outlined"
                                color="error"
                                fullWidth
                                onClick={handleCancelDialogOpen}
                                startIcon={<CancelIcon />}
                                sx={{
                                    borderRadius: '8px',
                                    py: 1.5,
                                    mt: 2,
                                    borderColor: '#d32f2f',
                                    color: '#d32f2f',
                                    '&:hover': {
                                        borderColor: '#c62828',
                                        backgroundColor: 'rgba(211, 47, 47, 0.04)'
                                    },
                                    textTransform: 'none',
                                    fontSize: '0.95rem',
                                    fontWeight: 500
                                }}
                            >
                                Cancel Booking
                            </Button>
                        </Grid>
                    )}
                </Grid>

                {/* Email Ticket Section - Only show for paid/confirmed bookings and upcoming flights */}
                {(isBookingPaid || isBookingConfirmed) && booking.arrivalTime && (new Date(booking.arrivalTime) > new Date()) && (
                    <Card sx={{ 
                        mt: 4, 
                        borderRadius: '12px',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ 
                            bgcolor: '#f5f1f9', 
                            p: 2, 
                            borderBottom: '1px solid rgba(156, 39, 176, 0.12)'
                        }}>
                            <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center' }}>
                                <EmailIcon sx={{ mr: 1, color: '#9C27B0' }} />
                                Email Ticket
                            </Typography>
                        </Box>
                        <CardContent sx={{ p: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2">
                                Send your ticket to your registered email address for easy access.
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={handleEmailTicket}
                                disabled={emailLoading}
                                startIcon={emailLoading ? <CircularProgress size={20} /> : <SendIcon />}
                                sx={{
                                    borderRadius: '8px',
                                    borderColor: '#9C27B0',
                                    color: '#9C27B0',
                                    '&:hover': {
                                        borderColor: '#7B1FA2',
                                        backgroundColor: 'rgba(156, 39, 176, 0.04)'
                                    },
                                    ml: 2,
                                    py: 1,
                                    textTransform: 'none',
                                    fontWeight: 500
                                }}
                            >
                                Send to My Email
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </Paper>

            {/* Cancellation Dialog for Paid Bookings */}
            <Dialog
                open={cancelDialogOpen}
                onClose={handleCancelDialogClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.15)'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    backgroundColor: '#f8f9fa', 
                    borderBottom: '1px solid #eeeeee',
                    pb: 2
                }}>
                    <Typography variant="h6" fontWeight="bold" color="error">
                        Cancel Paid Booking
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 0 }}>
                    {booking && (
                        <>
                            <Alert 
                                severity="info" 
                                variant="filled"
                                icon={<RefundIcon />}
                                sx={{ mb: 3 }}
                            >
                                The amount paid for this booking (₹{(booking.price || 0) * (booking.seatIds?.length || 0)}) will be refunded to your account within 3-4 business days.
                            </Alert>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Flight Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Flight</Typography>
                                        <Typography variant="body1">
                                            {booking.airline} {booking.flightNumber}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
                                        <Typography variant="body1">
                                            {booking.departureTime && new Date(booking.departureTime).toLocaleString()}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Route</Typography>
                                        <Typography variant="body1">
                                            {booking.origin} → {booking.destination}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Booking ID</Typography>
                                        <Typography variant="body1">
                                            {booking.id}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Passenger Details
                                </Typography>
                                <Grid container spacing={2}>
                                    {booking.passengers ? (
                                        booking.passengers.map((passenger, index) => (
                                            <Grid item xs={12} sm={6} key={index}>
                                                <Box sx={{ 
                                                    p: 1.5, 
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#f5f5f5'
                                                }}>
                                                    <Typography variant="subtitle2">
                                                        {passenger.firstName} {passenger.lastName}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {passenger.email && `Email: ${passenger.email}`}
                                                    </Typography>
                                                    {passenger.seatId && (
                                                        <Chip 
                                                            label={`Seat ${passenger.seatNumber || passenger.seatId}`}
                                                            size="small"
                                                            sx={{ mt: 1 }}
                                                        />
                                                    )}
                                                </Box>
                                            </Grid>
                                        ))
                                    ) : (
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                {booking.seatIds.length} seat(s) booked
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Fare Details
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Price per Seat</Typography>
                                        <Typography variant="body1">
                                            ₹{booking.price || 0}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Number of Seats</Typography>
                                        <Typography variant="body1">
                                            {booking.seatIds.length}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Total Amount: ₹{(booking.price || 0) * booking.seatIds.length}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                            
                            <Box sx={{ 
                                bgcolor: '#fff4e5', 
                                p: 2, 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                mb: 2
                            }}>
                                <ScheduleIcon sx={{ color: '#ff9800', mr: 1 }} />
                                <Typography variant="body2">
                                    Your refund will be processed to your original payment method. Please allow 3-4 business days for the refund to be credited.
                                </Typography>
                            </Box>
                            
                            <DialogContentText color="error" sx={{ mt: 2 }}>
                                Are you sure you want to cancel this booking? This action cannot be undone.
                            </DialogContentText>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button 
                        onClick={handleCancelDialogClose}
                        sx={{ 
                            color: '#9C27B0',
                            borderRadius: '8px'
                        }}
                    >
                        No, Keep Booking
                    </Button>
                    <Button 
                        onClick={handleCancelBooking} 
                        variant="contained" 
                        color="error"
                        disabled={cancelLoading}
                        startIcon={cancelLoading ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ borderRadius: '8px' }}
                    >
                        Yes, Cancel Booking
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default BookingConfirmation;