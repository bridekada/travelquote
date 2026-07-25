"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Copy, Trash2, ChevronDown } from "lucide-react";

interface MobileQuoteCardProps {
  quote: any;
  paymentTotal: number;
  onTap: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onStatusTap?: (quote: any) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Draft": { bg: "#F1F5F9", text: "#64748B" },
  "Quotation Sent": { bg: "#DBEAFE", text: "#1D4ED8" },
  "Follow-up Needed": { bg: "#FEF3C7", text: "#D97706" },
  "Confirmed": { bg: "#DCFCE7", text: "#166534" },
  "Payment Started": { bg: "#CCFBF1", text: "#0F766E" },
  "Payment Complete": { bg: "#BBF7D0", text: "#14532D" },
  "Lost": { bg: "#FEE2E2", text: "#DC2626" },
  "Cancelled": { bg: "#F1F5F9", text: "#94A3B8" },
};

function getDurationString(eta: string, etd: string): string {
  if (!eta || !etd) return "";
  const d1 = new Date(eta);
  const d2 = new Date(etd);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const nights = diffDays - 1;
  return `${diffDays}D${nights > 0 ? `${nights}N` : ""}`;
}

function formatDateRange(eta: string, etd: string): string {
  if (!eta) return "";
  const d1 = new Date(eta);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = d1.toLocaleDateString("en-US", opts);
  if (!etd) return start;
  const d2 = new Date(etd);
  if (d1.getMonth() === d2.getMonth()) {
    return `${start}-${d2.getDate()}, ${d2.getFullYear()}`;
  }
  return `${start} - ${d2.toLocaleDateString("en-US", opts)}, ${d2.getFullYear()}`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function MobileQuoteCard({ quote, paymentTotal, onTap, onDuplicate, onDelete, onStatusTap }: MobileQuoteCardProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const statusColor = STATUS_COLORS[quote.status] || STATUS_COLORS["Draft"];
  const duration = getDurationString(quote.eta, quote.etd);
  const dateRange = formatDateRange(quote.eta, quote.etd);
  const fleetStr = (quote.fleet_json || quote.fleet || []).map((v: any) => v.model).join(", ") || quote.vehicle_model || "";
  const description = quote.quotation_description || "";

  // Commission (same formula as desktop: extracted from a commission-inclusive total)
  const commissionPct = quote.admin_commission || 0;
  const commissionBase = quote.selected_package_total || quote.grand_total || 0;
  const commissionAmount = Math.round((commissionBase * commissionPct) / (100 + commissionPct));

  // Swipe action backgrounds
  const leftBg = useTransform(x, [-200, 0], [1, 0]);
  const rightBg = useTransform(x, [0, 200], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x < -threshold) {
      // Swiped left -> delete
      onDelete(quote.id, quote.customer_name || "Quote");
    } else if (info.offset.x > threshold) {
      // Swiped right -> duplicate
      onDuplicate(quote.id);
    }
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {/* Delete background (swipe left) */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background: "#FEE2E2",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 24,
          borderRadius: 16,
          opacity: leftBg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Trash2 size={20} color="#DC2626" />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", fontFamily: "'Inter', system-ui, sans-serif" }}>Delete</span>
        </div>
      </motion.div>

      {/* Duplicate background (swipe right) */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background: "#DCFCE7",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingLeft: 24,
          borderRadius: 16,
          opacity: rightBg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Copy size={20} color="#166534" />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#166534", fontFamily: "'Inter', system-ui, sans-serif" }}>Duplicate</span>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        dragSnapToOrigin
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{
          x,
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 16,
          padding: "14px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          cursor: "pointer",
          touchAction: "pan-y",
          position: "relative",
          zIndex: 1,
        }}
        onClick={() => {
          if (!isDragging) onTap(quote.id);
        }}
        whileTap={{ scale: isDragging ? 1 : 0.985 }}
      >
        {/* Row 1: Name + Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1.2,
              flex: 1,
              marginRight: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {quote.customer_name || "Untitled"}
          </div>
          <button
            className="m-chip"
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) onStatusTap?.(quote);
            }}
            style={{
              background: statusColor.bg,
              color: statusColor.text,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px 3px 10px",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {quote.status || "Draft"}
            {onStatusTap && <ChevronDown size={11} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Row 2: Duration + Fleet (always visible) */}
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12.5,
            fontWeight: 500,
            color: "#64748B",
            lineHeight: 1.3,
            marginBottom: description ? 2 : 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {duration && <span style={{ fontWeight: 700, color: "#475569" }}>{duration}</span>}
          {duration && fleetStr && " | "}
          {fleetStr}
        </div>

        {/* Row 2b: Quote Description (own line, like desktop's chip) */}
        {description && (
          <div
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11.5,
              fontWeight: 600,
              color: "#7C3AED",
              lineHeight: 1.3,
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </div>
        )}

        {/* Row 3: Date + Pax */}
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11.5,
            fontWeight: 500,
            color: "#94A3B8",
            marginBottom: 10,
          }}
        >
          {dateRange}
          {quote.pax_count ? ` · ${quote.pax_count} pax` : ""}
        </div>

        {/* Status-colored divider between the trip dates and the amount */}
        <div style={{ height: 2, background: statusColor.text, opacity: 0.85, margin: "0 -16px 10px" }} />

        {/* Row 4: Total + Meta */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.02em",
              }}
            >
              {quote.grand_total ? `P${Math.round(quote.grand_total).toLocaleString()}` : "—"}
            </div>
            {commissionPct > 0 && (
              <div
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#6366F1",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 1,
                }}
              >
                Comm: {commissionPct}% (P{commissionAmount.toLocaleString()})
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: "#94A3B8",
                lineHeight: 1.3,
              }}
            >
              {timeAgo(quote.updated_at || quote.created_at)}
            </div>
            {quote.creator?.full_name && (
              <div
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#94A3B8",
                  lineHeight: 1.3,
                }}
              >
                by {quote.creator.full_name}
              </div>
            )}
          </div>
        </div>

        {/* Payment progress bar (if has payments) */}
        {paymentTotal > 0 && quote.grand_total > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", fontFamily: "'Inter', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Paid: P{Math.round(paymentTotal).toLocaleString()}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: "#94A3B8", fontFamily: "'Inter', system-ui, sans-serif" }}>
                {Math.round((paymentTotal / quote.grand_total) * 100)}%
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 9999, background: "#F1F5F9", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (paymentTotal / quote.grand_total) * 100)}%`,
                  borderRadius: 9999,
                  background: "linear-gradient(90deg, #059669, #10B981)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
