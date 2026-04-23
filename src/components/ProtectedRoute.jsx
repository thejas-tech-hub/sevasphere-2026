import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (role && userProfile?.role !== role) {
    return <Navigate to={userProfile?.role === 'ngo' ? '/ngo' : '/volunteer'} />;
  }
  return children;
}