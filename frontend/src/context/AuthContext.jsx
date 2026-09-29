import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and restore session on startup using /api/auth/me
  useEffect(() => {
    async function restoreSession() {
      const storedToken = authService.getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const meUser = await authService.fetchMe();
      if (meUser) {
        setUser(meUser);
        setToken(storedToken);
        setIsAuthenticated(true);
      } else {
        authService.logout();
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    }

    restoreSession();

    // Handle global 401 unauthorized events
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth_unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password, tenantId) => {
    setIsLoading(true);
    try {
      const result = await authService.login(email, password, tenantId);
      setUser(result.user);
      setToken(result.token);
      setIsAuthenticated(true);
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
