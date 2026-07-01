import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, MapPin, PlusSquare, Loader2, ShieldAlert, Navigation } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const AlertItem = ({ alert, type, onConfirm, onReject }) => {
  const [address, setAddress] = useState('Fetching location...');
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const handleEmergencyDispatch = () => {
    if (selectedHospital) {
      socket.emit('emergency_sos', {
        hospitalName: selectedHospital.name,
        latitude: alert.latitude,
        longitude: alert.longitude,
        address: address
      });
      alert(`🚨 EMERGENCY SOS SENT to ${selectedHospital.name}! An ambulance has been dispatched to ${address}.`);
      setSelectedHospital(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAddress = async (retryCount = 0) => {
      try {
        const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY;
        const res = await axios.get(`https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${alert.latitude}&lon=${alert.longitude}&format=json`);
        if (isMounted && res.data && res.data.display_name) {
          const parts = res.data.display_name.split(', ');
          setAddress(parts.slice(0, 3).join(', '));
        }
      } catch (err) {
        console.error('Reverse Geocode Error:', err.response?.data || err.message);
        
        // If rate limited (429) and we haven't retried too much, try again after a delay
        if (err.response?.status === 429 && retryCount < 3) {
          setTimeout(() => fetchAddress(retryCount + 1), 1500); // Wait 1.5 seconds and retry
          return;
        }

        if (isMounted) {
          setAddress(`Loc: ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`);
        }
      }
    };
    fetchAddress();
    return () => { isMounted = false; };
  }, [alert.latitude, alert.longitude]);

  const findNearbyHospitals = async () => {
    if (showHospitals) {
      setShowHospitals(false);
      return;
    }
    
    setLoadingHospitals(true);
    setShowHospitals(true);
    try {
      // Use Overpass API to find hospitals AND police stations within 5km radius
      const query = `[out:json];node(around:5000,${alert.latitude},${alert.longitude})[amenity~"hospital|police"];out 6;`;
      const res = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (res.data && res.data.elements) {
        const fetchedHospitals = res.data.elements.map(el => {
          const dLat = (el.lat - alert.latitude) * 111;
          const dLon = (el.lon - alert.longitude) * 111 * Math.cos(alert.latitude * Math.PI / 180);
          const distance = Math.sqrt(dLat*dLat + dLon*dLon).toFixed(1);
          return {
            name: el.tags.name || `Unnamed ${el.tags.amenity === 'police' ? 'Police Station' : 'Hospital'}`,
            distance: distance,
            type: el.tags.amenity // 'hospital' or 'police'
          };
        }).sort((a, b) => a.distance - b.distance);
        setHospitals(fetchedHospitals);
      }
    } catch (err) {
      console.error('Error fetching emergency services', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  if (type === 'pending') {
    return (
      <div className="alert-card">
        <h3><AlertTriangle size={16} style={{ marginRight: '8px' }} /> Verify Accident</h3>
        <p style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} /> 
          <span>Reported at: <strong>{address}</strong></span>
        </p>
        <p style={{ marginBottom: '16px' }}>Please confirm to warn others.</p>
        <div className="alert-actions">
          <button className="btn-small btn-confirm" onClick={() => onConfirm(alert._id)}>
            <Check size={14} style={{ marginRight: '4px' }} /> Confirm
          </button>
          <button className="btn-small btn-reject" onClick={() => onReject(alert._id)}>
            <X size={14} style={{ marginRight: '4px' }} /> Reject
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-card" style={{ borderLeftColor: '#f59e0b' }}>
      <h3 style={{ color: '#fbbf24' }}>
        <AlertTriangle size={16} style={{ marginRight: '8px' }} /> Verified Accident
      </h3>
      <p style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} /> 
        <span>Confirmed at: <strong>{address}</strong></span>
      </p>
      <p style={{ marginBottom: 0 }}>Rerouting may occur automatically.</p>
      
      <button className="btn-hospital" onClick={findNearbyHospitals}>
        {loadingHospitals ? <Loader2 size={14} className="lucide-spin" /> : <PlusSquare size={14} />} 
        {showHospitals ? (loadingHospitals ? 'Scanning...' : 'Hide Emergency Services') : 'Find Emergency Hubs'}
      </button>

      {showHospitals && !loadingHospitals && (
        <div className="hospital-list">
          {hospitals.length > 0 ? (
            hospitals.map((h, i) => (
              <div key={i} className="hospital-item clickable" onClick={() => setSelectedHospital(h)}>
                <span className="hospital-name">
                  <PlusSquare size={12} style={{ display: 'inline', marginRight: '4px', color: h.type === 'police' ? '#3b82f6' : '#ef4444' }}/>
                  {h.name}
                </span>
                <span className="hospital-distance">{h.distance} km</span>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: '10px 0' }}>No emergency services found within 5km.</div>
          )}
        </div>
      )}

      {selectedHospital && (
        <div className="dispatch-modal-overlay">
          <div className="dispatch-modal">
            <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Dispatch Protocol: {selectedHospital.name}</h3>
            <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>
              Is this a critical emergency requiring an ambulance?
            </p>
            <div className="modal-actions">
              <button className="btn-emergency" onClick={handleEmergencyDispatch}>
                <ShieldAlert size={16} /> YES - Critical Emergency
              </button>
              <button className="btn-booking" onClick={() => window.location.href = '/booking'}>
                <Navigation size={16} /> NO - Book Auto/Cab
              </button>
            </div>
            <button className="btn-close-modal" onClick={() => setSelectedHospital(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const AlertSystem = ({ pendingAlerts, activeAlerts, onConfirm, onReject }) => {
  if (pendingAlerts.length === 0 && activeAlerts.length === 0) {
    return <div className="empty-state">No active incidents reported in your area.</div>;
  }

  return (
    <div className="alert-list">
      {pendingAlerts.map(alert => (
        <AlertItem 
          key={alert._id} 
          alert={alert} 
          type="pending" 
          onConfirm={onConfirm} 
          onReject={onReject} 
        />
      ))}
      
      {activeAlerts.map(alert => (
        <AlertItem 
          key={alert._id} 
          alert={alert} 
          type="active" 
        />
      ))}
    </div>
  );
};

export default AlertSystem;
