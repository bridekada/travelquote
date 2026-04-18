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
  background: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(4px)',
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
