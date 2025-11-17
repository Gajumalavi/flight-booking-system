import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Alert, Box, Container, Paper, Button, Typography, 
  Chip, CircularProgress, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Grid, Divider, Snackbar 
} from '@mui/material';
import SeatSelection from './SeatSelection';
import { bookSeat, createBooking, Passenger, Flight, saveApiFlightToDatabase } from '../../services/api';
import ErrorAlert from '../common/ErrorAlert';
import axios from 'axios';
import { webSocketService } from '../../services/websocket.service';
import RazorpayPayment from '../payment/RazorpayPayment';

// Add a key for storing selected seats in sessionStorage to improve cross-browser synchronization
const SEAT_STORAGE_KEY = 'selected_seats_for_flight_';

interface Booking {
    id: number;
    flightId: string;
    selectedSeats: number[];
    timestamp: string;
    status: 'confirmed' | 'completed' | 'cancelled';
    passengers?: Passenger[];
}

interface PassengerForm {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: string;
    seatId: number;
    seatNumber: string;
}

const SeatSelectionWrapper: React.FC = () => {
    const { flightId = '' } = useParams();
    const navigate = useNavigate();
    const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
    const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [passengerDialogOpen, setPassengerDialogOpen] = useState<boolean>(false);
    const [passengers, setPassengers] = useState<PassengerForm[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [flightData, setFlightData] = useState<Flight | null>(null);
    const [isApiSourced, setIsApiSourced] = useState<boolean>(false);
    const [isFlightSaved, setIsFlightSaved] = useState<boolean>(false);
    const [lastSeatCheckTime, setLastSeatCheckTime] = useState<number>(Date.now());
    const [bookingCreated, setBookingCreated] = useState<Booking | null>(null);
    const [bookingStep, setBookingStep] = useState<'selection' | 'payment' | 'confirmation'>('selection');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    
    // Convert flightId to number for API calls
    const flightIdNumber = parseInt(flightId, 10);
    
    // Define storage keys specific to this flight
    const seatStorageKey = `${SEAT_STORAGE_KEY}${flightId}`;
    const seatNumbersStorageKey = `${SEAT_STORAGE_KEY}${flightId}_numbers`;
    
    // Load initial seat selections from sessionStorage for this flight
    useEffect(() => {
        try {
            const storedSeats = sessionStorage.getItem(seatStorageKey);
            const storedSeatNumbers = sessionStorage.getItem(seatNumbersStorageKey);
            
            if (storedSeats) {
                const parsedSeats = JSON.parse(storedSeats);
                if (Array.isArray(parsedSeats)) {
                    setSelectedSeats(parsedSeats);
                    console.log('Loaded selected seats from storage:', parsedSeats);
                }
            }
            
            if (storedSeatNumbers) {
                const parsedSeatNumbers = JSON.parse(storedSeatNumbers);
                if (Array.isArray(parsedSeatNumbers)) {
                    setSelectedSeatNumbers(parsedSeatNumbers);
                    console.log('Loaded selected seat numbers from storage:', parsedSeatNumbers);
                }
            }
        } catch (error) {
            console.error('Error loading seats from sessionStorage:', error);
        }
    }, [flightId, seatStorageKey, seatNumbersStorageKey]);
    
    // Save seat selections to sessionStorage whenever they change
    useEffect(() => {
        try {
            sessionStorage.setItem(seatStorageKey, JSON.stringify(selectedSeats));
            sessionStorage.setItem(seatNumbersStorageKey, JSON.stringify(selectedSeatNumbers));
            console.log('Saved selected seats to storage:', selectedSeats);
        } catch (error) {
            console.error('Error saving seats to sessionStorage:', error);
        }
    }, [selectedSeats, selectedSeatNumbers, seatStorageKey, seatNumbersStorageKey]);
    
    // Periodically check for updates from other tabs/windows
    useEffect(() => {
        const checkForUpdates = () => {
            const now = Date.now();
            // Only check every 2 seconds at most
            if (now - lastSeatCheckTime < 2000) return;
            
            try {
                const storedSeats = sessionStorage.getItem(seatStorageKey);
                if (storedSeats) {
                    const parsedSeats = JSON.parse(storedSeats);
                    // Compare with current state and update if different
                    if (JSON.stringify(parsedSeats) !== JSON.stringify(selectedSeats)) {
                        console.log('Detected seat selection change from another tab, updating...');
                        setSelectedSeats(parsedSeats);
                    }
                }
                
                const storedSeatNumbers = sessionStorage.getItem(seatNumbersStorageKey);
                if (storedSeatNumbers) {
                    const parsedSeatNumbers = JSON.parse(storedSeatNumbers);
                    // Compare with current state and update if different
                    if (JSON.stringify(parsedSeatNumbers) !== JSON.stringify(selectedSeatNumbers)) {
                        setSelectedSeatNumbers(parsedSeatNumbers);
                    }
                }
                
                setLastSeatCheckTime(now);
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        };
        
        // Set up interval for periodic checks
        const intervalId = setInterval(checkForUpdates, 1000);
        
        // Clean up
        return () => clearInterval(intervalId);
    }, [selectedSeats, selectedSeatNumbers, lastSeatCheckTime, seatStorageKey, seatNumbersStorageKey]);

    // Export checkForUpdates for use in other functions
    const refreshSeatData = () => {
        const now = Date.now();
        
        try {
            // Reset selections and refresh local data
            setSelectedSeats([]);
            setSelectedSeatNumbers([]);
            setLastSeatCheckTime(now);
            
            // Re-fetch flight data
            const checkFlight = async () => {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        setError('Authentication required');
                        navigate('/login');
                        return;
                    }

                    // Try to fetch flight from database
                    const response = await axios.get(`http://localhost:8080/api/flights/${flightId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    setFlightData(response.data);
                    setIsApiSourced(response.data.apiSourced === true);
                    setIsFlightSaved(true);
                    
                    // Ensure we're in selection mode
                    setBookingStep('selection');
                } catch (err) {
                    console.error('Error refreshing flight data:', err);
                    setError('Could not retrieve updated flight information. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            };
            
            // Execute the refresh
            checkFlight();
            
        } catch (error) {
            console.error('Error refreshing seat data:', error);
        }
    };

    // Check if this flight exists in database or if it's an API flight
    useEffect(() => {
        const checkFlight = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Authentication required');
                    navigate('/login');
                    return;
                }

                // Try to fetch flight from database
                const response = await axios.get(`http://localhost:8080/api/flights/${flightId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                setFlightData(response.data);
                setIsApiSourced(response.data.apiSourced === true);
                setIsFlightSaved(true);
            } catch (err) {
                console.error('Error checking flight:', err);
                setError('Could not retrieve flight information. Please try again.');
                
                // Check if this is an API flight that wasn't saved properly
                try {
                    // Try to get flight from session storage (it might have been stored during search)
                    const storedFlights = sessionStorage.getItem('searchResults');
                    if (storedFlights) {
                        const parsedFlights = JSON.parse(storedFlights);
                        const apiFlight = parsedFlights.find((f: Flight) => f.id === flightIdNumber);
                        
                        if (apiFlight && apiFlight.apiSourced) {
                            setFlightData(apiFlight);
                            setIsApiSourced(true);
                            setIsFlightSaved(false);
                            setError(null); // Clear error as we found the flight
                        }
                    }
                } catch (storageErr) {
                    console.error('Error checking session storage:', storageErr);
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkFlight();
    }, [flightId, navigate, flightIdNumber]);

    // Handle API-sourced flight that wasn't saved to DB
    useEffect(() => {
        const saveFlightIfNeeded = async () => {
            if (flightData && isApiSourced && !isFlightSaved) {
                setIsLoading(true);
                setError(null);
                
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        setError('Authentication required');
                        navigate('/login');
                        return;
                    }
                    
                    // Save API flight to database
                    const savedFlight = await saveApiFlightToDatabase(flightData, token);
                    console.log('API flight saved or found in database:', savedFlight);
                    
                    if (savedFlight && savedFlight.id) {
                        // Check if we're already on this flight's page
                        if (savedFlight.id.toString() !== flightId) {
                            console.log(`Redirecting from temporary ID ${flightId} to permanent flight ID ${savedFlight.id}`);
                            // Redirect to the new flight's seat selection page
                            navigate(`/flights/${savedFlight.id}/seats`, { replace: true });
                        } else {
                            console.log('Already on the correct flight page, no redirect needed');
                            // Just update the state to show the flight is saved
                            setIsFlightSaved(true);
                            setFlightData(savedFlight);
                        }
                    } else {
                        throw new Error('Failed to save flight to database');
                    }
                } catch (err) {
                    console.error('Error saving API flight to database:', err);
                    setError('Failed to prepare flight for booking. Please try searching again.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        
        saveFlightIfNeeded();
    }, [flightData, isApiSourced, isFlightSaved, navigate, flightId]);

    // Initialize passengers when seats change
    useEffect(() => {
        if (selectedSeats.length > 0) {
            // Create or update passenger entries for each selected seat
            const updatedPassengers = selectedSeats.map((seatId, index) => {
                // Try to find existing passenger for this seat
                const existingPassenger = passengers.find(p => p.seatId === seatId);
                if (existingPassenger) {
                    return existingPassenger;
                }
                
                // Create new passenger entry
                return {
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    age: '',
                    seatId: seatId,
                    seatNumber: selectedSeatNumbers[index] || 'Unknown'
                };
            });
            
            // Remove passengers for seats that are no longer selected
            setPassengers(updatedPassengers);
        } else {
            setPassengers([]);
        }
    }, [selectedSeats, selectedSeatNumbers]);

    // Handle seat selection toggle with improved error recovery and cross-browser synchronization
    const handleSeatSelect = (seatId: number, seatNumber: string) => {
        try {
            if (selectedSeats.includes(seatId)) {
                // Deselect seat
                const updatedSeats = selectedSeats.filter(id => id !== seatId);
                const updatedSeatNumbers = selectedSeatNumbers.filter(num => num !== seatNumber);
                
                setSelectedSeats(updatedSeats);
                setSelectedSeatNumbers(updatedSeatNumbers);
                
                // Update session storage immediately for cross-browser sync
                sessionStorage.setItem(seatStorageKey, JSON.stringify(updatedSeats));
                sessionStorage.setItem(seatNumbersStorageKey, JSON.stringify(updatedSeatNumbers));
                
                setSuccessMessage(`Seat ${seatNumber} removed from selection`);
            } else {
                // Check if we're at maximum seat selection (e.g., 10 seats)
                if (selectedSeats.length >= 10) {
                    setError("You can only select up to 10 seats at once.");
                    return;
                }
                
                // Select seat
                const updatedSeats = [...selectedSeats, seatId];
                const updatedSeatNumbers = [...selectedSeatNumbers, seatNumber];
                
                setSelectedSeats(updatedSeats);
                setSelectedSeatNumbers(updatedSeatNumbers);
                
                // Update session storage immediately for cross-browser sync
                sessionStorage.setItem(seatStorageKey, JSON.stringify(updatedSeats));
                sessionStorage.setItem(seatNumbersStorageKey, JSON.stringify(updatedSeatNumbers));
                
                setSuccessMessage(`Seat ${seatNumber} added to selection`);
            }
        } catch (err) {
            console.error("Error handling seat selection:", err);
            setError("Failed to update seat selection. Please try again.");
        }
    };

    // Improved passenger info validation
    const validatePassengerInfo = () => {
        const errors: Record<string, string> = {};
        let isValid = true;
        
        passengers.forEach((passenger, index) => {
            const passengerPrefix = `passenger-${index}`;
            
            // First name validation - required
            if (!passenger.firstName.trim()) {
                errors[`${passengerPrefix}-firstName`] = "First name is required";
                isValid = false;
            } else if (passenger.firstName.trim().length < 2) {
                errors[`${passengerPrefix}-firstName`] = "First name must be at least 2 characters";
                isValid = false;
            } else if (!/^[A-Za-z\s.\-']+$/.test(passenger.firstName.trim())) {
                errors[`${passengerPrefix}-firstName`] = "First name contains invalid characters";
                isValid = false;
            }
            
            // Last name validation - required
            if (!passenger.lastName.trim()) {
                errors[`${passengerPrefix}-lastName`] = "Last name is required";
                isValid = false;
            } else if (passenger.lastName.trim().length < 2) {
                errors[`${passengerPrefix}-lastName`] = "Last name must be at least 2 characters";
                isValid = false;
            } else if (!/^[A-Za-z\s.\-']+$/.test(passenger.lastName.trim())) {
                errors[`${passengerPrefix}-lastName`] = "Last name contains invalid characters";
                isValid = false;
            }
            
            // Email validation (optional field)
            if (passenger.email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(passenger.email.trim())) {
                    errors[`${passengerPrefix}-email`] = "Please enter a valid email address";
                    isValid = false;
                }
            }
            
            // Phone validation (optional field)
            if (passenger.phone) {
                // Remove all non-digit characters to count actual digits
                const digitsOnly = passenger.phone.replace(/\D/g, '');
                if (digitsOnly.length !== 10) {
                    errors[`${passengerPrefix}-phone`] = "Phone number must be exactly 10 digits";
                    isValid = false;
                } else if (!/^[0-9+\-\s()]{10,15}$/.test(passenger.phone.trim())) {
                    errors[`${passengerPrefix}-phone`] = "Please enter a valid phone number";
                    isValid = false;
                }
            }
            
            // Age validation (optional field)
            if (passenger.age) {
                const ageNum = Number(passenger.age);
                if (isNaN(ageNum)) {
                    errors[`${passengerPrefix}-age`] = "Age must be a number";
                    isValid = false;
                } else if (ageNum < 0 || ageNum > 120) {
                    errors[`${passengerPrefix}-age`] = "Age must be between 0 and 120";
                    isValid = false;
                }
            }
        });
        
        setFormErrors(errors);
        return isValid;
    };

    // Handle passenger dialog close with confirmation if there are changes
    const handlePassengerDialogClose = () => {
        // Check if passenger info has been entered
        const hasEnteredData = passengers.some(p => 
            p.firstName.trim() || p.lastName.trim() || p.email.trim() || p.phone.trim() || p.age
        );
        
        if (hasEnteredData && Object.keys(formErrors).length === 0) {
            if (window.confirm("Are you sure you want to close? Your passenger information will be saved.")) {
                setPassengerDialogOpen(false);
            }
        } else {
            setPassengerDialogOpen(false);
        }
    };

    // Enhanced booking confirmation with better error recovery
    const handleBookingConfirmation = async () => {
        try {
            if (selectedSeats.length === 0) {
                setError('Please select at least one seat to proceed.');
                return;
            }

            // Open passenger info dialog if not already filled out or contains errors
            if (!validatePassengerInfo()) {
                setPassengerDialogOpen(true);
                return;
            }

            // Show a loading indicator
            setIsLoading(true);
            setError(null);
            
            // Get authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to book seats.');
                setIsLoading(false);
                return;
            }
            
            try {
                // Format passengers for API
                const formattedPassengers = passengers.map(p => ({
                    firstName: p.firstName.trim(),
                    lastName: p.lastName.trim(),
                    email: p.email.trim() || undefined,
                    phone: p.phone.trim() || undefined,
                    age: p.age ? parseInt(p.age, 10) : undefined,
                    seatId: p.seatId
                }));

                // Create a booking on the server
                console.log('Creating booking for seats:', selectedSeats);
                const bookingResult = await createBooking(flightId, selectedSeats, token, formattedPassengers);
                
                if (bookingResult && bookingResult.id) {
                    console.log('Booking created successfully:', bookingResult);
                    
                    // Set the booking and payment amount
                    setBookingCreated(bookingResult);
                    setPaymentAmount(flightData && flightData.price ? flightData.price * selectedSeats.length : 0);
                    
                    // Move to payment step
                    setBookingStep('payment');
                    setIsLoading(false);
                } else {
                    throw new Error('Invalid booking response');
                }
            } catch (bookError: any) {
                console.error('Error creating booking:', bookError);
                
                if (bookError.status === 400) {
                    setError('One or more seats are no longer available. Please refresh and try again.');
                } else if (bookError.status === 401) {
                    setError('Your session has expired. Please log in again.');
                    setTimeout(() => navigate('/login?expired=true'), 2000);
                } else if (!navigator.onLine) {
                    setError('No internet connection. Please check your network and try again.');
                } else {
                    setError(bookError.message || 'Failed to create booking. Please try again.');
                }
                
                setIsLoading(false);
            }
        } catch (err: any) {
            setError('Failed to process booking: ' + (err.message || 'Unknown error'));
            console.error('Booking error:', err);
            setIsLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        // Clear search results on successful payment
        sessionStorage.removeItem('searchResults');
        
        // Navigate to confirmation page
        if (bookingCreated) {
            navigate(`/booking-confirmation/${bookingCreated.id}`);
        }
    };

    const handlePaymentFailure = (errorMessage: string) => {
        // Display error message
        console.log('Payment failure handler called with:', errorMessage);
        
        // Update state before redirecting
        setError(`Payment failed: ${errorMessage}`);
        setBookingCreated(null);
        setBookingStep('selection');
        
        // Clear sessionStorage for selected seats
        sessionStorage.removeItem(seatStorageKey);
        sessionStorage.removeItem(seatNumbersStorageKey);
        
        // If this is a cancellation, do a full page reload to reset all state
        if (errorMessage.includes('cancelled')) {
            // Small delay to ensure state is updated
            setTimeout(() => {
                console.log('Reloading page to reset state after cancellation');
                window.location.reload();
            }, 100);
        } else {
            // For other payment failures, just reset state without reload
            setSelectedSeats([]);
            setSelectedSeatNumbers([]);
            setIsLoading(true);
            setTimeout(() => {
                refreshSeatData();
                setIsLoading(false);
            }, 1000);
        }
    };

    // Field error helper
    const getFieldError = (passengerIndex: number, field: string): string | undefined => {
        return formErrors[`passenger-${passengerIndex}-${field}`];
    };
    
    // Handle passenger information change with improved validation
    const handlePassengerChange = (seatId: number, field: keyof PassengerForm, value: string) => {
        setPassengers(prev => 
            prev.map((passenger, index) => {
                if (passenger.seatId === seatId) {
                    // Clear the specific error when the field is edited
                    const errorKey = `passenger-${index}-${field}`;
                    if (formErrors[errorKey]) {
                        const updatedErrors = {...formErrors};
                        delete updatedErrors[errorKey];
                        setFormErrors(updatedErrors);
                    }
                    
                    return { ...passenger, [field]: value };
                }
                return passenger;
            })
        );
    };

    // Open dialog to enter passenger information
    const handlePassengerInfoClick = () => {
        setPassengerDialogOpen(true);
    };

    // Function to properly release a seat via WebSocket
    const releaseSeat = async (seatId: number, seatNumber: string) => {
        try {
            // First update the local state to reflect the removal
            handleSeatSelect(seatId, seatNumber);
            
            // Then release the seat via WebSocket
            const success = await webSocketService.releaseSeat({
                seatId: seatId,
                flightId: flightIdNumber
            });
            
            if (success) {
                console.log(`Successfully released seat ${seatId} via WebSocket`);
            } else {
                console.error(`Failed to release seat ${seatId} via WebSocket`);
                setError(`Failed to release seat ${seatNumber}. It may still be held in your name.`);
            }
        } catch (err) {
            console.error('Error releasing seat:', err);
            setError(`Failed to release seat ${seatNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    return (
        <Container maxWidth="lg">
            <ErrorAlert 
                error={error} 
                onClose={() => setError(null)}
            />

            {bookingStep === 'payment' && bookingCreated ? (
                <Paper sx={{ p: 3, my: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#E33069' }}>
                        Booking Created!
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        Please complete payment to secure your seats.
                    </Typography>
                    <RazorpayPayment 
                        bookingId={bookingCreated.id}
                        amount={paymentAmount}
                        onSuccess={handlePaymentSuccess}
                        onFailure={handlePaymentFailure}
                    />
                </Paper>
            ) : (
                <Grid container spacing={3} sx={{ mt: 2 }}>
                    {/* Left Column - Seat Map */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 3, height: '100%', position: 'relative' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#E33069' }}>
                                    Select Your Seat
                                </Typography>
                                
                                <Button 
                                    variant="outlined" 
                                    onClick={() => navigate(-1)}
                                    disabled={isLoading}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    Back
                                </Button>
                            </Box>

                            <SeatSelection
                                flightId={flightIdNumber}
                                onSeatSelect={(seatId, seatNumber) => handleSeatSelect(seatId, seatNumber)}
                                selectedSeats={selectedSeats}
                            />

                            {/* Overlay loading indicator */}
                            {isLoading && (
                                <Box sx={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    right: 0, 
                                    bottom: 0, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                                    zIndex: 10 
                                }}>
                                    <CircularProgress />
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                    
                    {/* Right Column - Flight Info and Selected Seats */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ 
                            p: 3, 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column' 
                        }}>
                            {/* Flight Information Section */}
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#E33069' }}>
                                    Flight Information
                                </Typography>
                                
                                {flightData && (
                                    <Box>
                                        <Paper 
                                            elevation={0} 
                                            sx={{ 
                                                p: 2, 
                                                mb: 3, 
                                                bgcolor: '#f5f8fa',
                                                borderRadius: '8px',
                                                border: '1px solid #e0e0e0'
                                            }}
                                        >
                                            <Grid container spacing={2}>
                                                <Grid item xs={12}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {flightData.airline} {flightData.flightNumber}
                                                    </Typography>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        From
                                                    </Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                        {flightData.origin} {flightData.originCity && `- ${flightData.originCity}`}
                                                    </Typography>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        To
                                                    </Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                        {flightData.destination} {flightData.destinationCity && `- ${flightData.destinationCity}`}
                                                    </Typography>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Departure
                                                    </Typography>
                                                    <Typography variant="body1">
                                                        {new Date(flightData.departureTime).toLocaleString()}
                                                    </Typography>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Arrival
                                                    </Typography>
                                                    <Typography variant="body1">
                                                        {new Date(flightData.arrivalTime).toLocaleString()}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Paper>
                                    </Box>
                                )}
                            </Box>
                            
                            {/* Selected Seats Section */}
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#E33069', mt: 2 }}>
                                    Selected Seats
                                </Typography>
                                
                                {selectedSeats.length === 0 ? (
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 3, 
                                            textAlign: 'center',
                                            bgcolor: '#f5f8fa', 
                                            borderRadius: '8px',
                                            border: '1px solid #e0e0e0' 
                                        }}
                                    >
                                        <Typography variant="body1" color="text.secondary">
                                            No seats selected yet. Please select seats from the seat map.
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Box>
                                        {selectedSeatNumbers.map((seatNum, index) => (
                                            <Paper 
                                                key={index} 
                                                elevation={0}
                                                sx={{ 
                                                    p: 2, 
                                                    mb: 2, 
                                                    bgcolor: '#f5f8fa',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e0e0e0',
                                                    position: 'relative'
                                                }}
                                            >
                                                <Grid container alignItems="center">
                                                    <Grid item xs={8}>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9C27B0' }}>
                                                            Seat {seatNum}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Regular Seat
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FF7F23' }}>
                                                            {flightData && flightData.price ? `₹${flightData.price}` : 'Price N/A'}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                                <Button
                                                    size="small"
                                                    onClick={() => releaseSeat(selectedSeats[index], seatNum)}
                                                    sx={{
                                                        position: 'absolute',
                                                        right: '8px',
                                                        bottom: '8px',
                                                        minWidth: 'auto',
                                                        p: 0.5,
                                                        color: '#f44336'
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            </Paper>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                            
                            {/* Total Price Section */}
                            {selectedSeats.length > 0 && flightData && flightData.price && (
                                <Box sx={{ mt: 'auto', pt: 2 }}>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container justifyContent="space-between" alignItems="center">
                                        <Grid item>
                                            <Typography variant="h6">
                                                Total ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'})
                                            </Typography>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#FF7F23' }}>
                                                ₹{(flightData.price * selectedSeats.length).toLocaleString()}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                            
                            {/* Action Buttons */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                                {selectedSeats.length > 0 && (
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={handlePassengerInfoClick}
                                        disabled={isLoading}
                                        fullWidth
                                        sx={{ 
                                            py: 1.5,
                                            borderRadius: '8px',
                                        }}
                                    >
                                        Enter Passenger Info
                                    </Button>
                                )}
                                
                                <Button 
                                    variant="contained"
                                    color="primary"
                                    disabled={selectedSeats.length === 0 || isLoading}
                                    onClick={handleBookingConfirmation}
                                    fullWidth
                                    sx={{ 
                                        py: 1.5,
                                        bgcolor: '#FF7F23',
                                        '&:hover': {
                                            bgcolor: '#E67D2E'
                                        },
                                        borderRadius: '8px'
                                    }}
                                >
                                    {isLoading ? <CircularProgress size={24} /> : `Confirm & Pay (₹${flightData && flightData.price ? (flightData.price * selectedSeats.length).toLocaleString() : '0'})`}
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            )}
                
            {/* Enhanced Passenger Information Dialog */}
            <Dialog 
                open={passengerDialogOpen} 
                onClose={handlePassengerDialogClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6">Passenger Information</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                        Please enter information for each passenger. Fields marked with * are required.
                    </Typography>
                    
                    {passengers.map((passenger, index) => (
                        <Box key={passenger.seatId} sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Passenger {index + 1} - Seat {passenger.seatNumber}
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="First Name"
                                        value={passenger.firstName}
                                        onChange={(e) => handlePassengerChange(passenger.seatId, 'firstName', e.target.value)}
                                        error={!!getFieldError(index, 'firstName')}
                                        helperText={getFieldError(index, 'firstName')}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Last Name"
                                        value={passenger.lastName}
                                        onChange={(e) => handlePassengerChange(passenger.seatId, 'lastName', e.target.value)}
                                        error={!!getFieldError(index, 'lastName')}
                                        helperText={getFieldError(index, 'lastName')}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        value={passenger.email}
                                        onChange={(e) => handlePassengerChange(passenger.seatId, 'email', e.target.value)}
                                        error={!!getFieldError(index, 'email')}
                                        helperText={getFieldError(index, 'email')}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Phone"
                                        value={passenger.phone}
                                        onChange={(e) => handlePassengerChange(passenger.seatId, 'phone', e.target.value)}
                                        error={!!getFieldError(index, 'phone')}
                                        helperText={getFieldError(index, 'phone') || "Phone number must be exactly 10 digits"}
                                        inputProps={{ 
                                            maxLength: 15,
                                            pattern: '[0-9+\\-\\s()]{10,15}'
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Age"
                                        type="number"
                                        inputProps={{ min: 0, max: 120 }}
                                        value={passenger.age}
                                        onChange={(e) => handlePassengerChange(passenger.seatId, 'age', e.target.value)}
                                        error={!!getFieldError(index, 'age')}
                                        helperText={getFieldError(index, 'age')}
                                    />
                                </Grid>
                            </Grid>
                            {index < passengers.length - 1 && <Divider sx={{ mt: 2 }} />}
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePassengerDialogClose}>Close</Button>
                    <Button 
                        onClick={() => {
                            if (validatePassengerInfo()) {
                                setPassengerDialogOpen(false);
                                handleBookingConfirmation();
                            }
                        }}
                        color="primary"
                        variant="contained"
                    >
                        Confirm & Pay
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Success message snackbar */}
            <Snackbar 
                open={!!successMessage} 
                autoHideDuration={3000} 
                onClose={() => setSuccessMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSuccessMessage(null)} severity="success">
                    {successMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default SeatSelectionWrapper;