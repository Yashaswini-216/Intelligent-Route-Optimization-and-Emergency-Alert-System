import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const accidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapUpdater = ({ sourceLoc, destLoc, routes }) => {
  const map = useMap();
  useEffect(() => {
    if (routes && routes.length > 0 && routes[0].length > 0) {
      const bounds = L.latLngBounds(routes[0]);
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    } else if (sourceLoc && destLoc) {
      const bounds = L.latLngBounds([sourceLoc, destLoc]);
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
    } else if (sourceLoc) {
      map.flyTo(sourceLoc, 14);
    }
  }, [routes, sourceLoc, destLoc, map]);
  return null;
};

const MapComponent = ({ routes, alerts, sourceLoc, destLoc, trafficLevel, sourceName, destName }) => {
  const defaultCenter = [12.9716, 77.5946]; // Bangalore
  const center = sourceLoc || defaultCenter;

  const getPrimaryRouteColor = () => {
    switch(trafficLevel) {
      case 'High': return '#ef4444'; // Red
      case 'Medium': return '#f59e0b'; // Orange
      case 'Low': return '#10b981'; // Green
      default: return '#3b82f6'; // Blue
    }
  };

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        {/* Dark theme map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapUpdater sourceLoc={sourceLoc} destLoc={destLoc} routes={routes} />

        {sourceLoc && (
          <Marker position={sourceLoc} icon={startIcon}>
            <Popup className="custom-popup">
              <strong>Starting Point</strong><br/>
              {sourceName || "Current Location"}
            </Popup>
          </Marker>
        )}
        
        {destLoc && (
          <Marker position={destLoc} icon={endIcon}>
            <Popup className="custom-popup">
              <strong>Destination</strong><br/>
              {destName || "Selected Location"}
            </Popup>
          </Marker>
        )}

        {/* Draw alternative routes first (underneath) */}
        {routes && routes.length > 1 && routes.slice(1).map((route, idx) => (
          <Polyline 
            key={`alt-${idx}`}
            positions={route} 
            color="#64748b" 
            weight={5} 
            opacity={0.5} 
            dashArray="10, 10"
          />
        ))}

        {/* Draw primary route on top */}
        {routes && routes.length > 0 && (
          <Polyline 
            positions={routes[0]} 
            color={getPrimaryRouteColor()} 
            weight={7} 
            opacity={0.9} 
          />
        )}

        {alerts && alerts.map((alert, idx) => (
          <Marker key={idx} position={[alert.latitude, alert.longitude]} icon={accidentIcon}>
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong>Accident Reported</strong><br/>
                Status: {alert.isValidated ? 'Verified' : 'Pending Verification'}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
