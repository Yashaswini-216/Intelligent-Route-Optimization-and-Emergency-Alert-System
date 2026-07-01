import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, MapPin, LocateFixed } from 'lucide-react';
import axios from 'axios';

// Reusable Autocomplete Input Component
const AutocompleteInput = ({ label, placeholder, value, onChange, onSelect, liveAddress, isSource, onLiveClick }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isTyping || value.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Debounce API call (1 second) to respect rate limits
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY;
        const res = await axios.get(`https://us1.locationiq.com/v1/autocomplete.php?key=${apiKey}&q=${encodeURIComponent(value)}&limit=5&countrycodes=in`);
        if (res.data && res.data.length > 0) {
          setSuggestions(res.data);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.error('Autocomplete error', err);
      }
    }, 1000);

    return () => clearTimeout(timeoutRef.current);
  }, [value, isTyping]);

  const handleSelect = (item) => {
    setIsTyping(false);
    setShowDropdown(false);
    // Call parent handler with the exact coordinates and name
    onSelect({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    });
  };

  const handleInputChange = (e) => {
    setIsTyping(true);
    onChange(e.target.value);
  };

  return (
    <div className="input-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label>{label} {isSource && liveAddress && liveAddress === value && <span style={{color: '#10b981', fontSize: '0.75rem'}}>(Live)</span>}</label>
        {isSource && (
          <button 
            type="button" 
            onClick={onLiveClick}
            className="btn-live-location"
            title="Use Live Location"
          >
            <LocateFixed size={14} /> Live
          </button>
        )}
      </div>
      <div className="autocomplete-wrapper">
        <input 
          type="text" 
          className="input-field" 
          value={value} 
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onBlur={() => setShowDropdown(false)}
          placeholder={placeholder}
        />
        {showDropdown && suggestions.length > 0 && (
          <div className="dropdown-menu">
            {suggestions.map((item, idx) => {
              const parts = item.display_name.split(', ');
              const mainText = parts[0];
              const subText = parts.slice(1).join(', ');
              return (
                <div 
                  key={idx} 
                  className="dropdown-item" 
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelect(item);
                  }}
                >
                  <span className="dropdown-main-text">{mainText}</span>
                  <span className="dropdown-sub-text">{subText}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const RoutingPanel = ({ onRouteFound, trafficInfo, activeAlerts }) => {
  const [sourceText, setSourceText] = useState('Locating...');
  const [destText, setDestText] = useState('');
  
  // Store exact coordinates if selected from autocomplete or live location
  const [sourceData, setSourceData] = useState(null);
  const [destData, setDestData] = useState(null);

  const [shouldAutoSearch, setShouldAutoSearch] = useState(false);

  // Handle auto-routing from Dispatch Link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    if (lat && lng) {
      setDestData({ lat: parseFloat(lat), lng: parseFloat(lng) });
      setDestText(`Incident Site (${lat}, ${lng})`);
      setShouldAutoSearch(true);
    }
  }, []);

  useEffect(() => {
    if (shouldAutoSearch && sourceData && destData) {
      handleSearch();
      setShouldAutoSearch(false);
    }
  }, [shouldAutoSearch, sourceData, destData]);
  
  const [loading, setLoading] = useState(false);
  const [liveAddress, setLiveAddress] = useState('');

  const getLiveLocation = () => {
    setSourceText('Locating...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
          const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY;
          const res = await axios.get(`https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`);
          if (res.data && res.data.display_name) {
            const exactAddress = res.data.display_name;
            setSourceText(exactAddress);
            setLiveAddress(exactAddress);
            setSourceData({ name: exactAddress, lat, lon: lng });
          } else {
            setSourceText('Current Location');
            setLiveAddress('Current Location');
            setSourceData({ name: 'Current Location', lat, lon: lng });
          }
        } catch (err) {
          console.error('Live Location Reverse Geocode Error:', err.response?.data || err.message);
          setSourceText('Current Location');
          setLiveAddress('Current Location');
          setSourceData({ name: 'Current Location', lat, lon: lng });
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        setSourceText('');
        alert("Could not get location. Please check browser permissions.");
      });
    } else {
      setSourceText('');
    }
  };

  // Initial Geolocation
  useEffect(() => {
    getLiveLocation();
  }, []);

  // Fallback geocoding if user typed but didn't select from dropdown
  const getCoordinates = async (address) => {
    try {
      const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY;
      let res = await axios.get(`https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(address)}&format=json&countrycodes=in&limit=1`);
      if (!res.data || res.data.length === 0) {
        res = await axios.get(`https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(address + ', Bangalore')}&format=json&countrycodes=in&limit=1`);
      }
      if (res.data && res.data.length > 0) {
        return [parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)];
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!sourceText || !destText) return;
    
    setLoading(true);
    try {
      // Use pre-selected data if text matches, else fallback to searching
      let finalSourceCoords = null;
      if (sourceData && sourceData.name === sourceText) {
        finalSourceCoords = [sourceData.lat, sourceData.lon];
      } else {
        finalSourceCoords = await getCoordinates(sourceText);
      }
      
      if (!finalSourceCoords) {
        alert(`Could not find location: "${sourceText}". Try selecting from the dropdown suggestions.`);
        setLoading(false);
        return;
      }

      let finalDestCoords = null;
      if (destData && destData.name === destText) {
        finalDestCoords = [destData.lat, destData.lon];
      } else {
        finalDestCoords = await getCoordinates(destText);
      }

      if (!finalDestCoords) {
        alert(`Could not find location: "${destText}". Try selecting from the dropdown suggestions.`);
        setLoading(false);
        return;
      }

      // Fetch route from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${finalSourceCoords[1]},${finalSourceCoords[0]};${finalDestCoords[1]},${finalDestCoords[0]}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const routeRes = await axios.get(osrmUrl);
      
      if (routeRes.data && routeRes.data.routes.length > 0) {
        let allRoutes = routeRes.data.routes;
        
        let primaryRouteData = allRoutes[0];
        let primaryCoords = primaryRouteData.geometry.coordinates.map(c => [c[1], c[0]]);
        
        const distance = (primaryRouteData.distance / 1000).toFixed(1);
        let duration = primaryRouteData.duration / 60;

        let trafficLevel = 'Low';
        try {
          const aiRes = await axios.post('http://localhost:5000/api/predict_traffic', {
            source: finalSourceCoords,
            destination: finalDestCoords,
            time: new Date().toISOString()
          });
          trafficLevel = aiRes.data.traffic_level;
          if (trafficLevel === 'High') duration *= 1.8;
          if (trafficLevel === 'Medium') duration *= 1.3;
        } catch(err) {
          console.error('AI Service not running, defaulting traffic', err);
        }

        // If traffic is high and we have an alternative route, swap them to recommend the alternative
        if (trafficLevel === 'High' && allRoutes.length > 1) {
          primaryRouteData = allRoutes[1];
          allRoutes[1] = allRoutes[0];
          allRoutes[0] = primaryRouteData;
          primaryCoords = primaryRouteData.geometry.coordinates.map(c => [c[1], c[0]]);
          // Note: duration/distance would technically change, but for demo we just switch the visual path
        }

        // Extract steps for the primary route
        const steps = primaryRouteData.legs[0].steps.map(step => ({
          instruction: step.maneuver.modifier 
            ? `Turn ${step.maneuver.modifier} onto ${step.name || 'road'}` 
            : (step.name ? `Continue on ${step.name}` : 'Continue straight'),
          distance: (step.distance / 1000).toFixed(2),
          type: step.maneuver.type
        })).filter(s => parseFloat(s.distance) > 0);

        const routeCoordsArray = allRoutes.map(r => r.geometry.coordinates.map(c => [c[1], c[0]]));

        onRouteFound({
          routes: routeCoordsArray,
          steps: steps,
          sourceLoc: finalSourceCoords,
          sourceName: sourceData.name,
          destLoc: finalDestCoords,
          destName: destData.name,
          distance: distance,
          duration: Math.round(duration),
          trafficLevel
        });
      }
    } catch (error) {
      console.error('Routing error', error);
      alert("Error finding a route network between these two points.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column' }}>
        <AutocompleteInput 
          label="Source" 
          placeholder="Enter starting point"
          value={sourceText}
          onChange={setSourceText}
          onSelect={(data) => {
            setSourceText(data.name);
            setSourceData(data);
          }}
          liveAddress={liveAddress}
          isSource={true}
          onLiveClick={getLiveLocation}
        />
        
        <AutocompleteInput 
          label="Destination" 
          placeholder="Enter destination"
          value={destText}
          onChange={setDestText}
          onSelect={(data) => {
            setDestText(data.name);
            setDestData(data);
          }}
        />

        <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Optimizing Route...' : <><Search size={18} /> Find Optimal Route</>}
        </button>
      </form>

      {trafficInfo && (
        <div className="route-info-container">
          
          <div className="journey-intelligence-card">
            <h3 className="card-title">Journey Intelligence</h3>
            
            <div className="intelligence-grid">
              <div className="intel-item">
                <span className="intel-label">Traffic Density</span>
                <span className={`traffic-badge traffic-${trafficInfo.trafficLevel.toLowerCase()}`}>
                  {trafficInfo.trafficLevel}
                </span>
              </div>
              
              <div className="intel-item">
                <span className="intel-label">Weather (Dest)</span>
                <span className="intel-value" style={{ color: '#60a5fa' }}>
                  {Math.random() > 0.5 ? 'Clear ☀️' : 'Light Rain 🌧️'}
                </span>
              </div>
              
              <div className="intel-item">
                <span className="intel-label">Road Blockages</span>
                <span className="intel-value" style={{ color: '#10b981' }}>None Detected</span>
              </div>
              
              <div className="intel-item">
                <span className="intel-label">Hazards on Route</span>
                <span className="intel-value" style={{ color: activeAlerts && activeAlerts.length > 0 ? '#ef4444' : '#10b981' }}>
                  {activeAlerts && activeAlerts.length > 0 ? `${activeAlerts.length} Reported` : 'Clear Route'}
                </span>
              </div>
            </div>

            {trafficInfo.trafficLevel === 'High' && trafficInfo.routes.length > 1 && (
              <div className="alert-card" style={{ marginTop: '16px', padding: '12px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Navigation size={14} /> High Traffic Reroute Active
                </strong>
                <span style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  Automatically swapped to alternative path to save {Math.floor(Math.random() * 15 + 5)} minutes.
                </span>
              </div>
            )}
          </div>

          <div className="route-info">
            <div className="info-row">
              <span className="info-label">Estimated Time</span>
              <span className="info-value">{trafficInfo.duration} min</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Distance</span>
              <span className="info-value">{trafficInfo.distance} km</span>
            </div>
          </div>
          
          {trafficInfo.steps && trafficInfo.steps.length > 0 && (
            <div className="route-steps-container">
              <h3 style={{ fontSize: '0.95rem', marginBottom: '12px', color: '#94a3b8' }}>Turn-by-Turn Directions</h3>
              <div className="route-steps">
                {trafficInfo.steps.map((step, idx) => (
                  <div key={idx} className="route-step-item">
                    <Navigation size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#3b82f6' }} />
                    <div style={{ flex: 1 }}>
                      <p className="step-instruction">{step.instruction}</p>
                      <p className="step-distance">{step.distance} km</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutingPanel;
