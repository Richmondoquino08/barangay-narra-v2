import { Navigate } from 'react-router-dom';
import { hasAnyRole } from '../utils/roles';

/**
 * Route guard component that checks user role
 * @param {ReactNode} children - Component to render if authorized
 * @param {string|string[]} requiredRoles - Role(s) required to access
 * @param {string} userRole - Current user's role
 * @param {string} fallbackPath - Path to redirect to if not authorized (default: '/')
 */
export default function ProtectedRoute({ 
  children, 
  requiredRoles, 
  userRole,
  fallbackPath = '/' 
}) {
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  if (!hasAnyRole(userRole, rolesArray)) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
}
