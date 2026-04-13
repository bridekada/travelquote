"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, LayoutGrid, ShieldCheck, CheckCircle, AlertCircle } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role === 'super_admin') router.push("/admin");
        else router.push("/dashboard");
      } else {
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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        {/* Simplified Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl shadow-lg shadow-primary/10 mb-6">
            <LayoutGrid size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight mb-1">TravelQuote</h1>
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-widest">Authorized Access Only</p>
        </div>

        {/* Login Station */}
        <div className="bg-white border border-[#e8eaed] rounded-3xl !p-12 shadow-sm">
          <form onSubmit={handleManualAuth} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Email Identifier</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                  <input 
                    type="email" 
                    required
                    className="input !pl-14 !rounded-xl" 
                    placeholder="personnel@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Security Key</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                  <input 
                    type="password" 
                    required
                    className="input !pl-14 !rounded-xl" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                >
                  <AlertCircle size={14} />
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Sign In</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* System Metadata */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 opacity-40">
            <ShieldCheck size={12} className="text-primary" />
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Enclave V2.4</span>
          </div>
          <div className="h-2.5 w-px bg-border-light" />
          <div className="flex items-center gap-1.5 opacity-40">
            <CheckCircle size={12} className="text-primary" />
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Protected Endpoint</span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
