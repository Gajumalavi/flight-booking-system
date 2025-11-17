import React, { useState, useEffect } from 'react';
import { Box, Grid, Button, Typography, Paper, Alert, CircularProgress, Snackbar } from '@mui/material';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getAvailableSeats, getAllSeatsForFlight, selectSeat, releaseSeat } from '../../services/api';
import { webSocketService } from '../../services/websocket.service';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import SyncIcon from '@mui/icons-material/Sync';

// Add a storage event key for cross-tab communication
const SEAT_SELECTION_STORAGE_KEY = 'seat_selection_update';

interface Seat {
    id: number;
    seatNumber: string;
    available: boolean;
    booked: boolean;
}

interface SeatSelectionProps {
    flightId: number;
    onSeatSelect?: (seatId: number, seatNumber: string) => void;
    selectedSeats?: number[];
}

interface SeatSelectionResponse {
    success: boolean;
    message: string;
    seatId?: number;
}

// Add a new interface for seat update events
interface SeatSelectionEvent {
    flightId: number;
    seatId: number;
    action: 'select' | 'release';
    timestamp: number;
}

const SeatSelection: React.FC<SeatSelectionProps> = ({ 
    flightId, 
    onSeatSelect, 
    selectedSeats = [] 
}) => {
    const [seats, setSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [initialSeatCount, setInitialSeatCount] = useState<number>(0);
    const [lastVerificationTime, setLastVerificationTime] = useState<number>(0);
    const VERIFICATION_INTERVAL = 2000; // Reduced from 5000 to 2000 ms for more frequent checks
    const [holdExpirationMessage, setHoldExpirationMessage] = useState<string | null>(null);
    const [pendingOperations, setPendingOperations] = useState<Set<number>>(new Set());
    const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
    const [lastBroadcastTime, setLastBroadcastTime] = useState<number>(0);

    // Add a function to broadcast seat selection changes to other tabs/windows
    const broadcastSeatUpdate = (seatId: number, action: 'select' | 'release') => {
        try {
            // Don't broadcast too frequently (prevent loops)
            const now = Date.now();
            if (now - lastBroadcastTime < 500) return;
            
            setLastBroadcastTime(now);
            
            const event: SeatSelectionEvent = {
                flightId,
                seatId,
                action,
                timestamp: now
            };
            
            // Store in localStorage to trigger storage event in other tabs
            localStorage.setItem(SEAT_SELECTION_STORAGE_KEY, JSON.stringify(event));
            
            // Remove after a short delay to allow for future events
            setTimeout(() => {
                localStorage.removeItem(SEAT_SELECTION_STORAGE_KEY);
            }, 100);
            
            console.log(`[SeatSync] Broadcasting ${action} for seat ${seatId} on flight ${flightId}`);
        } catch (error) {
            console.error('[SeatSync] Error broadcasting seat update:', error);
        }
    };
    
    // Listen for seat selection broadcasts from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === SEAT_SELECTION_STORAGE_KEY && event.newValue) {
                try {
                    const data: SeatSelectionEvent = JSON.parse(event.newValue);
                    
                    // Only process events for our current flight
                    if (data.flightId === flightId) {
                        console.log(`[SeatSync] Received ${data.action} for seat ${data.seatId} from another tab`);
                        
                        // Force immediate seat verification
                        verifyAllSeats();
                    }
                } catch (error) {
                    console.error('[SeatSync] Error processing seat update from storage:', error);
                }
            }
        };
        
        // Add listener
        window.addEventListener('storage', handleStorageChange);
        
        // Clean up
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [flightId]);

    // Force WebSocket reconnect when component mounts
    useEffect(() => {
        console.log('SeatSelection: Forcing WebSocket reconnect for better real-time updates');
        // Force a reconnect to ensure fresh connection for seat updates
        webSocketService.forceReconnect().then(() => {
            console.log('SeatSelection: WebSocket reconnected successfully');
        }).catch(err => {
            console.error('SeatSelection: WebSocket reconnect failed:', err);
        });
        
        // Set up an interval to refresh seats more frequently
        const refreshInterval = setInterval(() => {
            refreshSeats();
        }, 5000); // Refresh all seats every 5 seconds (reduced from 10s)
        
        return () => {
            clearInterval(refreshInterval);
        };
    }, []);

    // Update the WebSocket subscription for real-time updates
    useEffect(() => {
        if (flightId) {
            const handleSeatUpdate = (update: any) => {
                if (update.flightId === flightId) {
                    console.log('WebSocket: Received seat update:', update);
                    
                    // Update the seat in our local state
                    setSeats(prevSeats => {
                        return prevSeats.map(seat => {
                            if (seat.id === update.seatId) {
                                // Update the seat with the new data from WebSocket
                                const isBooked = update.status === "CONFIRMED";
                                
                                // Show notification for hold expired
                                if (update.status === "HOLD_EXPIRED" || update.status === "FIXED_INCONSISTENCY") {
                                    const seatNumber = seat.seatNumber;
                                    setTimeout(() => {
                                        setError(`Seat ${seatNumber} hold time expired and is now available for booking.`);
                                        setHoldExpirationMessage(`Seat ${seatNumber} is now available for booking!`);
                                    }, 100);
                                }
                                
                                return { 
                                    ...seat, 
                                    available: update.available,
                                    booked: isBooked // Set booked status based on update status
                                };
                            }
                            return seat;
                        });
                    });

                    // Update selected seats list if seat was released (including hold expiration)
                    if ((update.status === "RELEASED" || update.status === "HOLD_EXPIRED") && 
                        selectedSeats.includes(update.seatId)) {
                        const seatNumber = seats.find(s => s.id === update.seatId)?.seatNumber || '';
                        onSeatSelect && onSeatSelect(update.seatId, seatNumber);
                    }
                    
                    // Force a seat verification after any update
                    verifyAllSeats();
                }
            };

            // Subscribe to seat updates for this flight
            console.log(`Subscribing to seat updates for flight ${flightId}`);
            webSocketService.subscribeSeatUpdates(flightId, handleSeatUpdate);

            // Clean up subscription when component unmounts or flightId changes
            return () => {
                console.log(`Unsubscribing from seat updates for flight ${flightId}`);
                webSocketService.unsubscribeSeatUpdates(flightId);
            };
        }
    }, [flightId, seats]); // Added seats dependency to update selection when seats change

    // Add new function to verify all seats
    const verifyAllSeats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            console.log('Verifying all seats with latest server data');
            const allSeatsData = await getAllSeatsForFlight(flightId.toString(), token);
            
            // Update our seats array with the latest server data
            setSeats(prevSeats => {
                return prevSeats.map(seat => {
                    // Find the matching seat in the server data
                    const serverSeat = allSeatsData.find((s: Seat) => s.id === seat.id);
                    if (serverSeat) {
                        // If this seat is in our selection, mark it accordingly
                        if (selectedSeats.includes(seat.id)) {
                            return { ...serverSeat, available: false };
                        }
                        // Otherwise use the server status
                        return serverSeat;
                    }
                    return seat;
                });
            });
        } catch (err) {
            console.error('Error verifying all seats:', err);
        }
    };

    // Update the verification useEffect to run more frequently
    useEffect(() => {
        const now = Date.now();
        if (now - lastVerificationTime < VERIFICATION_INTERVAL) {
            // Skip verification if it was done recently
            return;
        }

        const verifySelectedSeats = async () => {
            setLastVerificationTime(Date.now());
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Get ALL seats to verify selected ones
                const allSeatsData = await getAllSeatsForFlight(flightId.toString(), token);
                console.log('Verifying selected seats with server data');
                
                // Check if our selected seats are still available or valid
                const unavailableSelectedSeats = selectedSeats.filter(seatId => {
                    const seat = allSeatsData.find((s: Seat) => s.id === seatId);
                    // If the seat doesn't exist at all or it's already booked
                    return !seat || seat.booked === true;
                });
                
                if (unavailableSelectedSeats.length > 0) {
                    console.warn('Some selected seats are no longer available:', unavailableSelectedSeats);
                    
                    // Remove these unavailable seats from the selection
                    for (const unavailableSeatId of unavailableSelectedSeats) {
                        const seatNumber = seats.find(s => s.id === unavailableSeatId)?.seatNumber || '';
                        if (onSeatSelect && seatNumber) {
                            console.log(`Auto-removing unavailable seat ${unavailableSeatId} (${seatNumber}) from selection`);
                            onSeatSelect(unavailableSeatId, seatNumber);
                            setError(`Seat ${seatNumber} is no longer available and has been removed from your selection.`);
                        }
                    }
                }
                
                // Always update our seats array with the latest data
                setSeats(prevSeats => {
                    // Create a filtered list of still-valid selections
                    const validSelectedSeats = selectedSeats.filter(
                        seatId => !unavailableSelectedSeats.includes(seatId)
                    );
                    
                    return allSeatsData.map((serverSeat: Seat) => {
                        // If this seat is in our valid selection list, mark it accordingly
                        if (validSelectedSeats.includes(serverSeat.id)) {
                            return { ...serverSeat, available: false };
                        }
                        // Otherwise use the server status
                        return serverSeat;
                    });
                });
            } catch (err) {
                console.error('Error verifying seat status:', err);
            }
        };
        
        // Run the verification
        verifySelectedSeats();
    }, [selectedSeats, flightId, lastVerificationTime, seats]);

    // Add a new refreshSeats function
    const refreshSeats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            console.log('Refreshing all seats data from server');
            const allSeatsData = await getAllSeatsForFlight(flightId.toString(), token);
            
            // Update seats with the latest data
            setSeats(prevSeats => {
                return allSeatsData.map((serverSeat: Seat) => {
                    // If this seat is in our selection, mark it accordingly
                    if (selectedSeats.includes(serverSeat.id)) {
                        return { ...serverSeat, available: false };
                    }
                    // Otherwise use the server status
                    return serverSeat;
                });
            });
            
            // Update last refresh time
            setLastRefreshTime(Date.now());
        } catch (err) {
            console.error('Error refreshing seats:', err);
        }
    };

    // Fetch initial seats data
    useEffect(() => {
        const fetchSeats = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Authentication required');

                // Get ALL seats, not just available ones
                const seatsData = await getAllSeatsForFlight(flightId.toString(), token);
                console.log('Fetched ALL seats:', seatsData.length);
                
                // Keep track of the initial seat count for future reference
                setInitialSeatCount(seatsData.length);
                
                // Mark selected seats as unavailable
                const updatedSeats = seatsData.map((seat: Seat) => {
                    if (selectedSeats.includes(seat.id)) {
                        return { ...seat, available: false };
                    }
                    return seat;
                });
                
                setSeats(updatedSeats);
            } catch (err) {
                setError('Failed to load seats. Please try again later.');
                console.error('Seat loading error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSeats();
    }, [flightId, selectedSeats]);

    // Add these logging effects
    useEffect(() => {
        // Only log significant changes in seat count
        if (seats.length !== 0 && Math.abs(seats.length - initialSeatCount) > 5) {
            console.log('Significant change in seats state:', seats.length, 'seats');
        }
    }, [seats, initialSeatCount]);

    useEffect(() => {
        // Only log when selected seats actually change
        if (selectedSeats.length > 0) {
            console.log('Selected seats updated:', selectedSeats);
        }
    }, [selectedSeats]);

    // If we ever lose seats from our array, fetch them again
    useEffect(() => {
        // Only run this check after initial load
        if (initialSeatCount > 0 && !loading && seats.length < initialSeatCount) {
            console.warn(`Seat count decreased from ${initialSeatCount} to ${seats.length}. Refetching ALL seats...`);
            const refetchSeats = async () => {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    
                    // Get ALL seats, not just available ones
                    const seatsData = await getAllSeatsForFlight(flightId.toString(), token);
                    console.log('Refetched ALL seats:', seatsData.length);
                    
                    // Preserve our selected seats in the refetched data
                    const updatedSeats = seatsData.map((seat: Seat) => {
                        if (selectedSeats.includes(seat.id)) {
                            return { ...seat, available: false };
                        }
                        return seat;
                    });
                    
                    setSeats(updatedSeats);
                } catch (err) {
                    console.error('Error refetching seats:', err);
                }
            };
            
            refetchSeats();
        } else if (!loading && seats.length > 0 && initialSeatCount === 0) {
            // Store the initial seat count once loaded
            setInitialSeatCount(seats.length);
            console.log('Initial seat count set to:', seats.length);
        }
    }, [seats.length, loading, initialSeatCount, flightId, selectedSeats]);

    // Add this forced refresh effect when seats get stuck
    useEffect(() => {
        const now = Date.now();
        // Force refresh seats every 10 seconds at most
        if (now - lastRefreshTime > 10000 && pendingOperations.size === 0) {
            const refreshSeats = async () => {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    
                    console.log('Performing periodic refresh of seat data');
                    setLastRefreshTime(now);
                    
                    // Get ALL seats, not just available ones
                    const seatsData = await getAllSeatsForFlight(flightId.toString(), token);
                    
                    // Preserve our selected seats in the refetched data
                    const updatedSeats = seatsData.map((seat: Seat) => {
                        if (selectedSeats.includes(seat.id)) {
                            return { ...seat, available: false };
                        }
                        return seat;
                    });
                    
                    setSeats(updatedSeats);
                } catch (err) {
                    console.error('Error in periodic refresh:', err);
                }
            };
            
            refreshSeats();
        }
    }, [seats, flightId, selectedSeats, lastRefreshTime, pendingOperations]);

    // Add a new effect to check for seat status changes and ensure consistency
    useEffect(() => {
        // Get all seats and check their status against what we have locally
        const syncAllSeats = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                console.log('Performing deep seat synchronization...');
                const allSeatsData = await getAllSeatsForFlight(flightId.toString(), token);
                
                // Check if any seat has changed state (booked/held by someone else)
                let hasChanges = false;
                
                // Map all seats by ID for easy lookup
                const seatMap = new Map();
                allSeatsData.forEach((serverSeat: Seat) => {
                    seatMap.set(serverSeat.id, serverSeat);
                });
                
                // Compare with our current seats
                seats.forEach(localSeat => {
                    const serverSeat = seatMap.get(localSeat.id);
                    if (serverSeat) {
                        // Check if seat status is different (except for our selections)
                        if (selectedSeats.includes(localSeat.id)) {
                            // This is our selected seat - we don't sync available status
                            // But we should check if it was booked by someone else
                            if (serverSeat.booked !== localSeat.booked) {
                                console.warn(`Our selected seat ${localSeat.seatNumber} (${localSeat.id}) has been booked by someone else!`);
                                hasChanges = true;
                            }
                        } else {
                            // Not our selected seat, check if status changed
                            if (serverSeat.available !== localSeat.available || 
                                serverSeat.booked !== localSeat.booked) {
                                console.log(`Seat ${localSeat.seatNumber} (${localSeat.id}) status changed from server`);
                                hasChanges = true;
                            }
                        }
                    }
                });
                
                // If there are changes, update all seats with server data
                if (hasChanges) {
                    console.log('Seat status changes detected from server, syncing...');
                    setSeats(prevSeats => {
                        return allSeatsData.map((serverSeat: Seat) => {
                            // Keep our selected seats marked as selected
                            if (selectedSeats.includes(serverSeat.id)) {
                                // If it's already booked, we should de-select it
                                if (serverSeat.booked) {
                                    // This seat was booked by someone else, we need to notify and remove from selection
                                    setTimeout(() => {
                                        const seatNumber = seats.find(s => s.id === serverSeat.id)?.seatNumber || '';
                                        if (onSeatSelect && seatNumber) {
                                            onSeatSelect(serverSeat.id, seatNumber);
                                            setError(`Seat ${seatNumber} was booked by another user and has been removed from your selection.`);
                                        }
                                    }, 100);
                                    return serverSeat; // Don't mark as selected
                                }
                                return { ...serverSeat, available: false };
                            }
                            return serverSeat;
                        });
                    });
                }
            } catch (err) {
                console.error('Error syncing seats:', err);
            }
        };
        
        // Run the sync when component mounts and when selectedSeats changes
        syncAllSeats();
        
        // Also set up an interval to check for changes from outside
        const intervalId = setInterval(syncAllSeats, 5000); // Check every 5 seconds
        
        return () => clearInterval(intervalId);
    }, [flightId, selectedSeats]);

    const handleSeatClick = async (seatId: number, seatNumber: string) => {
        // Prevent clicking if this seat already has a pending operation
        if (pendingOperations.has(seatId)) {
            console.warn(`Ignoring click on seat ${seatId}, operation already in progress`);
            return;
        }

        setIsProcessing(true);
        setError(null);
        
        // Add this seat to pending operations
        setPendingOperations(prev => new Set([...Array.from(prev), seatId]));
        
        try {
            // Check if seat is already in selectedSeats
            const isSelected = selectedSeats.includes(seatId);
            console.log(`Clicking seat ${seatId} (${seatNumber}), currently selected: ${isSelected}`);
            
            // Get the current seat object
            const currentSeat = seats.find((seat: Seat) => seat.id === seatId);
            if (!currentSeat) {
                console.warn(`Seat ${seatId} not found in seats array before operation`);
                setError(`Seat ${seatNumber} information could not be found. Please refresh the page.`);
                setPendingOperations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(seatId);
                    return newSet;
                });
                setIsProcessing(false);
                return;
            }
            
            // Check if seat is actually available (not booked and not held by someone else)
            if (!isSelected && (!currentSeat.available || currentSeat.booked)) {
                console.warn(`Attempting to select unavailable seat ${seatId}`);
                setError(`Seat ${seatNumber} is not available for selection`);
                setPendingOperations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(seatId);
                    return newSet;
                });
                setIsProcessing(false);
                return;
            }
            
            let success = false;
            
            if (isSelected) {
                // Release the seat via WebSocket
                console.log(`Releasing seat ${seatId} via WebSocket`);
                
                // Immediately update the UI to show as released
                // This prevents the seat from disappearing before backend response
                setSeats(prevSeats => {
                    return prevSeats.map(seat =>
                        seat.id === seatId ? { ...seat, available: true } : seat
                    );
                });
                
                try {
                    // Use WebSocket service directly
                    success = await webSocketService.releaseSeat({
                        seatId: seatId,
                        flightId: flightId
                    });
                    
                    if (success) {
                        // Broadcast seat release to other tabs/windows
                        broadcastSeatUpdate(seatId, 'release');
                    }
                    
                    if (!success) {
                        console.error(`WebSocket seat release failed for seat ${seatId}`);
                        setError(`Failed to release seat ${seatNumber}. Please try again.`);
                        
                        // Revert the optimistic UI update since the operation failed
                        setSeats(prevSeats => {
                            return prevSeats.map(seat =>
                                seat.id === seatId ? { ...seat, available: false } : seat
                            );
                        });
                        
                        setPendingOperations(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(seatId);
                            return newSet;
                        });
                        
                        setIsProcessing(false);
                        return; // Prevent calling onSeatSelect for failed operations
                    }
                    
                    console.log(`Successfully released seat ${seatId} via WebSocket`);
                } catch (err) {
                    console.error('Error releasing seat:', err);
                    setError(`Failed to release seat ${seatNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    
                    // Revert the optimistic UI update since the operation failed
                    setSeats(prevSeats => {
                        return prevSeats.map(seat =>
                            seat.id === seatId ? { ...seat, available: false } : seat
                        );
                    });
                    
                    setPendingOperations(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(seatId);
                        return newSet;
                    });
                    
                    setIsProcessing(false);
                    return; // Prevent calling onSeatSelect for failed operations
                }
            } else {
                // Select the seat via WebSocket
                console.log(`Selecting seat ${seatId} via WebSocket`);
                
                // Optimistically update UI first
                setSeats(prevSeats => {
                    return prevSeats.map(seat =>
                        seat.id === seatId ? { ...seat, available: false } : seat
                    );
                });
                
                try {
                    // Use WebSocket service directly, which uses holdSeat under the hood
                    success = await webSocketService.selectSeat({
                        seatId: seatId,
                        flightId: flightId
                    });
                    
                    if (success) {
                        // Broadcast seat selection to other tabs/windows
                        broadcastSeatUpdate(seatId, 'select');
                    }
                    
                    if (!success) {
                        console.error(`WebSocket seat selection failed for seat ${seatId}`);
                        setError(`Failed to select seat ${seatNumber}. Please try again.`);
                        
                        // Revert the optimistic UI update since the operation failed
                        setSeats(prevSeats => {
                            return prevSeats.map(seat =>
                                seat.id === seatId ? { ...seat, available: true } : seat
                            );
                        });
                        
                        setPendingOperations(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(seatId);
                            return newSet;
                        });
                        
                        setIsProcessing(false);
                        return; // Prevent calling onSeatSelect for failed operations
                    }
                    
                    console.log(`Successfully selected seat ${seatId} via WebSocket`);
                } catch (err) {
                    console.error('Error selecting seat:', err);
                    setError(`Failed to select seat ${seatNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    
                    // Revert the optimistic UI update since the operation failed
                    setSeats(prevSeats => {
                        return prevSeats.map(seat =>
                            seat.id === seatId ? { ...seat, available: true } : seat
                        );
                    });
                    
                    setPendingOperations(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(seatId);
                        return newSet;
                    });
                    
                    setIsProcessing(false);
                    return; // Prevent calling onSeatSelect for failed operations
                }
            }
            
            // Call the parent's handler to update selected seats list
            if (onSeatSelect) {
                onSeatSelect(seatId, seatNumber);
            }
            
            // Force an immediate verification to ensure consistency
            setLastVerificationTime(0);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to process seat';
            setError(errorMessage);
            console.error('Seat operation error:', err);
        } finally {
            // Remove this seat from pending operations
            setPendingOperations(prev => {
                const newSet = new Set(prev);
                newSet.delete(seatId);
                return newSet;
            });
            
            setIsProcessing(false);
        }
    };

    // Add this function after the handleSeatClick function
    const findAndRestoreSeat = async (seatId: number, seatNumber: string) => {
        try {
            console.log(`Attempting to restore missing seat ${seatId} (${seatNumber})`);
            const token = localStorage.getItem('token');
            if (!token) return;
            
            // First check if the seat is already in our array
            const seatExists = seats.some(seat => seat.id === seatId);
            if (seatExists) {
                console.log(`Seat ${seatId} already exists in array, no need to restore`);
                return;
            }
            
            // Fetch ALL seats to restore the missing one
            const seatsData = await getAllSeatsForFlight(flightId.toString(), token);
            
            // Check if the seat exists in the fetched data
            const restoredSeat = seatsData.find((seat: Seat) => seat.id === seatId);
            if (restoredSeat) {
                console.log(`Found missing seat ${seatId} in API response, restoring it`);
                // Add just this seat back to our array
                setSeats(prevSeats => [...prevSeats, restoredSeat]);
            } else {
                console.warn(`Seat ${seatId} not found in API response, cannot restore`);
            }
        } catch (err) {
            console.error(`Error restoring seat ${seatId}:`, err);
        }
    };

    const renderSeat = (seat: Seat) => {
        // Determine if this seat is selected by checking the selectedSeats prop
        const isSelected = selectedSeats.includes(seat.id);
        
        // Determine appropriate status colors
        let bgColor = 'background.paper';
        let isDisabled = false;
        let onClick = () => handleSeatClick(seat.id, seat.seatNumber);
        
        // This seat has a pending operation, make it look like it's processing
        if (pendingOperations.has(seat.id)) {
            bgColor = 'action.disabled';
            isDisabled = true;
            onClick = async () => { return Promise.resolve(); }; // Return a resolved Promise
        }
        // Selected seats should be highlighted as blue
        else if (isSelected) {
            bgColor = '#1976d2'; // Blue color for selected seats
        }
        // Unavailable seat (could be booked or in the process of being booked)
        else if (!seat.available || seat.booked) {
            bgColor = 'error.light';
            isDisabled = true;
            onClick = async () => { return Promise.resolve(); }; // Return a resolved Promise
        }
        // Seat is available
        
        return (
            <Box
                key={seat.id}
                onClick={isDisabled ? undefined : onClick}
                sx={{
                    width: 30, 
                    height: { xs: 28, sm: 32 },
                    m: { xs: 0.25, sm: 0.5 },
                    backgroundColor: bgColor,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: { xs: 10, sm: 12 },
                    fontWeight: 'bold',
                    color: isSelected ? 'white' : 'text.primary', // White text for selected seats
                    transition: 'all 0.2s',
                    opacity: isDisabled ? 0.6 : 1,
                    '&:hover': {
                        transform: isDisabled ? 'none' : 'translateY(-2px)',
                        boxShadow: isDisabled ? 'none' : '0 3px 5px rgba(0,0,0,0.2)',
                        zIndex: 1,
                    },
                    '&:after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -4,
                        left: 0,
                        width: '100%',
                        height: 4,
                        backgroundColor: isSelected 
                            ? '#115293' // Darker blue for indicator
                            : (!seat.available || seat.booked) 
                            ? 'error.dark' 
                                    : 'grey.400',
                        borderRadius: '0 0 4px 4px',
                    }
                }}
                data-seat-id={seat.id}
            >
                {seat.seatNumber}
            </Box>
        );
    }

    const renderSeatGrid = () => {
        const groupedByRow = seats.reduce((acc: Record<string, Seat[]>, seat) => {
            // Extract the row letter (assuming format like 'A1', 'B3', etc.)
            const rowLetter = seat.seatNumber.charAt(0);
            if (!acc[rowLetter]) {
                acc[rowLetter] = [];
            }
            acc[rowLetter].push(seat);
            return acc;
        }, {});

        // Sort rows by letter and sort seats within each row by number
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                overflowX: 'auto'
            }}>
                {/* Airplane nose */}
                <Box 
                    sx={{ 
                        width: '60px', 
                        height: '80px', 
                        bgcolor: 'grey.300', 
                        borderRadius: '50% 50% 0 0', 
                        mb: 4,
                        display: { xs: 'none', sm: 'block' }
                    }} 
                />
                
                {/* Cabin section */}
                <Box sx={{ 
                    bgcolor: 'grey.100', 
                    borderRadius: '10px',
                    p: { xs: 1, sm: 2, md: 3 },
                    width: { xs: '95%', sm: '90%', md: '80%' },
                    maxWidth: '800px'
                }}>
                    {Object.keys(groupedByRow)
                        .sort()
                        .map(rowLetter => {
                            // Sort seats by their number
                            const sortedSeats = [...groupedByRow[rowLetter]].sort((a, b) => {
                                const aNum = parseInt(a.seatNumber.substring(1));
                                const bNum = parseInt(b.seatNumber.substring(1));
                                return aNum - bNum;
                            });
                            
                            // Create two groups for left and right sides of aisle
                            const midPoint = Math.ceil(sortedSeats.length / 2);
                            const leftSeats = sortedSeats.slice(0, midPoint);
                            const rightSeats = sortedSeats.slice(midPoint);
                            
                            return (
                                <Box key={rowLetter} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mb: { xs: 2, sm: 3 }, 
                                    justifyContent: 'center',
                                    width: '100%'
                                }}>
                                    <Typography variant="subtitle2" sx={{ 
                                        width: { xs: 20, sm: 30 }, 
                                        textAlign: 'center', 
                                        mr: { xs: 0.5, sm: 1 },
                                        fontWeight: 'bold'
                                    }}>
                                        {rowLetter}
                                    </Typography>
                                    
                                    {/* Left side seats */}
                                    <Box sx={{ display: 'flex' }}>
                                        {leftSeats.map(seat => renderSeat(seat))}
                                    </Box>
                                    
                                    {/* Aisle */}
                                    <Box sx={{ 
                                        width: { xs: 12, sm: 16, md: 20 }, 
                                        mx: { xs: 0.5, sm: 1, md: 2 }, 
                                        height: 4, 
                                        bgcolor: 'grey.300',
                                        alignSelf: 'center'
                                    }} />
                                    
                                    {/* Right side seats */}
                                    <Box sx={{ display: 'flex' }}>
                                        {rightSeats.map(seat => renderSeat(seat))}
                                    </Box>
                                </Box>
                            );
                        })}
                </Box>
            </Box>
        );
    };

    return (
        <Paper elevation={3} sx={{ 
            p: { xs: 1, sm: 2, md: 3 }, 
            maxWidth: '100%', 
            margin: 'auto', 
            overflowX: 'auto'
        }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            {holdExpirationMessage && (
                <Snackbar
                    open={!!holdExpirationMessage}
                    autoHideDuration={6000}
                    onClose={() => setHoldExpirationMessage(null)}
                    message={holdExpirationMessage}
                />
            )}
            
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ 
                    width: '100%', 
                    overflowX: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center' 
                }}>
                    <Typography variant="body2" gutterBottom align="center">
                        Please select your preferred seat from the available options below.
                    </Typography>
                    
                    {renderSeatGrid()}
                    
                    <Box sx={{ 
                        mt: 3, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        flexWrap: 'wrap', 
                        gap: { xs: 1, sm: 2 }, 
                        maxWidth: '100%'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                backgroundColor: 'background.paper', 
                                position: 'relative',
                                borderRadius: '4px 4px 0 0',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: -4,
                                    left: 0,
                                    width: '100%',
                                    height: 4,
                                    backgroundColor: 'grey.400',
                                    borderRadius: '0 0 4px 4px',
                                }
                            }}></Box>
                            <Typography variant="caption" sx={{ ml: 1 }}>Available</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                backgroundColor: '#1976d2', 
                                position: 'relative',
                                borderRadius: '4px 4px 0 0',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: -4,
                                    left: 0,
                                    width: '100%',
                                    height: 4,
                                    backgroundColor: '#115293',
                                    borderRadius: '0 0 4px 4px',
                                }
                            }}></Box>
                            <Typography variant="caption" sx={{ ml: 1 }}>Selected</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                backgroundColor: 'warning.light', 
                                position: 'relative',
                                borderRadius: '4px 4px 0 0',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: -4,
                                    left: 0,
                                    width: '100%',
                                    height: 4,
                                    backgroundColor: 'warning.dark',
                                    borderRadius: '0 0 4px 4px',
                                }
                            }}></Box>
                            <Typography variant="caption" sx={{ ml: 1 }}>Held (expires in 3 min)</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                backgroundColor: 'error.light',
                                position: 'relative',
                                borderRadius: '4px 4px 0 0',
                                '&:before': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: -4,
                                    left: 0,
                                    width: '100%',
                                    height: 4,
                                    backgroundColor: 'error.dark',
                                    borderRadius: '0 0 4px 4px',
                                }
                            }}></Box>
                            <Typography variant="caption" sx={{ ml: 1 }}>Booked</Typography>
                        </Box>
                    </Box>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        mt: 3,
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        gap: 1
                    }}>
                        <Button 
                            variant="outlined" 
                            color="primary" 
                            onClick={refreshSeats}
                            startIcon={<SyncIcon />}
                            disabled={isProcessing}
                            size="small"
                            sx={{ 
                                px: { xs: 1, sm: 2 },
                                py: { xs: 0.5, sm: 1 }
                            }}
                        >
                            Refresh Seats
                        </Button>
                        
                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => verifyAllSeats()}
                            disabled={isProcessing}
                            size="small"
                            sx={{ 
                                px: { xs: 1, sm: 2 },
                                py: { xs: 0.5, sm: 1 }
                            }}
                        >
                            Check Availability
                        </Button>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};

export default SeatSelection;