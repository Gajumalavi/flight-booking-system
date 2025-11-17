const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

interface ApiError extends Error {
    status?: number;
}

// Improved fetch utility with better error handling
const fetchAPI = async (url: string, options: RequestInit) => {
    try {
        console.log(`[API Debug] Making request to: ${API_BASE_URL}${url}`);
        console.log(`[API Debug] Request options:`, JSON.stringify(options));
        
        const response = await fetch(`${API_BASE_URL}${url}`, options);

        console.log(`[API Debug] Response status: ${response.status} ${response.statusText}`);
        console.log(`[API Debug] Response content-type:`, response.headers.get('content-type'));
        
        // Clone the response before reading its body
        const clonedResponse = response.clone();
        
        // Handle error responses
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorData;
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                    console.error(`[API Debug] Error response (JSON):`, errorData);
                } else {
                    errorData = await response.text();
                    console.error(`[API Debug] Error response (Text):`, errorData);
                }
            } catch (parseError) {
                console.error(`[API Debug] Failed to parse error response:`, parseError);
            }
            
            const error: ApiError = new Error(
                errorData?.message || `API Error: ${response.status} ${response.statusText}`
            );
            error.status = response.status;
            throw error;
        }
    
        // Extract and return response data
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log(`[API Debug] Response data (JSON):`, data);
        } else {
            data = await response.text();
            console.log(`[API Debug] Response data (Text):`, data);
        }
        
        return data;
    } catch (error) {
        console.error(`[API Debug] Fetch error:`, error);
            throw error;
    }
};

// Auth APIs
export interface AuthResponse {
    token: string;
    userId: number;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
}

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
    const data = await fetchAPI('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    
    // Save user info in local storage for easier access
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userRole', data.role);
    if (data.firstName) localStorage.setItem('userFirstName', data.firstName);
    if (data.lastName) localStorage.setItem('userLastName', data.lastName);
    
    return data;
};

export const registerUser = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string,
    phone?: string,
    address?: string
): Promise<AuthResponse> => {
    const data = await fetchAPI('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email, 
            password, 
            firstName, 
            lastName,
            phone,
            address
        }),
    });
    
    // Save user info in local storage for easier access
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userFirstName', data.firstName || '');
    localStorage.setItem('userLastName', data.lastName || '');
    if (data.phone) localStorage.setItem('userPhone', data.phone);
    if (data.address) localStorage.setItem('userAddress', data.address);
    
    return data;
};

// User APIs
export const getUserProfile = async (token: string): Promise<{ email: string }> => {
    return fetchAPI('/user/profile', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
    });
};

export const updateUserProfile = async (token: string, updatedData: any) => {
    return fetchAPI('/user/update', {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(updatedData),
    });
};

// Flight APIs
export const fetchFlights = async (token: string) => {
    return fetchAPI('/api/flights', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export const searchFlights = async (token: string, origin: string, destination: string, date: string) => {
    return fetchAPI(`/api/flights/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&departureDate=${encodeURIComponent(date)}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

// Seat APIs
export const getAvailableSeats = async (flightId: string, token: string) => {
    return fetchAPI(`/api/seats/available?flightId=${flightId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export const getAllSeatsForFlight = async (flightId: string, token: string) => {
    return fetchAPI(`/api/seats/flight/${flightId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export const selectSeat = async (seatId: string, flightId: string, token: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/seats/${seatId}/select?flightId=${flightId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to select seat: ${response.statusText}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        // Handle text response
        return await response.text();
    } catch (error) {
        console.error('Seat selection error:', error);
        throw error;
    }
};

export const releaseSeat = async (seatId: string, flightId: string, token: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/seats/${seatId}/release?flightId=${flightId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to release seat: ${response.statusText}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // Handle text response
        return await response.text();
    } catch (error) {
        console.error('Seat release error:', error);
        throw error;
    }
};

export const bookSeat = async (seatId: string, flightId: string, token: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/seats/${seatId}/book?flightId=${flightId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to book seat: ${response.statusText}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // Handle text response
        return await response.text();
    } catch (error) {
        console.error('Seat booking error:', error);
        throw error;
    }
};

// Booking APIs
export const getUserBookings = async (token: string) => {
    return fetchAPI('/api/bookings', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export interface BookingFilterOptions {
    status?: string;
    bookingId?: number;
    flightDate?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'asc' | 'desc';
}

export const getFilteredBookings = async (token: string, filters: BookingFilterOptions = {}) => {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.bookingId) queryParams.append('bookingId', filters.bookingId.toString());
    if (filters.flightDate) queryParams.append('flightDate', filters.flightDate);
    if (filters.page !== undefined) queryParams.append('page', filters.page.toString());
    if (filters.size !== undefined) queryParams.append('size', filters.size.toString());
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.direction) queryParams.append('direction', filters.direction);
    
    return fetchAPI(`/api/bookings/filtered?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export const getBookingById = async (bookingId: string, token: string) => {
    return fetchAPI(`/api/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export const downloadTicket = async (bookingId: string, token: string) => {
    try {
        // Using fetch directly as we need to handle blob response
        const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/download-ticket`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download ticket: ${response.status} ${response.statusText}`);
        }

        // Get the blob from response
        const blob = await response.blob();
        
        // Create a download link and trigger it
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `flight-ticket-${bookingId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Clean up
        window.URL.revokeObjectURL(downloadUrl);
        
        return true;
    } catch (error) {
        console.error('Ticket download error:', error);
        throw error;
    }
};

export const emailTicket = async (bookingId: string, token: string) => {
    return fetchAPI(`/api/bookings/${bookingId}/email-ticket`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

export interface Passenger {
    id?: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    age?: number;
    seatId: number;
    seatNumber?: string;
}

export interface Booking {
    id: number;
    flightId: string;
    seatIds: number[];
    timestamp: string;
    status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
    passengers?: Passenger[];
    flightNumber?: string;
    origin?: string;
    originCity?: string;
    originName?: string;
    originState?: string;
    destination?: string;
    destinationCity?: string;
    destinationName?: string;
    destinationState?: string;
    departureTime?: string;
    arrivalTime?: string;
    price?: number;
    airline?: string;
    seatClass?: string;
    flightStatus?: string;
}

export const createBooking = async (flightId: string, seatIds: number[], token: string, passengers?: Passenger[]) => {
    return fetchAPI('/api/bookings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            flightId,
            seatIds,
            passengers
        }),
    });
};

export const cancelBooking = async (bookingId: string, token: string) => {
    try {
        console.log(`[API] Attempting to cancel booking with ID: ${bookingId}, type: ${typeof bookingId}`);
        console.log(`[API] Building URL: ${API_BASE_URL}/api/bookings/${bookingId}/cancel`);
        
        // Log the request details for debugging
        const requestDetails = {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        console.log('[API] Request details:', JSON.stringify(requestDetails));
        
        const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, requestDetails);

        console.log(`[API] Booking cancellation status: ${response.status} ${response.statusText}`);
        console.log(`[API] Response headers: Content-Type:`, response.headers.get('content-type'));

        if (!response.ok) {
            // Try to get more detailed error information
            let errorMessage = `Failed to cancel booking: ${response.statusText}`;
            let errorDetails = null;
            
            try {
                // Try to parse as JSON first
                errorDetails = await response.json();
                console.log('[API] Error response body (JSON):', errorDetails);
                errorMessage = errorDetails.message || errorMessage;
            } catch (jsonError) {
                // If not JSON, try to get text
                try {
                    const errorText = await response.text();
                    console.log('[API] Error response body (Text):', errorText);
                    if (errorText) errorMessage += ` - ${errorText}`;
                } catch (textError) {
                    // Ignore text parsing error
                    console.log('[API] Could not parse error response as text');
                }
            }
            
            console.error('[API] Booking cancellation failed:', errorMessage);
            const error = new Error(errorMessage);
            // @ts-ignore
            error.status = response.status;
            // @ts-ignore
            error.details = errorDetails;
            throw error;
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
            console.log('[API] Booking cancellation successful, JSON response:', result);
        } else {
        // Handle text response
            result = await response.text();
            console.log('[API] Booking cancellation successful, text response:', result);
        }
        
        return result;
    } catch (error) {
        console.error('[API] Booking cancellation error:', error);
        throw error;
    }
};

// Types
export interface Seat {
    id: number;
    seatNumber: string;
    available: boolean;
    booked: boolean;
}

export interface Flight {
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
    status?: string;
    originCity?: string;
    originName?: string;
    originState?: string;
    destinationCity?: string;
    destinationName?: string;
    destinationState?: string;
}

// Add a new function to get bookings with simple filtering when the main endpoint fails
export const getSimpleFilteredBookings = async (token: string, status?: string, bookingId?: number) => {
    // Build query string
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (bookingId) queryParams.append('bookingId', bookingId.toString());
    
    return fetchAPI(`/api/bookings/simple-filter?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
    });
};

// New function to check if an API flight already exists
export const checkApiFlightExists = async (flight: Flight, token: string): Promise<{ exists: boolean; flight?: Flight }> => {
    try {
        console.log('Checking if API flight already exists:', {
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination
        });
        
        // Create a simplified version of the flight data
        const flightData = {
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            price: flight.price,
            airline: flight.airline || 'Unknown Airline',
            apiSourced: true
        };
        
        // Make the API call to check if the flight exists
        const response = await fetch(`${API_BASE_URL}/api/flights/api-flight/check-exists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(flightData)
        });

        if (!response.ok) {
            throw new Error(`Failed to check flight existence: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error checking if flight exists:', error);
        // Return false by default to continue with save operation
        return { exists: false };
    }
};

// Modified function to save an API-sourced flight to the database
export const saveApiFlightToDatabase = async (flight: Flight, token: string): Promise<Flight> => {
    try {
        console.log('Starting API flight save process with token:', token ? 'Valid token present' : 'Missing token');
        
        // First check if this flight already exists in the database
        const existsCheck = await checkApiFlightExists(flight, token);
        
        if (existsCheck.exists && existsCheck.flight) {
            console.log('Flight already exists in database with ID:', existsCheck.flight.id);
            // Return the existing flight instead of creating a new one
            return existsCheck.flight;
        }
        
        console.log('Flight does not exist in database, proceeding with save operation');
        console.log('Saving API flight to database:', {
            flightId: flight.id,
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            seatCount: flight.seats?.length,
            apiSourced: flight.apiSourced,
            airline: flight.airline
        });
        
        // Calculate available seats based on seat availability
        const availableSeats = flight.seats.filter(seat => seat.available).length;
        
        // Create a simplified version of the flight data without the seats array
        // This reduces payload size and potential serialization issues
        const simplifiedFlightData = {
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            price: flight.price,
            availableSeats: availableSeats,
            // Add the airline field back now that it's been added to the database
            airline: flight.airline || 'Unknown Airline',
            apiSourced: true,
            // Don't send the large seats array, the backend will generate seats
            status: 'SCHEDULED'
        };
        
        console.log('Sending simplified flight data to save:', JSON.stringify(simplifiedFlightData));
        console.log('API endpoint being used:', `${API_BASE_URL}/api/flights/api-flight/save`);
        
        // Directly use fetch with better error handling
        const response = await fetch(`${API_BASE_URL}/api/flights/api-flight/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(simplifiedFlightData)
        });

        console.log('Fetch response received:', {
            status: response.status,
            statusText: response.statusText
        });

        if (!response.ok) {
            let errorMessage = `Failed to save API flight: ${response.status} ${response.statusText}`;
            
            // Clone the response before reading its body
            const responseClone = response.clone();
            
            try {
                const errorBodyText = await responseClone.text();
                console.log('Error response body:', errorBodyText);
                
                // Try to parse as JSON if possible
                try {
                    const errorJson = JSON.parse(errorBodyText);
                    errorMessage += ` - ${errorJson.message || JSON.stringify(errorJson)}`;
                } catch {
                    // If not valid JSON, use the text
                    errorMessage += ` - ${errorBodyText || 'No error details available'}`;
                }
            } catch (bodyReadError) {
                console.error('Error reading response body:', bodyReadError);
                errorMessage += ' - Unable to read error details';
            }
            
            console.error('API Error Response:', errorMessage);
            throw new Error(errorMessage);
        }

        // Read the successful response
        const savedFlight = await response.json();
        console.log('Successfully saved API flight:', savedFlight);
        return savedFlight;
    } catch (error) {
        console.error('Error saving API flight to database:', error);
        throw error;
    }
};

// Airport API types
export interface Airport {
    id: number;
    code: string;
    name: string;
    city: string;
    state?: string;
    country: string;
    latitude?: number;
    longitude?: number;
}

// Airport APIs
export const searchAirports = async (query: string): Promise<Airport[]> => {
    if (!query || query.length < 2) {
        return [];
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No authentication token available for airport search');
            return [];
        }
        
        return await fetchAPI(`/api/airports/search?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
    } catch (error) {
        console.error('Airport search error:', error);
        return [];
    }
};

export const getAirportByCode = async (code: string): Promise<Airport | null> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No authentication token available for fetching airport');
            return null;
        }
        
        return await fetchAPI(`/api/airports/${encodeURIComponent(code)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
    } catch (error) {
        console.error(`Error fetching airport with code ${code}:`, error);
        return null;
    }
};

// Password Reset APIs
export interface PasswordResetResponse {
    success: boolean;
    message: string;
}

export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
    try {
        const data = await fetchAPI('/auth/password-reset/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return data;
    } catch (error) {
        console.error('Password reset request failed:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to request password reset'
        };
    }
};

export const verifyOtpAndResetPassword = async (
    email: string,
    otp: string,
    newPassword: string
): Promise<PasswordResetResponse> => {
    try {
        const data = await fetchAPI('/auth/password-reset/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword }),
        });
        return data;
    } catch (error) {
        console.error('OTP verification failed:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to verify OTP and reset password'
        };
    }
};

/**
 * Get Razorpay key ID from the server
 */
export const getRazorpayConfig = async (token: string): Promise<{ keyId: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payments/config`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get Razorpay config: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[API] Error getting Razorpay config:', error);
        throw error;
    }
};

/**
 * Create a Razorpay order for a booking
 */
export const createRazorpayOrder = async (bookingId: string, token: string): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/payments/create-order/${bookingId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create order: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[API] Error creating Razorpay order:', error);
        throw error;
    }
};

/**
 * Verify a Razorpay payment
 */
export const verifyRazorpayPayment = async (
    orderId: string, 
    paymentId: string, 
    signature: string, 
    bookingId: string, 
    token: string
): Promise<{ success: boolean, message: string }> => {
    try {
        const url = new URL(`${API_BASE_URL}/api/payments/verify`);
        url.searchParams.append('razorpay_order_id', orderId);
        url.searchParams.append('razorpay_payment_id', paymentId);
        url.searchParams.append('razorpay_signature', signature);
        url.searchParams.append('booking_id', bookingId);
        
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to verify payment: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[API] Error verifying Razorpay payment:', error);
        throw error;
    }
};

/**
 * Handle payment failure for a booking and update its status to CANCELLED
 */
export const handlePaymentFailure = async (bookingId: string, token: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/payment-failed`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to handle payment failure: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[API] Error handling payment failure:', error);
        throw error;
    }
};

export interface BookingReportFilter {
  startDate: string;
  endDate: string;
}

export const downloadBookingReport = async (token: string, filter: BookingReportFilter): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/reports/booking/History`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filter),
  });
  if (!response.ok) throw new Error('Failed to generate booking report');
  return await response.blob();
};

export interface FlightReportFilter {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export const downloadFlightReport = async (token: string, filter: FlightReportFilter): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/reports/flight/Analytics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filter),
  });
  if (!response.ok) throw new Error('Failed to generate flight report');
  return await response.blob();
};

export interface RevenueReportFilter {
  startDate: string;
  endDate: string;
  period: 'DAILY' | 'MONTHLY' | 'ANNUAL';
}

export const downloadRevenueReport = async (token: string, filter: RevenueReportFilter): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/reports/revenue/${filter.period}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filter),
  });
  if (!response.ok) throw new Error('Failed to generate revenue report');
  return await response.blob();
};