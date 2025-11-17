import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, TextField, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import dayjs from 'dayjs';
import { downloadRevenueReport } from '../../services/api';

const RevenueReportTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'DAILY' | 'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Single date for daily reports
  const [singleDate, setSingleDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  // Month and year for monthly reports
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  
  // Year for annual reports
  const [annualYear, setAnnualYear] = useState(dayjs().year());

  const handlePeriodChange = (newPeriod: 'DAILY' | 'MONTHLY' | 'ANNUAL') => {
    setPeriod(newPeriod);
    setValidationError(null);
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setValidationError(null);
    
    let startDate = '';
    let endDate = '';
    
    try {
      // Set date range based on period
      if (period === 'DAILY') {
        if (!singleDate) {
          setValidationError('Date is required.');
          setLoading(false);
          return;
        }
        // For daily, start and end are the same day
        startDate = singleDate;
        endDate = singleDate;
      } 
      else if (period === 'MONTHLY') {
        // For monthly, start is first day of month, end is last day
        const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
        startDate = `${selectedYear}-${monthStr}-01`;
        endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
      } 
      else if (period === 'ANNUAL') {
        // For annual, start is first day of year, end is last day
        startDate = `${annualYear}-01-01`;
        endDate = `${annualYear}-12-31`;
      }

      const token = localStorage.getItem('token') || '';
      const blob = await downloadRevenueReport(token, { startDate, endDate, period });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-report-${period.toLowerCase()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Generate array of months for dropdown
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  // Generate years for dropdown (last 5 years to next 5 years)
  const currentYear = dayjs().year();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Revenue Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Download daily, monthly, and annual revenue reports as PDF. Select the period type and timeframe.
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Report Period</InputLabel>
          <Select
            value={period}
            label="Report Period"
            onChange={(e) => handlePeriodChange(e.target.value as 'DAILY' | 'MONTHLY' | 'ANNUAL')}
          >
            <MenuItem value="DAILY">Daily</MenuItem>
            <MenuItem value="MONTHLY">Monthly</MenuItem>
            <MenuItem value="ANNUAL">Annual</MenuItem>
          </Select>
        </FormControl>
        
        {/* Dynamic date selectors based on period */}
        {period === 'DAILY' && (
          <TextField
            label="Select Date"
            type="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        )}
        
        {period === 'MONTHLY' && (
          <>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {months.map(month => (
                  <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
        
        {period === 'ANNUAL' && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={annualYear}
              label="Year"
              onChange={(e) => setAnnualYear(Number(e.target.value))}
            >
              {years.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleDownload} 
          disabled={loading} 
          sx={{ minWidth: 200, height: '56px' }}
        >
          {loading ? <CircularProgress size={24} /> : 'Generate Report'}
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

export default RevenueReportTab; 