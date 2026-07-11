"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Filter, Check, X } from "lucide-react";

interface MobileFilterChipsProps {
  statuses: string[];
  counts: Record<string, number>;
  activeFilter: string;
  onFilterChange: (status: string) => void;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  "All": "#003829",
  "Draft": "#94A3B8",
  "Quotation Sent": "#3B82F6",
  "Follow-up Needed": "#F59E0B",
  "Confirmed": "#22C55E",
  "Payment Started": "#14B8A6",
  "Payment Complete": "#15803D",
  "Lost": "#EF4444",
  "Cancelled": "#CBD5E1",
};

export default function MobileFilterChips({ statuses, counts, activeFilter, onFilterChange }: MobileFilterChipsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allStatuses = ["All", ...statuses];
  const totalCount = counts["All"] ?? 0;
  const isFiltered = activeFilter !== "All";

  return (
    <>
      {/* Filter Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 14px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          whiteSpace: "nowrap",
          border: isFiltered ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.08)",
          background: isFiltered ? "#003829" : "#ffffff",
          color: isFiltered ? "#ffffff" : "#475569",
          cursor: "pointer",
          transition: "all 0.15s ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Filter size={14} />
        {isFiltered ? activeFilter : "All"}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            opacity: 0.6,
            background: isFiltered ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
            padding: "1px 7px",
            borderRadius: 9999,
          }}
        >
          {isFiltered ? (counts[activeFilter] ?? 0) : totalCount}
        </span>
      </button>

      {/* Bottom Sheet */}
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
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
              maxHeight: "70dvh",
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
            </div>

            <div style={{ padding: "12px 20px 28px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0F172A",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Filter by Status
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
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

              {/* Status Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {allStatuses.map((status) => {
                  const isActive = activeFilter === status;
                  const count = counts[status] ?? 0;
                  const dotColor = STATUS_DOT_COLORS[status] || "#94A3B8";

                  return (
                    <button
                      key={status}
                      onClick={() => {
                        onFilterChange(status);
                        setIsOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "13px 14px",
                        borderRadius: 12,
                        border: "none",
                        background: isActive ? "#F0FDF4" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        WebkitTapHighlightColor: "transparent",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      {/* Status dot */}
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: dotColor,
                          flexShrink: 0,
                        }}
                      />

                      {/* Label */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#003829" : "#334155",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        {status}
                      </span>

                      {/* Count */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#94A3B8",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          minWidth: 20,
                          textAlign: "right",
                        }}
                      >
                        {count}
                      </span>

                      {/* Check */}
                      {isActive && (
                        <Check size={16} color="#00674F" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
