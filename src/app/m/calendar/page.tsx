"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, CarFront, Map as MapIcon } from "lucide-react";
import PullToRefresh from "../components/PullToRefresh";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, parseISO,
  startOfWeek, endOfWeek, startOfDay, isWithinInterval,
} from "date-fns";

const font = "'Inter', system-ui, sans-serif";

// Status colors (mirrors desktop CalendarView)
const GREEN_CONFIRMED = { bg: "#F0FDF4", text: "#166534", dot: "#4ADE80" };
const GREEN_STARTED = { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" };
const GREEN_COMPLETE = { bg: "#DCFCE7", text: "#14532D", dot: "#059669" };
const COLOR_GRAY = { bg: "#F1F5F9", text: "#64748B", dot: "#CBD5E1" };

function getStatusConfig(status: string, parsedEta?: Date) {
  if (parsedEta && parsedEta < startOfDay(new Date())) return COLOR_GRAY;
  if (status === "Confirmed") return GREEN_CONFIRMED;
  if (status === "Payment Started") return GREEN_STARTED;
  if (status === "Payment Complete") return GREEN_COMPLETE;
  return COLOR_GRAY;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MobileCalendarPage() {
  const router = useRouter();
  const { profile, selectedOperatorId } = useAuth();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!profile || !selectedOperatorId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*, creator:created_by(full_name)")
        .eq("operator_id", selectedOperatorId)
        .in("status", ["Confirmed", "Payment Started", "Payment Complete"])
        .order("eta", { ascending: true });

      if (error) {
        console.error("Error fetching quotes:", error);
        return;
      }
      setQuotes(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedOperatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeQuotes = useMemo(
    () =>
      quotes
        .filter((q) => q.eta && q.etd)
        .map((q) => ({
          ...q,
          parsedEta: startOfDay(parseISO(q.eta)),
          parsedEtd: startOfDay(parseISO(q.etd)),
        }))
        .filter((q) => q.parsedEta <= q.parsedEtd),
    [quotes]
  );

  const tripsOnDay = useCallback(
    (day: Date) =>
      activeQuotes.filter((q) =>
        isWithinInterval(startOfDay(day), { start: q.parsedEta, end: q.parsedEtd })
      ),
    [activeQuotes]
  );

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }),
  });

  const today = new Date();
  const selectedTrips = tripsOnDay(selectedDay);

  return (
    <PullToRefresh onRefresh={fetchData}>
      {/* Month Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          style={navBtnStyle}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} color="#475569" />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {format(currentDate, "MMMM yyyy")}
          </div>
          <button
            onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}
            style={{
              fontFamily: font, fontSize: 10, fontWeight: 700, color: "#00674F",
              background: "none", border: "none", cursor: "pointer", textTransform: "uppercase",
              letterSpacing: "0.08em", padding: 2, WebkitTapHighlightColor: "transparent",
            }}
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          style={navBtnStyle}
          aria-label="Next month"
        >
          <ChevronRight size={18} color="#475569" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 18,
          padding: "12px 8px",
          marginBottom: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Weekday labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: font, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            const trips = tripsOnDay(day);

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  WebkitTapHighlightColor: "transparent",
                  minHeight: 44,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    fontFamily: font,
                    fontSize: 13.5,
                    fontWeight: isToday || isSelected ? 800 : 500,
                    background: isSelected ? "#003829" : isToday ? "#F0FDF4" : "transparent",
                    border: isToday && !isSelected ? "1.5px solid #00674F" : "none",
                    color: isSelected ? "#ffffff" : !isCurrentMonth ? "#CBD5E1" : isToday ? "#00674F" : "#0F172A",
                  }}
                >
                  {format(day, "d")}
                </span>
                {/* Trip dots (max 3) */}
                <div style={{ display: "flex", gap: 2, height: 5 }}>
                  {trips.slice(0, 3).map((q) => (
                    <span
                      key={q.id}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: getStatusConfig(q.status, q.parsedEta).dot,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Trips */}
      <div style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        {format(selectedDay, "EEEE, MMM d")}
        <span style={{ color: "#94A3B8", fontWeight: 600, marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
          {selectedTrips.length} trip{selectedTrips.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <Loader2 className="animate-spin" size={22} color="#00674F" />
        </div>
      ) : selectedTrips.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "28px 24px",
            background: "rgba(241,245,249,0.5)",
            border: "1px dashed #E2E8F0",
            borderRadius: 16,
            fontFamily: font,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: 0 }}>No trips on this day</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {selectedTrips.map((q, i) => {
            const cfg = getStatusConfig(q.status, q.parsedEta);
            const fleet = q.fleet_json || q.fleet || [];
            const fleetStr = Array.isArray(fleet) && fleet.length > 0
              ? fleet.map((v: any) => v.model).slice(0, 2).join(", ") + (fleet.length > 2 ? "..." : "")
              : q.vehicle_model || "";

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => router.push(`/m/builder?id=${q.id}`)}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderLeft: `4px solid ${cfg.dot}`,
                  borderRadius: 14,
                  padding: "13px 15px",
                  marginBottom: 8,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: "#0F172A", flex: 1, minWidth: 0, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {q.customer_name || "Untitled"}
                  </div>
                  <span
                    style={{
                      fontFamily: font, fontSize: 9, fontWeight: 700, padding: "3px 8px",
                      borderRadius: 9999, background: cfg.bg, color: cfg.text,
                      textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
                    }}
                  >
                    {q.status}
                  </span>
                </div>

                <div style={{ fontFamily: font, fontSize: 11.5, fontWeight: 500, color: "#64748B", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span>
                    {format(q.parsedEta, "MMM d")} – {format(q.parsedEtd, "MMM d, yyyy")}
                    {q.pax_count ? ` · ${q.pax_count} pax` : ""}
                  </span>
                  {fleetStr && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <CarFront size={11} color="#94A3B8" /> {fleetStr}
                    </span>
                  )}
                  {(q.pickup_location || q.dropoff_location) && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <MapIcon size={11} color="#94A3B8" style={{ flexShrink: 0 }} />
                      {q.pickup_location || "—"} → {q.dropoff_location || "—"}
                    </span>
                  )}
                </div>

                {q.grand_total > 0 && (
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: "#0F172A", marginTop: 8, letterSpacing: "-0.01em" }}>
                    P{Math.round(q.grand_total).toLocaleString()}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </PullToRefresh>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};
