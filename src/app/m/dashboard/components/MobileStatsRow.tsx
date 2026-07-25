"use client";

import { motion } from "framer-motion";

interface MobileStatsRowProps {
  totalQuotes: number;
  confirmedCount: number;
  revenue: number;
  pendingCount: number;
}

const font = "'Inter', system-ui, sans-serif";

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return `P${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `P${(n / 1_000).toFixed(0)}K`;
  return `P${n.toLocaleString()}`;
};

const STATS_CONFIG = [
  { key: "total", label: "Total Quotes", color: "#003829", bg: "#F0FDF4" },
  { key: "confirmed", label: "Confirmed", color: "#059669", bg: "#ECFDF5" },
  { key: "revenue", label: "Revenue", color: "#0369A1", bg: "#E0F2FE" },
  { key: "pending", label: "Pending", color: "#D97706", bg: "#FEF3C7" },
];

export default function MobileStatsRow({ totalQuotes, confirmedCount, revenue, pendingCount }: MobileStatsRowProps) {
  const values: Record<string, string> = {
    total: String(totalQuotes),
    confirmed: String(confirmedCount),
    revenue: formatCurrency(revenue),
    pending: String(pendingCount),
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {STATS_CONFIG.map((stat, i) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          style={{
            flex: 1,
            minWidth: 0,
            background: stat.bg,
            borderRadius: 14,
            padding: "12px 10px",
          }}
        >
          <div
            style={{
              fontFamily: font,
              fontSize: 9,
              fontWeight: 700,
              color: stat.color,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {stat.label}
          </div>
          <div
            style={{
              fontFamily: font,
              fontSize: 15,
              fontWeight: 800,
              color: stat.color,
              letterSpacing: "-0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {values[stat.key]}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
