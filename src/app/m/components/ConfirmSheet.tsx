"use client";

import { Drawer } from "vaul";
import { Loader2, AlertTriangle } from "lucide-react";

const font = "'Inter', system-ui, sans-serif";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const accentColor = destructive ? "#E11D48" : "#00674F";
  const accentBg = destructive ? "#FFF1F2" : "#F0FDF4";

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && !loading && onCancel()}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1099 }} />
        <Drawer.Content
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            zIndex: 1100,
            outline: "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
          </div>
          <div style={{ padding: "16px 20px 32px", textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: accentBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <AlertTriangle size={22} color={accentColor} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: font, letterSpacing: "-0.01em" }}>
              {title}
            </h3>
            {message && (
              <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 500, color: "#64748B", fontFamily: font, lineHeight: 1.45 }}>
                {message}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: message ? 0 : 20 }}>
              <button
                onClick={onCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "#ffffff",
                  color: "#475569",
                  fontFamily: font,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 14,
                  border: "none",
                  background: destructive ? "#E11D48" : "#003829",
                  color: "#ffffff",
                  fontFamily: font,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  WebkitTapHighlightColor: "transparent",
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : confirmLabel}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
