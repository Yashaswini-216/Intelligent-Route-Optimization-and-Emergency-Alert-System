import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import MapComponent from './components/MapComponent';
import RoutingPanel from './components/RoutingPanel';
import AlertSystem from './components/AlertSystem';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const socket = io('http://localhost:3001');

function CivilianDashboard() {
  const [routeInfo, setRouteInfo] = useState(null);
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [ambulanceDistance, setAmbulanceDistance] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  
  const userLocationRef = React.useRef(null);
  const latestRouteInfo = React.useRef(null);

  useEffect(() => {
    if (activeAlerts.length > 0) {
      setShowBanner(true);
    }
  }, [activeAlerts.length]);

  useEffect(() => {
    latestRouteInfo.current = routeInfo;
  }, [routeInfo]);

  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        (err) => console.log('Geolocation watch error', err),
        { enableHighAccuracy: true }
      );
    }
    return () => { if(watchId) navigator.geolocation.clearWatch(watchId); }
  }, []);

  useEffect(() => {
    socket.emit('get_active_alerts');

    socket.on('active_alerts', (alerts) => {
      setActiveAlerts(alerts);
    });

    socket.on('new_pending_alert', (alert) => {
      setPendingAlerts(prev => [...prev, alert]);
    });

    socket.on('alert_validated', (validatedAlert) => {
      setPendingAlerts(prev => prev.filter(a => a._id !== validatedAlert._id));
      setActiveAlerts(prev => {
        if (!prev.find(a => a._id === validatedAlert._id)) {
          return [...prev, validatedAlert];
        }
        return prev;
      });
    });

    socket.on('alert_rejected', (data) => {
      setPendingAlerts(prev => prev.filter(a => a._id !== data.alertId));
    });

    socket.on('ambulance_nearby', (ambulanceLoc) => {
      const userLat = userLocationRef.current?.lat || latestRouteInfo.current?.sourceLoc?.[0];
      const userLng = userLocationRef.current?.lng || latestRouteInfo.current?.sourceLoc?.[1];
      
      if (userLat && userLng) {
        const R = 6371e3; // metres
        const lat1 = userLat * Math.PI/180;
        const lat2 = ambulanceLoc.latitude * Math.PI/180;
        const deltaLat = (ambulanceLoc.latitude - userLat) * Math.PI/180;
        const deltaLng = (ambulanceLoc.longitude - userLng) * Math.PI/180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // in metres

        if (distance < 1500) { // Alert if within 1.5km
          setAmbulanceDistance(Math.round(distance));
        } else {
          setAmbulanceDistance(null);
        }
      }
    });

    socket.on('clear_pending_alerts', () => {
      setPendingAlerts([]);
    });

    return () => {
      socket.off('active_alerts');
      socket.off('new_pending_alert');
      socket.off('alert_validated');
      socket.off('alert_rejected');
      socket.off('ambulance_nearby');
      socket.off('clear_pending_alerts');
    };
  }, []);

  const handleRouteFound = (info) => {
    setRouteInfo(info);
  };

  const handleReportAccident = () => {
    const lat = routeInfo?.sourceLoc?.[0] || 28.6139;
    const lng = routeInfo?.sourceLoc?.[1] || 77.2090;
    
    const offsetLat = lat + (Math.random() - 0.5) * 0.005;
    const offsetLng = lng + (Math.random() - 0.5) * 0.005;

    socket.emit('report_accident', { latitude: offsetLat, longitude: offsetLng });
  };

  const handleConfirmAlert = (alertId) => {
    socket.emit('confirm_alert', { alertId });
    setPendingAlerts(prev => prev.filter(a => a._id !== alertId));
  };

  const handleRejectAlert = (alertId) => {
    socket.emit('reject_alert', { alertId });
    setPendingAlerts(prev => prev.filter(a => a._id !== alertId));
  };

  const handleResetDemo = async () => {
    try {
      await axios.post('http://localhost:3001/api/alerts/clear');
      window.location.reload(); // Refresh the page to clear all states
    } catch (err) {
      console.error('Error resetting demo', err);
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="top-navbar">
        <div className="logo-section">
          <ShieldAlert size={28} color="#3b82f6" />
          <h1>SmartRoute AI</h1>
        </div>
        <div className="nav-actions">
          <button className="btn-reset" onClick={handleResetDemo} title="Clear all data for a fresh start">Reset</button>
          <div className="mode-toggle">
            <a href="/ambulance" className="btn-switch-mode ambulance-btn">Switch to Ambulance Mode</a>
          </div>
        </div>
      </nav>

      {showBanner && activeAlerts.some(alert => {
        const userLat = userLocationRef.current?.lat || latestRouteInfo.current?.sourceLoc?.[0];
        const userLng = userLocationRef.current?.lng || latestRouteInfo.current?.sourceLoc?.[1];
        if (!userLat) return false;
        
        const R = 6371; // km
        const dLat = (alert.latitude - userLat) * Math.PI/180;
        const dLon = (alert.longitude - userLng) * Math.PI/180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI/180) * Math.cos(alert.latitude * Math.PI/180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return (R * c) < 10; // Only show if within 10km
      }) && (
        <div className="global-alert-banner">
          <div className="marquee">
            <span>
              🚨 EMERGENCY BROADCAST: CRITICAL INCIDENT CONFIRMED NEAR YOUR LOCATION. EMERGENCY SERVICES DISPATCHED. PLEASE YIELD TO AMBULANCES. 🚨
            </span>
          </div>
          <button className="close-banner" onClick={() => setShowBanner(false)}>&times;</button>
        </div>
      )}
      
      <div className="main-layout">
        <div className="sidebar">
          <div className="sidebar-section">
            <h2>Route Optimization</h2>
            <RoutingPanel 
              onRouteFound={handleRouteFound} 
              trafficInfo={routeInfo} 
              activeAlerts={activeAlerts}
            />
          </div>
          
          {(pendingAlerts.length > 0 || activeAlerts.length > 0) && (
            <div className="sidebar-section" style={{ borderBottom: 'none' }}>
              <h2>Live Incident Alerts</h2>
              <AlertSystem 
                pendingAlerts={pendingAlerts}
                activeAlerts={activeAlerts}
                onConfirm={handleConfirmAlert}
                onReject={handleRejectAlert}
              />
            </div>
          )}
        </div>
        
        <div className="map-container">
          {ambulanceDistance !== null && (
            <div className="ambulance-warning-overlay">
              <div className="ambulance-warning-content">
                <ShieldAlert size={48} className="warning-pulse-icon" />
                <h2>🚨 AMBULANCE APPROACHING 🚨</h2>
                <h1 className="distance-text">{ambulanceDistance} METERS BEHIND YOU</h1>
                <p>CLEAR THE PATH IMMEDIATELY. PULL OVER TO THE LEFT.</p>
              </div>
            </div>
          )}

          <MapComponent 
            routes={routeInfo?.routes} 
            sourceLoc={routeInfo?.sourceLoc}
            sourceName={routeInfo?.sourceName}
            destLoc={routeInfo?.destLoc}
            destName={routeInfo?.destName}
            trafficLevel={routeInfo?.trafficLevel}
            alerts={[...pendingAlerts, ...activeAlerts]} 
          />
          <button className="report-fab" onClick={handleReportAccident} title="Report Accident at Current Location">
            <AlertTriangle />
          </button>
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AmbulanceDashboard from './components/AmbulanceDashboard';
import BookingPage from './components/BookingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CivilianDashboard />} />
        <Route path="/ambulance" element={<AmbulanceDashboard />} />
        <Route path="/booking" element={<BookingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
