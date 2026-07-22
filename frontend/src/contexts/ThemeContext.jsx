import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

const ThemeContext = createContext(null);

const DEFAULTS = {
  barangay_name:  'Barangay Narra',
  system_name:    'Barangay Management System',
  login_tagline:  'Official Records & Services Portal',
  logo_url:        '',
  background_url:  '',
  login_bg_url:    '',
  primary_color:   '#7c6cff',
  font_size:       'medium',
};

// Default module access per role (admin always has full access — not listed here)
export const DEFAULT_ROLE_PERMISSIONS = {
  // Captain: governance & public-safety focus only
  captain:   ['dashboard','blotter','reports','officials','bdrrm','announcements','verify_certificate'],
  // Secretary: all records + selected finance forms they prepare
  secretary: ['dashboard','residents','certificates','verify_certificate','blotter','officials','projects','assets','social','bdrrm','announcements','documents','reports','trash','fin_brgy_id','fin_kidlat','fin_trip','fin_pr','fin_ris','fin_transmittal'],
  // Treasurer: full finance suite + cross-cutting reports
  treasurer: ['dashboard','finance','cheque_print','reports','officials','announcements','fin_brgy_id','fin_kidlat','fin_trip','fin_pcf','fin_sppcv','fin_rao','fin_obr','fin_pr','fin_po','fin_iar','fin_ris','fin_dv','fin_crdr','fin_chbr','fin_checks','fin_collections','fin_transmittal'],
  // Intern/Guest: view-only by default (enforced server-side); same
  // baseline visibility as secretary's records modules, minus finance.
  intern: ['dashboard','residents','certificates','verify_certificate','blotter','announcements','documents','reports'],
};

// Font size map — values in px applied to <html> so all rem units scale proportionally
const FONT_SIZE_PX = { small: '13px', medium: '15px', large: '16px', xlarge: '18px' };

function applyFontSize(size) {
  const px = FONT_SIZE_PX[size] || FONT_SIZE_PX.medium;
  document.documentElement.style.fontSize = px;
  document.documentElement.setAttribute('data-font-size', size);
}

function load(key, fallback) {
  const v = localStorage.getItem(key);
  return (v !== null && v !== 'null' && v !== 'undefined' && v !== '') ? v : fallback;
}

export function resolveAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `/${path}`;
}

// ── Derive CSS variable shades from any hex colour ─────────────────────────
function hexToHsl(hex) {
  const h6 = hex.replace('#', '');
  const r = parseInt(h6.slice(0, 2), 16) / 255;
  const g = parseInt(h6.slice(2, 4), 16) / 255;
  const b = parseInt(h6.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const lig = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lig > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(hue * 360), Math.round(sat * 100), Math.round(lig * 100)];
}

function applyPrimaryColor(hex) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
  const [h, s, l] = hexToHsl(hex);
  const root = document.documentElement;
  root.style.setProperty('--primary',        `hsl(${h},${s}%,${l}%)`);
  root.style.setProperty('--primary-hover',  `hsl(${h},${s}%,${Math.max(0, l - 8)}%)`);
  root.style.setProperty('--primary-active', `hsl(${h},${s}%,${Math.max(0, l - 14)}%)`);
  // Ring: semi-transparent version for focus outlines
  root.style.setProperty('--primary-ring',   `hsl(${h},${s}%,${l}% / 0.35)`);
  // Light surface (for hover backgrounds, badges)
  root.style.setProperty('--primary-light',  `hsl(${h},${s}%,${Math.min(97, l + 38)}%)`);
  // Text colour on primary background (white for dark colours)
  root.style.setProperty('--primary-fg',     l < 55 ? '#ffffff' : '#1a1a1a');
  // Sidebar shadow tint
  root.style.setProperty('--primary-shadow', `hsl(${h},${s}%,${Math.max(0, l - 20)}% / 0.4)`);
}

export function ThemeProvider({ children }) {
  const [darkMode,      setDarkMode]      = useState(() => localStorage.getItem('darkMode') === 'true');
  const [barangayName,  setBarangayName]  = useState(() => load('bn_name',     DEFAULTS.barangay_name));
  const [systemName,    setSystemName]    = useState(() => load('bn_sysname',  DEFAULTS.system_name));
  const [loginTagline,  setLoginTagline]  = useState(() => load('bn_tagline',  DEFAULTS.login_tagline));
  const [logo,          setLogo]          = useState(() => load('bn_logo',     DEFAULTS.logo_url));
  const [background,    setBackground]    = useState(() => load('bn_bg',       DEFAULTS.background_url));
  const [loginBg,       setLoginBg]       = useState(() => load('bn_login_bg', DEFAULTS.login_bg_url));
  const [primaryColor,  setPrimaryColor]  = useState(() => load('bn_primary',   DEFAULTS.primary_color));
  const [fontSize,      setFontSize]      = useState(() => load('bn_fontsize',  DEFAULTS.font_size));
  const [rolePermissions, setRolePermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('bn_role_perms');
      return saved ? JSON.parse(saved) : DEFAULT_ROLE_PERMISSIONS;
    } catch { return DEFAULT_ROLE_PERMISSIONS; }
  });

  // Apply dark class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Apply primary colour CSS variables
  useEffect(() => { applyPrimaryColor(primaryColor); }, [primaryColor]);

  // Apply font size to <html> so all rem units scale proportionally
  useEffect(() => { applyFontSize(fontSize); }, [fontSize]);

  // Apply app background image to body
  useEffect(() => {
    const url = resolveAssetUrl(background);
    if (url) {
      document.body.style.backgroundImage    = `url(${url})`;
      document.body.style.backgroundSize     = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundPosition = 'center';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [background]);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/settings');
      const d = res.data || {};
      if (d.barangay_name  !== undefined) { setBarangayName(d.barangay_name);  localStorage.setItem('bn_name',     d.barangay_name); }
      if (d.system_name    !== undefined) { setSystemName(d.system_name);      localStorage.setItem('bn_sysname',  d.system_name); }
      if (d.login_tagline  !== undefined) { setLoginTagline(d.login_tagline);  localStorage.setItem('bn_tagline',  d.login_tagline); }
      if (d.logo_url       !== undefined) { setLogo(d.logo_url);               localStorage.setItem('bn_logo',     d.logo_url); }
      if (d.background_url !== undefined) { setBackground(d.background_url);   localStorage.setItem('bn_bg',       d.background_url); }
      if (d.login_bg_url   !== undefined) { setLoginBg(d.login_bg_url);        localStorage.setItem('bn_login_bg', d.login_bg_url); }
      if (d.primary_color  !== undefined && d.primary_color) {
        setPrimaryColor(d.primary_color);
        localStorage.setItem('bn_primary', d.primary_color);
        applyPrimaryColor(d.primary_color);
      }
      if (d.font_size !== undefined && d.font_size) {
        setFontSize(d.font_size);
        localStorage.setItem('bn_fontsize', d.font_size);
        applyFontSize(d.font_size);
      }
      if (d.role_permissions) {
        const perms = typeof d.role_permissions === 'string'
          ? JSON.parse(d.role_permissions)
          : d.role_permissions;
        setRolePermissions(perms);
        localStorage.setItem('bn_role_perms', JSON.stringify(perms));
      }
      // Extra fields used by finance print headers — no React state needed
      if (d.province         !== undefined) localStorage.setItem('bn_province',   d.province         || '');
      if (d.city_municipality!== undefined) localStorage.setItem('bn_city',       d.city_municipality|| '');
      if (d.right_logo_url   !== undefined) localStorage.setItem('bn_right_logo', d.right_logo_url   || '');
      if (d.address          !== undefined) localStorage.setItem('bn_address',    d.address          || '');
    } catch (_) { /* silently use cached localStorage values */ }
  }, []);

  useEffect(() => { refreshSettings(); }, []);

  const toggleDark = () => setDarkMode(p => !p);

  return (
    <ThemeContext.Provider value={{
      darkMode, toggleDark,
      logo, background, loginBg,
      barangayName, systemName, loginTagline,
      primaryColor, fontSize,
      refreshSettings,
      rolePermissions,
      setRolePermissions,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);