import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Permission, PermissionScope } from '../../types';

interface CanProps {
  permission: Permission;
  scope?: PermissionScope;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  scope,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission, scope)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
