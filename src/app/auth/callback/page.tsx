"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying security credentials...");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let authListener: any;

    /**
     * Centralized Redirection Logic
     * Ensures we check for 'Setup Flow' regardless of how the user authenticated.
     */
    const performSmartRedirect = async (session: any) => {
      if (!session) return;
      const user = session.user;
      
      console.log("Auth: Finalizing session for", user.email);

      // 1. Identify if this is a first-time setup (Invite, Signup, or Recovery)
      const urlType = searchParams.get("type");
      const hashString = window.location.hash || "";
      const isSetupFlow = 
        urlType === 'invite' || urlType === 'signup' || urlType === 'recovery' || 
        hashString.includes('type=invite') || hashString.includes('type=recovery') || 
        hashString.includes('type=signup') || hashString.includes('invite');

      if (isSetupFlow) {
        console.log("Auth: Setup marker found. Accessing secure setup page...");
        setStatus("success");
        setMessage("Account setup required. Redirecting...");
        router.replace("/setup-password");
        return;
      }

      // 2. Otherwise, check role for standard dashboard routing
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setStatus("success");
      if (profile?.role === 'super_admin') {
        setMessage("Admin verified! Opening Admin Dashboard...");
        router.replace("/admin");
      } else {
        setMessage("Identity verified! Opening Dashboard...");
        router.replace("/dashboard");
      }
    };

    const handleAuth = async () => {
      try {
        // A. Background Listener (Main Pathway)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            console.log("Auth: State change event caught:", event);
            performSmartRedirect(session);
          }
        });
        authListener = subscription;

        // B. Manual Hash Scraper (Backup for Implicit links)
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log("Auth: Manual URL fragment detected");
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data: { session: manualSession }, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (!setSessionError && manualSession) {
              performSmartRedirect(manualSession);
              return; 
            }
          }
        }

        // C. Code/OTP Exchange (Backup)
        const code = searchParams.get("code");
        if (code) {
          const { data: { session: codeSession }, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!codeError && codeSession) {
            performSmartRedirect(codeSession);
            return;
          }
        }

        // D. Initial Check
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          performSmartRedirect(existingSession);
          return;
        }

        // E. Patience Loop
        console.log("Auth: Waiting for session resolution...");
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 3500); // 3.5s cushion
        });

        const { data: finalData } = await supabase.auth.getSession();
        if (finalData.session) {
           performSmartRedirect(finalData.session);
           return;
        }
        
        throw new Error("Unable to identify your session. The link may have expired.");
      } catch (err: any) {
        console.error("Auth Failure:", err.message);
        setStatus("error");
        setMessage(err.message || "Failed to authenticate.");
      }
    };

    handleAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (authListener) authListener.unsubscribe();
    };
  }, [router, searchParams]);

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
