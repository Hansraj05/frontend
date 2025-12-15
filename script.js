// --- Global Variables ---
let map;
let parkingMarkers = [];
let userMarker; 

// Fallback coordinates (Guwahati, used ONLY if geolocation is blocked/fails)
const FALLBACK_LAT = 26.14; 
const FALLBACK_LNG = 91.64;

// --- 2. LOCATION HANDLING: Handles the user's decision ---

function getLocationAndLoadMap() {
    const statusElement = document.getElementById('location-status');
    
    if (statusElement) {
        statusElement.textContent = 'Please allow location access...';
    } else {
        console.error("CRITICAL: Status bar element not found in index1.html.");
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // SUCCESS Handler (Uses whatever the browser reports, e.g., Lakhimpur)
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                console.log("SUCCESS: Received browser location (may be inaccurate).");
                if (statusElement) statusElement.textContent = 'Location successfully retrieved.';
                
                displayMapAndSpots(userLat, userLng, true); 
            },
            // ERROR Handler (Permission denied or Timeout)
            (error) => {
                console.error("Geolocation Error:", error.message);
                
                console.log("FALLBACK: Using default location (Guwahati).");
                handleLocationError(FALLBACK_LAT, FALLBACK_LNG);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } 
        );
    } else {
        console.log("Browser does not support Geolocation.");
        handleLocationError(FALLBACK_LAT, FALLBACK_LNG);
    }
}

function handleLocationError(fallbackLat, fallbackLng) {
    const statusElement = document.getElementById('location-status');
    if (statusElement) {
        statusElement.textContent = 'Location Blocked/Unavailable. Displaying map at Default Project Location.';
    }
    
    displayMapAndSpots(fallbackLat, fallbackLng, false);
}


// --- 3. MAP & SPOT DISPLAY (Leaflet Specific) ---

function displayMapAndSpots(lat, lng, locationReceived) {
    const userPos = [lat, lng];
    let bounds = [];

    // 1. Initialize the Leaflet Map instance
    if (map) { map.remove(); } 
    map = L.map('map'); 

    // Add a tile layer (the actual map tiles from OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. Add the User Location Marker (at the reported location)
    let markerTitle = locationReceived ? "Your Reported Location" : "Default Project Center";
    
    userMarker = L.marker(userPos, { 
        title: markerTitle,
        icon: L.icon({
            // CORRECTED: Removed the extra 'https://'
            iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', 
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map);
    
    if (locationReceived) {
        userMarker.bindPopup("Map centered on your browser's reported location. If this is inaccurate, please check your network settings.").openPopup();
    }
    
    bounds.push(userPos); 

    // 3. Load spots using the reported location for filtering, and pass the bounds array
    loadParkingSpots(lat, lng, bounds); 
    
    // Set up the auto-refresh every 30 seconds
    setInterval(() => {
        // NOTE: We pass the initial coordinates (lat, lng) to the refresh function
        // to maintain the initial filtering context.
        loadParkingSpots(lat, lng, bounds); 
    }, 30000); 
}


// --- 4. BACKEND COMMUNICATION (Modified to handle bounds array) ---

function loadParkingSpots(userLat, userLng, bounds) {
    const data = {
        user_lat: userLat,
        user_lng: userLng,
    };

    fetch('https://smart-parking-api-1i5w.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) { throw new Error(HTTP error! status: ${response.status}); }
        return response.json();
    })
    .then(spots => {
        clearMarkers();
        
        // Reset bounds for fitting the map view
        // We assume the user marker (userPos) is already in the first element of bounds.
        // We only reset the parking spot markers (which start from index 1).
        bounds.length = 1; 

        spots.forEach(spot => {
            addParkingMarker(spot);
            // Add every spot's location to the bounds array
            bounds.push([spot.lat, spot.lng]); 
        });
        
        console.log(Successfully updated ${spots.length} parking spots.);
        
        // CRITICAL FIX: Fit the map view to contain the user and all loaded parking markers!
        if (bounds.length > 1) { // bounds.length > 1 means we have the user marker + at least one spot
            map.fitBounds(bounds, { padding: [50, 50] }); 
        } else {
            // If only the user marker exists, set a default view (zoom 12)
            map.setView([userLat, userLng], 12);
        }
        
        // Final Fix: Safety check for 'last-refresh'
        const refreshElement = document.getElementById('last-refresh');
        if (refreshElement) {
            refreshElement.textContent = Last refresh: ${new Date().toLocaleTimeString()};
        }

    })
    .catch(error => {
        console.error('Error fetching parking data:', error);
        
        // Final Fix: Safety check for 'location-status'
        const statusElement = document.getElementById('location-status');
        if (statusElement) {
            statusElement.textContent = 'Error fetching data from server. Check if backend is running (Flask).';
        }
    });
}

// --- 5. MARKER RENDERING & UTILITIES ---

function clearMarkers() {
    parkingMarkers.forEach(marker => map.removeLayer(marker));
    parkingMarkers = [];
}

function getMarkerIcon(status) {
    let color = 'blue';
    if (status === 'red') { color = 'red'; } 
    else if (status === 'yellow') { color = 'gold'; } 
    else { color = 'green'; }
    
    return L.icon({
        // CORRECTED: This also uses the correct URL
        iconUrl: https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

function addParkingMarker(spot) {
    const latLng = [spot.lat, spot.lng];
    const icon = getMarkerIcon(spot.status_color);

    const newMarker = L.marker(latLng, { 
        icon: icon, title: spot.name, spotData: spot 
    });

    const content = `
        <div class="info-window-content">
            <h3>${spot.name}</h3>
            <p><strong>Available Spots:</strong> ${spot.available_count} / ${spot.total_capacity}</p>
            <p><strong>Predicted Occupied:</strong> ${spot.predicted_occupied} cars</p>
            <p><strong>Status:</strong> <span style="color:${spot.status_color}; font-weight:bold;">${spot.available_count < 5 ? 'CRITICAL' : spot.available_count < 20 ? 'BUSY' : 'GOOD'}</span></p>
            <p><small>Distance: ${spot.distance_km} km</small></p>
        </div>
    `;

    newMarker.bindPopup(content);
    newMarker.addTo(map);

    parkingMarkers.push(newMarker);
    return newMarker; 
}

// CRITICAL: Calling the main function directly at the end of the script
getLocationAndLoadMap();


