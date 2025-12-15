// Global map variable
let map;

// The JSON array for the Dark Minimalist Map Style
const darkMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
];


function initMap() {
    // Initial center is a general point in India
    const initialCenter = { lat: 22.351114, lng: 78.667743 };

    map = new google.maps.Map(document.getElementById("map"), {
        center: initialCenter,
        zoom: 5,
        // Insert the dark map styles here
        styles: darkMapStyles,
        mapTypeControl: false, // Optional: hides the map/satellite toggle
        streetViewControl: false, // Optional: hides the street view character
    });

    // Check if geolocation is available in the browser
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                // Center the map on the user's location
                map.setCenter(userLocation);
                map.setZoom(12); // Zoom in on the user's city

                // Add a marker for the user's location
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "Your Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#007BFF', // Primary Blue
                        fillOpacity: 1,
                        strokeWeight: 0,
                        scale: 8
                    }
                });
            },
            () => {
                // Handle the case where the user denies permission
                handleLocationError(true, map.getCenter());
            }
        );
    } else {
        // Handle the case where the browser does not support Geolocation
        handleLocationError(false, map.getCenter());
    }

    // Load parking spot data from the API
    loadParkingSpots();
}

function handleLocationError(browserHasGeolocation, pos) {
    // Alert the user if location access failed
    alert(
        browserHasGeolocation
            ? "Error: The Geolocation service failed. Displaying default view."
            : "Error: Your browser doesn't support geolocation."
    );
}

// Function to fetch data from the Flask API and place markers
function loadParkingSpots() {
    // *** CRITICAL STEP: REPLACE THIS WITH YOUR LIVE RENDER URL ***
    const apiBaseUrl = 'https://smart-parking-api-1i5w.onrender.com'; 

    // Define the data payload required by the Flask API
    const data = {
        city: 'India_Cities' // Or whatever city/region your API expects for the full dataset
    };

    fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Crucial for cross-origin requests
            'Accept': 'application/json' 
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            // Throw an error if the API request failed (e.g., 500 server error)
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.predictions) {
            data.predictions.forEach(parking => {
                placeMarker(parking);
            });
        }
    })
    .catch(error => {
        console.error('Error fetching parking data:', error);
        alert('Could not load real-time parking data. Check the console for details.');
    });
}

// Function to place an individual marker on the map
function placeMarker(parking) {
    const latLng = new google.maps.LatLng(parking.latitude, parking.longitude);
    
    // Determine the marker color based on predicted availability (Enhancement Logic)
    let markerColor;
    let availabilityText;
    
    if (parking.available > 10) {
        markerColor = '#28A745'; // Success Green: High Availability
        availabilityText = `<span style="color: #28A745; font-weight: bold;">High Availability (${parking.available} spots)</span>`;
    } else if (parking.available > 0) {
        markerColor = '#FFC107'; // Warning Yellow/Orange: Limited Availability
        availabilityText = `<span style="color: #FFC107; font-weight: bold;">Limited Availability (${parking.available} spots)</span>`;
    } else {
        markerColor = '#DC3545'; // Danger Red: Fully Occupied
        availabilityText = `<span style="color: #DC3545; font-weight: bold;">Fully Occupied</span>`;
    }

    const marker = new google.maps.Marker({
        position: latLng,
        map: map,
        title: parking.location_name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeWeight: 1,
            strokeColor: '#343A40', // Dark Charcoal stroke for contrast
            scale: 10 // Slightly larger pin
        }
    });

    // Create the content for the info window (popup)
    const contentString = `
        <div style="font-family: Arial, sans-serif; color: #343A40;">
            <h4 style="margin: 0 0 5px 0; color: #007BFF;">${parking.location_name}</h4>
            <p style="margin: 0;">Status: ${availabilityText}</p>
            <p style="margin: 0;">Rate: ₹${parking.hourly_rate} / hour</p>
            <p style="margin: 5px 0 0 0; font-size: 0.8em;">City: ${parking.city}</p>
        </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
        content: contentString,
    });

    // Add click listener to display the info window
    marker.addListener("click", () => {
        infoWindow.open(map, marker);
    });
}
