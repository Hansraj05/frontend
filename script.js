// Initialize the map and set its view to a general point in India
// [lat, lng], zoom level
var map = L.map('map').setView([22.3511, 78.6677], 5);

// Add Dark Mode Map Tiles (using CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Status elements from your index1.html
const statusEl = document.getElementById('location-status');
const refreshEl = document.getElementById('last-refresh');

// 1. Get User Location
if (navigator.geolocation) {
    statusEl.innerText = "Finding your location...";
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            statusEl.innerText = "Location Found";
            refreshEl.innerText = "Last refresh: " + new Date().toLocaleTimeString();

            // Center map on user
            map.setView([userLat, userLng], 13);

            // Add a blue marker for the user
            L.circleMarker([userLat, userLng], {
                radius: 8,
                fillColor: "#007BFF",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map).bindPopup("<b>You are here</b>").openPopup();

            // Load parking spots from your API
            loadParkingSpots();
        },
        () => {
            statusEl.innerText = "Location access denied. Using default.";
            loadParkingSpots();
        }
    );
} else {
    statusEl.innerText = "Browser doesn't support geolocation.";
    loadParkingSpots();
}

// 2. Load Parking Data from Render API
function loadParkingSpots() {
    const apiBaseUrl = 'https://smart-parking-api-1i5w.onrender.com';
    
    fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'India_Cities' }),
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.predictions) {
            data.predictions.forEach(parking => {
                placeMarker(parking);
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusEl.innerText = "API Error: Could not load spots.";
    });
}

// 3. Place Color-Coded Markers
function placeMarker(parking) {
    let markerColor;
    let statusText;

    if (parking.available > 10) {
        markerColor = "#28A745"; // Green
        statusText = "High Availability";
    } else if (parking.available > 0) {
        markerColor = "#FFC107"; // Yellow
        statusText = "Limited Availability";
    } else {
        markerColor = "#DC3545"; // Red
        statusText = "Full";
    }

    // Create a circular marker
    const marker = L.circleMarker([parking.latitude, parking.longitude], {
        radius: 10,
        fillColor: markerColor,
        color: "#333",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(map);

    // Add Popup (Info Window)
    const popupContent = `
        <div class="info-window-content">
            <b style="color:#007BFF">${parking.location_name}</b><br>
            <b>Status:</b> <span style="color:${markerColor}">${statusText}</span> (${parking.available} spots)<br>
            <b>Rate:</b> ₹${parking.hourly_rate}/hr<br>
            <small>City: ${parking.city}</small>
        </div>
    `;
    marker.bindPopup(popupContent);
}



