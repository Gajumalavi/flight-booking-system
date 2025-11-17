import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { webSocketService, SeatSelectionRequest } from '../services/websocket.service';

function TestControls({ flightId }: { flightId: number }) {
    const [testStatus, setTestStatus] = useState<string>('Not started');
    const [connectedStatus, setConnectedStatus] = useState<boolean>(false);

    // Check connection status periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const isConnected = webSocketService.isConnected;
            setConnectedStatus(isConnected);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleTestConnection = async () => {
        setTestStatus('Testing connection...');
        try {
            await webSocketService.connect();
            setTestStatus('Connection successful!');
        } catch (error) {
            setTestStatus(`Connection failed: ${error}`);
        }
    };

    const handleTestSubscription = async () => {
        setTestStatus('Testing subscription...');
        try {
            const success = await webSocketService.subscribeSeatUpdates(flightId, (update) => {
                console.log('Received update:', update);
                setTestStatus(`Received update for seat ${update.seatId}`);
            });

            if (success) {
                setTestStatus('Subscription successful!');
            } else {
                setTestStatus('Subscription failed');
            }
        } catch (error) {
            setTestStatus(`Subscription failed: ${error}`);
        }
    };

    const handleTestDisconnect = () => {
        setTestStatus('Testing forced disconnect...');
        webSocketService.disconnect();
        setTestStatus('Disconnected. Watch for automatic reconnection...');
    };

    const handleTestSelectSeat = async () => {
        const testSeatId = 1; // Replace with an actual available seat ID
        setTestStatus('Testing seat selection...');
        try {
            const request: SeatSelectionRequest = {
                seatId: testSeatId,
                flightId: flightId
            };
            
            const success = await webSocketService.selectSeat(request);
            if (success) {
                setTestStatus(`Successfully selected seat ${testSeatId}`);
            } else {
                setTestStatus('Seat selection failed');
            }
        } catch (error) {
            setTestStatus(`Seat selection error: ${error}`);
        }
    };

    return (
        <Paper
            elevation={4}
            sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                padding: 2,
                zIndex: 9999,
                width: 300,
                backgroundColor: '#f5f5f5'
            }}
        >
            <Typography variant="h6" gutterBottom>WebSocket Test Panel</Typography>
            
            <Box sx={{ mb: 1 }}>
                <Typography>
                    Connection Status: 
                    <Box component="span" sx={{ 
                        color: connectedStatus ? 'success.main' : 'error.main',
                        fontWeight: 'bold',
                        ml: 1
                    }}>
                        {connectedStatus ? 'Connected' : 'Disconnected'}
                    </Box>
                </Typography>
            </Box>
            
            <Typography sx={{ mb: 2 }}>Test Status: {testStatus}</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="contained" color="primary" onClick={handleTestConnection}>
                    Test Connection
                </Button>
                <Button variant="contained" color="secondary" onClick={handleTestSubscription}>
                    Test Subscription
                </Button>
                <Button variant="contained" color="error" onClick={handleTestDisconnect}>
                    Force Disconnect
                </Button>
                <Button variant="contained" color="success" onClick={handleTestSelectSeat}>
                    Test Select Seat
                </Button>
            </Box>
        </Paper>
    );
}

export default TestControls;