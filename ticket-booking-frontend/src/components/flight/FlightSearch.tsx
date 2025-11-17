import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    CircularProgress,
    Alert,
    Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';
import { searchFlights } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import AirportAutocomplete, { Airport } from '../common/AirportAutocomplete';

// Import the API_BASE_URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

interface FormData {
    origin: string;
    destination: string;
    departureDate: moment.Moment | null;
    originAirport?: Airport;
    destinationAirport?: Airport;
}

const FlightSearch: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<FormData>({
        origin: '',
        destination: '',
        departureDate: moment().add(1, 'day')
    });
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleOriginChange = (value: string, airport?: Airport) => {
        setFormData(prev => ({
            ...prev,
            origin: value,
            originAirport: airport
        }));
    };

    const handleDestinationChange = (value: string, airport?: Airport) => {
        setFormData(prev => ({
            ...prev,
            destination: value,
            destinationAirport: airport
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            // Enhanced validation
            if (!formData.origin.trim()) {
                throw new Error('Please select an origin airport');
            }
            
            if (!formData.destination.trim()) {
                throw new Error('Please select a destination airport');
            }
            
            if (formData.origin === formData.destination) {
                throw new Error('Origin and destination cannot be the same');
            }
            
            if (!formData.departureDate) {
                throw new Error('Please select a departure date');
            }
            
            // Ensure departure date is not in the past
            const today = moment().startOf('day');
            if (formData.departureDate.isBefore(today)) {
                throw new Error('Departure date cannot be in the past');
            }
            
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const departureDate = formData.departureDate.format('YYYY-MM-DD');
            const response = await searchFlights(token, formData.origin, formData.destination, departureDate);
            
            // Navigate to results with the flights data
            navigate('/flight-results', { state: { 
                flights: response,
                searchData: {
                    origin: formData.origin,
                    destination: formData.destination,
                    departureDate: departureDate,
                    originAirport: formData.originAirport,
                    destinationAirport: formData.destinationAirport
                }
            }});
        } catch (err) {
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred during search');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Search for Flights</Typography>
            
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <AirportAutocomplete 
                            label="From"
                            placeholder="City, airport, or code (e.g., Mumbai, BOM)"
                            value={formData.origin}
                            onChange={handleOriginChange}
                            required
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <AirportAutocomplete 
                            label="To"
                            placeholder="City, airport, or code (e.g., Delhi, DEL)"
                            value={formData.destination}
                            onChange={handleDestinationChange}
                            required
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <LocalizationProvider dateAdapter={AdapterMoment}>
                            <DatePicker
                                label="Departure Date"
                                value={formData.departureDate}
                                onChange={(date) => setFormData(prev => ({ ...prev, departureDate: date }))}
                                slotProps={{ textField: { fullWidth: true, required: true } }}
                                disablePast
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        size="large"
                        disabled={loading}
                        sx={{ minWidth: 150 }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Search Flights'}
                    </Button>
                </Box>
            </form>
        </Paper>
    );
};

export default FlightSearch; 