import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fuel, Navigation, ArrowLeft, Star, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export interface PlaceResultNew {
  name?: string;
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
  distanceMeters?: number;
}

export const LowFuel = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<PlaceResultNew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Haversine formula
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m away`;
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  const fetchStations = useCallback(async (location: {lat: number, lng: number}) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error("Missing API Key");
      }

      const requestBody = {
        includedTypes: ["gas_station"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng
            },
            radius: 5000.0 // Strict 5km radius
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
        // Calculate distance, filter strictly <= 5000m, and sort by distance
        const placesWithDistance = data.places.map((place: PlaceResultNew) => {
          if (place.location) {
            place.distanceMeters = calculateDistanceMeters(
              location.lat, 
              location.lng, 
              place.location.latitude, 
              place.location.longitude
            );
          } else {
            place.distanceMeters = 999999;
          }
          return place;
        });

        // Strict 5km filter
        const filteredPlaces = placesWithDistance.filter((p: PlaceResultNew) => 
          p.distanceMeters !== undefined && p.distanceMeters <= 5000
        );

        // Sort by nearest first
        filteredPlaces.sort((a: PlaceResultNew, b: PlaceResultNew) => 
          (a.distanceMeters || 0) - (b.distanceMeters || 0)
        );

        if (filteredPlaces.length === 0) {
          setError("No petrol pumps found within 5 km of your current location.");
          setPlaces([]);
        } else {
          setPlaces(filteredPlaces);
        }
      } else {
        setError("No petrol pumps found within 5 km of your current location.");
        setPlaces([]);
      }
    } catch (err: any) {
      setError(`Unable to load nearby petrol pumps. Please try again. (${err.message})`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const locateUser = useCallback(() => {
    setLoading(true);
    setError('');
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(pos);
        fetchStations(pos);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Your current location could not be determined.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location detection timed out. Please try again.");
        } else {
          setError("Failed to get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [fetchStations]);

  useEffect(() => {
    locateUser();
  }, [locateUser]);

  const openDirections = (place: PlaceResultNew) => {
    if (!place.location || !userLocation) return;
    
    const origin = `${userLocation.lat},${userLocation.lng}`;
    const destination = `${place.location.latitude},${place.location.longitude}`;
    
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-10">
      <div className="p-4 bg-white shadow-sm flex items-center justify-between md:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold">Low Fuel</h2>
        </div>
        
        {userLocation && (
          <button 
            onClick={locateUser}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors disabled:opacity-50"
            title="Refresh Location"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
            <Fuel className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Nearby Petrol Pumps</h3>
            <p className="text-slate-500 text-sm">Strictly within 5km radius from your exact location</p>
          </div>
        </div>

        {permissionDenied ? (
          <div className="bg-white p-8 rounded-2xl border border-amber-200 shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Location access is required</h3>
            <p className="text-slate-600 text-sm mb-6">Location access is required to find petrol pumps near you.</p>
            <button 
              onClick={locateUser}
              className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors"
            >
              Enable Location / Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="p-8 bg-white rounded-2xl text-center shadow-sm border border-slate-100">
              <div className="w-10 h-10 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-bold text-slate-700">Finding petrol pumps near your location...</p>
              <p className="text-sm text-slate-500 mt-1">Fetching real-time data...</p>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-4">{error}</p>
            <button 
              onClick={locateUser}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Fuel className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-slate-800 mb-2">No stations found nearby.</h3>
            <p className="text-slate-500 mb-6 text-sm">There are no petrol pumps within 5km of your current location.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{places.length} Stations Found</span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider border border-amber-100">Sorted by Nearest</span>
            </div>
            
            {places.map((place, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:shadow-md hover:border-amber-200 transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-lg leading-tight">{place.displayName?.text || 'Petrol Station'}</h4>
                    <p className="text-sm text-slate-500 flex items-start gap-1 mt-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" /> 
                      <span>{place.formattedAddress || 'Address unavailable'}</span>
                    </p>
                  </div>
                  {place.distanceMeters !== undefined && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded shrink-0 whitespace-nowrap">
                      {formatDistance(place.distanceMeters)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  {place.rating && (
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700 text-xs font-bold shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {place.rating}
                    </div>
                  )}
                  {place.businessStatus === 'OPERATIONAL' && (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-xs font-bold">Open</span>
                  )}
                  {place.businessStatus === 'CLOSED_TEMPORARILY' && (
                    <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-xs font-bold">Temporarily Closed</span>
                  )}
                </div>
                
                <button 
                  onClick={() => openDirections(place)}
                  className="mt-3 w-full bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                >
                  <Navigation className="w-5 h-5" /> Navigate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
