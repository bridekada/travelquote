/**
 * EMERALD CORE — Shared Style Objects
 * 
 * All component-level styles live here. Every page imports from this file
 * so changing a value here updates the entire app.
 * 
 * Colors/spacing reference CSS variables from globals.css :root {},
 * meaning this file + globals.css = complete design system.
 */

import type { CSSProperties } from 'react';

/* ── Cards ─────────────────────────────────────── */

export const cardStyle: CSSProperties = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border-default)',
  borderRadius: '16px',
  padding: '20px 24px',
  boxShadow: 'var(--shadow-xs)',
};

export const cardStyleLg: CSSProperties = {
  ...cardStyle,
  padding: '24px 28px',
  borderRadius: '20px',
};

export const cardStyleCompact: CSSProperties = {
  ...cardStyle,
  padding: '10px 20px',
  borderRadius: '12px',
};

/* ── Chips / Badges ────────────────────────────── */

export const chipGreen: CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-brand)',
  background: 'var(--color-brand-soft)',
  padding: '4px 12px',
  borderRadius: '9999px',
};

export const chipGray: CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  background: 'var(--color-bg-subtle)',
  padding: '4px 12px',
  borderRadius: '9999px',
};

export const chipDanger: CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-danger)',
  background: '#FEF2F2',
  padding: '4px 12px',
  borderRadius: '9999px',
};

/* ── Buttons ───────────────────────────────────── */

export const btnPrimary: CSSProperties = {
  background: 'var(--color-brand)',
  color: 'white',
  border: 'none',
  borderRadius: '16px',
  fontWeight: 700,
  fontSize: '14px',
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export const btnAction: CSSProperties = {
  background: 'var(--color-brand)',
  backgroundImage: 'linear-gradient(135deg, var(--color-brand) 0%, #064E3B 100%)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '14px',
  fontWeight: 800,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '0 24px',
  boxShadow: '0 8px 16px -4px rgba(5, 150, 105, 0.25), 0 4px 6px -2px rgba(5, 150, 105, 0.1)',
};

export const btnPillarPrimary: CSSProperties = {
  height: '54px',
  borderRadius: '9999px',
  background: '#064E3B',
  color: 'white',
  fontWeight: 900,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.25em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  padding: '0 48px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 25px 50px -12px rgba(6, 78, 59, 0.2)',
};

export const btnPillarSecondary: CSSProperties = {
  height: '54px',
  borderRadius: '9999px',
  background: 'white',
  border: '2px solid #059669',
  color: '#059669',
  fontWeight: 900,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.25em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  padding: '0 40px',
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.05)',
};

export const btnSecondary: CSSProperties = {
  background: 'white',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border-default)',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '14px',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export const btnDanger: CSSProperties = {
  background: 'var(--color-danger)',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '14px',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export const btnIcon: CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: '1px solid var(--color-border-default)',
  color: 'var(--color-text-faint)',
  cursor: 'pointer',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/* ── Inputs ────────────────────────────────────── */

export const inputStyle: CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 16px',
  border: '1px solid var(--color-border-default)',
  borderRadius: '12px',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-page)',
  outline: 'none',
  boxSizing: 'border-box',
};

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: '6px',
};

export const sectionLabel: CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-faint)',
};

/* ── Modals ────────────────────────────────────── */

export const modalOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
};


export const modalCard: CSSProperties = {
  position: 'relative',
  zIndex: 10,
  background: 'white',
  border: '1px solid var(--color-border-default)',
  borderRadius: '32px',
  boxShadow: '0 32px 64px -12px rgba(15, 23, 42, 0.12)',
  padding: '36px',
};

export const modalTitle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.02em',
};

export const modalFormSpace: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

/* ── Typography ────────────────────────────────── */

export const pageTitle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.02em',
  marginBottom: '6px',
};

export const pageSubtitle: CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-muted)',
  marginBottom: '28px',
};

export const headingMd: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
};

/* ── Layout ────────────────────────────────────── */

export const pageContainer: CSSProperties = {
  maxWidth: '860px',
  margin: '0 auto',
  padding: '48px 24px',
};

export const topBar: CSSProperties = {
  background: 'white',
  borderBottom: '1px solid var(--color-border-default)',
};

export const topBarInner: CSSProperties = {
  width: '100%',
  padding: '0 32px',
  height: '64px',
};

export const tabRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '32px',
  overflowX: 'auto',
};

/* ── Status / Alerts ───────────────────────────── */

export const alertSuccess: CSSProperties = {
  padding: '14px 16px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 500,
  background: '#ECFDF5',
  color: '#059669',
};

export const alertError: CSSProperties = {
  padding: '14px 16px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 500,
  background: '#FEF2F2',
  color: 'var(--color-danger)',
};

/* ── Helpers ───────────────────────────────────── */

/** Focus ring for inputs — call in onFocus handler */
export const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'var(--color-brand)';
  e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)';
};

/** Remove focus ring — call in onBlur handler */
export const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'var(--color-border-default)';
  e.target.style.boxShadow = 'none';
};
