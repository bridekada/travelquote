"use client";

import { useAuth } from "@/lib/auth";
import { FileText, TrendingUp, CheckCircle, Clock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function MobileDashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();

  return (
    <div>
      {/* ── Welcome Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 20 }}
      >
        <h2
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: "#0F172A",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Welcome, {profile?.full_name?.split(" ")[0] || "there"} 👋
        </h2>
        <p
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#64748B",
            margin: 0,
            marginTop: 4,
          }}
        >
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </motion.div>

      {/* ── Quick Stats (Placeholder) ── */}
      <div className="mobile-h-scroll" style={{ marginBottom: 24, paddingBottom: 4 }}>
        {[
          { label: "Total Quotes", value: "—", icon: <FileText size={18} />, color: "#003829", bg: "#F0FDF4" },
          { label: "Confirmed", value: "—", icon: <CheckCircle size={18} />, color: "#059669", bg: "#ECFDF5" },
          { label: "Revenue", value: "—", icon: <TrendingUp size={18} />, color: "#0369A1", bg: "#E0F2FE" },
          { label: "Pending", value: "—", icon: <Clock size={18} />, color: "#D97706", bg: "#FEF3C7" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              minWidth: 140,
              padding: "16px 18px",
              borderRadius: 16,
              background: "#ffffff",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: stat.bg,
                color: stat.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {stat.icon}
            </div>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 22,
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Coming Soon Notice ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="m-card"
        style={{
          textAlign: "center",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #00674F 0%, #004F3D 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 4px 16px -2px rgba(0, 103, 79, 0.3)",
          }}
        >
          <FileText size={24} color="#ffffff" />
        </div>
        <h3
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#0F172A",
            margin: 0,
            marginBottom: 8,
          }}
        >
          Dashboard Ready
        </h3>
        <p
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#64748B",
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 280,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Your mobile dashboard shell is live! Quote list, analytics, and search are coming in Phase 2.
        </p>

        <button
          className="m-btn-emerald"
          onClick={() => router.push("/m/builder")}
          style={{ marginTop: 24, maxWidth: 220, marginLeft: "auto", marginRight: "auto" }}
        >
          <Plus size={18} />
          New Quote
        </button>
      </motion.div>
    </div>
  );
}
