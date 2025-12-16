// --- Global Variables ---
let map;
let parkingMarkers = [];
let userMarker; 

const FALLBACK_LAT = 26.14; 
const FALLBACK_LNG = 91.64;

// --- 1. LOCATION HANDLING ---
function getLocationAndLoadMap() {
    const statusElement = document.getElementById('location-status');
    if (statusElement) statusElement.textContent = 'Initializing map...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                displayMapAndSpots(position.coords.latitude, position.coords.longitude, true); 
            },
            () => {
                handleLocationError(FALLBACK_LAT, FALLBACK_LNG);
            },
            { enableHighAccuracy: true, timeout: 5000 } 
        );
    } else {
        handleLocationError(FALLBACK_LAT, FALLBACK_LNG);
    }
}

function handleLocationError(lat, lng) {
    const statusElement = document.getElementById('location-status');
    if (statusElement) statusElement.textContent = 'Using Default Location.';
    displayMapAndSpots(lat, lng, false);
}

// --- 2. MAP DISPLAY ---
function displayMapAndSpots(lat, lng, locationReceived) {
    const userPos = [lat, lng];
    if (map) { map.remove(); } 
    map = L.map('map').setView(userPos, 13); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    userMarker = L.marker(userPos, { 
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', 
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41]
        })
    }).addTo(map).bindPopup("<b>You are here</b>").openPopup();

    // Initial load
    loadParkingSpots(lat, lng); 
    // Auto refresh
    setInterval(() => loadParkingSpots(lat, lng), 30000); 
}

// --- 3. BACKEND COMMUNICATION (FIXING THE 400 ERROR) ---
function loadParkingSpots(userLat, userLng) {
    const apiURL = 'https://smart-parking-api-1i5w.onrender.com/predict';

    // We are switching to a GET-style request approach or a very basic POST
    // to avoid the 400 Bad Request common in Flask JSON parsing.
    fetch(apiURL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "city": "India_Cities" }), 
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        clearMarkers();
        let bounds = [[userLat, userLng]];

        // Match the "predictions" key from your Render logs
        const spots = data.predictions || data; 

        if (Array.isArray(spots)) {
            spots.forEach(spot => {
                addParkingMarker(spot);
                if (spot.latitude && spot.longitude) {
                    bounds.push([spot.latitude, spot.longitude]);
                }
            });

            if (bounds.length > 1) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
        
        document.getElementById('last-refresh').textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
        document.getElementById('location-status').textContent = 'System Active';
    })
    .catch(error => {
        console.error('Fetch Error:', error);
        document.getElementById('location-status').textContent = 'API Error - Backend issues.';
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
        iconSize: [25, 41], iconAnchor: [12, 41]
    });
}

function addParkingMarker(spot) {
    if (!spot.latitude || !spot.longitude) return;

    const latLng = [spot.latitude, spot.longitude];
    const icon = getMarkerIcon(spot.available);
    const newMarker = L.marker(latLng, { icon: icon }).addTo(map);

    const content = `
        <div style="font-family: Arial, sans-serif;">
            <h4 style="margin:0;">${spot.location_name || 'Parking Spot'}</h4>
            <p style="margin:5px 0;"><b>Available:</b> ${spot.available} spots</p>
            <p style="margin:0;"><b>Price:</b> ₹${spot.hourly_rate}/hr</p>
        </div>
    `;

    newMarker.bindPopup(content);
    parkingMarkers.push(newMarker);
}

// Start
window.onload = getLocationAndLoadMap;






