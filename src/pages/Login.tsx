import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { brandConfig } from '../config/brand';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <h2 className="text-3xl font-bold text-navy mb-2">Welcome Back</h2>
      <p className="text-slate-500 mb-8">{brandConfig.appName} is here to keep you safe.</p>

      {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 w-full max-w-md">{error}</div>}

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input 
            type="email" 
            required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input 
            type="password" 
            required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-accent text-white py-3 rounded-lg font-bold shadow hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className="mt-6 text-slate-600">
        Don't have an account? <Link to="/signup" className="text-accent font-bold">Sign up</Link>
      </p>
    </div>
  );
};
