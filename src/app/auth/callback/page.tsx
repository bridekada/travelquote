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

    const handleAuth = async () => {
      try {
        // 1. Check for 'code' (OAuth/Magic Link)
        const code = searchParams.get("code");
        if (code) {
          console.log("Auth: Found code, exchanging...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // 2. Check for 'token_hash' (Invites/OTP)
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        if (token_hash && type) {
          console.log(`Auth: Found ${type} token hash, verifying...`);
          const { error } = await supabase.auth.verifyOtp({ 
            token_hash, 
            type: type as any 
          });
          if (error) throw error;
        }

        // 3. Buffer to allow Supabase to process URL fragments (#access_token)
        // Fragments are handled internally by the Supabase browser client.
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 800);
        });

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (data.session) {
          console.log("Auth: Session confirmed");
          setStatus("success");
          setMessage("Authentication successful! Redirecting...");
          redirectId = setTimeout(() => router.push("/dashboard"), 1000);
        } else {
          // If no session, check if we're in a common error redirect state
          const errorDesc = searchParams.get("error_description");
          if (errorDesc) throw new Error(errorDesc);
          
          throw new Error("Unable to establish a secure session. The link may have expired.");
        }
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

