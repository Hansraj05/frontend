// --- Global Variables ---
let map;
let parkingMarkers = [];
let userMarker; 

// Fallback coordinates (Guwahati)
const FALLBACK_LAT = 26.14; 
const FALLBACK_LNG = 91.64;

// --- 2. LOCATION HANDLING ---

function getLocationAndLoadMap() {
    const statusElement = document.getElementById('location-status');
    
    if (statusElement) {
        statusElement.textContent = 'Please allow location access...';
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                if (statusElement) statusElement.textContent = 'Location successfully retrieved.';
                displayMapAndSpots(userLat, userLng, true); 
            },
            (error) => {
                handleLocationError(FALLBACK_LAT, FALLBACK_LNG);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } 
        );
    } else {
        handleLocationError(FALLBACK_LAT, FALLBACK_LNG);
    }
}

function handleLocationError(fallbackLat, fallbackLng) {
    const statusElement = document.getElementById('location-status');
    if (statusElement) {
        statusElement.textContent = 'Location Blocked. Using Guwahati as default.';
    }
    displayMapAndSpots(fallbackLat, fallbackLng, false);
}

// --- 3. MAP & SPOT DISPLAY ---

function displayMapAndSpots(lat, lng, locationReceived) {
    const userPos = [lat, lng];
    let bounds = [];

    if (map) { map.remove(); } 
    map = L.map('map'); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let markerTitle = locationReceived ? "Your Reported Location" : "Default Project Center";
    
    userMarker = L.marker(userPos, { 
        title: markerTitle,
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', 
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        })
    }).addTo(map);
    
    if (locationReceived) {
        userMarker.bindPopup("Map centered on your location.").openPopup();
    }
    
    bounds.push(userPos); 
    loadParkingSpots(lat, lng, bounds); 

    setInterval(() => {
        loadParkingSpots(lat, lng, bounds); 
    }, 30000); 
}

// --- 4. BACKEND COMMUNICATION ---

function loadParkingSpots(userLat, userLng, bounds) {
    // Note: We send city to match your existing API logic
    const data = { city: 'India_Cities' };

    fetch('https://smart-parking-api-1i5w.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    })
    .then(data => {
        clearMarkers();
        bounds.length = 1; 

        // We use data.predictions because that is what your Render API sends
        if (data.predictions) {
            data.predictions.forEach(spot => {
                addParkingMarker(spot);
                // Important: Using latitude/longitude keys from your API
                bounds.push([spot.latitude, spot.longitude]); 
            });
        }
        
        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] }); 
        } else {
            map.setView([userLat, userLng], 12);
        }
        
        const refreshElement = document.getElementById('last-refresh');
        if (refreshElement) {
            refreshElement.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const statusElement = document.getElementById('location-status');
        if (statusElement) statusElement.textContent = 'Error fetching data from server.';
    });
}

// --- 5. MARKER RENDERING & UTILITIES ---

function clearMarkers() {
    parkingMarkers.forEach(marker => map.removeLayer(marker));
    parkingMarkers = [];
}

function getMarkerIcon(available) {
    // Logic: Green if > 10, Gold if > 0, Red if 0
    let color = available > 10 ? 'green' : (available > 0 ? 'gold' : 'red');
    
    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
}

function addParkingMarker(spot) {
    // Updated to use the correct keys from your Render API
    const latLng = [spot.latitude, spot.longitude];
    const icon = getMarkerIcon(spot.available);

    const newMarker = L.marker(latLng, { icon: icon }).addTo(map);

    const content = `
        <div class="info-window-content">
            <h3>${spot.location_name}</h3>
            <p><strong>Available Spots:</strong> ${spot.available}</p>
            <p><strong>Rate:</strong> ₹${spot.hourly_rate}/hr</p>
            <p><strong>Status:</strong> <span style="font-weight:bold;">${spot.available < 5 ? 'BUSY' : 'GOOD'}</span></p>
        </div>
    `;

    newMarker.bindPopup(content);
    parkingMarkers.push(newMarker);
}

// CRITICAL: Initialize the app
getLocationAndLoadMap();




