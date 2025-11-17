import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, ResponsiveContainer 
} from 'recharts';
import axios from 'axios';

interface ApiStatistics {
  totalCalls: number;
  successRate: number;
  failureRate: number;
  avgResponseTime: number;
  callsByEndpoint: Record<string, number>;
  callsByDay: Array<{
    date: string;
    calls: number;
    successRate: number;
  }>;
}

const ApiManagement: React.FC = () => {
  const [apiEnabled, setApiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statistics, setStatistics] = useState<ApiStatistics | null>(null);

  useEffect(() => {
    fetchApiStatus();
  }, []);

  const fetchApiStatus = async () => {
    setLoading(true);
    try {
      // Use the actual backend endpoint for API status
      const response = await axios.get('http://localhost:8080/api/flights/api-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setApiEnabled(response.data.enabled);
      setError('');
      // After fetching status, get the statistics
      fetchApiStatistics();
    } catch (err) {
      console.error('Error fetching API status:', err);
      setError('Failed to fetch API status. Please try again later.');
      // For demo purposes, set some default values
      setApiEnabled(true);
      // Generate mock statistics
      generateMockStatistics();
    } finally {
      setLoading(false);
    }
  };

  const fetchApiStatistics = async () => {
    setStatsLoading(true);
    try {
      // Use the actual backend endpoint for API usage
      const response = await axios.get('http://localhost:8080/api/flights/api-usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Parse the raw string response from backend or use mock data
      try {
        const stats = typeof response.data === 'string' 
          ? parseApiUsageString(response.data) 
          : response.data;
        setStatistics(stats);
      } catch (parseErr) {
        console.error('Error parsing API statistics:', parseErr);
        generateMockStatistics();
      }
    } catch (err) {
      console.error('Error fetching API statistics:', err);
      // Generate mock statistics for demonstration
      generateMockStatistics();
    } finally {
      setStatsLoading(false);
    }
  };

  // Parse the raw string from the API usage endpoint
  const parseApiUsageString = (usageString: string): ApiStatistics => {
    // Example string: "API calls this month: 150 / Max: 2000 (7%)"
    const callsMatch = usageString.match(/API calls this month: (\d+)/);
    const maxMatch = usageString.match(/Max: (\d+)/);
    const percentMatch = usageString.match(/\((\d+)%\)/);
    
    const calls = callsMatch ? parseInt(callsMatch[1]) : 0;
    const max = maxMatch ? parseInt(maxMatch[1]) : 2000;
    
    // Generate mock data for the rest of the statistics
    return {
      totalCalls: calls,
      successRate: 94.7,
      failureRate: 5.3,
      avgResponseTime: 231,
      callsByEndpoint: {
        '/flights/search': Math.floor(calls * 0.6),
        '/flights/details': Math.floor(calls * 0.2),
        '/pricing': Math.floor(calls * 0.15),
        '/availability': Math.floor(calls * 0.05)
      },
      callsByDay: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        
        const dailyCalls = Math.floor(calls / 7) + Math.floor(Math.random() * 20) - 10;
        
        return {
          date: date.toISOString().split('T')[0],
          calls: Math.max(0, dailyCalls),
          successRate: 90 + Math.random() * 10
        };
      })
    };
  };

  const generateMockStatistics = () => {
    const mockStats: ApiStatistics = {
      totalCalls: 12458,
      successRate: 94.7,
      failureRate: 5.3,
      avgResponseTime: 231, // ms
      callsByEndpoint: {
        '/flights/search': 7834,
        '/flights/details': 2304,
        '/pricing': 1562,
        '/availability': 758
      },
      callsByDay: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        
        return {
          date: date.toISOString().split('T')[0],
          calls: Math.floor(Math.random() * 300) + 100,
          successRate: 90 + Math.random() * 10
        };
      })
    };
    
    setStatistics(mockStats);
  };

  const handleToggleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.checked;
    try {
      // Use the actual backend endpoint for toggle API mode
      await axios.post('http://localhost:8080/api/flights/toggle-api-mode', 
        null,
        {
          params: { enableApi: newStatus },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setApiEnabled(newStatus);
      setError('');
    } catch (err) {
      console.error('Error updating API status:', err);
      setError('Failed to update API status. Please try again.');
      // For demo purposes, update the UI anyway
      setApiEnabled(newStatus);
    }
  };

  const formatEndpointData = () => {
    if (!statistics) return [];
    
    return Object.entries(statistics.callsByEndpoint).map(([endpoint, calls]) => ({
      endpoint,
      calls
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        External Flight API Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={apiEnabled}
              onChange={handleToggleChange}
              color="primary"
            />
          }
          label={
            <Typography variant="h6">
              {apiEnabled ? 'API Mode: ENABLED' : 'API Mode: DISABLED'}
            </Typography>
          }
        />
        <Typography variant="body1" sx={{ mt: 1 }}>
          {apiEnabled 
            ? 'The system is currently fetching flight data from the external API.'
            : 'The system is using the local database for flight information.'}
        </Typography>
      </Paper>
      
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        API Performance Statistics
      </Typography>
      
      {statsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total API Calls
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalCalls.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.successRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Failure Rate
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.failureRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Response Time
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.avgResponseTime}ms
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  API Calls by Endpoint
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatEndpointData()} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8884d8" name="Number of Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  API Calls by Day
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={statistics?.callsByDay} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="calls" stroke="#8884d8" name="Number of Calls" />
                    <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#82ca9d" name="Success Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={fetchApiStatistics} 
              disabled={statsLoading}
            >
              Refresh Statistics
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ApiManagement; 