"use client";

interface MobileFilterChipsProps {
  statuses: string[];
  counts: Record<string, number>;
  activeFilter: string;
  onFilterChange: (status: string) => void;
}

export default function MobileFilterChips({ statuses, counts, activeFilter, onFilterChange }: MobileFilterChipsProps) {
  return (
    <div className="mobile-h-scroll no-select" style={{ gap: 8, paddingBottom: 2 }}>
      {["All", ...statuses].map((status) => {
        const isActive = activeFilter === status;
        const count = counts[status] ?? 0;

        return (
          <button
            key={status}
            onClick={() => onFilterChange(status)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              whiteSpace: "nowrap",
              flexShrink: 0,
              border: isActive ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.08)",
              background: isActive ? "#003829" : "#ffffff",
              color: isActive ? "#ffffff" : "#475569",
              cursor: "pointer",
              transition: "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {status}
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                opacity: isActive ? 0.8 : 0.5,
                minWidth: 14,
                textAlign: "center",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
