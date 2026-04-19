"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Verification Component
 * Handles the actual auth logic inside the Suspense boundary.
 */
function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your session...");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let redirectId: NodeJS.Timeout;
    let authListener: any;

    const handleAuth = async () => {
      try {
        console.log("Auth: Handler started. URL Hash present:", !!window.location.hash);

        // 1. MANUAL FRAGMENT PARSE (The "Nuclear" Option)
        // If Supabase background listener is silent, we manually scrape the token.
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log("Auth: Manual fragment detected, parsing tokens...");
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log("Auth: Found tokens in URL, forcing setSession...");
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (!setSessionError) {
              console.log("Auth: Manual setSession succeeded!");
              setStatus("success");
              setMessage("Identity identified! Redirecting...");
              redirectId = setTimeout(() => router.push("/dashboard"), 500);
              return; // Success! Exit early.
            } else {
              console.error("Auth: Manual setSession failed", setSessionError.message);
            }
          }
        }

        // 2. Set up a listener (Standard Flow fallback)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            console.log("Auth: Caught event:", event);
            setStatus("success");
            setMessage("Authentication successful! Redirecting...");
            redirectId = setTimeout(() => router.push("/dashboard"), 800);
          }
        });
        authListener = subscription;

        // 3. Check for query parameters (PKCE Flow)
        const code = searchParams.get("code");
        if (code) {
          console.log("Auth: Exchanging code...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        if (token_hash && type) {
          console.log(`Auth: Verifying ${type} hash...`);
          const { error } = await supabase.auth.verifyOtp({ 
            token_hash, 
            type: type as any 
          });
          if (error) throw error;
        }

        // 4. Initial check for an existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Auth: Session confirmed, checking profile...");
          const user = session.user;

          // 5. Role-based redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          setStatus("success");
          
          if (profile?.role === 'super_admin') {
            setMessage("Admin identity verified! Redirecting to Admin Dashboard...");
            redirectId = setTimeout(() => router.push("/admin"), 1000);
          } else {
            setMessage("Authentication successful! Redirecting to Dashboard...");
            redirectId = setTimeout(() => router.push("/dashboard"), 1000);
          }
          return;
        } 

        // 6. Final Patience Loop
        console.log("Auth: No session confirmed yet, waiting for processing...");
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 3000);
        });

        // Final check after waiting
        const { data: finalData } = await supabase.auth.getSession();
        if (finalData.session) {
           // If we caught it here, perform the same profile check
           const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', finalData.session.user.id)
            .maybeSingle();
            
           setStatus("success");
           if (profile?.role === 'super_admin') {
             router.push("/admin");
           } else {
             router.push("/dashboard");
           }
           return;
        }
        
        const errorDesc = searchParams.get("error_description");
        throw new Error(errorDesc || "Could not confirm your session. The link may have expired or was already used.");
      } catch (err: any) {
        console.error("Auth Callback Failure:", err.message || err);
        setStatus("error");
        setMessage(err.message || "Something went wrong during authentication.");
      }
    };

    handleAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (redirectId) clearTimeout(redirectId);
      if (authListener) authListener.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={status}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{ 
          textAlign: 'center', 
          maxWidth: '430px', 
          width: '90%',
          padding: '40px',
          background: 'var(--color-bg-card)',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid var(--color-border-default)'
        }}
      >
        {status === "verifying" && (
          <>
            <Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--color-brand)', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Security Check</h2>
            <p style={{ color: 'var(--color-text-faint)', fontSize: '14px', lineHeight: 1.5 }}>{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <ShieldCheck style={{ width: '40px', height: '40px', color: '#10B981', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Identity Verified</h2>
            <p style={{ color: 'var(--color-text-faint)', fontSize: '14px' }}>{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle style={{ width: '40px', height: '40px', color: '#EF4444', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Verification Error</h2>
            <p style={{ color: 'var(--color-text-faint)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>{message}</p>
            <button 
              onClick={() => router.push("/")}
              style={{ 
                padding: '12px 24px',
                background: 'var(--color-brand)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Return to Login
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Main Page Component
 * Wraps the handler in Suspense as required by Next.js for useSearchParams.
 */
export default function AuthCallbackPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--color-bg-main)',
      color: 'var(--color-text-main)',
      fontFamily: 'inherit'
    }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: 'var(--color-brand)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-faint)', fontSize: '14px' }}>Loading verification module...</p>
        </div>
      }>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}

