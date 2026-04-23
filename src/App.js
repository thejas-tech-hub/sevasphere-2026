import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NGODashboard from './pages/NGODashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import CrisisMap from './pages/CrisisMap';

function AppRoutes() {
  const { currentUser, userProfile } = useAuth();
  const home = userProfile?.role === 'ngo' ? '/ngo' : '/volunteer';
  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to={home} /> : <Landing />} />
      <Route path="/login" element={currentUser ? <Navigate to={home} /> : <Login />} />
      <Route path="/register" element={currentUser ? <Navigate to={home} /> : <Register />} />
      <Route path="/ngo" element={<ProtectedRoute role="ngo"><NGODashboard /></ProtectedRoute>} />
      <Route path="/volunteer" element={<ProtectedRoute role="volunteer"><VolunteerDashboard /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><CrisisMap /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
