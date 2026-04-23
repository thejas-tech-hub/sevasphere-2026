import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertCircle, Building2, User } from 'lucide-react';

const SKILLS = ['Medical Aid','Rescue Operations','Food Distribution','Water Distribution','Shelter Management','Evacuation Support','Logistics','Community Outreach','First Aid','Sanitation','Counseling','Communication'];

export default function Register() {
  const [role, setRole] = useState('volunteer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState([]);
  const [orgType, setOrgType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const toggleSkill = s => setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (role === 'volunteer' && skills.length === 0) return setError('Select at least one skill.');
    setError(''); setLoading(true);
    try {
      const profileData = role === 'ngo'
        ? { role, name, location, orgType }
        : { role, name, location, skills, available: true };
      await register(email, password, profileData);
      navigate(role === 'ngo' ? '/ngo' : '/volunteer');
    } catch (err) {
      setError(err.message.includes('email-already-in-use') ? 'Email already registered.' : 'Registration failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-blue-900" />
            <span className="text-2xl font-bold text-blue-900">Seva<span className="text-orange-500">Sphere</span></span>
          </div>
        </div>

        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
          {[{v:'volunteer',icon:<User className="w-4 h-4"/>,l:'Volunteer'},{v:'ngo',icon:<Building2 className="w-4 h-4"/>,l:'NGO / Organization'}].map(r => (
            <button key={r.v} type="button" onClick={() => setRole(r.v)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${role === r.v ? 'bg-blue-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {r.icon} {r.l}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder={role === 'ngo' ? 'Organization Name' : 'Full Name'} />
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Email address" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Password (min 6 chars)" />
          <input required value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="City, State (e.g. Bengaluru, Karnataka)" />

          {role === 'ngo' && (
            <select required value={orgType} onChange={e => setOrgType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
              <option value="">Select Organization Type</option>
              {['Disaster Relief','Healthcare','Food Security','Education','Women Empowerment','Environmental','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          )}

          {role === 'volunteer' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Your Skills</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSkill(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${skills.includes(s) ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-60">
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already registered? <Link to="/login" className="text-blue-700 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}