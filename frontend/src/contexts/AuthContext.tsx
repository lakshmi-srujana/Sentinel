import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, type User } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: 'employee' | 'manager' | 'hr' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sentinel_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('sentinel_token');
      if (storedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch {
          localStorage.removeItem('sentinel_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const data = await api.login(formData);
    localStorage.setItem('sentinel_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('sentinel_token');
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (role: 'employee' | 'manager' | 'hr' | 'admin') => {
    await login(role, 'Password123!');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchDemoUser }}>
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
