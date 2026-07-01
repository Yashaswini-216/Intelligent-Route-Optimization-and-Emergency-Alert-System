import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Radio, Navigation } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const AmbulanceDashboard = () => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [dispatches, setDispatches] = useState([]);

  useEffect(() => {
    // Listen for incoming dispatches (confirmed accidents)
    socket.emit('get_active_alerts');
    
    socket.on('active_alerts', (alerts) => {
      setDispatches(alerts);
    });

    socket.on('alert_validated', (validatedAlert) => {
      setDispatches(prev => {
        if (!prev.find(a => a._id === validatedAlert._id)) {
          return [...prev, validatedAlert];
        }
        return prev;
      });
    });

    return () => {
      socket.off('active_alerts');
      socket.off('alert_validated');
    };
  }, []);

  useEffect(() => {
    let watchId;
    if (isBroadcasting) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            // Broadcast live location to server
            socket.emit('ambulance_location', { latitude, longitude });
          },
          (err) => {
            console.error(err);
            setError('Location access denied. Cannot broadcast.');
            setIsBroadcasting(false);
          },
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        setError('Geolocation is not supported by this browser.');
      }
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isBroadcasting]);

  return (
    <div className="dashboard-container ambulance-theme">
      <nav className="top-navbar" style={{ background: 'rgba(220, 38, 38, 0.95)' }}>
        <div className="logo-section">
          <ShieldAlert size={28} color="#ffffff" />
          <h1 style={{ color: 'white' }}>Ambulance Command</h1>
        </div>
        <div className="mode-toggle">
          <a href="/" className="btn-switch-mode">Switch to Civilian</a>
        </div>
      </nav>

      <div className="ambulance-main">
        <div className="ambulance-grid">
          {/* Broadcasting Panel */}
          <div className="broadcast-card">
            <div className="broadcast-icon-container">
              <Radio size={64} className={isBroadcasting ? "broadcast-pulse" : ""} color={isBroadcasting ? "#ef4444" : "#64748b"} />
            </div>
            <h2>Emergency Protocol System</h2>
            <p>
              Activate the broadcasting system when responding to an emergency. 
              This will instantly alert all civilian vehicles within a 1.5km radius to clear the road.
            </p>

            {error && <div className="error-msg">{error}</div>}

            <button 
              className={`btn-broadcast ${isBroadcasting ? 'active' : ''}`}
              onClick={() => setIsBroadcasting(!isBroadcasting)}
            >
              {isBroadcasting ? 'STOP BROADCASTING' : 'ACTIVATE EMERGENCY SIREN (BROADCAST)'}
            </button>

            {isBroadcasting && location && (
              <div className="live-status">
                <span className="live-dot"></span> Live Tracking Active
                <br/>
                <small>Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}</small>
              </div>
            )}
          </div>

          {/* Dispatch Panel */}
          <div className="dispatch-card">
            <h2 style={{ color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={24} color="#ef4444" /> 
              Incoming Dispatches
            </h2>
            <div className="dispatch-list">
              {dispatches.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>
                  No active emergencies reported.
                </div>
              ) : (
                dispatches.map((alert, idx) => (
                  <div key={idx} className="dispatch-item">
                    <div className="dispatch-header">
                      <span className="dispatch-badge">CRITICAL INCIDENT</span>
                      <span className="dispatch-time">Just Now</span>
                    </div>
                    <div className="dispatch-body">
                      <strong>Location Data:</strong>
                      <p>Lat: {alert.latitude.toFixed(4)}</p>
                      <p>Lng: {alert.longitude.toFixed(4)}</p>
                    </div>
                    <button 
                      className="btn-route-dispatch"
                      onClick={() => window.location.href = `/?lat=${alert.latitude}&lng=${alert.longitude}`}
                    >
                      <Navigation size={14} /> Route to Incident
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceDashboard;
