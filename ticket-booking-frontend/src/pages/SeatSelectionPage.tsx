import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { webSocketService, SeatSelectionRequest } from '../services/websocket.service';

// This interface represents a seat structure
interface Seat {
    id: number;
    seatNumber: string;
    status: 'AVAILABLE' | 'SELECTED' | 'BOOKED';
    price: number;
}

const SeatSelectionPage: React.FC = () => {
    // Get flightId from URL parameters
    const { flightId } = useParams<{ flightId: string }>();
    const flightIdNumber = parseInt(flightId || '0', 10);
    console.log('Parsed flightId:', { raw: flightId, parsed: flightIdNumber });

    // State for seats, loading status, and errors
    const [seats, setSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

    // Fetch seats when component mounts
    useEffect(() => {
        const fetchSeats = async () => {
            try {
                setLoading(true);
                // Replace with your actual API call to fetch seats
                const response = await fetch(`/api/flights/${flightIdNumber}/seats`);
                if (!response.ok) {
                    throw new Error('Failed to fetch seats');
                }
                const data = await response.json();
                setSeats(data);
                setError(null);
            } catch (err) {
                setError('Error fetching seats. Please try again later.');
                console.error('Error fetching seats:', err);
            } finally {
                setLoading(false);
            }
        };

        if (flightIdNumber > 0) {
            fetchSeats();

            // Subscribe to seat updates
            webSocketService.subscribeSeatUpdates(flightIdNumber, (update) => {
                // Update the seat status in our local state
                setSeats(prevSeats => prevSeats.map(seat =>
                    seat.id === update.seatId
                        ? { ...seat, status: update.status as any }
                        : seat
                ));
            });
        }

        // Cleanup subscription on unmount
        return () => {
            if (flightIdNumber > 0) {
                webSocketService.unsubscribeSeatUpdates(flightIdNumber);
            }
        };
    }, [flightIdNumber]);

    // Handle seat selection
    const handleSeatSelect = async (seatId: number) => {
        try {
            // Find the seat to check if it's already selected or booked
            const seat = seats.find(s => s.id === seatId);
            if (!seat || seat.status === 'BOOKED') {
                return; // Can't select booked seats
            }

            // Create the request object
            const request: SeatSelectionRequest = {
                seatId: seatId,
                flightId: flightIdNumber
            };

            // If this seat is already selected by this user, release it
            if (selectedSeat === seatId) {
                await webSocketService.releaseSeat(request);
                setSelectedSeat(null);
                return;
            }

            // If another seat is selected, release it first
            if (selectedSeat !== null) {
                const previousRequest: SeatSelectionRequest = {
                    seatId: selectedSeat,
                    flightId: flightIdNumber
                };
                await webSocketService.releaseSeat(previousRequest);
            }

            // Select the new seat
            const success = await webSocketService.selectSeat(request);
            if (success) {
                setSelectedSeat(seatId);
            }
        } catch (err) {
            console.error('Error selecting seat:', err);
            setError('Error selecting seat. Please try again.');
        }
    };

    // Create a grid of seats
    const renderSeats = () => {
        return (
            <div className="seat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {seats.map(seat => (
                    <div
                        key={seat.id}
                        className={`seat ${seat.status.toLowerCase()} ${selectedSeat === seat.id ? 'my-selection' : ''}`}
                        onClick={() => handleSeatSelect(seat.id)}
                        style={{
                            padding: '10px',
                            textAlign: 'center',
                            cursor: seat.status === 'BOOKED' ? 'not-allowed' : 'pointer',
                            backgroundColor:
                                seat.status === 'BOOKED' ? '#ccc' :
                                    seat.status === 'SELECTED' ? '#ffcc80' :
                                        selectedSeat === seat.id ? '#4caf50' : '#e0f7fa',
                            border: '1px solid #999'
                        }}
                    >
                        {seat.seatNumber}<br />
                        ${seat.price}
                    </div>
                ))}
            </div>
        );
    };

    console.log('SeatSelectionPage rendering with flightId:', flightIdNumber);

    return (
        <div className="seat-selection-container" style={{ padding: '20px' }}>
            <h1>Select Your Seat</h1>

            {loading && <p>Loading seats...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!loading && !error && (
                <>
                    <div className="seat-legend" style={{ margin: '20px 0', display: 'flex', gap: '20px' }}>
                        <div><span style={{ backgroundColor: '#e0f7fa', padding: '5px', border: '1px solid #999' }}>Available</span></div>
                        <div><span style={{ backgroundColor: '#ffcc80', padding: '5px', border: '1px solid #999' }}>Selected by others</span></div>
                        <div><span style={{ backgroundColor: '#4caf50', padding: '5px', border: '1px solid #999' }}>Your selection</span></div>
                        <div><span style={{ backgroundColor: '#ccc', padding: '5px', border: '1px solid #999' }}>Booked</span></div>
                    </div>

                    {renderSeats()}

                    {selectedSeat && (
                        <div style={{ marginTop: '20px' }}>
                            <button
                                style={{ padding: '10px 20px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '4px' }}
                                onClick={() => {
                                    // Add your booking logic here
                                    alert(`Proceed to book seat ${seats.find(s => s.id === selectedSeat)?.seatNumber}`);
                                }}
                            >
                                Continue to Booking
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SeatSelectionPage;