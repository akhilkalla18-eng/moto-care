import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Autocomplete, Marker, Polyline } from '@react-google-maps/api';
import { MapPin, Navigation, ArrowLeft } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../auth/AuthContext';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export const JourneyNew = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [routeInfo, setRouteInfo] = useState<{
    distanceText: string;
    durationText: string;
    distanceMeters: number;
    durationSeconds: number;
    encodedPolyline: string;
  } | null>(null);

  const [origin, setOrigin] = useState<google.maps.LatLngLiteral | null>(null);
  const [destination, setDestination] = useState<google.maps.LatLngLiteral | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setOrigin(pos);
          map.panTo(pos);
          map.setZoom(15);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError("Location access is required to use Drive Safely. Please enable it.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, []);

  const onUnmount = useCallback(function callback() {
    mapRef.current = null;
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const dest = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setDestination(dest);
        calculateRoute(origin, dest);
      } else {
        setError("Could not find this destination. Please select a valid location from the dropdown.");
      }
    }
  };

  const calculateRoute = async (orig: google.maps.LatLngLiteral | null, dest: google.maps.LatLngLiteral | null) => {
    if (!orig || !dest) {
      setError("Origin or destination is missing.");
      return;
    }
    setError('');
    setRouteInfo(null);
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("Missing Google Maps API Key.");

      const requestBody = {
        origin: { location: { latLng: { latitude: orig.lat, longitude: orig.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        units: "METRIC"
      };

      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Routes API failed:", data);
        const errMessage = data.error?.message || `API Error: ${response.status}`;
        throw new Error(errMessage);
      }

      if (!data.routes || data.routes.length === 0) {
        throw new Error("No driving route found for this destination.");
      }

      const route = data.routes[0];
      const encodedPolyline = route.polyline.encodedPolyline;
      const distanceMeters = route.distanceMeters;
      const durationSeconds = parseInt(route.duration.replace('s', ''));

      // Format for UI
      const distanceText = distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`;
      const durationText = durationSeconds > 3600 
        ? `${Math.floor(durationSeconds / 3600)} h ${Math.floor((durationSeconds % 3600) / 60)} min`
        : `${Math.floor(durationSeconds / 60)} min`;

      setRouteInfo({
        distanceText,
        durationText,
        distanceMeters,
        durationSeconds,
        encodedPolyline
      });

      // Fit map bounds
      if (window.google && mapRef.current) {
        const decodedPath = google.maps.geometry.encoding.decodePath(encodedPolyline);
        const bounds = new google.maps.LatLngBounds();
        decodedPath.forEach(p => bounds.extend(p));
        mapRef.current.fitBounds(bounds);
      }

    } catch (err: any) {
      console.error("Route calculation error:", err);
      setError(`Could not calculate route: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startJourney = async () => {
    if (!origin || !destination || !currentUser || !routeInfo) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'journeys'), {
        userId: currentUser.uid,
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        destinationAddress: autocompleteRef.current?.getPlace()?.formatted_address || 'Destination',
        overviewPolyline: routeInfo.encodedPolyline,
        status: 'ACTIVE',
        startTime: Date.now(),
        distance: routeInfo.distanceMeters,
        estimatedDuration: routeInfo.durationSeconds,
        routeDeviationStatus: 'NORMAL',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      navigate(`/journey/${docRef.id}`);
    } catch (err: any) {
      setError("Failed to create journey: " + err.message);
      setLoading(false);
    }
  };

  if (loadError) return <div className="p-6">Error loading maps. Check API Key.</div>;
  if (!isLoaded) return <div className="p-6 text-center mt-10">Loading maps...</div>;

  return (
    <div className="flex flex-col md:flex-row h-full relative">
      <div className="p-4 md:p-8 bg-white shadow-md md:shadow-xl z-10 w-full md:w-[450px] shrink-0 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold">Start Journey</h2>
        </div>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}

        <div className="space-y-4 relative flex-1">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-accent rounded-full shrink-0"></div>
            <div className="flex-1 p-3 bg-slate-100 rounded-lg text-slate-500 text-sm md:text-base border border-slate-200">
              {origin ? "Current Location" : "Locating you..."}
            </div>
          </div>
          
          <div className="absolute left-[5.5px] top-[24px] bottom-[30px] w-0.5 bg-slate-300 hidden md:block"></div>

          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-danger ml-0 shrink-0" />
            <div className="flex-1">
              <Autocomplete
                onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                onPlaceChanged={onPlaceChanged}
              >
                <input
                  type="text"
                  placeholder="Where to?"
                  className="w-full p-3 md:p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none text-base"
                />
              </Autocomplete>
            </div>
          </div>
          
          {routeInfo && (
            <div className="mt-auto pt-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <p className="text-3xl font-bold text-slate-800">{routeInfo.durationText}</p>
                <p className="text-slate-500 text-base">{routeInfo.distanceText}</p>
              </div>
              <button 
                onClick={startJourney}
                disabled={loading}
                className="w-full bg-safe text-white py-4 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 text-lg"
              >
                <Navigation className="w-6 h-6" />
                {loading ? 'STARTING...' : 'START SAFE JOURNEY'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-[50vh] md:min-h-0 bg-slate-100">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={origin || { lat: 20.5937, lng: 78.9629 }}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          {origin && <Marker position={origin} />}
          {destination && <Marker position={destination} />}
          {routeInfo && window.google && (
            <Polyline
              path={google.maps.geometry.encoding.decodePath(routeInfo.encodedPolyline)}
              options={{
                strokeColor: '#10B981',
                strokeWeight: 6,
                strokeOpacity: 0.8,
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
};
