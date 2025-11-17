import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button,
    TextField, Box, Typography, CircularProgress, Alert, Tooltip, Chip, LinearProgress, Skeleton,
    Grid, Card, CardContent, CardActions, useMediaQuery, useTheme, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment, { Moment } from 'moment';
import axios from 'axios';
import FlightIcon from '@mui/icons-material/Flight';
import CloudIcon from '@mui/icons-material/Cloud';
import { formatPrice, formatDate } from '../../utils/formatters';
import { saveApiFlightToDatabase, Flight as ApiFlightType, Seat as ApiSeatType } from '../../services/api';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AirportAutocomplete, { Airport } from '../common/AirportAutocomplete';
import { getAirportByCode } from '../../services/api';

// Local interfaces for the component
interface Seat {
    id: number;
    seatNumber: string;
    available: boolean;
}

interface Flight {
    id: number;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    seats: Seat[];
    apiSourced?: boolean;
    airline?: string;
    availableSeats?: number;
    status?: string;
    originCity?: string;
    originName?: string;
    destinationCity?: string;
    destinationName?: string;
    originCountry?: string;
    destinationCountry?: string;
}

// Function to convert local Flight to API Flight
const convertToApiFlightType = (flight: Flight): ApiFlightType => {
    // Make sure the flight has all the required fields
    console.log('Converting to API Flight type:', {
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        seatCount: flight.seats?.length,
        apiSourced: flight.apiSourced
    });
    
    // We'll only count the available seats, but not pass the full seat objects
    // to avoid serialization issues with the backend
    const availableSeatsCount = flight.seats.filter(seat => seat.available).length;
    
    // Create a minimal flight object with essential fields only
    const apiFlightData: ApiFlightType = {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        price: flight.price,
        airline: flight.airline || 'Unknown Airline',
        seats: [], // Empty seats array, let the backend create them
        apiSourced: true // Explicitly set to true
    };
    
    // Add availableSeats property - this will work with the API even if not in the TypeScript interface
    (apiFlightData as any).availableSeats = availableSeatsCount;
    
    return apiFlightData;
};

interface FlightListProps {
    isAdminView?: boolean;
}

// Demo flights for when the API is not available
const demoFlights = [
    {
        id: 1001,
        flightNumber: 'AI101',
        airline: 'Air India',
        origin: 'DEL',
        destination: 'BOM',
        departureTime: moment().add(1, 'day').set({ hour: 10, minute: 30 }).format(),
        arrivalTime: moment().add(1, 'day').set({ hour: 12, minute: 30 }).format(),
        price: 5500,
        seats: Array(60).fill(null).map((_, i) => ({
            id: i + 1,
            seatNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
            available: Math.random() > 0.3
        })),
        apiSourced: false,
        originCity: 'Delhi',
        originName: 'Indira Gandhi International Airport',
        destinationCity: 'Mumbai',
        destinationName: 'Chhatrapati Shivaji Maharaj International Airport'
    },
    {
        id: 1002,
        flightNumber: 'SG202',
        airline: 'SpiceJet',
        origin: 'BLR',
        destination: 'MAA',
        departureTime: moment().add(1, 'day').set({ hour: 14, minute: 45 }).format(),
        arrivalTime: moment().add(1, 'day').set({ hour: 16, minute: 0 }).format(),
        price: 3200,
        seats: Array(60).fill(null).map((_, i) => ({
            id: i + 1,
            seatNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
            available: Math.random() > 0.3
        })),
        apiSourced: false,
        originCity: 'Bangalore',
        originName: 'Kempegowda International Airport',
        destinationCity: 'Chennai',
        destinationName: 'Chennai International Airport'
    },
    {
        id: 1003,
        flightNumber: 'UK303',
        airline: 'Vistara',
        origin: 'BOM',
        destination: 'CCU',
        departureTime: moment().add(2, 'day').set({ hour: 9, minute: 15 }).format(),
        arrivalTime: moment().add(2, 'day').set({ hour: 11, minute: 45 }).format(),
        price: 6800,
        seats: Array(60).fill(null).map((_, i) => ({
            id: i + 1,
            seatNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
            available: Math.random() > 0.3
        })),
        apiSourced: false,
        originCity: 'Mumbai',
        originName: 'Chhatrapati Shivaji Maharaj International Airport',
        destinationCity: 'Kolkata',
        destinationName: 'Netaji Subhas Chandra Bose International Airport'
    },
    {
        id: 1004,
        flightNumber: 'DM130',
        airline: 'Demo Air',
        origin: 'BOM',
        destination: 'BLR',
        departureTime: moment().add(3, 'day').set({ hour: 8, minute: 17 }).format(),
        arrivalTime: moment().add(3, 'day').set({ hour: 9, minute: 17 }).format(),
        price: 5656,
        seats: Array(60).fill(null).map((_, i) => ({
            id: i + 1,
            seatNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
            available: Math.random() > 0.3
        })),
        apiSourced: false,
        originCity: 'Mumbai',
        originName: 'Chhatrapati Shivaji Maharaj International Airport',
        destinationCity: 'Bangalore',
        destinationName: 'Kempegowda International Airport'
    }
];

const FlightList = ({ isAdminView = false }: FlightListProps) => {
    const navigate = useNavigate();
    const [searchDate, setSearchDate] = useState<Moment | null>(moment().add(1, 'days')); // Default to tomorrow
    const [origin, setOrigin] = useState('');
    const [originAirport, setOriginAirport] = useState<Airport | undefined>(undefined);
    const [destination, setDestination] = useState('');
    const [destinationAirport, setDestinationAirport] = useState<Airport | undefined>(undefined);
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [apiAvailable, setApiAvailable] = useState(true);
    const [searchAttempted, setSearchAttempted] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState<number | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

    // Load search results from sessionStorage when component mounts
    useEffect(() => {
        try {
            const storedFlights = sessionStorage.getItem('searchResults');
            if (storedFlights) {
                const parsedFlights = JSON.parse(storedFlights);
                if (Array.isArray(parsedFlights) && parsedFlights.length > 0) {
                    setFlights(parsedFlights);
                    setSearchAttempted(true);
                    console.log('Loaded previous search results from sessionStorage:', parsedFlights.length);
                }
            }
        } catch (error) {
            console.error('Error loading search results from sessionStorage:', error);
        }
    }, []);

    const handleSearch = async () => {
        if (!origin || !destination || !searchDate) {
            setError('Please fill in all search fields');
            return;
        }

        // Validate search date is not in the past
        if (searchDate.isBefore(moment().startOf('day'))) {
            setError('Cannot search for flights in the past');
            return;
        }

        // Clear existing search results from sessionStorage before new search
        sessionStorage.removeItem('searchResults');

        setError('');
        setIsSearching(true);
        setSearchAttempted(true);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication required');
            
            try {
                // Try to use the actual API
                const response = await axios.get(`http://localhost:8080/api/flights/search`, {
                    params: {
                        origin: origin,
                        destination: destination,
                        departureDate: searchDate.format('YYYY-MM-DD')
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                // Process API response to include airport details
                const processedData = await Promise.all(response.data.map(async (flight: any) => {
                    // Enrich with airport details if missing
                    const enrichedFlight = {
                    ...flight,
                    apiSourced: flight.apiSourced !== undefined ? flight.apiSourced : true
                    };
                    
                    // Get origin airport details if needed
                    if (!flight.originCity || !flight.originName) {
                        try {
                            const originAirport = await getAirportByCode(flight.origin);
                            if (originAirport) {
                                enrichedFlight.originCity = originAirport.city;
                                enrichedFlight.originName = originAirport.name;
                                enrichedFlight.originCountry = originAirport.country;
                            }
                        } catch (err) {
                            console.warn(`Could not fetch details for origin airport ${flight.origin}`, err);
                        }
                    }
                    
                    // Get destination airport details if needed
                    if (!flight.destinationCity || !flight.destinationName) {
                        try {
                            const destinationAirport = await getAirportByCode(flight.destination);
                            if (destinationAirport) {
                                enrichedFlight.destinationCity = destinationAirport.city;
                                enrichedFlight.destinationName = destinationAirport.name;
                                enrichedFlight.destinationCountry = destinationAirport.country;
                            }
                        } catch (err) {
                            console.warn(`Could not fetch details for destination airport ${flight.destination}`, err);
                        }
                    }
                    
                    return enrichedFlight;
                }));
                
                if (processedData.length > 0) {
                    // We got actual flights from the API or database
                setFlights(processedData);
                // Store search results in sessionStorage for persistence when navigating back from seat selection
                sessionStorage.setItem('searchResults', JSON.stringify(processedData));
                setApiAvailable(true);
                } else {
                    // No flights found in database, use demo flights as fallback
                    console.log('No flights found in database, using demo flights as fallback');
                    setApiAvailable(false);
                    
                    // Filter demo flights for search
                    const filteredFlights = demoFlights.filter(flight => 
                        flight.origin.toLowerCase().includes(origin.toLowerCase()) &&
                        flight.destination.toLowerCase().includes(destination.toLowerCase()) &&
                        moment(flight.departureTime).isSame(searchDate, 'day')
                    );
                    
                    if (filteredFlights.length === 0) {
                        // Create a new demo flight with the search parameters if no matches
                        const originCode = originAirport ? originAirport.code : origin.toUpperCase();
                        const destinationCode = destinationAirport ? destinationAirport.code : destination.toUpperCase();
                        
                        const newDemoFlight = {
                            id: Math.floor(Math.random() * 10000) + 2000,
                            flightNumber: `DM${Math.floor(Math.random() * 900) + 100}`,
                            airline: ['Air India', 'IndiGo', 'SpiceJet', 'Vistara', 'GoAir'][Math.floor(Math.random() * 5)],
                            origin: originCode,
                            destination: destinationCode,
                            departureTime: searchDate.clone().set({ hour: Math.floor(Math.random() * 12) + 6, minute: [0, 15, 30, 45][Math.floor(Math.random() * 4)] }).format(),
                            arrivalTime: searchDate.clone().set({ hour: Math.floor(Math.random() * 12) + 6, minute: [0, 15, 30, 45][Math.floor(Math.random() * 4)] }).add(Math.floor(Math.random() * 3) + 1, 'hours').format(),
                            price: Math.floor(Math.random() * 8000) + 3000,
                            seats: Array(60).fill(null).map((_, i) => ({
                                id: i + 1,
                                seatNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
                                available: Math.random() > 0.3
                            })),
                            apiSourced: false,
                            // Add airport info
                            originCity: originAirport ? originAirport.city : origin,
                            originName: originAirport ? originAirport.name : `${origin} Airport`,
                            destinationCity: destinationAirport ? destinationAirport.city : destination,
                            destinationName: destinationAirport ? destinationAirport.name : `${destination} Airport`
                        };
                        
                        setFlights([newDemoFlight]);
                        // Store demo flight in sessionStorage for persistence
                        sessionStorage.setItem('searchResults', JSON.stringify([newDemoFlight]));
                    } else {
                        setFlights(filteredFlights);
                        // Store filtered flights in sessionStorage for persistence
                        sessionStorage.setItem('searchResults', JSON.stringify(filteredFlights));
                    }
                }
            } catch (error) {
                console.error('API error:', error);
                setApiAvailable(false);
                
                // Filter demo flights as fallback
                const filteredFlights = demoFlights.filter(flight => 
                    flight.origin.toLowerCase().includes(origin.toLowerCase()) &&
                    flight.destination.toLowerCase().includes(destination.toLowerCase()) &&
                    moment(flight.departureTime).isSame(searchDate, 'day')
                );
                
                if (filteredFlights.length === 0) {
                    // Create a new demo flight with the search parameters if no matches
                    const originCode = originAirport ? originAirport.code : origin.toUpperCase();
                    const destinationCode = destinationAirport ? destinationAirport.code : destination.toUpperCase();
                    
                    const newDemoFlight = {
                        id: Math.floor(Math.random() * 10000) + 2000,
                        flightNumber: `DM${Math.floor(Math.random() * 900) + 100}`,
                        airline: ['Air India', 'IndiGo', 'SpiceJet', 'Vistara', 'GoAir'][Math.floor(Math.random() * 5)],
                        origin: originCode,
                        destination: destinationCode,
                        departureTime: searchDate.clone().set({ hour: Math.floor(Math.random() * 12) + 6, minute: [0, 15, 30, 45][Math.floor(Math.random() * 4)] }).format(),
                        arrivalTime: searchDate.clone().set({ hour: Math.floor(Math.random() * 12) + 6, minute: [0, 15, 30, 45][Math.floor(Math.random() * 4)] }).add(Math.floor(Math.random() * 3) + 1, 'hours').format(),
                        price: Math.floor(Math.random() * 8000) + 3000,
                        seats: Array(60).fill(null).map((_, i) => ({
                            id: i + 1,
                            seatNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
                            available: Math.random() > 0.3
                        })),
                        apiSourced: false,
                        // Add airport info
                        originCity: originAirport ? originAirport.city : origin,
                        originName: originAirport ? originAirport.name : `${origin} Airport`,
                        destinationCity: destinationAirport ? destinationAirport.city : destination,
                        destinationName: destinationAirport ? destinationAirport.name : `${destination} Airport`
                    };
                    
                    setFlights([newDemoFlight]);
                    // Store demo flight in sessionStorage for persistence
                    sessionStorage.setItem('searchResults', JSON.stringify([newDemoFlight]));
                } else {
                    setFlights(filteredFlights);
                    // Store filtered flights in sessionStorage for persistence
                    sessionStorage.setItem('searchResults', JSON.stringify(filteredFlights));
                }
            }
        } catch (err: any) {
            console.error('Error during search:', err);
            setError(err.message || 'Error during search');
            setFlights([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleBooking = async (flightId: number) => {
        try {
            const flight = flights.find(f => f.id === flightId);
            if (!flight) {
                setError('Flight not found');
                return;
            }
            
            // Check if flight has already departed
            if (moment(flight.departureTime).isBefore(moment())) {
                setError(`Cannot book flight ${flight.flightNumber} as it has already departed.`);
                return;
            }
            
            if (!flight.seats || flight.seats.filter(s => s.available).length === 0) {
                setError('No seats available for this flight');
                return;
            }

            // Set booking in progress for this flight
            setBookingInProgress(flightId);
            setError('');
            
            console.log('Starting booking process for flight:', {
                flightId: flight.id,
                flightNumber: flight.flightNumber,
                apiSourced: flight.apiSourced
            });

            // If the flight is from the API, we need to save it to the database first
            if (flight.apiSourced) {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        throw new Error('Authentication required');
                    }

                    console.log('Flight is API-sourced, saving to database first');
                    
                    // Convert to API Flight type and save to database
                    const apiFlightData = convertToApiFlightType(flight);
                    
                    // Add a timeout to ensure we don't wait forever
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
                    });
                    
                    // Race between the API call and the timeout
                    const savedFlight = await Promise.race([
                        saveApiFlightToDatabase(apiFlightData, token),
                        timeoutPromise
                    ]) as ApiFlightType;
                    
                    console.log('Successfully saved API flight, navigating to seat selection:', savedFlight);
                    
                    // Navigate to the seat selection page using the new database ID
                    navigate(`/flights/${savedFlight.id}/seats`);
                } catch (error) {
                    console.error('Error saving API flight:', error);
                    let errorMessage = 'Failed to prepare flight for booking.';
                    
                    if (error instanceof Error) {
                        if (error.message.includes('timed out')) {
                            errorMessage = 'Request timed out. Please try again later.';
                        } else if (error.message.includes('401') || error.message.includes('Authentication')) {
                            errorMessage = 'Authentication error. Please log in again.';
                        } else if (error.message.includes('403')) {
                            errorMessage = 'You do not have permission to perform this action.';
                        } else if (error.message.includes('404')) {
                            errorMessage = 'The flight data could not be saved. Flight not found.';
                        } else if (error.message.includes('500')) {
                            errorMessage = 'Server error. Please try again later.';
                        } else {
                            errorMessage = `Failed to prepare flight for booking: ${error.message}`;
                        }
                    }
                    
                    setError(errorMessage);
                    setBookingInProgress(null);
                }
            } else {
                // For non-API flights, navigate directly to seat selection
                console.log('Flight is not API-sourced, navigating directly to seat selection');
                navigate(`/flights/${flightId}/seats`);
            }
        } catch (err) {
            console.error('Booking error:', err);
            if (err instanceof Error) {
                setError(`Booking error: ${err.message}`);
            } else {
                setError('An error occurred during booking');
            }
        } finally {
            setBookingInProgress(null);
        }
    };

    const getAvailableSeatsCount = (flight: Flight) => {
        return flight.seats ? flight.seats.filter(seat => seat.available).length : 0;
    };

    // Check if flight is departing soon (within 2 hours)
    const isDepartingSoon = (departureTime: string) => {
        const departure = moment(departureTime);
        const now = moment();
        const hoursDiff = departure.diff(now, 'hours');
        return hoursDiff >= 0 && hoursDiff <= 2;
    };

    // Function to get flight status display
    const getFlightStatus = (flight: Flight) => {
        // First check if the flight has a status from the server
        if (flight.status) {
            switch (flight.status) {
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
                    // Fall back to the time-based logic for unknown statuses
                    break;
            }
        }
        
        // Fall back to the existing time-based logic if no status is provided
        const departureTime = moment(flight.departureTime);
        const now = moment();
        
        // Check if flight has already departed
        if (departureTime.isBefore(now)) {
            return <Chip label="Departed" color="default" size="small" sx={{ fontWeight: 'bold' }} />;
        }
        
        // Check if flight is departing soon (within 2 hours)
        if (isDepartingSoon(flight.departureTime)) {
            return <Chip label="Departing Soon" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
        }
        
        const availableSeats = getAvailableSeatsCount(flight);
        const totalSeats = flight.seats ? flight.seats.length : 0;
        
        if (totalSeats === 0) {
            return <Chip label="Unknown" color="default" size="small" />;
        } else if (availableSeats === 0) {
            return <Chip label="Sold Out" color="error" size="small" />;
        } else if (availableSeats < totalSeats * 0.2) {
            return <Chip label="Almost Full" color="error" size="small" />;
        } else if (availableSeats < totalSeats * 0.5) {
            return <Chip label="Filling Up" color="warning" size="small" />;
        } else {
            return <Chip label="Available" color="success" size="small" />;
        }
    };

    // Function to get flight source icon and tooltip
    const getFlightSourceInfo = (flight: Flight) => {
        if (flight.apiSourced) {
            return (
                <Tooltip title="External API sourced flight">
                    <CloudIcon color="info" />
                </Tooltip>
            );
        } else {
            return (
                <Tooltip title="Internal database flight">
                    <Box component="span" sx={{ display: 'inline-flex' }}>
                        <FlightIcon color="primary" />
                    </Box>
                </Tooltip>
            );
        }
    };

    // Function to format flight duration
    const calculateDuration = (departureTime: string, arrivalTime: string) => {
        const start = moment(departureTime);
        const end = moment(arrivalTime);
        const duration = moment.duration(end.diff(start));
        const hours = Math.floor(duration.asHours());
        const minutes = duration.minutes();
        
        return `${hours}h ${minutes}m`;
    };

    // Handle airport selection for origin
    const handleOriginChange = (value: string, airport?: Airport) => {
        setOrigin(value);
        setOriginAirport(airport);
    };

    // Handle airport selection for destination
    const handleDestinationChange = (value: string, airport?: Airport) => {
        setDestination(value);
        setDestinationAirport(airport);
    };

    // Add helper functions to format airport display
    const getAirportDisplayShort = (code: string, city?: string) => {
        if (city) {
            return `${code} - ${city}`;
        }
        return code;
    };

    const getAirportDisplayLong = (code: string, city?: string, name?: string) => {
        if (city && name) {
            return `${code} - ${city} (${name})`;
        } else if (city) {
            return `${code} - ${city}`;
        }
        return code;
    };

    // Function to clear search results and form
    const handleClearResults = () => {
        setFlights([]);
        setSearchAttempted(false);
        setOrigin('');
        setDestination('');
        setOriginAirport(undefined);
        setDestinationAirport(undefined);
        sessionStorage.removeItem('searchResults');
        // Reset to default search date (tomorrow)
        setSearchDate(moment().add(1, 'days'));
        setError('');
    };

    return (
        <Container maxWidth={isAdminView ? false : "lg"} className="flight-list">
            <Box sx={{ py: 4 }}>
            {!isAdminView && (
                    <Typography variant="h4" component="h1" gutterBottom>
                        Find your perfect flight
                    </Typography>
            )}
            
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
            
                {/* Search Form */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                    <AirportAutocomplete 
                        label="From" 
                        value={origin} 
                        onChange={handleOriginChange}
                        placeholder="City or airport code"
                        required
                    />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                    <AirportAutocomplete 
                        label="To" 
                        value={destination} 
                        onChange={handleDestinationChange}
                        placeholder="City or airport code"
                        required
                    />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <DatePicker 
                            label="Date" 
                            value={searchDate} 
                            onChange={(newValue) => setSearchDate(newValue)}
                            disablePast
                                slotProps={{ 
                                    textField: { 
                                        fullWidth: true,
                                        size: isMobile ? "small" : "medium",
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                bgcolor: '#F5F8FA'
                                            }
                                        }
                                    } 
                                }}
                        />
                    </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12}>
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        flexDirection: isMobile ? 'column' : 'row'
                    }}>
                    <Button 
                        variant="contained" 
                            color="primary"
                        onClick={handleSearch}
                            disabled={isSearching}
                            fullWidth={isMobile}
                            sx={{ 
                                mt: 1,
                                bgcolor: '#FF7F23',
                                '&:hover': {
                                    bgcolor: '#E67D2E'
                                },
                                borderRadius: '8px',
                                flex: isMobile ? '1' : 'initial'
                            }}
                    >
                            {isSearching ? 'Searching...' : 'Search Flights'}
                    </Button>
                        
                        {searchAttempted && flights.length > 0 && (
                            <Button
                                variant="outlined"
                                onClick={handleClearResults}
                                fullWidth={isMobile}
                                sx={{ 
                                    mt: 1,
                                    borderRadius: '8px',
                                    flex: isMobile ? '1' : 'initial',
                                    borderColor: '#f44336',
                                    color: '#f44336',
                                    '&:hover': {
                                        borderColor: '#d32f2f',
                                        backgroundColor: 'rgba(244, 67, 54, 0.04)'
                                    }
                                }}
                            >
                                Clear Results
                            </Button>
                        )}
                    </Box>
                    </Grid>
                </Grid>
                
                {isSearching && <LinearProgress sx={{ mb: 3, borderRadius: '4px' }} />}
                
                {/* Flight Results */}
                {searchAttempted && !isSearching && flights.length === 0 && (
                    <Alert severity="info" sx={{ borderRadius: '8px' }}>
                        No flights found for your search criteria. Please try different dates or locations.
                    </Alert>
                )}
                
                {flights.length > 0 && (
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                            {flights.length} {flights.length === 1 ? 'Flight' : 'Flights'} Available
                        </Typography>
                            
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleClearResults}
                                sx={{ 
                                    borderColor: '#f44336',
                                    color: '#f44336',
                                    '&:hover': {
                                        borderColor: '#d32f2f',
                                        backgroundColor: 'rgba(244, 67, 54, 0.04)'
                                    }
                                }}
                            >
                                Clear Results
                            </Button>
                        </Box>
                        
                        {/* Mobile/Tablet Card View */}
                        {(isMobile || isTablet) && (
                            <Grid container spacing={2}>
                                {flights.map((flight) => (
                                    <Grid item xs={12} key={flight.id}>
                                        <Card 
                                            elevation={0}
                                            sx={{ 
                                                mb: 2,
                                                transition: 'transform 0.2s',
                                                borderRadius: '8px',
                                                boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                                                p: '0.25rem',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.15)'
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ pb: 1, p: '1.25rem' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <FlightIcon 
                                                            sx={{ 
                                                                mr: 1, 
                                                                color: '#E33069',
                                                                transform: 'rotate(45deg)'
                                                            }} 
                                                        />
                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                            {flight.airline} {flight.flightNumber}
                                                        </Typography>
                                                    </Box>
                                                    {getFlightStatus(flight)}
                                                </Box>
                                                
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                    <Box>
                                                        <Typography variant="h6">{getAirportDisplayShort(flight.origin, flight.originCity)}</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {flight.originName}
                                                            {flight.originCountry && flight.originCountry !== 'India' && 
                                                                `, ${flight.originCountry}`}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {moment(flight.departureTime).format('MMM D, YYYY')}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                                                            {calculateDuration(flight.departureTime, flight.arrivalTime)}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                            <Box sx={{ height: 1, bgcolor: 'grey.400', flex: 1 }} />
                                                            <ArrowRightAltIcon sx={{ color: '#9C27B0', mx: 0.5 }} />
                                                            <Box sx={{ height: 1, bgcolor: 'grey.400', flex: 1 }} />
                                                        </Box>
                                                    </Box>
                                                    
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="h6">{getAirportDisplayShort(flight.destination, flight.destinationCity)}</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {flight.destinationName}
                                                            {flight.destinationCountry && flight.destinationCountry !== 'India' && 
                                                                `, ${flight.destinationCountry}`}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {moment(flight.arrivalTime).format('MMM D, YYYY')}
                                                        </Typography>
                                                    </Box>
                </Box>
                                                
                                                <Divider sx={{ my: 1 }} />
                                                
                                                <Grid container spacing={1} sx={{ mt: 1 }}>
                                                    <Grid item xs={6}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <AirlineSeatReclineNormalIcon fontSize="small" sx={{ mr: 0.5, color: '#9C27B0' }} />
                                                            <Typography variant="body2">
                                                                {getAvailableSeatsCount(flight)} seats available
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                            <Typography variant="h6" color="#FF7F23" fontWeight="bold">
                                                                {formatPrice(flight.price)}
                                                            </Typography>
                </Box>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                            
                                            <CardActions sx={{ px: '1.25rem', pb: '1.25rem', pt: 0 }}>
                                                <Button
                                                    variant="contained"
                                                    fullWidth
                                                    onClick={() => handleBooking(flight.id)}
                                                    disabled={bookingInProgress === flight.id}
                                                    sx={{
                                                        bgcolor: '#FF7F23',
                                                        '&:hover': {
                                                            bgcolor: '#E67D2E'
                                                        },
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    {bookingInProgress === flight.id ? 'Processing...' : 'Select Flight'}
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                        
                        {/* Desktop Table View */}
                        {!isMobile && !isTablet && (
                            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, borderRadius: '8px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' }}>
                                <Table aria-label="flights table">
                                    <TableHead sx={{ 
                                        background: 'linear-gradient(45deg, #E33069 30%, #9C27B0 90%)'
                                    }}>
                            <TableRow>
                                            <TableCell sx={{ 
                                                color: 'white', 
                                                fontWeight: 'bold',
                                                padding: '16px',
                                                borderTopLeftRadius: '8px'
                                            }}>Flight Number</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>From</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>To</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>Departure</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>Arrival</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>Price (INR)</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>Available Seats</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>Status</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold', padding: '16px' }}>Source</TableCell>
                                            <TableCell sx={{ 
                                                color: 'white', 
                                                fontWeight: 'bold',
                                                padding: '16px',
                                                borderTopRightRadius: '8px'
                                            }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                                        {flights.map((flight) => (
                                            <TableRow 
                                                key={flight.id}
                                                hover
                                                sx={{
                                                    transition: 'background-color 0.2s',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                                    }
                                                }}
                                            >
                                        <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <FlightIcon 
                                                            sx={{ 
                                                                mr: 1, 
                                                                color: '#E33069',
                                                                transform: 'rotate(45deg)'
                                                            }} 
                                                        />
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold">
                                            {flight.flightNumber}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                    {flight.airline}
                                                </Typography>
                                                        </Box>
                                                    </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {getAirportDisplayShort(flight.origin, flight.originCity)}
                                            </Typography>
                                            {flight.originName && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {flight.originName}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {getAirportDisplayShort(flight.destination, flight.destinationCity)}
                                            </Typography>
                                            {flight.destinationName && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {flight.destinationName}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                                    <Typography variant="body2">
                                                        {moment(flight.departureTime).format('MMM D, YYYY')}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {moment(flight.departureTime).format('h:mm A')}
                                                    </Typography>
                                        </TableCell>
                                        <TableCell>
                                                    <Typography variant="body2">
                                                        {moment(flight.arrivalTime).format('MMM D, YYYY')}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {moment(flight.arrivalTime).format('h:mm A')}
                                                    </Typography>
                                        </TableCell>
                                        <TableCell>
                                                    <Typography variant="body2" fontWeight="bold" color="#FF7F23">
                                                        {formatPrice(flight.price)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{getAvailableSeatsCount(flight)}</TableCell>
                                                <TableCell>{getFlightStatus(flight)}</TableCell>
                                                <TableCell>{getFlightSourceInfo(flight)}</TableCell>
                                                <TableCell>
                                                    <Button 
                                                        variant="contained" 
                                                        size="small"
                                                        onClick={() => handleBooking(flight.id)}
                                                        disabled={bookingInProgress === flight.id}
                                                        sx={{
                                                            bgcolor: '#FF7F23',
                                                            '&:hover': {
                                                                bgcolor: '#E67D2E'
                                                            },
                                                            borderRadius: '8px'
                                                        }}
                                                    >
                                                        {bookingInProgress === flight.id ? 'Processing...' : 'Select'}
                                                    </Button>
                                        </TableCell>
                                    </TableRow>
                                        ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                        )}
                    </>
            )}
            </Box>
        </Container>
    );
};

export default FlightList;