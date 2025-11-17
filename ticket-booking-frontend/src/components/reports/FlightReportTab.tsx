import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, TextField, Grid } from '@mui/material';
import dayjs from 'dayjs';
import { downloadFlightReport } from '../../services/api';
import AirportAutocomplete, { Airport } from '../common/AirportAutocomplete';

const FlightReportTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOriginChange = (value: string, airport?: Airport) => {
    setOrigin(value);
  };

  const handleDestinationChange = (value: string, airport?: Airport) => {
    setDestination(value);
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setValidationError(null);
    
    // Validation
    if (!origin) {
      setValidationError('Origin airport is required');
      setLoading(false);
      return;
    }
    
    if (!destination) {
      setValidationError('Destination airport is required');
      setLoading(false);
      return;
    }
    
    if (origin === destination) {
      setValidationError('Origin and destination cannot be the same');
      setLoading(false);
      return;
    }
    
    if (!startDate || !endDate) {
      setValidationError('Both start and end dates are required.');
      setLoading(false);
      return;
    }
    
    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      setValidationError('End date cannot be before start date.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || '';
      const blob = await downloadFlightReport(token, { origin, destination, startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flight-report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Flight Analytics Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Download flight search analytics, route popularity, and price analysis as PDF. Filter by route and date range.
      </Typography>
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={3}>
          <AirportAutocomplete 
            label="From"
            placeholder="City, airport, or code"
            value={origin}
            onChange={handleOriginChange}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <AirportAutocomplete 
            label="To"
            placeholder="City, airport, or code"
            value={destination}
            onChange={handleDestinationChange}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleDownload} 
            disabled={loading || !origin || !destination} 
            sx={{ minWidth: 200, height: '56px' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Report'}
          </Button>
        </Grid>
      </Grid>
      
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      )}
      {validationError && (
        <Typography color="error" sx={{ mt: 2 }}>{validationError}</Typography>
      )}
    </Paper>
  );
};

export default FlightReportTab; 