import React, { useEffect, useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Chip,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    CircularProgress,
    Alert,
    Snackbar,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Pagination,
    Stack,
    IconButton,
    Divider,
    FormGroup,
    InputAdornment,
    Tooltip
} from '@mui/material';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import PaymentIcon from '@mui/icons-material/Payment';
import CancelIcon from '@mui/icons-material/Cancel';
import RefundIcon from '@mui/icons-material/MoneyOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import moment from 'moment';
import { cancelBooking, getUserBookings, getFilteredBookings, getSimpleFilteredBookings, BookingFilterOptions, Booking, downloadTicket, emailTicket } from '../../services/api';
import { useNavigate } from 'react-router-dom';

// Demo bookings for when the API isn't available
const demoBookings: Booking[] = [
    {
        id: 12345,
        flightId: "1",
        seatIds: [101, 102],
        timestamp: moment().subtract(5, 'days').format(),
        status: 'paid',
        passengers: [
            {
                id: 1001,
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                phone: "9876543210",
                age: 35,
                seatId: 101
            },
            {
                id: 1002,
                firstName: "Jane",
                lastName: "Doe",
                email: "jane.doe@example.com",
                phone: "9876543211",
                age: 32,
                seatId: 102
            }
        ]
    },
    {
        id: 12346,
        flightId: "2",
        seatIds: [204],
        timestamp: moment().subtract(1, 'days').format(),
        status: 'confirmed',
        passengers: [
            {
                id: 1003,
                firstName: "Alice",
                lastName: "Smith",
                email: "alice.smith@example.com",
                phone: "9876543212",
                age: 28,
                seatId: 204
            }
        ]
    },
    {
        id: 12347,
        flightId: "3",
        seatIds: [305, 306],
        timestamp: moment().subtract(10, 'days').format(),
        status: 'cancelled',
        passengers: [
            {
                id: 1004,
                firstName: "Bob",
                lastName: "Johnson",
                email: "bob.johnson@example.com",
                phone: "9876543213",
                age: 42,
                seatId: 305
            },
            {
                id: 1005,
                firstName: "Carol",
                lastName: "Johnson",
                email: "carol.johnson@example.com",
                phone: "9876543214",
                age: 38,
                seatId: 306
            }
        ]
    }
];

const BookingHistory = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [apiAvailable, setApiAvailable] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); // For download/email actions
    
    // Add state for detailed cancellation dialog
    const [detailedCancelDialogOpen, setDetailedCancelDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    
    // Filter states
    const [filters, setFilters] = useState<BookingFilterOptions>({
        status: '',
        bookingId: undefined,
        flightDate: '',
        page: 0,
        size: 5,
        sortBy: 'bookingTime',
        direction: 'desc'
    });
    
    // Pagination states
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    // Date picker states
    const [flightDateValue, setFlightDateValue] = useState<moment.Moment | null>(null);
    
    // Create a retry counter state to help with transaction issues
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 2; // Maximum number of retries for transaction errors
    
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
    }, [filters.page, filters.size, filters.sortBy, filters.direction]);

    const fetchBookings = async () => {
        setLoading(true);
        setError(null);
        console.log('[BookingHistory] Fetching bookings with filters:', JSON.stringify(filters));
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('[BookingHistory] No token found in localStorage');
                setError('You must be logged in to view bookings');
                navigate('/login');
                return;
            }
            
            console.log('[BookingHistory] Token from localStorage:', token.substring(0, 15) + '...');
            
            // Check if filters are active
            const hasActiveFilters = 
                (filters.status && filters.status !== '') ||
                (filters.bookingId !== undefined && filters.bookingId !== null) ||
                (filters.flightDate && filters.flightDate !== '');
            
            try {
                let response;
                if (hasActiveFilters) {
                    console.log('[BookingHistory] Using filtered endpoint with filters:', JSON.stringify(filters));
                    
                    // Ensure correct parameter types (convert empty strings to undefined)
                    const cleanedFilters = {
                        ...filters,
                        bookingId: filters.bookingId || undefined,
                        status: filters.status || undefined,
                        flightDate: filters.flightDate || undefined
                    };
                    
                    console.log('[BookingHistory] Cleaned filters:', JSON.stringify(cleanedFilters));
                    response = await getFilteredBookings(token, cleanedFilters);
                    console.log('[BookingHistory] Filtered bookings response:', response);
                    
                    if (response && response.bookings) {
                        console.log(`[BookingHistory] Received ${response.bookings.length} bookings from API`);
                        setBookings(response.bookings);
                        setTotalPages(response.totalPages || 1);
                        setTotalItems(response.totalItems || response.bookings.length);
                        setApiAvailable(true);
                    } else if (!apiAvailable) {
                        // If API is unavailable but we have demo data, filter demo bookings
                        console.log('[BookingHistory] API response missing bookings array, falling back to demo data');
                        let filteredDemoBookings = [...demoBookings];
                        
                        if (filters.status) {
                            filteredDemoBookings = filteredDemoBookings.filter(
                                b => b.status.toLowerCase() === filters.status?.toLowerCase()
                            );
                        }
                        
                        if (filters.bookingId) {
                            filteredDemoBookings = filteredDemoBookings.filter(
                                b => b.id === filters.bookingId
                            );
                        }
                        
                        setBookings(filteredDemoBookings);
                    } else {
                        console.log('[BookingHistory] No bookings found in API response');
                        setBookings([]);
                    }
                } else {
                    // No filters, get all bookings
                    console.log('[BookingHistory] Fetching all bookings without filters');
                    response = await getUserBookings(token);
                    console.log('[BookingHistory] All bookings response:', response);
                    
                    if (Array.isArray(response) && response.length > 0) {
                        console.log(`[BookingHistory] Received ${response.length} bookings from API`);
                        setBookings(response);
                        setApiAvailable(true);
                    } else if (response && typeof response === 'object' && response.bookings) {
                        // Handle case where API returns an object with bookings array
                        console.log(`[BookingHistory] Received ${response.bookings.length} bookings (object format)`);
                        setBookings(response.bookings);
                        setApiAvailable(true);
                    } else if (!apiAvailable) {
                        // Show demo bookings if API is unavailable
                        console.log('[BookingHistory] API response format incorrect, using demo data');
                        setBookings(demoBookings);
                    } else {
                        console.log('[BookingHistory] No bookings found in API response');
                        setBookings([]);
                    }
                }
            } catch (apiError: any) {
                console.error('[BookingHistory] API Error in fetchBookings:', apiError);
                console.error('[BookingHistory] Error details:', apiError.message);
                
                // If the filtered endpoint fails, try falling back to simple filtering
                if (hasActiveFilters) {
                    try {
                        console.log('[BookingHistory] Falling back to simple filter with status:', filters.status);
                        const simpleResponse = await getSimpleFilteredBookings(
                            token, 
                            filters.status,
                            filters.bookingId
                        );
                        
                        if (simpleResponse && simpleResponse.bookings) {
                            console.log(`[BookingHistory] Received ${simpleResponse.bookings.length} bookings from simple filter`);
                            setBookings(simpleResponse.bookings);
                            setTotalItems(simpleResponse.totalItems || simpleResponse.bookings.length);
                            setTotalPages(1); // Simple filter doesn't support pagination
                            setApiAvailable(true);
                        } else {
                            console.log('[BookingHistory] Simple filter returned no bookings, using demo data');
                            setApiAvailable(false);
                            setBookings(demoBookings);
                        }
                    } catch (fallbackError: any) {
                        console.error('[BookingHistory] Fallback filter also failed:', fallbackError);
                        console.error('[BookingHistory] Fallback error details:', fallbackError.message);
                setApiAvailable(false);
                        setBookings(demoBookings);
                    }
                } else {
                    console.log('[BookingHistory] No fallback attempted, using demo data');
                    setApiAvailable(false);
                    setBookings(demoBookings);
                }
            }
        } catch (err: any) {
            console.error('[BookingHistory] Error in fetchBookings:', err);
            console.error('[BookingHistory] Error stack:', err.stack);
            setError('Failed to load bookings. Please try again later.');
            setApiAvailable(false);
            setBookings(demoBookings);
        } finally {
            setLoading(false);
        }
    };
    
    const handleFilterChange = (field: keyof BookingFilterOptions, value: any) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [field]: value,
            // Reset page when filters change
            ...(field !== 'page' && { page: 0 })
        }));
    };
    
    const handleDateChange = (date: moment.Moment | null) => {
        setFlightDateValue(date);
        
        if (date) {
            // Ensure proper ISO format YYYY-MM-DD
            const formattedDate = date.format('YYYY-MM-DD');
            console.log(`Setting flightDate to: ${formattedDate}`);
            handleFilterChange('flightDate', formattedDate);
        } else {
            handleFilterChange('flightDate', '');
        }
    };
    
    const handleApplyFilters = () => {
        // Reset page to 0 when applying new filters
        setFilters(prevFilters => ({
            ...prevFilters,
            page: 0
        }));
        
        // Then fetch bookings with updated filters
        fetchBookings();
    };
    
    const handleResetFilters = () => {
        // Reset all filters to their default values
        setFilters({
            status: '',
            bookingId: undefined,
            flightDate: '',
            page: 0,
            size: 5,
            sortBy: 'bookingTime',
            direction: 'desc'
        });
        
        // Reset date picker state
        setFlightDateValue(null);
        
        // Fetch bookings with reset filters - do this after a short delay to ensure state is updated
        setTimeout(() => {
        fetchBookings();
        }, 0);
    };
    
    const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
        handleFilterChange('page', page - 1);
    };

    const handleCancelDialogOpen = (bookingId: number) => {
        console.log(`Opening cancel dialog for booking ID: ${bookingId}, type: ${typeof bookingId}`);
        setSelectedBookingId(bookingId);
        
        // Find the booking to check if it's paid
        const booking = bookings.find(b => b.id === bookingId);
        
        if (booking && booking.status.toLowerCase() === 'paid') {
            // For paid bookings, show detailed cancel dialog with refund information
            setSelectedBooking(booking);
            setDetailedCancelDialogOpen(true);
        } else {
            // For other bookings (pending, confirmed), show regular cancel dialog
            setConfirmDialogOpen(true);
        }
    };
    
    const handleCancelDialogClose = () => {
        console.log('Closing cancel dialog, selectedBookingId was:', selectedBookingId);
        setSelectedBookingId(null);
        setConfirmDialogOpen(false);
    };
    
    const handleDetailedCancelDialogClose = () => {
        setSelectedBooking(null);
        setDetailedCancelDialogOpen(false);
    };
    
    const handleCancelBooking = async () => {
        if (!selectedBookingId) {
            console.error('Cannot cancel booking: No booking ID selected');
            return;
        }
        
        console.log(`Attempting to cancel booking ID: ${selectedBookingId}, type: ${typeof selectedBookingId}`);
        
        setLoading(true);
        setError(null);
        
        try {
            // If API is unavailable, simulate cancellation
            if (!apiAvailable) {
                console.log('API unavailable, simulating cancellation');
                setTimeout(() => {
                    // Update demo booking status
                    const updatedBookings = bookings.map(booking => {
                        if (booking.id === selectedBookingId) {
                            return {
                                ...booking,
                                status: 'cancelled' as 'cancelled'
                            };
                        }
                        return booking;
                    });
                    
                    setBookings(updatedBookings);
                    setSuccessMessage('Booking cancelled successfully! (Demo mode)');
                    handleCancelDialogClose();
                    setLoading(false);
                }, 800);
                return;
            }
            
            // Real API call
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to cancel bookings');
                navigate('/login');
                return;
            }
            
            // Ensure we're using the correct type
            const bookingIdToCancel = selectedBookingId;
            console.log(`Sending cancellation request with ID: ${bookingIdToCancel}, type: ${typeof bookingIdToCancel}`);
            
            try {
                const result = await cancelBooking(bookingIdToCancel.toString(), token);
                console.log('Cancellation API response:', result);
                
                // Update the booking status in the UI without refetching
                const updatedBookings = bookings.map(booking => {
                    if (booking.id === selectedBookingId) {
                        return {
                            ...booking,
                            status: 'cancelled' as 'cancelled'
                        };
                    }
                    return booking;
                });
                
                setBookings(updatedBookings);
            setSuccessMessage('Booking cancelled successfully!');
                handleCancelDialogClose();
                setLoading(false);
            
                // Optionally refetch after a delay to ensure server state is synchronized
                setTimeout(() => {
            fetchBookings();
                }, 1000);
            } catch (apiError: any) {
                console.error('API error details:', {
                    message: apiError.message,
                    stack: apiError.stack,
                    status: apiError.status,
                    response: apiError.response
                });
                
                // More specific error message based on the error
                let errorMessage = 'Failed to cancel booking. Please try again later.';
                
                if (apiError.message) {
                    // Extract more detailed message if available
                    if (apiError.message.includes('not found')) {
                        errorMessage = 'Booking not found. It may have been already cancelled or deleted.';
                    } else if (apiError.message.includes('already cancelled')) {
                        errorMessage = 'This booking is already cancelled.';
                    } else if (apiError.message.includes('permission')) {
                        errorMessage = 'You do not have permission to cancel this booking.';
                    } else {
                        errorMessage = `Error: ${apiError.message}`;
                    }
                }
                
                setError(errorMessage);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error cancelling booking:', err);
            setError('Failed to cancel booking. Please try again later.');
            setLoading(false);
        }
    };
    
    const handleViewBooking = (bookingId: number) => {
        navigate(`/booking-confirmation/${bookingId}`);
    };
    
    const handleDownloadTicket = async (bookingId: number) => {
        setLoading(true);
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to download a ticket');
                return;
            }
            
            await downloadTicket(bookingId.toString(), token);
            setSuccessMessage('Ticket downloaded successfully');
        } catch (err: any) {
            console.error('Download error:', err);
            setError(err.response?.data?.message || 'Failed to download ticket. Please try again.');
        } finally {
            setLoading(false);
            setActionLoading(false);
        }
    };
    
    const handleEmailTicket = async (bookingId: number) => {
        setLoading(true);
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to email a ticket');
                return;
            }
            
            const response = await emailTicket(bookingId.toString(), token);
            setSuccessMessage(response.message || 'Ticket has been sent to your email');
        } catch (err: any) {
            console.error('Email error:', err);
            setError(err.response?.data?.message || 'Failed to send email. Please try again.');
        } finally {
            setLoading(false);
            setActionLoading(false);
        }
    };
    
    const handlePayNow = (booking: Booking) => {
        navigate(`/booking-confirmation/${booking.id}`);
    };
    
    const renderFilters = () => {
        return (
            <Paper sx={{ p: 2, mb: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Filters</Typography>
                    <IconButton onClick={() => setShowFilters(false)} size="small">
                        <ClearIcon />
                    </IconButton>
                </Box>
                
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status}
                                label="Status"
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="confirmed">Confirmed</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Booking ID"
                            type="number"
                            value={filters.bookingId || ''}
                            onChange={(e) => handleFilterChange('bookingId', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={4}>
                        <LocalizationProvider dateAdapter={AdapterMoment}>
                            <DatePicker
                                label="Flight Date"
                                value={flightDateValue}
                                onChange={handleDateChange}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                    <Button 
                        variant="outlined" 
                        onClick={handleResetFilters}
                        startIcon={<ClearIcon />}
                    >
                        Reset
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleApplyFilters}
                        startIcon={<SearchIcon />}
                    >
                        Apply Filters
                    </Button>
                </Box>
            </Paper>
        );
    };

    // Render the booking history page
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 3, 
                    borderRadius: '8px',
                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
                }}
            >
                <Box 
                    sx={{ 
                        p: 2, 
                        mb: 3, 
                        background: 'linear-gradient(45deg, #E33069 30%, #9C27B0 90%)',
                        color: 'white',
                        borderRadius: '8px'
                    }}
                >
                    <Typography variant="h5" component="h1" gutterBottom>
                        Your Booking History
                    </Typography>
                    <Typography variant="body2">
                        View and manage all your flight bookings in one place
                    </Typography>
                </Box>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 3,
                            borderRadius: '8px'
                        }}
                    >
                        {error}
                    </Alert>
                )}
            
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : bookings.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="textSecondary">
                        No bookings found
                    </Typography>
                    <Typography color="textSecondary" sx={{ mt: 1 }}>
                        You haven't made any bookings yet or none match your current filters.
                    </Typography>
                </Paper>
            ) : (
                <>
                        <Box sx={{ mb: 4, p: 2, backgroundColor: '#F5F8FA', borderRadius: '8px' }}>
                            <Typography variant="h6" gutterBottom>
                                Filter Bookings
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4} md={3}>
                                    <TextField
                                        select
                                        label="Booking Status"
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        fullWidth
                                        margin="normal"
                                        size="small"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                bgcolor: '#FFFFFF'
                                            }
                                        }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        <MenuItem value="confirmed">Confirmed</MenuItem>
                                        <MenuItem value="paid">Paid</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={4} md={3}>
                                    <TextField
                                        label="Booking ID"
                                        value={filters.bookingId || ''}
                                        onChange={(e) => handleFilterChange('bookingId', e.target.value ? parseInt(e.target.value) : undefined)}
                                        fullWidth
                                        margin="normal"
                                        size="small"
                                        type="number"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                bgcolor: '#FFFFFF'
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4} md={3}>
                                    <LocalizationProvider dateAdapter={AdapterMoment}>
                                        <DatePicker
                                            label="Flight Date"
                                            value={flightDateValue}
                                            onChange={handleDateChange}
                                            slotProps={{ 
                                                textField: { 
                                                    fullWidth: true, 
                                                    margin: 'normal', 
                                                    size: 'small',
                                                    sx: {
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: '8px',
                                                            bgcolor: '#FFFFFF'
                                                        }
                                                    }
                                                } 
                                            }}
                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item xs={12} sm={12} md={3}>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                        <Button 
                                            variant="contained" 
                                            onClick={handleApplyFilters}
                                            sx={{ 
                                                bgcolor: '#FF7F23',
                                                '&:hover': {
                                                    bgcolor: '#E67D2E'
                                                },
                                                borderRadius: '8px',
                                                flexGrow: 1
                                            }}
                                        >
                                            Apply Filters
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            onClick={handleResetFilters}
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
                                            Reset
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                    <Grid container spacing={3}>
                        {bookings.map(booking => (
                            <Grid item xs={12} key={booking.id}>
                                    <Card 
                                        sx={{ 
                                            mb: 3, 
                                            borderRadius: '8px',
                                            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        <CardContent sx={{ p: '1.25rem' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Typography variant="h6">
                                                Booking #{booking.id}
                                            </Typography>
                                            <Chip 
                                                label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                color={
                                                    booking.status === 'confirmed' ? 'primary' :
                                                    booking.status === 'paid' ? 'success' :
                                                    'error'
                                                }
                                                size="small"
                                            />
                                        </Box>
                                        
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <FlightTakeoffIcon color="primary" sx={{ mr: 1 }} />
                                                        <Typography>
                                                            {booking.flightNumber 
                                                                ? `Flight ${booking.flightNumber}` 
                                                                : `Flight ID: ${booking.flightId}`}
                                                        </Typography>
                                                </Box>
                                                    
                                                    {booking.origin && booking.destination && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                            <FlightLandIcon color="primary" sx={{ mr: 1 }} />
                                                            <Typography>
                                                                {`${booking.origin} → ${booking.destination}`}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    
                                                    {booking.departureTime && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                            <EventIcon color="primary" sx={{ mr: 1 }} />
                                                            <Typography>
                                                                {new Date(booking.departureTime).toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    
                                                    {booking.airline && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                            <FlightTakeoffIcon color="primary" sx={{ mr: 1 }} />
                                                            <Typography>{booking.airline}</Typography>
                                                        </Box>
                                                    )}
                                                
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                                                    <Typography>
                                                        Booked on: {moment(booking.timestamp).format('MMMM D, YYYY [at] h:mm A')}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Passengers:
                                                </Typography>
                                                {booking.passengers ? (
                                                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                                        {booking.passengers.map((passenger, index) => (
                                                            <li key={index}>
                                                                {passenger.firstName} {passenger.lastName} 
                                                                {passenger.seatId && ` - Seat ${passenger.seatId}`}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary">
                                                        {booking.seatIds.length} seat(s) booked
                                                    </Typography>
                                                )}
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                    
                                        <CardActions sx={{ justifyContent: 'flex-end', p: '1.25rem', pt: 0 }}>
                                        <Button 
                                            size="small" 
                                            onClick={() => handleViewBooking(booking.id)}
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
                                            View Details
                                        </Button>
                                        
                                        {/* Show action buttons based on booking status */}
                                        {(() => {
                                            // Show action buttons based on booking status
                                            const isComplete = booking.status === 'paid' || booking.status === 'confirmed';
                                            const isCancelled = booking.status === 'cancelled';
                                            const isPending = booking.status === 'pending';
                                            
                                            // Check if flight has already arrived
                                            const hasArrived = booking.arrivalTime && new Date(booking.arrivalTime) < new Date();
                                            
                                            // Only show download/email options for confirmed bookings with upcoming flights
                                            const canAccessTicket = (isComplete && !hasArrived);
                                            
                                            return (
                                                <Stack direction="row" spacing={1}>
                                                    {canAccessTicket && (
                                                        <>
                                                            <Tooltip title="Download Ticket">
                                                                <IconButton 
                                                                    size="small"
                                                                    onClick={() => handleDownloadTicket(booking.id)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <DownloadIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            
                                                            <Tooltip title="Email Ticket">
                                                                <IconButton 
                                                                    size="small"
                                                                    onClick={() => handleEmailTicket(booking.id)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <EmailIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    
                                                    {isPending && (
                                                        <Tooltip title="Complete Payment">
                                                            <IconButton 
                                                                size="small"
                                                                onClick={() => handlePayNow(booking)}
                                                                color="primary"
                                                            >
                                                                <PaymentIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    
                                                    {!isCancelled && !hasArrived && (
                                                        <Tooltip title="Cancel Booking">
                                                            <IconButton 
                                                                size="small"
                                                                onClick={() => handleCancelDialogOpen(booking.id)}
                                                                color="error"
                                                            >
                                                                <CancelIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            );
                                        })()}
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    
                    {/* Pagination controls */}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination 
                                count={totalPages} 
                                page={filters.page ? filters.page + 1 : 1}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}
            
            {/* Confirmation dialog for cancellation */}
            <Dialog
                open={confirmDialogOpen}
                onClose={handleCancelDialogClose}
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
                    }
                }}
            >
                <DialogTitle>Confirm Cancellation</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to cancel this booking? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleCancelDialogClose}
                        sx={{ color: '#9C27B0' }}
                    >
                        No, Keep Booking
                    </Button>
                    <Button 
                        onClick={handleCancelBooking} 
                        variant="contained" 
                        color="error"
                        sx={{ borderRadius: '8px' }}
                    >
                        Yes, Cancel Booking
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Detailed dialog for cancelling paid bookings */}
            <Dialog
                open={detailedCancelDialogOpen}
                onClose={handleDetailedCancelDialogClose}
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
                    {selectedBooking && (
                        <>
                            <Alert 
                                severity="info" 
                                variant="filled"
                                icon={<RefundIcon />}
                                sx={{ mb: 3 }}
                            >
                                The amount paid for this booking (₹{selectedBooking.price || 0}) will be refunded to your account within 3-4 business days.
                            </Alert>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Flight Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Flight</Typography>
                                        <Typography variant="body1">
                                            {selectedBooking.airline} {selectedBooking.flightNumber}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
                                        <Typography variant="body1">
                                            {selectedBooking.departureTime && new Date(selectedBooking.departureTime).toLocaleString()}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Route</Typography>
                                        <Typography variant="body1">
                                            {selectedBooking.origin} → {selectedBooking.destination}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Booking ID</Typography>
                                        <Typography variant="body1">
                                            {selectedBooking.id}
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
                                    {selectedBooking.passengers ? (
                                        selectedBooking.passengers.map((passenger, index) => (
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
                                                {selectedBooking.seatIds.length} seat(s) booked
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
                                            ₹{selectedBooking.price || 0}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Number of Seats</Typography>
                                        <Typography variant="body1">
                                            {selectedBooking.seatIds.length}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Total Amount: ₹{(selectedBooking.price || 0) * selectedBooking.seatIds.length}
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
                        onClick={handleDetailedCancelDialogClose}
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
                        sx={{ borderRadius: '8px' }}
                    >
                        Yes, Cancel Booking
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Success message snackbar */}
            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={() => setSuccessMessage(null)}
                message={successMessage}
            />
            </Paper>
        </Container>
    );
};

export default BookingHistory;