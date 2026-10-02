import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/config';

export const TrustedContacts = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [contact1, setContact1] = useState({ name: '', relationship: '', phone: '' });
  const [contact2, setContact2] = useState({ name: '', relationship: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentUser) {
      setError("Authentication error. Please log in again.");
      return;
    }

    // Validation
    if (!contact1.name.trim() || !contact1.relationship.trim() || !contact1.phone.trim()) {
      setError('Please complete all fields for Trusted Contact 1.');
      return;
    }
    
    if (!contact2.name.trim() || !contact2.relationship.trim() || !contact2.phone.trim()) {
      setError('Please complete all fields for Trusted Contact 2.');
      return;
    }

    if (contact1.phone.trim() === contact2.phone.trim()) {
      setError('Trusted contacts must have different phone numbers.');
      return;
    }

    setLoading(true);
    try {
      // Save Contact 1
      const contact1Ref = doc(db, 'users', currentUser.uid, 'trustedContacts', 'contact1');
      await setDoc(contact1Ref, {
        name: contact1.name.trim(),
        relationship: contact1.relationship.trim(),
        phone: contact1.phone.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Save Contact 2
      const contact2Ref = doc(db, 'users', currentUser.uid, 'trustedContacts', 'contact2');
      await setDoc(contact2Ref, {
        name: contact2.name.trim(),
        relationship: contact2.relationship.trim(),
        phone: contact2.phone.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      navigate('/home');
    } catch (err: any) {
      setError('Account created, but we couldn\'t save your trusted contacts. Please try again. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh] p-6 max-w-2xl mx-auto w-full pt-10">
      <div className="text-sm font-bold text-slate-400 mb-2 tracking-widest uppercase">Step 2 of 2 — Trusted Contacts</div>
      <h2 className="text-3xl font-bold text-navy mb-2 text-center">Add Trusted Contacts</h2>
      <p className="text-slate-500 mb-8 text-center">Add exactly 2 people we can contact in case of an emergency.</p>

      {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-6 w-full border border-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="w-full space-y-8">
        
        {/* Contact 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Trusted Contact 1</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                value={contact1.name} onChange={(e) => setContact1({...contact1, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <input 
                type="text" required placeholder="e.g. Brother, Friend"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                value={contact1.relationship} onChange={(e) => setContact1({...contact1, relationship: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <input 
                type="tel" required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                value={contact1.phone} onChange={(e) => setContact1({...contact1, phone: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Contact 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">Trusted Contact 2</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                value={contact2.name} onChange={(e) => setContact2({...contact2, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <input 
                type="text" required placeholder="e.g. Sister, Parent"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                value={contact2.relationship} onChange={(e) => setContact2({...contact2, relationship: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <input 
                type="tel" required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                value={contact2.phone} onChange={(e) => setContact2({...contact2, phone: e.target.value})}
              />
            </div>
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-accent text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-800 transition-colors disabled:opacity-50 text-lg"
        >
          {loading ? 'Saving...' : 'Complete Setup'}
        </button>
      </form>
    </div>
  );
};
