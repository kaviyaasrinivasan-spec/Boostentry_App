import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, fetchClients } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const res = await apiLogin(email, password);
      console.log('Login Response Full Body:', JSON.stringify(res, null, 2));

      if (res.status === 'success' && res.user) {
        const userDataRaw = res.user;
        const branchName = userDataRaw.name || '';
        const isAdmin = branchName.toLowerCase() === 'admin' || email.toLowerCase().includes('admin');
        const clientId = userDataRaw.client_id;
        
        console.log('Detected isAdmin:', isAdmin, 'Branch:', branchName, 'ClientID:', clientId);

        const userData = {
          email: userDataRaw.email || email,
          branch: branchName,
          token: res.token || res.data?.token || 'session_token', // Fallback if token missing
          isAdmin,
          clientId,
        };

        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, message: e.response?.data?.detail?.message || e.message || 'Network error' };
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
