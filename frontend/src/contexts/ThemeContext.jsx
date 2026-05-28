import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

const ThemeContext = createContext(null);

const DEFAULTS = {
  barangay_name: 'Barangay Narra',
  system_name:   'Barangay Management System',
  login_tagline: 'Official Records & Services Portal',
  logo_url:       '',
  background_url: '',
  primary_color:  '#4F46E5',
};

function load(key, fallback) {
  return localStorage.getItem(key) || fallback;
}

export function ThemeProvider({ children }) {
  const [darkMode,      setDarkMode]      = useState(() => localStorage.getItem('darkMode') === 'true');
  const [barangayName,  setBarangayName]  = useState(() => load('bn_name',     DEFAULTS.barangay_name));
  const [systemName,    setSystemName]    = useState(() => load('bn_sysname',  DEFAULTS.system_name));
  const [loginTagline,  setLoginTagline]  = useState(() => load('bn_tagline',  DEFAULTS.login_tagline));
  const [logo,          setLogo]          = useState(() => load('bn_logo',     DEFAULTS.logo_url));
  const [background,    setBackground]    = useState(() => load('bn_bg',       DEFAULTS.background_url));

  // ── Apply dark class to <html> ──────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // ── Apply background image to body ─────────────────────────────
  useEffect(() => {
    if (background) {
      const API = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
      const url = background.startsWith('http') ? background : `${API}${background}`;
      document.body.style.backgroundImage    = `url(${url})`;
      document.body.style.backgroundSize     = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundPosition = 'center';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [background]);

  // ── Fetch settings from backend (public endpoint, no auth needed) ─
  const refreshSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/settings');
      const d = res.data || {};

      if (d.barangay_name)  { setBarangayName(d.barangay_name);   localStorage.setItem('bn_name',    d.barangay_name); }
      if (d.system_name)    { setSystemName(d.system_name);        localStorage.setItem('bn_sysname', d.system_name); }
      if (d.login_tagline)  { setLoginTagline(d.login_tagline);    localStorage.setItem('bn_tagline', d.login_tagline); }
      if (d.logo_url !== undefined)       { setLogo(d.logo_url);          localStorage.setItem('bn_logo',    d.logo_url); }
      if (d.background_url !== undefined) { setBackground(d.background_url); localStorage.setItem('bn_bg',  d.background_url); }
    } catch (_) {
      // Silently ignore — use cached values from localStorage
    }
  }, []);

  // Fetch on first render (works even on login page since endpoint is now public)
  useEffect(() => { refreshSettings(); }, []);

  const toggleDark = () => setDarkMode(p => !p);

  return (
    <ThemeContext.Provider value={{
      darkMode, toggleDark,
      logo, background,
      barangayName, systemName, loginTagline,
      refreshSettings,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
