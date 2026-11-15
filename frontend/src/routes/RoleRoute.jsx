import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Restricts a route to users whose role is in the `roles` array.
 * Must be nested inside <PrivateRoute> (auth is guaranteed at this point).
 */
const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    // Redirect to the user's own dashboard instead of a generic 403
    const dashboardMap = {
      admin:   '/dashboard/admin',
      faculty: '/dashboard/faculty',
      student: '/dashboard/student',
    };
    const fallback = user ? (dashboardMap[user.role] || '/') : '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default RoleRoute;
