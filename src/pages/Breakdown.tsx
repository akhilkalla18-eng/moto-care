import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Phone, Navigation, ArrowLeft, Star, MapPin } from 'lucide-react';

interface PlaceInfo {
  id: string;
  name: string;
  address: string;
  rating: number;
  lat: number;
  lng: number;
  distance: number;
  phone?: string;
  category: 'vehicle-specific' | 'general';
}

// Haversine distance formula in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const Breakdown = () => {
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState({ brand: '', model: '' });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [specificPlaces, setSpecificPlaces] = useState<PlaceInfo[]>([]);
  const [generalPlaces, setGeneralPlaces] = useState<PlaceInfo[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);

  const searchNearbyMechanics = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    
    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLoc({ lat, lng });

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setError("Google Maps API key is missing.");
          setLoading(false);
          return;
        }

        try {
          // SEARCH A: Vehicle-specific service centers
          const brandModel = `${vehicle.brand} ${vehicle.model}`.trim();
          const specificQuery = `${brandModel} authorized service center OR ${brandModel} repair`;
          
          const specificRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber"
            },
            body: JSON.stringify({
              textQuery: specificQuery,
              locationBias: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: 5000.0 // 5km
                }
              }
            })
          });

          const specificData = await specificRes.json();
          const parsedSpecific: PlaceInfo[] = (specificData.places || []).map((p: any) => ({
            id: p.id,
            name: p.displayName?.text || 'Service Center',
            address: p.formattedAddress || '',
            rating: p.rating || 0,
            phone: p.nationalPhoneNumber || '',
            lat: p.location.latitude,
            lng: p.location.longitude,
            distance: getDistance(lat, lng, p.location.latitude, p.location.longitude),
            category: 'vehicle-specific'
          })).filter((p: PlaceInfo) => p.distance <= 5.5); // Filter approx 5km

          // SEARCH B: General mechanics
          const generalRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber"
            },
            body: JSON.stringify({
              textQuery: "mechanic OR vehicle repair shop OR garage OR bike service",
              locationBias: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: 5000.0
                }
              }
            })
          });

          const generalData = await generalRes.json();
          let parsedGeneral: PlaceInfo[] = (generalData.places || []).map((p: any) => ({
            id: p.id,
            name: p.displayName?.text || 'Repair Shop',
            address: p.formattedAddress || '',
            rating: p.rating || 0,
            phone: p.nationalPhoneNumber || '',
            lat: p.location.latitude,
            lng: p.location.longitude,
            distance: getDistance(lat, lng, p.location.latitude, p.location.longitude),
            category: 'general'
          })).filter((p: PlaceInfo) => p.distance <= 5.5);

          // Deduplicate general mechanics that are already in specific mechanics
          const specificIds = new Set(parsedSpecific.map((p: PlaceInfo) => p.id));
          parsedGeneral = parsedGeneral.filter((p: PlaceInfo) => !specificIds.has(p.id));

          // Sort both by distance
          parsedSpecific.sort((a: PlaceInfo, b: PlaceInfo) => a.distance - b.distance);
          parsedGeneral.sort((a: PlaceInfo, b: PlaceInfo) => a.distance - b.distance);

          setSpecificPlaces(parsedSpecific);
          setGeneralPlaces(parsedGeneral);

          if (parsedSpecific.length === 0 && parsedGeneral.length === 0) {
            setError("No nearby vehicle service centers or mechanics found within 5 km.");
          }

        } catch (err) {
          console.error("API error", err);
          setError("Failed to fetch nearby help due to a network error.");
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        console.error(geoError);
        setError("Location access is required to find nearby vehicle help.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [vehicle]);

  const handleNext = () => {
    if (!vehicle.brand) return;
    setStep(2);
    searchNearbyMechanics();
  };

  const openNavigation = (lat: number, lng: number) => {
    if (!userLoc) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const PlaceCard = ({ place }: { place: PlaceInfo }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-slate-900">{place.name}</h4>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 line-clamp-2">
            <MapPin className="w-4 h-4 shrink-0" /> {place.address}
          </p>
          <p className="text-sm text-accent font-bold mt-2">
            {place.distance.toFixed(1)} km away
          </p>
        </div>
        {place.rating > 0 && (
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-amber-700 text-sm font-bold shrink-0">
            <Star className="w-4 h-4 fill-amber-400" /> {place.rating}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mt-2">
        {place.phone && (
          <a href={`tel:${place.phone.replace(/\\D/g,'')}`} className="flex-1 border border-accent text-accent py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
            <Phone className="w-4 h-4" /> Call
          </a>
        )}
        <button 
          onClick={() => openNavigation(place.lat, place.lng)}
          className="flex-1 bg-accent text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors"
        >
          <Navigation className="w-4 h-4" /> Navigate
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-10">
      <div className="p-4 bg-white shadow-sm flex items-center gap-3 md:px-8">
        <button onClick={() => { if(step === 2) setStep(1); else navigate(-1); }} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold">Breakdown Assistance</h2>
      </div>

      <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        {step === 1 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-2xl font-bold text-navy mb-2">Identify Vehicle</h3>
            <p className="text-slate-500 mb-6">Enter your vehicle details to find authorized service centers and specialized mechanics nearby.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Brand</label>
                <input 
                  type="text" 
                  placeholder="e.g. Honda, TVS, Ather"
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  value={vehicle.brand}
                  onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Activa 6G"
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                />
              </div>
              <button 
                onClick={handleNext}
                disabled={!vehicle.brand}
                className="w-full bg-accent text-white py-3 rounded-lg font-bold shadow hover:bg-blue-800 transition-colors disabled:opacity-50 mt-4"
              >
                Find Nearby Help
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            {loading ? (
              <div className="p-8 bg-white rounded-xl text-center shadow-sm animate-pulse border border-slate-100 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-accent rounded-full animate-spin"></div>
                <p className="text-slate-600 font-medium">Finding vehicle help near your location...</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100 flex flex-col gap-4 items-start">
                <p className="font-medium">{error}</p>
                {error.includes('Location access is required') && (
                  <button onClick={searchNearbyMechanics} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors">
                    Enable Location
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {userLoc && (
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">Your Current Location</p>
                      <p className="text-sm mt-0.5">We are searching for help near your exact GPS coordinates.</p>
                    </div>
                  </div>
                )}

                {specificPlaces.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-800 mb-4 text-lg uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                      <span>🚗</span> VEHICLE-SPECIFIC SERVICE CENTERS
                    </h3>
                    <div className="space-y-4">
                      {specificPlaces.map((place) => (
                        <PlaceCard key={place.id} place={place} />
                      ))}
                    </div>
                  </div>
                )}

                {generalPlaces.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-800 mb-4 text-lg uppercase tracking-wider border-b pb-2 flex items-center gap-2 mt-8">
                      <span>🔧</span> NEARBY MECHANICS & REPAIR SHOPS
                    </h3>
                    <div className="space-y-4">
                      {generalPlaces.map((place) => (
                        <PlaceCard key={place.id} place={place} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
