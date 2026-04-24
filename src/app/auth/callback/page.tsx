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
  
  // 1. Capture initial intent IMMEDIATELY on mount
  // This is critical because Supabase often cleans the URL fragment (#) very quickly
  const initialSetupRef = useRef<{ isSetup: boolean, type: string | null }>({ 
    isSetup: false, 
    type: null 
  });

  useEffect(() => {
    const hash = window.location.hash || "";
    const type = new URLSearchParams(hash.substring(1)).get("type") || searchParams.get("type");
    const isSetup = 
      type === 'invite' || type === 'signup' || type === 'recovery' || 
      hash.includes('type=invite') || hash.includes('type=recovery') || 
      hash.includes('type=signup') || hash.includes('invite');
    
    initialSetupRef.current = { isSetup, type };
    if (isSetup) {
      console.log("Auth: Detected setup flow early:", type);
    }
  }, [searchParams]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let authListener: any;
    const isRedirecting = useRef(false);

    const performSmartRedirect = async (session: any) => {
      if (!session || isRedirecting.current) return;
      isRedirecting.current = true;
      
      const user = session.user;
      console.log("Auth: Finalizing session for", user.email);

      try {
        // Use the CAPTURED intent from the mount phase
        const { isSetup, type } = initialSetupRef.current;
        
        if (isSetup) {
          console.log("Auth: Redirecting to setup page (type:", type, ")");
          setStatus("success");
          setMessage("Account setup required. Redirecting...");
          router.replace("/setup-password");
          return;
        }

        // 2. Otherwise, check role for standard dashboard routing
        console.log("Auth: Checking profile for standard routing...");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Auth: Profile check error", profileError);
        }

        setStatus("success");
        if (profile?.role === 'super_admin') {
          setMessage("Admin verified! Opening Admin Dashboard...");
          router.replace("/admin");
        } else {
          setMessage("Identity verified! Opening Dashboard...");
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("Auth: Smart Redirect failed", err);
        isRedirecting.current = false; 
        throw err;
      }
    };

    const handleAuth = async () => {
      try {
        // A. Listen for auth state changes (Primary)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Auth: Event caught:", event, session ? "Session present" : "No session");
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            performSmartRedirect(session);
          }
        });
        authListener = subscription;

        // B. Manual Token Processing (Backup for Implicit links)
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log("Auth: Processing URL fragment...");
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

        // C. Code/OTP Exchange (OAuth/Magic Links)
        const code = searchParams.get("code");
        if (code) {
          console.log("Auth: Exchanging code for session...");
          const { data: { session: codeSession }, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!codeError && codeSession) {
            performSmartRedirect(codeSession);
            return;
          }
        }

        // D. Initial Check
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log("Auth: Found existing session");
          performSmartRedirect(existingSession);
          return;
        }

        // E. Patience Loop
        console.log("Auth: Waiting for session resolution...");
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 3500); 
        });

        const { data: finalData } = await supabase.auth.getSession();
        if (finalData.session) {
           performSmartRedirect(finalData.session);
           return;
        }
        
        throw new Error("Unable to identify your session. The link may have expired or was already used.");
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
