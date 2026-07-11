"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { Loader2, X, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/app/actions/user-management";
import ConfirmSheet from "./ConfirmSheet";

const font = "'Inter', system-ui, sans-serif";

interface ProfileEditSheetProps {
  open: boolean;
  profile: any;
  onClose: () => void;
  /** Adds a Sign Out row — used in the Admin Portal where Settings is unreachable */
  showSignOut?: boolean;
}

export default function ProfileEditSheet({ open, profile, onClose, showSignOut = false }: ProfileEditSheetProps) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (open) setStatus(null);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    const fullName = (formData.get("fullName") as string).trim();
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    try {
      if (!fullName) throw new Error("Name is required");
      const res = await updateProfile(profile.id, { fullName });
      if (res.error) throw new Error(res.error);

      if (newPassword) {
        if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
        if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
      }
      window.location.reload();
    } catch (err: any) {
      setStatus(err.message);
      setSaving(false);
    }
  };

  const executeSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/m";
  };

  return (
    <>
      <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
          <Drawer.Content
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff",
              borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1000, outline: "none",
              maxHeight: "88dvh", display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
            </div>
            <div style={{ padding: "10px 20px 32px", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: font }}>Edit Profile</h3>
                <button
                  onClick={onClose}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", border: "none", background: "#F1F5F9",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                  aria-label="Close"
                >
                  <X size={14} color="#64748B" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <Field label="Full Name">
                  <input name="fullName" defaultValue={profile?.full_name || ""} required style={inputStyle} />
                </Field>
                <Field label="New Password (optional)">
                  <input name="newPassword" type="password" style={inputStyle} placeholder="Leave blank to keep current" />
                </Field>
                <Field label="Confirm New Password">
                  <input name="confirmPassword" type="password" style={inputStyle} />
                </Field>
                {status && (
                  <div
                    style={{
                      padding: "10px 12px", background: "#FFF1F2", border: "1px solid rgba(225,29,72,0.15)",
                      borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: 600, color: "#E11D48", marginBottom: 12,
                    }}
                  >
                    {status}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12, border: "none",
                    background: "#003829", color: "#ffffff", fontFamily: font, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: saving ? 0.7 : 1, WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {saving ? <Loader2 className="animate-spin" size={15} /> : "Save Changes"}
                </button>
              </form>

              {showSignOut && (
                <button
                  onClick={() => setConfirmSignOut(true)}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12, marginTop: 10,
                    border: "1.5px solid rgba(225,29,72,0.2)", background: "#FFF1F2", color: "#E11D48",
                    fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {showSignOut && (
        <ConfirmSheet
          open={confirmSignOut}
          title="Sign out of TravelQuote?"
          message="You will need to log in again to access the admin portal."
          confirmLabel="Sign Out"
          destructive
          loading={signingOut}
          onConfirm={executeSignOut}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: font,
  fontWeight: 500,
  border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff",
  color: "#0F172A",
  outline: "none",
  WebkitAppearance: "none",
};
