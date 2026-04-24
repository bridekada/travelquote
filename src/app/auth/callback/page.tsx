"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying security credentials...");
  
  // 1. Safe, Instant Detection
  const [setupIntent] = useState(() => {
    if (typeof window === 'undefined') return { isSetup: false, type: null as string | null };
    
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const fullUrl = window.location.href;
    
    const type = new URLSearchParams(hash.substring(1)).get("type") || 
                 new URLSearchParams(search).get("type");
                 
    const isSetup = 
      type === 'invite' || type === 'signup' || type === 'recovery' || 
      fullUrl.includes('invite') || fullUrl.includes('type=invite');
    
    return { isSetup, type: type || (fullUrl.includes('invite') ? 'invite' : null) };
  });

  const isRedirecting = useRef(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let authListener: any;

    const performRedirect = async (session: any) => {
      if (!session || isRedirecting.current) return;
      isRedirecting.current = true;
      
      console.log("Auth: Session identified. Determining destination...");

      try {
        // PRIORITY: Setup Flow
        if (setupIntent.isSetup) {
          console.log("Auth: Invite/Setup detected. Moving to setup page.");
          setStatus("success");
          setMessage("Account setup required. Redirecting...");
          router.replace("/setup-password");
          return;
        }

        // SECONDARY: Standard Role-based Flow
        console.log("Auth: Normal login detected. Fetching profile...");
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) console.error("Auth: Profile fetch error", error);

        setStatus("success");
        if (profile?.role === 'super_admin') {
          setMessage("Admin access granted. Redirecting...");
          router.replace("/admin");
        } else {
          setMessage("Identity verified. Opening dashboard...");
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("Auth: Redirection failed", err);
        isRedirecting.current = false; 
        setStatus("error");
        setMessage("Failed to route to your destination.");
      }
    };

    const runAuth = async () => {
      try {
        // A. Token Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            performRedirect(session);
          }
        });
        authListener = subscription;

        // B. Manual Hash Check
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { data: { session: manualSession } } = await supabase.auth.setSession({
              access_token,
              refresh_token
            });
            if (manualSession) {
              performRedirect(manualSession);
              return;
            }
          }
        }

        // C. Existing Session Check
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          performRedirect(existingSession);
          return;
        }

        // D. Timeout Loop
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 4000); 
        });

        const { data: final } = await supabase.auth.getSession();
        if (final.session) {
           performRedirect(final.session);
           return;
        }
        
        throw new Error("Your session could not be established. The link may have expired.");
      } catch (err: any) {
        console.error("Auth: Verification failed", err);
        setStatus("error");
        setMessage(err.message || "Failed to verify credentials.");
      }
    };

    runAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (authListener?.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, [router, setupIntent, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200"
         style={{ borderRadius: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.08)' }}>
      {status === "loading" && (
        <>
          <Loader2 className="animate-spin mb-6" size={40} style={{ color: 'var(--color-brand)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Verifying Access</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mb-6 flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Identity Confirmed</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{message}</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mb-6 flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#FEF2F2', color: 'var(--color-danger)' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Verification Error</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>{message}</p>
          <button 
            onClick={() => router.push("/")}
            style={{ 
              background: 'var(--color-brand)', color: 'white', border: 'none', 
              padding: '12px 24px', borderRadius: '14px', fontWeight: 600, cursor: 'pointer' 
            }}
          >
            Return to Login
          </button>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50"
          style={{ background: 'linear-gradient(135deg, white 0%, #F1F5F9 100%)' }}>
      <Suspense fallback={<Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-brand)' }} />}>
        <AuthCallbackHandler />
      </Suspense>
    </main>
  );
}
