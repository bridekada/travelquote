"use client";

// Temporary stub until Phase 4 (mobile 5-step wizard).
// Forwards to the desktop builder, preserving ?id= / ?copyFrom= params.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MobileBuilderRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/builder${window.location.search}`);
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "64px 24px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <Loader2 className="animate-spin" size={24} color="#00674F" />
      <p style={{ fontSize: 13, fontWeight: 600, color: "#64748B", margin: 0 }}>
        Opening quote builder...
      </p>
      <p style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", margin: 0, textAlign: "center" }}>
        The mobile builder is coming soon — using the desktop version for now.
      </p>
    </div>
  );
}
