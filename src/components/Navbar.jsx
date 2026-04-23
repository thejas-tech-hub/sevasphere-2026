import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Map, LogOut } from 'lucide-react';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dashPath = userProfile?.role === 'ngo' ? '/ngo' : '/volunteer';

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={currentUser ? dashPath : '/'} className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-orange-400" />
          <span className="text-xl font-bold">Seva<span className="text-orange-400">Sphere</span></span>
        </Link>
        {currentUser && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-300 hidden sm:block mr-2">{userProfile?.name}</span>
            <Link to="/map" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${location.pathname === '/map' ? 'bg-orange-500' : 'hover:bg-blue-800'}`}>
              <Map className="w-4 h-4" /> Crisis Map
            </Link>
            <Link to={dashPath} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${location.pathname === dashPath ? 'bg-orange-500' : 'hover:bg-blue-800'}`}>
              Dashboard
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}