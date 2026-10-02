import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Clock, MapPin, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/config';
import type { Journey } from '../types';

export const History = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'journeys'), 
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const fetched: Journey[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Journey);
        });
        setJourneys(fetched);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [currentUser]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 pb-10">
      <div className="p-4 bg-white shadow-sm flex items-center gap-3 md:px-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold">Journey History</h2>
      </div>

      <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : journeys.length === 0 ? (
          <div className="text-center text-slate-500 py-10 flex flex-col items-center">
            <Clock className="w-12 h-12 mb-3 text-slate-300" />
            <p>No past journeys found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {journeys.map((journey) => (
              <div 
                key={journey.id} 
                onClick={() => navigate(`/journey/${journey.id}`)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all active:scale-95"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {formatDate(journey.startTime)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    journey.status === 'COMPLETED' ? 'bg-safe/10 text-safe' : 
                    journey.status === 'EMERGENCY' ? 'bg-danger/10 text-danger' : 
                    'bg-accent/10 text-accent'
                  }`}>
                    {journey.status}
                  </span>
                </div>
                
                <div className="space-y-2 relative pl-2">
                  <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                  
                  <div className="flex items-start gap-3 relative bg-white">
                    <div className="w-2.5 h-2.5 bg-slate-400 rounded-full mt-1.5 ml-[3px] border-2 border-white box-content"></div>
                    <p className="text-slate-600 text-sm flex-1 truncate">
                      {journey.origin.address || `Lat: ${journey.origin.lat.toFixed(4)}, Lng: ${journey.origin.lng.toFixed(4)}`}
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3 relative bg-white">
                    <MapPin className="w-4 h-4 text-accent z-10 -ml-[2px]" />
                    <p className="text-slate-800 font-medium text-sm flex-1 truncate">
                      {journey.destination.address || `Lat: ${journey.destination.lat.toFixed(4)}, Lng: ${journey.destination.lng.toFixed(4)}`}
                    </p>
                  </div>
                </div>

                {journey.status === 'EMERGENCY' && (
                  <div className="mt-4 bg-red-50 p-2 rounded flex items-center gap-2 text-danger text-sm font-bold">
                    <ShieldAlert className="w-4 h-4" /> Emergency event recorded
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
