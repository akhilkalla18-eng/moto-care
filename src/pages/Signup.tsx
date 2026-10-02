import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!vehicleNumber.trim()) {
      setError('Vehicle number is required');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      navigate('/trusted-contacts');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <h2 className="text-3xl font-bold text-navy mb-6">Create Account</h2>

      {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 w-full max-w-md">{error}</div>}

      <form onSubmit={handleSignup} className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input 
            type="text" required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            value={name} onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <input 
            type="tel" required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Number</label>
          <input 
            type="text" required
            placeholder="e.g. APXX1234"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none uppercase"
            value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input 
            type="email" required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input 
            type="password" required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-accent text-white py-3 rounded-lg font-bold shadow hover:bg-blue-800 transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-6 text-slate-600">
        Already have an account? <Link to="/login" className="text-accent font-bold">Log in</Link>
      </p>
    </div>
  );
};
