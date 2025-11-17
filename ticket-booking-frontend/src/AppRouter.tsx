import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import FlightList from './components/flight/FlightList';
import SeatSelectionWrapper from './components/flight/SeatSelectionWrapper';
import Home from './components/home/Home';
import Profile from './components/profile/Profile';
import BookingHistory from './components/booking/BookingHistory';
import BookingConfirmation from './components/booking/BookingConfirmation';
import PaymentResult from './components/payment/PaymentResult';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRoute from './components/common/AdminRoute';
import { initializeSession } from './utils/sessionHandler';

const AppRouter = () => {
    // Initialize session timeout handler
    useEffect(() => {
        if (localStorage.getItem('token')) {
            initializeSession();
        }
    }, []);

    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Routes */}
                <Route path="/flights" element={
                    <ProtectedRoute>
                        <FlightList />
                    </ProtectedRoute>
                } />
                <Route path="/flights/:flightId/seats" element={
                    <ProtectedRoute>
                        <SeatSelectionWrapper />
                    </ProtectedRoute>
                } />
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                } />
                <Route path="/bookings" element={
                    <ProtectedRoute>
                        <BookingHistory />
                    </ProtectedRoute>
                } />
                <Route path="/booking-confirmation/:bookingId" element={
                    <ProtectedRoute>
                        <BookingConfirmation />
                    </ProtectedRoute>
                } />
                
                {/* Payment Routes */}
                <Route path="/payment/success" element={<PaymentResult />} />
                <Route path="/payment/cancel" element={<PaymentResult />} />
                <Route path="/payment/result/:bookingId" element={<PaymentResult />} />
                
                {/* Admin Routes */}
                <Route 
                    path="/admin/*" 
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    } 
                />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;