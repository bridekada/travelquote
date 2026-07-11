"use client";

import { motion } from "framer-motion";
import { FileText, CheckCircle, TrendingUp, Clock } from "lucide-react";

interface MobileStatsRowProps {
  totalQuotes: number;
  confirmedCount: number;
  revenue: number;
  pendingCount: number;
}

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return `P${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `P${(n / 1_000).toFixed(0)}K`;
  return `P${n.toLocaleString()}`;
};

const STATS_CONFIG = [
  { key: "total", label: "Total Quotes", icon: <FileText size={18} />, color: "#003829", bg: "#F0FDF4", borderColor: "rgba(0,56,41,0.08)" },
  { key: "confirmed", label: "Confirmed", icon: <CheckCircle size={18} />, color: "#059669", bg: "#ECFDF5", borderColor: "rgba(5,150,105,0.1)" },
  { key: "revenue", label: "Revenue", icon: <TrendingUp size={18} />, color: "#0369A1", bg: "#E0F2FE", borderColor: "rgba(3,105,161,0.1)" },
  { key: "pending", label: "Pending", icon: <Clock size={18} />, color: "#D97706", bg: "#FEF3C7", borderColor: "rgba(217,119,6,0.1)" },
];

export default function MobileStatsRow({ totalQuotes, confirmedCount, revenue, pendingCount }: MobileStatsRowProps) {
  const values: Record<string, string> = {
    total: String(totalQuotes),
    confirmed: String(confirmedCount),
    revenue: formatCurrency(revenue),
    pending: String(pendingCount),
  };

  return (
    <div className="mobile-h-scroll" style={{ paddingBottom: 4, paddingLeft: 0 }}>
      {STATS_CONFIG.map((stat, i) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          style={{
            minWidth: 130,
            padding: "14px 16px",
            borderRadius: 16,
            background: "#ffffff",
            border: `1px solid ${stat.borderColor}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: stat.bg,
              color: stat.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
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
              marginBottom: 3,
              letterSpacing: "-0.02em",
            }}
          >
            {values[stat.key]}
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
  );
}
