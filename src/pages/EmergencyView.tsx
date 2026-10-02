import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { ShieldAlert, Clock } from 'lucide-react';
import { db } from '../firebase/config';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export const EmergencyView = () => {
  const { token } = useParams<{ token: string }>();
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState('');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid tracking link.');
      return;
    }

    const unsub = onSnapshot(doc(db, 'publicShares', token), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'ENDED') {
          setError('This emergency tracking session has ended.');
        } else {
          setShareData(data);
          setError('');
        }
      } else {
        setError('This tracking link is invalid or has expired.');
      }
    }, (err) => {
      console.error(err);
      setError('Could not connect to tracking server.');
    });

    return () => unsub();
  }, [token]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tracking Unavailable</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  if (!shareData || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const loc = shareData.location;
  const timeDiffMs = Date.now() - (shareData.updatedAt || shareData.createdAt);
  const timeDiffSec = Math.floor(timeDiffMs / 1000);
  
  let timeStr = 'Just now';
  if (timeDiffSec > 60) {
    timeStr = `${Math.floor(timeDiffSec / 60)} minutes ago`;
  } else if (timeDiffSec > 10) {
    timeStr = `${timeDiffSec} seconds ago`;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-red-600 text-white p-4 shadow-md z-10">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 animate-pulse shrink-0" />
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider">Emergency Alert</h2>
            <p className="text-sm opacity-90">{shareData.userName || 'A user'} requires assistance.</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white shadow-sm z-10 border-b border-slate-200 flex justify-between items-center text-sm md:text-base">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-4 h-4 text-slate-400" />
          Last updated: <span className="font-bold text-slate-800">{timeStr}</span>
        </div>
        <button 
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`, '_blank')}
          className="bg-accent text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800"
        >
          Open in Maps
        </button>
      </div>

      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={{ lat: loc.lat, lng: loc.lng }}
          zoom={16}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          <Marker 
            position={{ lat: loc.lat, lng: loc.lng }} 
            icon={{
               path: window.google.maps.SymbolPath.CIRCLE,
               scale: 10,
               fillColor: '#DC2626',
               fillOpacity: 1,
               strokeWeight: 4,
               strokeColor: '#FECACA'
            }}
          />
        </GoogleMap>
      </div>
    </div>
  );
};
