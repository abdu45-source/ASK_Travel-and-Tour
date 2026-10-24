import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAccessToken } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { User, Permission, PermissionScope } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; phone?: string; referral_code?: string }) => Promise<User>;
  initiateRegistration: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'CLIENT' | 'AGENT';
    referral_code?: string;
    payout_details?: string;
  }) => Promise<{ success: boolean; message: string; email: string; role: string; simulationCode?: string }>;
  confirmRegistration: (email: string, code: string) => Promise<User>;
  resendRegistrationCode: (email: string) => Promise<{ success: boolean; message: string; simulationCode?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  hasPermission: (permission: Permission, requiredScope?: PermissionScope) => boolean;
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      connectSocket();
    } catch {
      setUser(null);
      disconnectSocket();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        setUser(data.user);
        connectSocket();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password: pass });
    setAccessToken(data.accessToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  };

  const register = async (regData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    referral_code?: string;
  }): Promise<User> => {
    const { data } = await api.post('/auth/register', regData);
    setAccessToken(data.accessToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  };

  const initiateRegistration = async (initData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'CLIENT' | 'AGENT';
    referral_code?: string;
    payout_details?: string;
  }) => {
    const { data } = await api.post('/auth/register-initiate', initData);
    return data;
  };

  const confirmRegistration = async (email: string, code: string): Promise<User> => {
    const { data } = await api.post('/auth/register-confirm', { email, code });
    setAccessToken(data.accessToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  };

  const resendRegistrationCode = async (email: string) => {
    const { data } = await api.post('/auth/resend-code', { email });
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      setUser(null);
      disconnectSocket();
    }
  };

  const hasPermission = (permission: Permission, requiredScope?: PermissionScope): boolean => {
    if (!user || !user.permissions) return false;
    const userScope = user.permissions[permission];
    if (!userScope) return false;
    if (!requiredScope || requiredScope === PermissionScope.ANY) {
      return true;
    }
    // Scope hierarchy: ANY satisfies all; TEAM satisfies ASSIGNED & OWN; ASSIGNED satisfies OWN
    if (userScope === PermissionScope.ANY) return true;
    if (userScope === PermissionScope.TEAM && (requiredScope === PermissionScope.ASSIGNED || requiredScope === PermissionScope.OWN)) return true;
    if (userScope === PermissionScope.ASSIGNED && requiredScope === PermissionScope.OWN) return true;
    return userScope === requiredScope;
  };

  const hasRole = (roleName: string): boolean => {
    return user?.roles?.includes(roleName) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        initiateRegistration,
        confirmRegistration,
        resendRegistrationCode,
        logout,
        refreshMe,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
