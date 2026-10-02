const apiKey = "AIzaSyBhwhPk5fZMG0upbbCIWuOo2frF1uclfpE";

async function testRoutes() {
  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: 37.419734,
          longitude: -122.0827784
        }
      }
    },
    destination: {
      location: {
        latLng: {
          latitude: 37.417670,
          longitude: -122.079595
        }
      }
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false
    },
    languageCode: "en-US",
    units: "IMPERIAL"
  };

  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        "Referer": "http://localhost:5173/"
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

testRoutes();
