export const ROLES = {
  SECRETARY: 'secretary',
  CAPTAIN: 'captain',
  TREASURER: 'treasurer',
  ADMIN: 'admin',
};

export function hasRole(userRole, requiredRole) {
  return userRole === requiredRole;
}

export function hasAnyRole(userRole, requiredRoles) {
  return requiredRoles.includes(userRole);
}

export function getRoleDisplayName(role) {
  const roleNames = {
    [ROLES.SECRETARY]: 'Secretary',
    [ROLES.CAPTAIN]: 'Captain',
    [ROLES.TREASURER]: 'Treasurer',
    [ROLES.ADMIN]: 'Administrator',
  };
  return roleNames[role] || role;
}

export function getRoleDashboardPath(role) {
  switch (role) {
    case ROLES.SECRETARY:
      return '/';
    case ROLES.CAPTAIN:
      return '/';
    case ROLES.TREASURER:
      return '/';
    case ROLES.ADMIN:
      return '/';
    default:
      return '/';
  }
}
