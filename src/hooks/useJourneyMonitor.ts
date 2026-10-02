import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Journey, Location } from '../types';
import { brandConfig } from '../config/brand';

export const useJourneyMonitor = (journeyId: string | undefined) => {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location & { speed?: number; timestamp: number } | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to journey document
  useEffect(() => {
    if (!journeyId) return;
    const unsub = onSnapshot(doc(db, 'journeys', journeyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Journey;
        setJourney(data);
        if (data.status === 'EMERGENCY') setIsEmergency(true);
      }
    });
    return () => unsub();
  }, [journeyId]);

  const lastLocRef = useRef<{lat: number, lng: number, timestamp: number} | null>(null);

  // Helper to calculate distance in meters between two lat/lng points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Monitor Geolocation
  useEffect(() => {
    if (!journeyId || journey?.status === 'PAUSED' || journey?.status === 'COMPLETED') return;

    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          let speed = position.coords.speed;
          
          // Fallback: Compute speed manually if hardware speed is unavailable
          if (speed === null && lastLocRef.current) {
             const dist = calculateDistance(
               lastLocRef.current.lat, lastLocRef.current.lng,
               position.coords.latitude, position.coords.longitude
             );
             const timeDiff = (position.timestamp - lastLocRef.current.timestamp) / 1000; // seconds
             speed = timeDiff > 0 ? dist / timeDiff : 0;
          } else if (speed === null) {
             speed = 0; // First reading
          }

          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed: speed, // m/s
            timestamp: position.timestamp
          };
          
          lastLocRef.current = { lat: newLoc.lat, lng: newLoc.lng, timestamp: newLoc.timestamp };
          
          setCurrentLocation(newLoc);
          updateJourneyLocation(newLoc);
          checkStopLogic(newLoc);
        },
        (error) => console.error("Error watching position", error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [journeyId, journey?.status]);

  const updateJourneyLocation = async (loc: any) => {
    if (!journeyId || !journey) return;
    const now = Date.now();
    await updateDoc(doc(db, 'journeys', journeyId), {
      currentLocation: loc,
      updatedAt: now
    });
    // Throttle public sync to avoid spamming publicShares
    if (journey.status === 'EMERGENCY' && (journey as any).shareToken) {
      await updateDoc(doc(db, 'publicShares', (journey as any).shareToken), {
        location: loc,
        updatedAt: now
      }).catch(e => console.error(e));
    }
  };

  const checkStopLogic = (loc: any) => {
    // If speed is practically 0 (less than 1 m/s, approx 3.6 km/h)
    if (loc.speed < 1) {
      if (!stopTimerRef.current) {
        stopTimerRef.current = setTimeout(() => {
          setIsStopped(true);
        }, brandConfig.thresholds.STOP_DETECTION_THRESHOLD_SECONDS * 1000);
      }
    } else {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
      setIsStopped(false);
    }
  };

  const triggerEmergency = async (reason: string) => {
    if (!journeyId || !journey) return;
    setIsEmergency(true);
    
    // Generate cryptographically secure share token for live tracking
    const shareToken = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
      
    const now = Date.now();

    import('firebase/firestore').then(({ setDoc }) => {
      setDoc(doc(db, 'publicShares', shareToken), {
        userId: journey.userId, // Strictly required for Firestore security rules ownership check
        location: currentLocation,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }).catch(e => console.error(e));
    });

    await updateDoc(doc(db, 'journeys', journeyId), { 
      status: 'EMERGENCY',
      shareToken: shareToken 
    });
    
    await addDoc(collection(db, 'emergencyEvents'), {
      journeyId,
      userId: journey.userId,
      location: currentLocation,
      timestamp: now,
      triggerType: reason,
      shareToken: shareToken,
      status: 'ACTIVE'
    });
  };

  const confirmSafe = async () => {
    setIsStopped(false);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    
    // End emergency session if it was active
    if (journey && (journey as any).shareToken) {
      import('firebase/firestore').then(({ updateDoc }) => {
        updateDoc(doc(db, 'publicShares', (journey as any).shareToken), { status: 'ENDED' }).catch(e => console.error(e));
      });
      setIsEmergency(false);
    }
  };

  const pauseJourney = async () => {
    if (!journeyId) return;
    await updateDoc(doc(db, 'journeys', journeyId), { status: 'PAUSED' });
  };

  const resumeJourney = async () => {
    if (!journeyId) return;
    await updateDoc(doc(db, 'journeys', journeyId), { status: 'ACTIVE' });
  };

  return {
    journey,
    currentLocation,
    isEmergency,
    isStopped,
    triggerEmergency,
    confirmSafe,
    pauseJourney,
    resumeJourney
  };
};
