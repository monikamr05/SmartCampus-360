import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ─── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Storage helpers ─────────────────────────────────────────────────────────
const TOKEN_KEY = 'sc360_token';
const USER_KEY  = 'sc360_user';

const saveSession  = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY,  JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const loadSession = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY));
    if (token && user && user._id) return { token, user };
  } catch { /* corrupted storage — treat as logged out */ }
  return null;
};

// ─── Validation helpers ───────────────────────────────────────────────────────
export const validateRegister = ({ name, email, password, confirmPassword }) => {
  const errors = {};
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim();

  if (!trimmedName)                              errors.name            = 'Name is required.';
  else if (trimmedName.length < 2)               errors.name            = 'Name must be at least 2 characters.';

  if (!trimmedEmail)                             errors.email           = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) errors.email = 'Enter a valid email address.';

  if (!password)                                 errors.password        = 'Password is required.';
  else if (password.length < 6)                  errors.password        = 'Password must be at least 6 characters.';
  else if (!/[A-Z]/.test(password))              errors.password        = 'Include at least one uppercase letter.';
  else if (!/[0-9]/.test(password))              errors.password        = 'Include at least one number.';

  if (!confirmPassword)                          errors.confirmPassword = 'Please confirm your password.';
  else if (password !== confirmPassword)         errors.confirmPassword = 'Passwords do not match.';

  return errors;
};

export const validateLogin = ({ email, password }) => {
  const errors = {};
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail)    errors.email    = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
  if (!password)        errors.password = 'Password is required.';
  return errors;
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user,          setUser]          = useState(null);
  const [token,         setToken]         = useState(null);
  const [loading,       setLoading]       = useState(true);   // initial hydration
  const [authError,     setAuthError]     = useState('');

  // Hydrate from localStorage on mount
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
      // Verify token validity with backend; only clear if token is rejected (401)
      api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${session.token}` },
      }).then(({ data }) => {
        setUser(data);
        saveSession(session.token, data);
      }).catch((err) => {
        if (err.response?.status === 401) {
          clearSession();
          setUser(null);
          setToken(null);
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setAuthError('');
    const cleanEmail = (email || '').trim().toLowerCase();
    const { data } = await api.post('/auth/login', { email: cleanEmail, password });
    const { token: tkn, ...userData } = data;
    saveSession(tkn, userData);
    setToken(tkn);
    setUser(userData);
    return userData; // caller can read .role to redirect
  }, []);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async ({ name, email, password, role }) => {
    setAuthError('');
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const { data } = await api.post('/auth/register', { name: cleanName, email: cleanEmail, password, role });
    // After registration, auto-login the user
    const { token: tkn, ...userData } = data;
    saveSession(tkn, userData);
    setToken(tkn);
    setUser(userData);
    return userData;
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    authError,
    setAuthError,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
