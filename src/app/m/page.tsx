"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, Palmtree, ArrowRight, KeyRound, X } from "lucide-react";
import { Drawer } from "vaul";
import "./mobile.css";

export default function MobileLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        // Mirror desktop: super admins land on the Admin Portal to pick an agency
        window.location.href = profile?.role === "super_admin" ? "/m/admin" : "/m/home";
      } catch {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError("");
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      // Mirror desktop: super admins land on the Admin Portal to pick an agency
      window.location.href = profile?.role === "super_admin" ? "/m/admin" : "/m/home";
    } catch (err: any) {
      setAuthError(
        err.message === "Invalid login credentials"
          ? "Access Denied: Invalid Credentials"
          : err.message
      );
      setIsSubmitting(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetStatus(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      setResetStatus({ type: "success", msg: "Reset link sent! Check your email." });
    } catch (err: any) {
      setResetStatus({ type: "error", msg: err.message || "Failed to send reset link." });
    } finally {
      setResetLoading(false);
    }
  };

  // Full-screen loader while checking session
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(145deg, #002A1F 0%, #003829 40%, #00674F 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 className="animate-spin" size={28} color="rgba(255,255,255,0.6)" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(145deg, #002A1F 0%, #003829 40%, #00674F 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        paddingTop: "calc(24px + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: "380px" }}
      >
        {/* â”€â”€ Logo â”€â”€ */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            }}
          >
            <Palmtree size={30} color="#003829" strokeWidth={1.8} />
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28,
              fontWeight: 500,
              color: "#ffffff",
              letterSpacing: "0.06em",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            JWRM
          </h1>
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 8.5,
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.5)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              margin: 0,
              marginTop: 6,
            }}
          >
            Travel & Tours
          </p>
        </div>

        {/* â”€â”€ Login Form â”€â”€ */}
        <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Email */}
          <div style={{ position: "relative" }}>
            <Mail
              size={18}
              color="rgba(255,255,255,0.35)"
              style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="login-input"
            />
          </div>

          {/* Password */}
          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              color="rgba(255,255,255,0.35)"
              style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input"
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {authError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: "rgba(220, 38, 38, 0.15)",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#FCA5A5",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {authError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} className="m-btn-primary" style={{ marginTop: 6 }}>
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* â”€â”€ Forgot Password Link â”€â”€ */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => {
              setIsResetOpen(true);
              setResetStatus(null);
              setResetEmail(email);
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.45)",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: "pointer",
              padding: "8px 16px",
              transition: "color 0.2s",
            }}
          >
            Forgot Password?
          </button>
        </div>

        {/* â”€â”€ Copyright â”€â”€ */}
        <div
          style={{
            textAlign: "center",
            marginTop: 48,
            opacity: 0.25,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 500, color: "#fff", margin: 0 }}>
            Â© 2026 NorthMind Ecosystem
          </p>
          <p style={{ fontSize: 9, fontWeight: 500, color: "#fff", margin: 0 }}>
            All rights reserved.
          </p>
        </div>
      </motion.div>

      {/* â”€â”€ Forgot Password Bottom Sheet â”€â”€ */}
      <Drawer.Root open={isResetOpen} onOpenChange={setIsResetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
          />
          <Drawer.Content
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#ffffff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 1000,
              outline: "none",
              maxHeight: "85dvh",
            }}
          >
            {/* Handle bar */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 9999,
                  background: "#E2E8F0",
                }}
              />
            </div>

            <div style={{ padding: "16px 24px 32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#F0FDF4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <KeyRound size={18} color="#00674F" />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#0F172A",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Reset Password
                  </h3>
                </div>
                <button
                  onClick={() => setIsResetOpen(false)}
                  style={{
                    background: "#F1F5F9",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} color="#64748B" />
                </button>
              </div>

              <p
                style={{
                  fontSize: 13,
                  color: "#64748B",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleResetRequest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="m-input"
                />

                <AnimatePresence>
                  {resetStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        background: resetStatus.type === "success" ? "#F0FDF4" : "#FEF2F2",
                        border: `1px solid ${resetStatus.type === "success" ? "#BBF7D0" : "#FECACA"}`,
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: resetStatus.type === "success" ? "#166534" : "#DC2626",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {resetStatus.msg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={resetLoading} className="m-btn-emerald">
                  {resetLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
