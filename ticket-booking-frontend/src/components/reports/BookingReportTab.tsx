import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, TextField } from '@mui/material';
import dayjs from 'dayjs';
import { downloadBookingReport } from '../../services/api';

const BookingReportTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setValidationError(null);
    // Validation
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
      const blob = await downloadBookingReport(token, { startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'booking-report.pdf';
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
        Booking Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Download booking confirmation and history reports as PDF. Filter by date range.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" color="primary" onClick={handleDownload} disabled={loading} sx={{ minWidth: 200 }}>
          {loading ? <CircularProgress size={24} /> : 'Download Booking Report'}
        </Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      )}
      {validationError && (
        <Typography color="error" sx={{ mt: 2 }}>{validationError}</Typography>
      )}
    </Paper>
  );
};

export default BookingReportTab; 