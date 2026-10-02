const apiKey = "AIzaSyBhwhPk5fZMG0upbbCIWuOo2frF1uclfpE";

async function testPlaces() {
  const requestBody = {
    includedTypes: ["parking"],
    maxResultCount: 10,
    locationRestriction: {
      circle: {
        center: {
          latitude: 20.5937,
          longitude: 78.9629
        },
        radius: 3000.0
      }
    }
  };

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.rating,places.businessStatus",
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

testPlaces();
