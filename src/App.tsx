import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { brandConfig } from './config/brand';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Home } from './pages/Home';
import { JourneyNew } from './pages/JourneyNew';
import { JourneyActive } from './pages/JourneyActive';
import { Breakdown } from './pages/Breakdown';
import { EVCharging } from './pages/EVCharging';
import { LowFuel } from './pages/LowFuel';
import { SmartLocation } from './pages/SmartLocation';
import { Profile } from './pages/Profile';
import { History } from './pages/History';
import { TrustedContacts } from './pages/TrustedContacts';
import { EmergencyView } from './pages/EmergencyView';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-accent selection:text-white flex flex-col">
          
          <header className="bg-white shadow-sm p-4 sticky top-0 z-50 flex items-center justify-between shrink-0 px-4 md:px-8">
            <Link to="/" className="text-xl font-bold text-accent flex items-center gap-2">
              <Shield className="w-6 h-6" /> {brandConfig.appName}
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-xs font-bold text-slate-500 hidden sm:block">MVP Demo</div>
              <div className="text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded-md">BETA</div>
            </div>
          </header>

          <main className="flex-1 relative w-full h-full flex flex-col">
            <Routes>
              <Route path="/" element={
                <div className="p-6 flex flex-col items-center justify-center min-h-[80vh] text-center max-w-2xl mx-auto">
                  <Shield className="w-20 h-20 text-accent mb-6" />
                  <h2 className="text-4xl md:text-5xl font-bold text-navy mb-6">{brandConfig.tagline}</h2>
                  <p className="text-lg text-slate-600 mb-10">Travel with confidence, day or night. Our advanced mobility safety platform monitors your journey in real-time.</p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link to="/login" className="bg-accent text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-blue-800 transition-colors w-full sm:w-48">
                      Log In
                    </Link>
                    <Link to="/signup" className="border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-full font-bold hover:bg-slate-50 transition-colors w-full sm:w-48">
                      Create Account
                    </Link>
                  </div>
                </div>
              } />
              
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/emergency/:token" element={<EmergencyView />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/home" element={<Home />} />
                <Route path="/journey/new" element={<JourneyNew />} />
                <Route path="/journey/:id" element={<JourneyActive />} />
                <Route path="/breakdown" element={<Breakdown />} />
                <Route path="/charging" element={<EVCharging />} />
                <Route path="/fuel" element={<LowFuel />} />
                <Route path="/smart-location" element={<SmartLocation />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/history" element={<History />} />
                <Route path="/trusted-contacts" element={<TrustedContacts />} />
                <Route path="/onboarding" element={<Navigate to="/profile" replace />} />
              </Route>
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
