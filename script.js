// --- Global Variables ---
let map;
let parkingMarkers = [];
let userMarker; 

const FALLBACK_LAT = 26.14; 
const FALLBACK_LNG = 91.64;

// --- 1. INITIALIZATION ---
function getLocationAndLoadMap() {
    const statusEl = document.getElementById('location-status');
    if (statusEl) statusEl.textContent = 'Initializing...';

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
    const statusEl = document.getElementById('location-status');
    if (statusEl) statusEl.textContent = 'Using Default Location.';
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

    loadParkingSpots(lat, lng); 
}

// --- 3. THE FIXED API CALL (Fixes 400 Error) ---
function loadParkingSpots(userLat, userLng) {
    const apiURL = 'https://smart-parking-api-1i5w.onrender.com/predict';

    // We send every possible key name that a Flask API might be looking for
    // This prevents the 400 "KeyError" in your Python code
    const payload = {
        "city": "India_Cities",
        "latitude": userLat,
        "longitude": userLng,
        "user_lat": userLat,
        "user_lng": userLng,
        "lat": userLat,
        "lng": userLng
    };

    fetch(apiURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server Error ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        clearMarkers();
        let bounds = [[userLat, userLng]];

        // Support both "predictions" list or a direct list response
        const spots = data.predictions || (Array.isArray(data) ? data : []); 

        spots.forEach(spot => {
            const sLat = spot.latitude || spot.lat;
            const sLng = spot.longitude || spot.lng;
            
            if (sLat && sLng) {
                addParkingMarker(spot, sLat, sLng);
                bounds.push([sLat, sLng]);
            }
        });

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        // SAFETY CHECKS: Only update text if the ID exists in index1.html
        const refreshEl = document.getElementById('last-refresh');
        if (refreshEl) refreshEl.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
        
        const statusEl = document.getElementById('location-status');
        if (statusEl) statusEl.textContent = 'Spots Loaded';
    })
    .catch(error => {
        console.error('API Error:', error);
        const statusEl = document.getElementById('location-status');
        if (statusEl) statusEl.textContent = 'API Error';
    });
}

// --- 4. MARKER UTILS ---
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

function addParkingMarker(spot, lat, lng) {
    const available = spot.available !== undefined ? spot.available : (spot.available_count || 0);
    const icon = getMarkerIcon(available);
    const newMarker = L.marker([lat, lng], { icon: icon }).addTo(map);

    const content = `
        <div style="font-family: Arial; min-width: 120px;">
            <b>${spot.location_name || spot.name || 'Spot'}</b><br>
            Available: ${available}<br>
            Rate: ₹${spot.hourly_rate || 20}/hr
        </div>
    `;
    newMarker.bindPopup(content);
    parkingMarkers.push(newMarker);
}

window.onload = getLocationAndLoadMap;









