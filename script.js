// --- Global Variables ---
let map;
let parkingMarkers = [];
let userMarker; 

// Fallback coordinates (Guwahati)
const FALLBACK_LAT = 26.14; 
const FALLBACK_LNG = 91.64;

// --- 1. LOCATION HANDLING ---

function getLocationAndLoadMap() {
    const statusElement = document.getElementById('location-status');
    if (statusElement) statusElement.textContent = 'Please allow location access...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                if (statusElement) statusElement.textContent = 'Location successfully retrieved.';
                displayMapAndSpots(userLat, userLng, true); 
            },
            (error) => {
                console.warn("Geolocation blocked, using fallback.");
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
        statusElement.textContent = 'Location Blocked. Using Default View.';
    }
    displayMapAndSpots(fallbackLat, fallbackLng, false);
}

// --- 2. MAP DISPLAY ---

function displayMapAndSpots(lat, lng, locationReceived) {
    const userPos = [lat, lng];
    let bounds = [];

    if (map) { map.remove(); } 
    map = L.map('map'); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    userMarker = L.marker(userPos, { 
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', 
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        })
    }).addTo(map);
    
    userMarker.bindPopup(locationReceived ? "<b>You are here</b>" : "<b>Default Location</b>").openPopup();
    
    bounds.push(userPos); 
    loadParkingSpots(lat, lng, bounds); 

    // Refresh every 30 seconds
    setInterval(() => loadParkingSpots(lat, lng, bounds), 30000); 
}

// --- 3. BACKEND COMMUNICATION (RECTIFIED 400 ERROR) ---

function loadParkingSpots(userLat, userLng, bounds) {
    // RECTIFIED: Sending exact format expected by the API
    const payload = { 
        city: "India_Cities" 
    };

    fetch('https://smart-parking-api-1i5w.onrender.com/predict', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        clearMarkers();
        // Reset bounds to just the user position before adding spots
        bounds.length = 1; 

        // Handling the "predictions" array from your API
        if (data && data.predictions) {
            data.predictions.forEach(spot => {
                addParkingMarker(spot);
                bounds.push([spot.latitude, spot.longitude]); 
            });

            // Auto-zoom map to show all spots
            if (bounds.length > 1) {
                map.fitBounds(bounds, { padding: [50, 50] }); 
            }
        }
        
        const refreshElement = document.getElementById('last-refresh');
        if (refreshElement) {
            refreshElement.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
        }
    })
    .catch(error => {
        console.error('Fetch Error:', error);
        const statusElement = document.getElementById('location-status');
        if (statusElement) statusElement.textContent = 'API Error: Check Backend.';
    });
}

// --- 4. MARKERS ---

function clearMarkers() {
    parkingMarkers.forEach(marker => map.removeLayer(marker));
    parkingMarkers = [];
}

function getMarkerIcon(available) {
    let color = available > 10 ? 'green' : (available > 0 ? 'gold' : 'red');
    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
}

function addParkingMarker(spot) {
    const latLng = [spot.latitude, spot.longitude];
    const icon = getMarkerIcon(spot.available);

    const newMarker = L.marker(latLng, { icon: icon }).addTo(map);

    const content = `
        <div class="info-window-content">
            <h3 style="margin:0; color:#333;">${spot.location_name}</h3>
            <hr>
            <p><b>Available:</b> ${spot.available} spots</p>
            <p><b>Rate:</b> ₹${spot.hourly_rate}/hr</p>
            <p><b>Status:</b> ${spot.available > 0 ? 'OPEN' : 'FULL'}</p>
        </div>
    `;

    newMarker.bindPopup(content);
    parkingMarkers.push(newMarker);
}

// Start app
getLocationAndLoadMap();





