import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { ShieldAlert, Pause, Play, ShieldCheck, Phone, Navigation as NavIcon, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useJourneyMonitor } from '../hooks/useJourneyMonitor';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { brandConfig } from '../config/brand';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export const JourneyActive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (loadError) {
    console.error("Map load error:", loadError);
  }

  const {
    journey,
    currentLocation,
    isEmergency,
    isStopped,
    triggerEmergency,
    confirmSafe,
    pauseJourney,
    resumeJourney
  } = useJourneyMonitor(id);

  const [activePolyline, setActivePolyline] = useState<string>('');
  const [isDeviated, setIsDeviated] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const deviationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (journey?.overviewPolyline && !activePolyline) {
      setActivePolyline(journey.overviewPolyline);
    }
  }, [journey, activePolyline]);

  // Fetch route explicitly for recalculation using Routes API REST
  const recalculateRoute = async () => {
    if (!currentLocation || !journey) return;
    setRecalculating(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const requestBody = {
        origin: { location: { latLng: { latitude: currentLocation.lat, longitude: currentLocation.lng } } },
        destination: { location: { latLng: { latitude: journey.destination.lat, longitude: journey.destination.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      };

      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message);

      if (data.routes && data.routes.length > 0) {
        const newPoly = data.routes[0].polyline.encodedPolyline;
        setActivePolyline(newPoly);
        setIsDeviated(false);
        // Save to firestore optionally
        await updateDoc(doc(db, 'journeys', id!), { overviewPolyline: newPoly });
      }
    } catch (error: any) {
      console.error("Recalculation failed:", error);
      alert(`Failed to recalculate route: ${error.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  // Route Deviation Detection
  useEffect(() => {
    if (!isLoaded || !window.google || !currentLocation || !activePolyline || journey?.status !== 'ACTIVE') return;

    const currentLatLng = new google.maps.LatLng(currentLocation.lat, currentLocation.lng);
    const decodedPath = google.maps.geometry.encoding.decodePath(activePolyline);
    
    // Check if the current location is on or near the route
    const isNearRoute = google.maps.geometry.poly.isLocationOnEdge(
      currentLatLng, 
      new google.maps.Polyline({ path: decodedPath }), 
      0.005 // Approx 500 meters tolerance
    );

    if (!isNearRoute && !isDeviated) {
      if (!deviationTimerRef.current) {
        deviationTimerRef.current = setTimeout(() => {
          setIsDeviated(true);
        }, brandConfig.thresholds.ROUTE_DEVIATION_GRACE_PERIOD_SECONDS * 1000);
      }
    } else {
      if (deviationTimerRef.current) clearTimeout(deviationTimerRef.current);
      deviationTimerRef.current = null;
      if (isNearRoute) setIsDeviated(false);
    }

    return () => {
      if (deviationTimerRef.current) clearTimeout(deviationTimerRef.current);
    };
  }, [currentLocation, activePolyline, isLoaded, journey?.status, isDeviated]);

  const endJourney = async () => {
    if (!id) return;
    confirmSafe();
    await updateDoc(doc(db, 'journeys', id), { status: 'COMPLETED', endTime: Date.now() });
    navigate('/');
  };

  const openGoogleMaps = () => {
    if (!currentLocation || !journey) return;
    const origin = `${currentLocation.lat},${currentLocation.lng}`;
    const destination = `${journey.destination.lat},${journey.destination.lng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank');
  };

  const [nearestPolice, setNearestPolice] = useState<{name: string, phone: string, address: string, lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (isEmergency && currentLocation) {
      // Find nearest police station
      const searchPolice = async () => {
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          const requestBody = {
            includedTypes: ["police"],
            maxResultCount: 1,
            locationRestriction: {
              circle: {
                center: {
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng
                },
                radius: 5000.0 // 5km
              }
            }
          };

          const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location"
            },
            body: JSON.stringify(requestBody)
          });

          const data = await response.json();
          if (data.places && data.places.length > 0) {
            const p = data.places[0];
            setNearestPolice({
              name: p.displayName?.text || 'Nearest Police Station',
              phone: p.nationalPhoneNumber || '',
              address: p.formattedAddress || '',
              lat: p.location.latitude,
              lng: p.location.longitude
            });
          }
        } catch (err) {
          console.error("Error finding police station", err);
        }
      };
      searchPolice();
    }
  }, [isEmergency, currentLocation]);

  if (!journey) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  );

  if (journey.status === 'COMPLETED') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6 flex-col text-center">
        <ShieldCheck className="w-20 h-20 text-emerald-500 mb-4" />
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Journey Completed</h2>
        <p className="text-slate-500 mb-8">You have successfully reached your destination.</p>
        <button onClick={() => navigate('/')} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold">Return Home</button>
      </div>
    );
  }

  if (isEmergency) {
    return (
      <div className="bg-red-600 text-white min-h-[calc(100vh-64px)] p-6 flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-24 h-24 mb-6 animate-pulse" />
        <h2 className="text-4xl font-bold mb-4">EMERGENCY MODE</h2>
        <p className="text-xl mb-4 opacity-90">Your emergency location has been recorded in the system.</p>
        
        {journey && (journey as any).shareToken ? (
          <div className="bg-red-700/50 p-4 rounded-xl border border-red-500 mb-8 w-full max-w-sm shadow-inner">
            <p className="text-xs font-bold text-red-200 mb-3 uppercase tracking-wide">WhatsApp automatic alert is not configured</p>
            <a 
              href={`https://wa.me/?text=${encodeURIComponent(`🚨 MOTO CARE EMERGENCY ALERT\n\nI may need help. My Moto Care emergency mode has been activated.\n\nLive location:\n${window.location.origin}/emergency/${(journey as any).shareToken}\n\nPlease check my live location and contact me immediately.`)}`}
              target="_blank" rel="noreferrer"
              className="bg-[#25D366] text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors w-full shadow-lg"
            >
              Share emergency location via WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-sm mb-8 opacity-75">Generating secure live tracking link...</p>
        )}
        
        <div className="space-y-4 w-full max-w-sm">
          {nearestPolice ? (
            nearestPolice.phone ? (
              <a href={`tel:${nearestPolice.phone.replace(/\\D/g,'')}`} className="w-full bg-white text-red-600 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-lg shadow-lg">
                <div className="flex items-center gap-2"><Phone className="w-6 h-6" /> CALL {nearestPolice.name.toUpperCase()}</div>
                <span className="text-sm font-normal opacity-80">{nearestPolice.phone}</span>
              </a>
            ) : (
              <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.lat},${currentLocation?.lng}&destination=${nearestPolice.lat},${nearestPolice.lng}`, '_blank')} className="w-full bg-white text-red-600 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-lg shadow-lg">
                <div className="flex items-center gap-2"><NavIcon className="w-6 h-6" /> NAVIGATE TO {nearestPolice.name.toUpperCase()}</div>
                <span className="text-sm font-normal opacity-80">{nearestPolice.address}</span>
              </button>
            )
          ) : (
            <a href="tel:112" className="w-full bg-white text-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg">
              <Phone className="w-6 h-6" /> CALL POLICE (112)
            </a>
          )}
          
          <button 
            onClick={() => { 
              confirmSafe(); 
              updateDoc(doc(db, 'journeys', id!), { status: 'ACTIVE' }).then(() => window.location.reload()); 
            }}
            className="w-full bg-red-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-900 transition-colors mt-8"
          >
            RESOLVE FALSE ALARM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full relative">
      <div className="flex-1 relative min-h-[50vh] md:min-h-0 bg-slate-100 order-2 md:order-1">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={currentLocation || journey.origin}
            zoom={16}
            options={{ disableDefaultUI: true, zoomControl: true }}
          >
            {currentLocation && (
               <Marker 
                 position={currentLocation} 
                 icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#10B981', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }} 
               />
            )}
            {journey.destination && <Marker position={journey.destination} />}
            {activePolyline && window.google && (
              <Polyline
                path={google.maps.geometry.encoding.decodePath(activePolyline)}
                options={{
                  strokeColor: '#10B981',
                  strokeWeight: 6,
                  strokeOpacity: 0.8,
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center text-slate-400 font-bold">Map Loading...</div>
        )}

        {isStopped && journey.status === 'ACTIVE' && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center text-white">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 animate-pulse">Are you okay?</h3>
            <p className="mb-8 text-slate-300 text-lg max-w-md">We noticed your vehicle has been unexpectedly stopped for a prolonged duration. Please confirm your safety.</p>
            <div className="w-full max-w-sm space-y-4">
              <button onClick={confirmSafe} className="w-full bg-emerald-500 text-white py-5 rounded-xl font-bold flex justify-center gap-2 text-lg hover:bg-emerald-600 transition-colors">
                <ShieldCheck className="w-6 h-6" /> YES, I'M OKAY
              </button>
              <button onClick={() => triggerEmergency('UNEXPECTED_STOP_NO_RESPONSE')} className="w-full bg-red-600 text-white py-5 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors">
                NO, I NEED HELP
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow-xl p-6 z-10 w-full md:w-[450px] shrink-0 flex flex-col order-1 md:order-2 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
           <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
             <ArrowLeft className="w-6 h-6" />
           </button>
           <div>
             <h3 className="font-bold text-2xl text-slate-800">Journey {journey.status}</h3>
             <p className="text-slate-500 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Safety Monitoring
             </p>
           </div>
           <div className="ml-auto">
             {journey.status === 'ACTIVE' ? (
               <button onClick={pauseJourney} className="p-3 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full text-slate-700" title="Pause Tracking">
                 <Pause className="w-6 h-6" />
               </button>
             ) : (
               <button onClick={resumeJourney} className="p-3 bg-emerald-100 hover:bg-emerald-200 transition-colors rounded-full text-emerald-700" title="Resume Tracking">
                 <Play className="w-6 h-6" />
               </button>
             )}
           </div>
        </div>

        {journey.status === 'PAUSED' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
            <h4 className="font-bold text-amber-800 flex items-center gap-2"><Pause className="w-5 h-5"/> Monitoring Paused</h4>
            <p className="text-sm text-amber-700 mt-1">We have temporarily stopped tracking your location and deviations.</p>
          </div>
        )}

        {isDeviated && journey.status === 'ACTIVE' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 animate-in fade-in">
            <h4 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Route Deviation Detected</h4>
            <p className="text-sm text-red-700 mt-1 mb-3">You're significantly off the planned route.</p>
            <div className="flex gap-2">
               <button onClick={recalculateRoute} disabled={recalculating} className="flex-1 bg-white border border-red-200 text-red-700 py-2 rounded-lg text-sm font-bold hover:bg-red-100 flex justify-center items-center gap-1">
                 {recalculating ? 'Working...' : <><RefreshCw className="w-4 h-4"/> Recalculate</>}
               </button>
               <button onClick={() => triggerEmergency('ROUTE_DEVIATION')} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700">
                 Emergency
               </button>
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Destination</p>
          <p className="font-medium text-slate-800 line-clamp-2">{journey.destinationAddress || 'Custom Destination'}</p>
        </div>

        {currentLocation && (
          <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
            <div>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Current Speed</p>
              <p className="font-bold text-2xl text-emerald-800">
                {Math.round((currentLocation.speed || 0) * 3.6)} <span className="text-sm font-medium text-emerald-600">km/h</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-emerald-100">
               <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        )}

        <div className="mt-auto pt-6 space-y-3">
          <button 
            onClick={openGoogleMaps}
            className="w-full bg-slate-100 text-slate-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
          >
            <NavIcon className="w-5 h-5" /> Open in Google Maps
          </button>
          
          <button 
            onClick={endJourney}
            className="w-full bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            End Journey
          </button>

          <button 
            onClick={() => triggerEmergency('MANUAL_SOS')}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-600/30 flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all mt-4"
          >
            <ShieldAlert className="w-5 h-5" /> EMERGENCY SOS
          </button>
        </div>
      </div>
    </div>
  );
};
