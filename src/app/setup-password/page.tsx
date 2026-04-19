"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Loader2, ShieldCheck, CheckCircle, LayoutGrid, XCircle } from "lucide-react";
import { 
  cardStyle, btnPrimary, inputStyle, labelStyle, alertError, 
  pageTitle, pageSubtitle 
} from "@/lib/styles";

export default function SetupPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      setLoading(false);
    };
    checkSession();
  }, [router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update the password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });
      if (updateError) throw updateError;

      // 2. Clear session for fresh re-login
      await supabase.auth.signOut();
      
      // 3. Success redirect
      router.push("/?setup=success");
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
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
        style={{ width: '100%', maxWidth: '440px' }}
      >
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
            <ShieldCheck size={28} />
          </div>
          <h1 style={pageTitle}>Complete Your Setup</h1>
          <p style={pageSubtitle}>Create your personal security key to access the enclave.</p>
        </div>

        <div style={{ 
          ...cardStyle,
          padding: '40px 36px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}>
          <form onSubmit={handleSetup}>
            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>New Password (Min. 6 characters)</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2" size={16} style={{ left: '14px', color: 'var(--color-text-faint)' }} />
                <input 
                  type="password" required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingLeft: '42px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.background = 'var(--color-bg-page)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Confirm Security Key</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2" size={16} style={{ left: '14px', color: 'var(--color-text-faint)' }} />
                <input 
                  type="password" required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingLeft: '42px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.background = 'var(--color-bg-page)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ ...alertError, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <XCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="active:scale-[0.98] transition-transform"
              style={{ 
                ...btnPrimary,
                width: '100%', height: '52px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '15px',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <CheckCircle size={18} />
                  <span>Secure Account & Log In</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: 'var(--color-text-faint)' }}>
          By completing setup, you agree to agency security protocols.
        </p>
      </motion.div>
    </main>
  );
}
