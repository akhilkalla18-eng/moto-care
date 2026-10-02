import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/config';
import { Shield, Navigation, Wrench, BatteryCharging, Fuel, User as UserIcon, MapPin, ArrowRight, Activity, ShieldAlert } from 'lucide-react';

export const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [missingData, setMissingData] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) {
              setUserName(data.name);
            }
            if (!data.vehicleNumber) {
              setMissingData(true);
            }
          } else {
            setMissingData(true);
          }
        } catch (err) {
          console.error("Failed to fetch user data:", err);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const menuItems = [
    { 
      title: 'Drive Safely', 
      desc: 'Monitor your journey and stay connected.',
      icon: <Navigation className="w-8 h-8 text-blue-600" />, 
      route: '/journey/new', 
      accent: 'border-blue-200 hover:border-blue-400 bg-blue-50/50',
      iconBg: 'bg-blue-100',
      primary: true
    },
    { 
      title: 'Breakdown', 
      desc: 'Find nearby vehicle assistance.',
      icon: <Wrench className="w-6 h-6 text-orange-600" />, 
      route: '/breakdown', 
      accent: 'border-orange-100 hover:border-orange-300',
      iconBg: 'bg-orange-50'
    },
    { 
      title: 'EV Charging', 
      desc: 'Find nearby EV charging stations.',
      icon: <BatteryCharging className="w-6 h-6 text-emerald-600" />, 
      route: '/charging', 
      accent: 'border-emerald-100 hover:border-emerald-300',
      iconBg: 'bg-emerald-50'
    },
    { 
      title: 'Low Fuel', 
      desc: 'Find nearby fuel stations.',
      icon: <Fuel className="w-6 h-6 text-amber-600" />, 
      route: '/fuel', 
      accent: 'border-amber-100 hover:border-amber-300',
      iconBg: 'bg-amber-50'
    },
    { 
      title: 'Smart Location', 
      desc: 'Find nearby parking areas.',
      icon: <MapPin className="w-6 h-6 text-teal-600" />, 
      route: '/smart-location', 
      accent: 'border-teal-100 hover:border-teal-300',
      iconBg: 'bg-teal-50'
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-32">
      
      {/* Header Area */}
      <div className="bg-navy text-white p-6 md:p-8 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-start">
          <div>
            <p className="text-slate-300 text-sm md:text-base mb-1">{getGreeting()},</p>
            <h2 className="text-3xl md:text-4xl font-bold">{userName || currentUser?.email?.split('@')[0] || 'User'}</h2>
          </div>
          <button onClick={() => navigate('/profile')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <UserIcon className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {/* Safety Status Card (Replacing the old transparent one) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-safe/10 p-3 rounded-full">
              <Shield className="w-8 h-8 text-safe" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">Safety Status</p>
              <p className="text-slate-500 text-sm">No active journey</p>
            </div>
          </div>
          <Activity className="w-6 h-6 text-slate-300 hidden sm:block" />
        </div>

        {missingData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <div className="bg-amber-100 text-amber-700 p-2 rounded-full mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-800">Complete your profile</h4>
              <p className="text-amber-700 text-sm mb-3">Add your vehicle and trusted contacts to continue using all features safely.</p>
              <button 
                onClick={() => navigate('/trusted-contacts')} 
                className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors"
              >
                Complete Profile Now
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 text-xl">Services</h3>
          <button onClick={() => navigate('/history')} className="text-accent font-bold hover:underline text-sm md:text-base">
            View History
          </button>
        </div>

        {/* Unified Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-10">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.route)}
              className={`bg-white rounded-2xl shadow-sm border-2 ${item.accent} p-5 text-left flex flex-col justify-between hover:shadow-md transition-all active:scale-[0.98] h-full min-h-[140px] md:min-h-[160px] ${item.primary ? 'sm:col-span-2' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`${item.iconBg} p-3 rounded-xl`}>
                  {item.icon}
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <h4 className={`font-bold ${item.primary ? 'text-2xl text-slate-800' : 'text-lg text-slate-800'} mb-1`}>{item.title}</h4>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Persistent Emergency SOS Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 pointer-events-none z-50 flex justify-center md:justify-end">
        <button 
          onClick={() => navigate('/emergency')}
          className="w-full md:w-auto pointer-events-auto bg-danger text-white px-8 py-4 rounded-2xl md:rounded-full font-bold shadow-2xl shadow-danger/40 flex justify-center items-center gap-3 hover:bg-red-600 active:scale-95 transition-all text-xl"
        >
          <ShieldAlert className="w-7 h-7" />
          EMERGENCY SOS
        </button>
      </div>
      
    </div>
  );
};
