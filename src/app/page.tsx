"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, LayoutGrid, ShieldCheck, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          await supabase.auth.signOut().catch(() => {});
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.role === 'super_admin') router.push("/admin");
        else router.push("/dashboard");
      } catch {
        await supabase.auth.signOut().catch(() => {});
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError("");
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (profile?.role === 'super_admin') router.push("/admin");
      else router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err.message === 'Invalid login credentials' ? 'Access Denied: Invalid Credentials' : err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--color-bg-page)' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ 
        padding: '24px',
        background: 'linear-gradient(135deg, var(--color-brand-soft) 0%, var(--color-bg-page) 40%, var(--color-bg-subtle) 100%)',
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div 
            className="inline-flex items-center justify-center"
            style={{ 
              width: '56px', height: '56px', 
              background: 'var(--color-brand)', 
              borderRadius: '16px',
              color: 'white',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(0, 103, 79, 0.25)',
            }}
          >
            <LayoutGrid size={24} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            TravelQuote
          </h1>
          <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
            Authorized Access Only
          </p>
        </div>

        {/* Login Card */}
        <div style={{ 
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}>
          <form onSubmit={handleManualAuth}>
            
            {/* Email */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Email Identifier
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2" size={16} style={{ left: '14px', color: 'var(--color-text-faint)' }} />
                <input 
                  type="email" required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="personnel@agency.com"
                  style={{ 
                    width: '100%', height: '48px',
                    paddingLeft: '42px', paddingRight: '16px',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: '12px', fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-page)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.background = 'var(--color-bg-page)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Security Key
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2" size={16} style={{ left: '14px', color: 'var(--color-text-faint)' }} />
                <input 
                  type="password" required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ 
                    width: '100%', height: '48px',
                    paddingLeft: '42px', paddingRight: '16px',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: '12px', fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-page)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.background = 'var(--color-bg-page)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Error */}
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center"
                  style={{ gap: '12px', padding: '14px 16px', background: '#FEF2F2', color: 'var(--color-danger)', borderRadius: '12px', fontSize: '13px', fontWeight: 500, border: '1px solid #FECACA', marginBottom: '20px' }}
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center active:scale-[0.98] transition-transform"
              style={{ 
                width: '100%', height: '50px', gap: '8px',
                background: 'var(--color-brand)', color: 'white',
                border: 'none', borderRadius: '14px',
                fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 16px rgba(0, 103, 79, 0.2)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget).style.background = 'var(--color-brand-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = 'var(--color-brand)'; }}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} style={{ opacity: 0.7 }} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center" style={{ gap: '20px', marginTop: '36px' }}>
          <div className="flex items-center" style={{ gap: '6px', opacity: 0.35, color: 'var(--color-text-muted)', minHeight: 'auto', minWidth: 'auto' }}>
            <ShieldCheck size={12} />
            <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Enclave V2.4</span>
          </div>
          <div style={{ height: '12px', width: '1px', background: 'var(--color-border-default)' }} />
          <div className="flex items-center" style={{ gap: '6px', opacity: 0.35, color: 'var(--color-text-muted)', minHeight: 'auto', minWidth: 'auto' }}>
            <CheckCircle size={12} />
            <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Protected Endpoint</span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
