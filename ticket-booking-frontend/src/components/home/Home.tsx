import React from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Paper,
    Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';

const Home = () => {
    const navigate = useNavigate();

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box textAlign="center" mb={4}>
                <Typography variant="h3" gutterBottom>
                    Welcome to Ticket Booking
                </Typography>
                <Typography variant="h6" color="textSecondary">
                    Book your flights with ease
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 3,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <FlightTakeoffIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
                        <Typography variant="h5" gutterBottom>
                            Search Flights
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Find the best flights for your journey
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/flights')}
                            sx={{ mt: 'auto' }}
                        >
                            Search Now
                        </Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 3,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <PersonIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
                        <Typography variant="h5" gutterBottom>
                            My Profile
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Manage your account and preferences
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/profile')}
                            sx={{ mt: 'auto' }}
                        >
                            View Profile
                        </Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper
                        sx={{
                            p: 3,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <HistoryIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
                        <Typography variant="h5" gutterBottom>
                            Booking History
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            View and manage your bookings
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/bookings')}
                            sx={{ mt: 'auto' }}
                        >
                            View Bookings
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Home;