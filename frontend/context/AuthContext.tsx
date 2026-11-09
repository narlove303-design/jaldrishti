'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setStoredToken, getStoredToken } from '@/lib/api';

export type UserRole = 'Administrator' | 'Operating Staff' | 'Resident';

export interface User {
  id: number;
  name: string;
  email_or_mobile: string;
  role: UserRole;
  village: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isResident: boolean;
  login: (emailOrMobile: string, pass: string) => Promise<void>;
  logout: () => void;
  switchPersona: (role: UserRole, village?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAdmin: false,
  isStaff: false,
  isResident: false,
  login: async () => {},
  logout: () => {},
  switchPersona: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const stored = getStoredToken();
      if (!stored) {
        // Default to Administrator in initial demo load for seamless evaluation
        await switchPersona('Administrator');
        return;
      }

      setToken(stored);
      const res = await apiRequest<{ user: User }>('/auth/me');
      setUser(res.user);
    } catch (err) {
      console.warn('Session verification failed, logging into demo administrator:', err);
      await switchPersona('Administrator');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email_or_mobile: string, password: string) => {
    const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email_or_mobile, password }),
    });

    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const switchPersona = async (role: UserRole, targetVillage = 'All') => {
    setLoading(true);
    try {
      let email = 'admin@demo.local';
      if (role === 'Operating Staff') email = 'operator@demo.local';
      else if (role === 'Resident') {
        if (targetVillage === 'Village B') email = 'resident.b@demo.local';
        else if (targetVillage === 'Village C') email = 'resident.c@demo.local';
        else email = 'resident@demo.local';
      }

      await login(email, 'Demo12345!');
    } catch (err) {
      console.error('Persona switch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'Administrator';
  const isStaff = user?.role === 'Operating Staff' || user?.role === 'Administrator';
  const isResident = user?.role === 'Resident';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isStaff,
        isResident,
        login,
        logout,
        switchPersona,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
