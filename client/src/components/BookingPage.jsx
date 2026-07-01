import React, { useState } from 'react';
import { ShieldAlert, Car, Zap, Users, ArrowLeft, CheckCircle } from 'lucide-react';

const BookingPage = () => {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const vehicleOptions = [
    { id: 'auto', name: 'Auto Rickshaw', icon: <Zap size={24} />, price: '₹45 - ₹60', eta: '3 min', capacity: 3 },
    { id: 'mini', name: 'Mini Cab', icon: <Car size={24} />, price: '₹120 - ₹150', eta: '5 min', capacity: 4 },
    { id: 'prime', name: 'Prime Sedan', icon: <Users size={24} />, price: '₹180 - ₹220', eta: '7 min', capacity: 4 },
    { id: 'suv', name: 'SUV / XL', icon: <Car size={32} />, price: '₹250 - ₹300', eta: '10 min', capacity: 6 }
  ];

  const handleBookNow = () => {
    if (selectedVehicle) {
      setBookingConfirmed(true);
    }
  };

  if (bookingConfirmed) {
    return (
      <div className="booking-page-container">
        <div className="success-card">
          <CheckCircle size={64} color="#10b981" />
          <h1>Ride Booked Successfully!</h1>
          <p>Your {selectedVehicle.name} is on the way.</p>
          <div className="driver-info">
            <div className="driver-avatar">JD</div>
            <div className="driver-details">
              <strong>John Doe</strong>
              <span>★ 4.8 | KA-01-EF-1234</span>
            </div>
          </div>
          <button className="btn-back-home" onClick={() => window.location.href = '/'}>Back to Map</button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page-container">
      <nav className="top-navbar">
        <div className="logo-section">
          <ShieldAlert size={28} color="#3b82f6" />
          <h1>SmartRoute Booking</h1>
        </div>
        <button className="btn-back" onClick={() => window.location.href = '/'}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </nav>

      <div className="booking-main">
        <div className="booking-card">
          <h2>Choose a Ride</h2>
          <div className="vehicle-options">
            {vehicleOptions.map((option) => (
              <div 
                key={option.id} 
                className={`vehicle-item ${selectedVehicle?.id === option.id ? 'active' : ''}`}
                onClick={() => setSelectedVehicle(option)}
              >
                <div className="vehicle-icon">{option.icon}</div>
                <div className="vehicle-info">
                  <div className="vehicle-name">{option.name}</div>
                  <div className="vehicle-meta">
                    <span><Users size={12} /> {option.capacity}</span>
                    <span>• {option.eta} away</span>
                  </div>
                </div>
                <div className="vehicle-price">{option.price}</div>
              </div>
            ))}
          </div>

          <div className="payment-summary">
            <h3>Payment Method: Personal Card (**** 1234)</h3>
          </div>

          <button 
            className={`btn-confirm-booking ${!selectedVehicle ? 'disabled' : ''}`}
            onClick={handleBookNow}
            disabled={!selectedVehicle}
          >
            {selectedVehicle ? `BOOK ${selectedVehicle.name.toUpperCase()}` : 'SELECT A VEHICLE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
