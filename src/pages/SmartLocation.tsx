import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { MapPin, ArrowLeft, Star, ParkingCircle, AlertCircle, Navigation, Map as MapIcon, RefreshCw } from 'lucide-react';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];
const PARKING_SEARCH_RADIUS_METERS = 3000;

export interface PlaceResultNew {
  name?: string; // resource name
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  businessStatus?: string;
  displayName?: {
    text: string;
  };
}

export const SmartLocation = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<PlaceResultNew[]>([]);
  
  // Status states
  const [locationState, setLocationState] = useState<'IDLE' | 'FETCHING_LOCATION' | 'LOCATION_DENIED' | 'LOCATION_ERROR' | 'SEARCHING_PARKING' | 'SUCCESS' | 'API_ERROR' | 'NO_RESULTS'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const searchNearbyParking = useCallback(async (location: google.maps.LatLngLiteral) => {
    if (!isLoaded) {
      setLocationState('API_ERROR');
      setErrorMessage("Google Maps API is not loaded.");
      return;
    }

    setLocationState('SEARCHING_PARKING');
    
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
         throw new Error("Missing API Key");
      }

      const requestBody = {
        includedTypes: ["parking"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng
            },
            radius: PARKING_SEARCH_RADIUS_METERS
          }
        }
      };

      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.rating,places.businessStatus"
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        setPlaces(data.places);
        setLocationState('SUCCESS');
      } else {
        setPlaces([]);
        setLocationState('NO_RESULTS');
      }
    } catch (err: any) {
      setLocationState('API_ERROR');
      setErrorMessage(`Places API (New) Error: ${err.message}`);
      console.error(err);
    }
  }, [isLoaded]);

  const fetchCurrentLocation = useCallback(() => {
    setLocationState('FETCHING_LOCATION');
    setErrorMessage('');
    
    if (!navigator.geolocation) {
      setLocationState('LOCATION_ERROR');
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(pos);
        searchNearbyParking(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationState('LOCATION_DENIED');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationState('LOCATION_ERROR');
          setErrorMessage("Your current location could not be determined.");
        } else if (err.code === err.TIMEOUT) {
          setLocationState('LOCATION_ERROR');
          setErrorMessage("Location detection timed out. Please try again.");
        } else {
          setLocationState('LOCATION_ERROR');
          setErrorMessage("Failed to get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [searchNearbyParking]);

  const openDirections = (place: PlaceResultNew) => {
    if (!place.location) return;
    const lat = place.location.latitude;
    const lng = place.location.longitude;
    // Using destination coordinates for reliable navigation
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const calculateDistance = (placeLoc: {latitude: number, longitude: number}) => {
    if (!userLocation) return null;
    
    // Haversine formula for distance estimation
    const R = 6371e3; // metres
    const φ1 = userLocation.lat * Math.PI/180; // φ, λ in radians
    const φ2 = placeLoc.latitude * Math.PI/180;
    const Δφ = (placeLoc.latitude - userLocation.lat) * Math.PI/180;
    const Δλ = (placeLoc.longitude - userLocation.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // in metres

    if (d < 1000) {
      return `${Math.round(d)} m`;
    }
    return `${(d/1000).toFixed(1)} km`;
  };

  return (
    <div className="flex flex-col md:flex-row h-full relative bg-slate-50">
      
      {/* Sidebar Area */}
      <div className="flex flex-col w-full md:w-[450px] lg:w-[500px] shrink-0 bg-white shadow-xl z-10 h-[50vh] md:h-full overflow-y-auto">
        <div className="p-5 md:p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ParkingCircle className="w-6 h-6 text-teal-600" /> Smart Location
              </h2>
            </div>
            
            {/* Refresh Button - Only show if location was already fetched */}
            {userLocation && (
              <button 
                onClick={fetchCurrentLocation}
                disabled={locationState === 'FETCHING_LOCATION' || locationState === 'SEARCHING_PARKING'}
                className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors disabled:opacity-50"
                title="Refresh Location"
              >
                <RefreshCw className={`w-5 h-5 ${locationState === 'FETCHING_LOCATION' ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-5 md:p-6 bg-slate-50">
          
          {/* INITIAL STATE */}
          {locationState === 'IDLE' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mt-4">
              <MapIcon className="w-16 h-16 text-teal-100 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Need to stop safely?</h3>
              <p className="text-slate-600 mb-8">Find nearby parking instead of stopping in restricted or unsafe areas.</p>
              
              <button 
                onClick={fetchCurrentLocation}
                className="w-full bg-teal-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-600/20"
              >
                <MapPin className="w-5 h-5" /> Fetch Current Location
              </button>
            </div>
          )}

          {/* LOADING STATES */}
          {(locationState === 'FETCHING_LOCATION' || locationState === 'SEARCHING_PARKING') && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mt-4 space-y-6">
              <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin mx-auto"></div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  {locationState === 'FETCHING_LOCATION' ? 'Getting your current location...' : 'Finding nearby parking...'}
                </h3>
                <p className="text-slate-500 text-sm mt-2">This should only take a moment.</p>
              </div>
            </div>
          )}

          {/* ERROR STATES */}
          {locationState === 'LOCATION_DENIED' && (
            <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm text-center mt-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Location access is required</h3>
              <p className="text-slate-600 text-sm mb-6">Location permission was denied. Please enable location access in your browser settings and try again.</p>
              <button 
                onClick={fetchCurrentLocation}
                className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors w-full"
              >
                Try Again
              </button>
            </div>
          )}

          {locationState === 'LOCATION_ERROR' && (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center mt-4">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-red-700 font-medium mb-4">{errorMessage}</p>
              <button 
                onClick={fetchCurrentLocation}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {locationState === 'API_ERROR' && (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center mt-4">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-red-800 mb-2">Unable to find nearby parking right now.</h3>
              <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
              {loadError && (
                <div className="text-xs text-red-500 bg-red-100 p-2 rounded mb-4 text-left font-mono">
                  Google Maps could not be loaded. Please ensure VITE_GOOGLE_MAPS_API_KEY is configured in your .env file.
                </div>
              )}
              <button 
                onClick={() => userLocation ? searchNearbyParking(userLocation) : fetchCurrentLocation()}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {locationState === 'NO_RESULTS' && (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 mt-4">
              <ParkingCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-lg text-slate-800 mb-2">No nearby parking areas found.</h3>
              <p className="text-slate-500 mb-6 text-sm">Try searching a wider area.</p>
              <button 
                onClick={() => userLocation ? searchNearbyParking(userLocation) : fetchCurrentLocation()}
                className="border-2 border-teal-600 text-teal-600 px-6 py-2 rounded-xl font-bold hover:bg-teal-50 transition-colors"
              >
                Search Again
              </button>
            </div>
          )}

          {/* SUCCESS STATE - RESULTS */}
          {locationState === 'SUCCESS' && (
            <div className="space-y-4 pb-6">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{places.length} Locations Found</span>
                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full uppercase tracking-wider">Current Location Detected</span>
              </div>
              
              {places.map((place, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:shadow-md hover:border-teal-200 transition-all">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{place.displayName?.text || 'Parking Location'}</h4>
                      <p className="text-sm text-slate-500 flex items-start gap-1 mt-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" /> 
                        <span>{place.formattedAddress || 'Address unavailable'}</span>
                      </p>
                    </div>
                    {place.location && calculateDistance(place.location) && (
                      <div className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded shrink-0">
                        {calculateDistance(place.location)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {place.rating && (
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-amber-700 text-xs font-bold shrink-0 border border-amber-100">
                        <Star className="w-3 h-3 fill-amber-400" /> {place.rating}
                      </div>
                    )}
                    {place.businessStatus === 'OPERATIONAL' && (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-xs font-bold">Open</span>
                    )}
                    {place.businessStatus === 'CLOSED_TEMPORARILY' && (
                      <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-xs font-bold">Temporarily Closed</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-600 flex justify-between">
                      <span className="font-semibold">FEE:</span> 
                      <span className="italic">Parking fee information unavailable</span>
                    </p>
                    <p className="text-xs text-slate-600 flex justify-between">
                      <span className="font-semibold">AVAILABILITY:</span> 
                      <span className="italic">Live availability unavailable</span>
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => openDirections(place)}
                    className="mt-2 w-full bg-navy text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-md"
                  >
                    <Navigation className="w-4 h-4" /> START
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative h-[50vh] md:h-full bg-slate-200 border-t md:border-t-0 md:border-l border-slate-300">
        {!isLoaded || loadError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 p-6 text-center">
            <MapIcon className="w-16 h-16 text-slate-300 mb-4" />
            <p className="font-medium text-lg text-slate-700">Map Area</p>
            {loadError && (
              <p className="text-red-500 text-sm mt-2 max-w-sm">Google Maps could not be loaded. Please verify your VITE_GOOGLE_MAPS_API_KEY.</p>
            )}
            {!loadError && !isLoaded && (
              <p className="text-slate-500 text-sm mt-2">Map will appear here after fetching location.</p>
            )}
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={userLocation || { lat: 20.5937, lng: 78.9629 }}
            zoom={userLocation ? 15 : 5}
            options={{ 
              disableDefaultUI: true, 
              zoomControl: true,
              styles: [
                {
                  featureType: "poi.business",
                  stylers: [{ visibility: "off" }]
                },
                {
                  featureType: "poi.park",
                  elementType: "labels.text",
                  stylers: [{ visibility: "off" }]
                }
              ]
            }}
          >
            {userLocation && (
              <Marker 
                position={userLocation} 
                title="You are here"
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: '#3B82F6', // Blue
                  fillOpacity: 1,
                  strokeWeight: 3,
                  strokeColor: '#FFFFFF',
                }} 
              />
            )}
            
            {places.map((place, idx) => (
              place.location && (
                <Marker 
                  key={idx} 
                  position={{ lat: place.location.latitude, lng: place.location.longitude }} 
                  title={place.displayName?.text || 'Parking'}
                  icon={{
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: '#0D9488', // Teal
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                  }}
                />
              )
            ))}
          </GoogleMap>
        )}
      </div>
      
    </div>
  );
};
