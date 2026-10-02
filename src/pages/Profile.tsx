import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Phone, Shield, ArrowLeft, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/config';
import type { EmergencyContact } from '../types';

export const Profile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!currentUser) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData(docSnap.data());

        const q = query(collection(db, 'users', currentUser.uid, 'trustedContacts'));
        const querySnapshot = await getDocs(q);
        const fetchedContacts: EmergencyContact[] = [];
        querySnapshot.forEach((doc) => {
          fetchedContacts.push({ id: doc.id, ...doc.data() } as EmergencyContact);
        });
        setContacts(fetchedContacts);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newContact.name || !newContact.phone) return;
    try {
      const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'trustedContacts'), {
        name: newContact.name,
        phone: newContact.phone,
        relationship: newContact.relationship,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setContacts([...contacts, { id: docRef.id, userId: currentUser.uid, priority: contacts.length + 1, ...newContact }]);
      setNewContact({ name: '', phone: '', relationship: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'trustedContacts', id));
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 pb-10">
      <div className="p-4 bg-white shadow-sm flex items-center justify-between md:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold">Profile & Settings</h2>
        </div>
        <button onClick={handleLogout} className="p-2 text-danger hover:bg-red-50 rounded-full">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 md:p-10 max-w-3xl mx-auto w-full">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 mb-6 relative">
          <div className="flex items-center gap-4">
            <div className="bg-navy text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
              {userData?.name?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-navy">{userData?.name || currentUser?.email?.split('@')[0] || 'User'}</h3>
              <p className="text-slate-500 text-sm">{currentUser?.email}</p>
              {userData?.vehicleNumber && (
                <p className="text-accent text-sm font-bold mt-1 bg-accent/10 inline-block px-2 py-0.5 rounded uppercase">
                  {userData.vehicleNumber}
                </p>
              )}
            </div>
          </div>
          <details className="text-sm border-t border-slate-100 pt-3 mt-1 group">
            <summary className="text-accent font-bold cursor-pointer hover:underline list-none">Edit Profile</summary>
            <form className="mt-3 flex flex-col gap-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!currentUser) return;
              const fd = new FormData(e.currentTarget);
              const name = fd.get('name') as string;
              const vn = fd.get('vehicleNumber') as string;
              await setDoc(doc(db, 'users', currentUser.uid), { name, vehicleNumber: vn }, { merge: true });
              setUserData({ ...userData, name, vehicleNumber: vn });
            }}>
              <input name="name" defaultValue={userData?.name} placeholder="Full Name" required className="p-2 border border-slate-200 rounded outline-none focus:border-accent" />
              <input name="vehicleNumber" defaultValue={userData?.vehicleNumber} placeholder="Vehicle Number" required className="p-2 border border-slate-200 rounded outline-none focus:border-accent uppercase" />
              <button type="submit" className="bg-accent text-white py-2 rounded font-bold hover:bg-blue-800">Save Changes</button>
            </form>
          </details>
        </div>

        <h3 className="font-bold text-slate-800 mb-4 text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          Trusted Emergency Contacts
        </h3>

        {loading ? (
          <div className="text-center text-slate-500 py-4 animate-pulse">Loading contacts...</div>
        ) : (
          <div className="space-y-3 mb-6">
            {contacts.length === 0 ? (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200">
                You haven't added any emergency contacts yet. Please add at least one trusted person.
              </div>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800">{contact.name}</h4>
                    <p className="text-slate-500 text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {contact.phone} <span className="opacity-50">({contact.relationship})</span>
                    </p>
                  </div>
                  <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-slate-400 hover:text-danger hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-4">Add New Contact</h4>
          <form onSubmit={handleAddContact} className="space-y-3">
            <input 
              type="text" placeholder="Name" required
              className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-accent"
              value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})}
            />
            <input 
              type="tel" placeholder="Phone Number" required
              className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-accent"
              value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})}
            />
            <input 
              type="text" placeholder="Relationship (e.g. Brother, Friend)" required
              className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-accent"
              value={newContact.relationship} onChange={e => setNewContact({...newContact, relationship: e.target.value})}
            />
            <button type="submit" className="w-full bg-accent text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors">
              Add Contact
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
