"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, MapPin, Plus, Trash2, Car, BedDouble, ExternalLink, Coins,
  Fuel, Banknote, Route,
} from "lucide-react";
import { QuoteData, QuoteItem } from "@/app/builder/components/types";
import { calculateFuelCost } from "@/app/builder/components/utils";
import MobileSearchSelect from "./MobileSearchSelect";

const font = "'Inter', system-ui, sans-serif";

interface MobileDayCardsProps {
  quote: QuoteData;
  dbPresets: any[];
  dbAccommodations: any[];
  dbMiscPresets: any[];
  livePackages: any[];
  colTotals: { rate: number; km: number; fuel: number; accom: number; grand: number; misc: Record<string, number> };
  readOnly?: boolean;
  onUpdateItem: (index: number, updates: Partial<QuoteItem>, manual?: boolean) => void;
  onApplyPreset: (index: number, presetId: string) => void;
  onAddDay: () => void;
  onRemoveLastDay: () => void;
}

export default function MobileDayCards({
  quote, dbPresets, dbAccommodations, dbMiscPresets, livePackages, colTotals, readOnly,
  onUpdateItem, onApplyPreset, onAddDay, onRemoveLastDay,
}: MobileDayCardsProps) {
  const [openIdx, setOpenIdx] = useState<number>(0);
  const fleet = quote.fleet || [];

  const dayLabel = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Fleet labels with same-model disambiguation (#1/#2)
  const vehicleLabel = (v: any) => {
    const sameModel = fleet.filter((f) => f.model === v.model);
    if (sameModel.length > 1) return `${v.model} #${sameModel.indexOf(v) + 1}`;
    return v.model;
  };

  const activeVehicleIds = (item: QuoteItem) =>
    item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0
      ? item.selected_vehicle_ids
      : fleet.map((v) => v.id);

  const toggleVehicle = (index: number, item: QuoteItem, vid: string) => {
    const current = activeVehicleIds(item);
    const next = current.includes(vid) ? current.filter((id) => id !== vid) : [...current, vid];
    onUpdateItem(index, { selected_vehicle_ids: next });
  };

  const fleetRateFor = (item: QuoteItem) => {
    const ids = activeVehicleIds(item);
    const active = fleet.filter((v) => ids.includes(v.id));
    return active.length > 0 ? active.reduce((a, v) => a + (v.daily_rate || 0), 0) : (item.vehicle_rate || 0);
  };

  return (
    <div>
      {quote.items.map((item, index) => {
        const isOpen = openIdx === index;
        const fleetRate = fleetRateFor(item);
        const fuel = calculateFuelCost(item, fleet);
        const rowTotal = item.row_total || 0;
        const accApplied = activeVehicleIds(item);

        return (
          <div
            key={item.day_number}
            style={{
              background: "#ffffff",
              border: isOpen ? "1.5px solid rgba(0,103,79,0.25)" : "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16,
              marginBottom: 10,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            {/* Header */}
            <button
              onClick={() => setOpenIdx(isOpen ? -1 : index)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px",
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F0FDF4", color: "#00674F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: font, fontSize: 7, fontWeight: 800, letterSpacing: "0.06em" }}>DAY</span>
                <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{item.day_number}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.destination || <span style={{ color: "#CBD5E1" }}>Tap to plan this day</span>}
                </div>
                <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 500, color: "#94A3B8" }}>
                  {dayLabel(item.date)}{rowTotal > 0 ? ` · ₱${Math.round(rowTotal).toLocaleString()}` : ""}
                </div>
              </div>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                <ChevronDown size={18} color="#94A3B8" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "0 14px 16px", ...(readOnly ? { pointerEvents: "none" as const, opacity: 0.75 } : {}) }}>
                    {/* Itinerary */}
                    <Group label="Itinerary" icon={<Route size={12} color="#00674F" />} />
                    <FieldLabel>Destination / Preset</FieldLabel>
                    <MobileSearchSelect
                      value={item.applied_preset_id || item.destination || ""}
                      onValueChange={(v) => onApplyPreset(index, v)}
                      options={dbPresets}
                      getLabel={(p: any) => p.title}
                      getValue={(p: any) => p.id}
                      renderOption={(p: any) => (
                        <span>{p.title}{p.default_km ? <span style={{ color: "#94A3B8", fontWeight: 500 }}> · {p.default_km} KM</span> : null}</span>
                      )}
                      title="Destination"
                      placeholder="Select or type destination"
                      creatable clearable
                      icon={<MapPin size={14} color="#94A3B8" />}
                    />
                    <div style={{ height: 8 }} />
                    <FieldLabel>Details</FieldLabel>
                    <textarea
                      value={item.itinerary_details}
                      onChange={(e) => onUpdateItem(index, { itinerary_details: e.target.value }, true)}
                      placeholder="Notes for this day..."
                      rows={2}
                      style={{ ...inputStyle, height: "auto", paddingTop: 10, paddingBottom: 10, resize: "vertical", lineHeight: 1.4 }}
                    />
                    <div style={{ height: 8 }} />
                    <FieldLabel>Estimated KM</FieldLabel>
                    <input
                      value={item.km || ""}
                      onChange={(e) => onUpdateItem(index, { km: parseFloat(e.target.value) || 0 }, true)}
                      inputMode="decimal"
                      placeholder="0"
                      style={inputStyle}
                    />

                    {/* Stay */}
                    <Group label="Stay" icon={<BedDouble size={12} color="#00674F" />} />
                    <FieldLabel>Accommodation</FieldLabel>
                    <MobileSearchSelect
                      value={item.guest_accommodation_id || item.guest_accommodation_name || ""}
                      onValueChange={(v) => {
                        const accom = dbAccommodations.find((a) => a.id === v);
                        if (accom) onUpdateItem(index, { guest_accommodation_id: accom.id, guest_accommodation_name: accom.name, guest_accommodation_amount: accom.amount }, true);
                        else onUpdateItem(index, { guest_accommodation_id: "", guest_accommodation_name: v, guest_accommodation_amount: v ? item.guest_accommodation_amount : 0 }, true);
                      }}
                      options={dbAccommodations}
                      getLabel={(a: any) => a.name}
                      getValue={(a: any) => a.id}
                      renderOption={(a: any) => (
                        <span>{a.name}<span style={{ color: "#94A3B8", fontWeight: 500 }}> · {a.pax_count} pax · ₱{(a.amount || 0).toLocaleString()}</span></span>
                      )}
                      title="Accommodation"
                      placeholder="None / select / type"
                      creatable clearable
                      icon={<BedDouble size={14} color="#94A3B8" />}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1 }}>
                        <FieldLabel>Price (₱)</FieldLabel>
                        <input
                          value={item.guest_accommodation_amount || ""}
                          onChange={(e) => onUpdateItem(index, { guest_accommodation_amount: parseFloat(e.target.value) || 0 }, true)}
                          inputMode="decimal"
                          placeholder="0"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <FieldLabel>Hotel URL</FieldLabel>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            value={item.accommodation_url || ""}
                            onChange={(e) => onUpdateItem(index, { accommodation_url: e.target.value }, true)}
                            placeholder="https://..."
                            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                          />
                          {item.accommodation_url && (
                            <a
                              href={item.accommodation_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ width: 42, height: 42, borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.08)", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}
                              aria-label="Open hotel link"
                            >
                              <ExternalLink size={15} color="#00674F" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vehicles */}
                    {fleet.length > 0 && (
                      <>
                        <Group label="Active Vehicles" icon={<Car size={12} color="#00674F" />} />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {fleet.map((v, i) => {
                            const on = accApplied.includes(v.id);
                            return (
                              <button
                                key={v.id}
                                onClick={() => toggleVehicle(index, item, v.id)}
                                style={{
                                  padding: "7px 12px", borderRadius: 9999, fontFamily: font, fontSize: 12, fontWeight: 700,
                                  border: on ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.1)",
                                  background: on ? "#003829" : "#ffffff", color: on ? "#ffffff" : "#64748B",
                                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                                }}
                              >
                                {vehicleLabel(v)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Costs */}
                    <Group label="Costs" icon={<Coins size={12} color="#00674F" />} />
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <DerivedCost label="Fleet Rate" icon={<Banknote size={11} color="#94A3B8" />} value={fleetRate} />
                      <DerivedCost label="Fuel" icon={<Fuel size={11} color="#94A3B8" />} value={fuel} />
                    </div>

                    {/* Add-on fees: toggle + editable amount (merged tag + matrix) */}
                    {dbMiscPresets.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <FieldLabel>Add-on Fees</FieldLabel>
                        {dbMiscPresets.map((p) => {
                          const on = item.tags.includes(p.name);
                          const amount = item.dynamic_costs[p.id] || 0;
                          const inPkgZero = livePackages.some((lp) => (lp.includes_misc_ids || []).includes(p.id)) && (colTotals.misc[p.id] || 0) === 0;
                          return (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <button
                                onClick={() => {
                                  const nextTags = on ? item.tags.filter((t) => t !== p.name) : [...item.tags, p.name];
                                  onUpdateItem(index, { tags: nextTags });
                                }}
                                style={{
                                  flex: 1, minWidth: 0, textAlign: "left", padding: "9px 11px", borderRadius: 10,
                                  border: on ? "1.5px solid rgba(0,103,79,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
                                  background: on ? "#F0FDF4" : "#ffffff", cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 8, WebkitTapHighlightColor: "transparent",
                                }}
                              >
                                <span style={{
                                  width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                                  border: on ? "none" : "1.5px solid #CBD5E1",
                                  background: on ? "#00674F" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  {on && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                </span>
                                <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 12.5, fontWeight: 600, color: on ? "#003829" : "#64748B", lineHeight: 1.3, overflowWrap: "anywhere" }}>
                                  {p.name}
                                </span>
                                {inPkgZero && <span title="In a package but ₱0" style={{ marginLeft: "auto", color: "#D97706", fontSize: 11, flexShrink: 0 }}>⚠</span>}
                              </button>
                              <input
                                value={on ? (amount || "") : ""}
                                disabled={!on}
                                onChange={(e) => onUpdateItem(index, { dynamic_costs: { ...item.dynamic_costs, [p.id]: parseFloat(e.target.value) || 0 } }, true)}
                                inputMode="decimal"
                                placeholder={on ? "0" : "—"}
                                style={{ ...inputStyle, width: 84, flex: "none", flexShrink: 0, height: 40, textAlign: "right", opacity: on ? 1 : 0.5 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Row total */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F8FAFC", borderRadius: 12 }}>
                      <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Day Total</span>
                      <span style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>₱{Math.round(rowTotal).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Add / remove day */}
      {!readOnly && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onAddDay} style={addBtnStyle}>
            <Plus size={15} strokeWidth={2.5} /> Add Day
          </button>
          {quote.items.length > 1 && (
            <button onClick={onRemoveLastDay} style={removeBtnStyle} aria-label="Remove last day">
              <Trash2 size={15} /> Remove Last
            </button>
          )}
        </div>
      )}

      {/* Totals bar */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <TotalTile label="Total KM" value={`${Math.round(colTotals.km).toLocaleString()}`} />
        <TotalTile label="Fuel" value={`₱${Math.round(colTotals.fuel).toLocaleString()}`} />
        <TotalTile label="Fleet Rate" value={`₱${Math.round(colTotals.rate).toLocaleString()}`} />
      </div>
    </div>
  );
}

function Group({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "16px 0 8px" }}>
      {icon}
      <span style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.05)" }} />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontFamily: font, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{children}</label>;
}

function DerivedCost({ label, icon, value }: { label: string; icon: React.ReactNode; value: number }) {
  return (
    <div style={{ flex: 1, padding: "9px 11px", background: "#F8FAFC", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        {icon}
        <span style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: "#0F172A" }}>₱{Math.round(value).toLocaleString()}</div>
    </div>
  );
}

function TotalTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", background: "#003829", borderRadius: 12 }}>
      <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#4ADE80", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 42, padding: "0 12px", borderRadius: 10, fontSize: 14,
  fontFamily: font, fontWeight: 500, border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff", color: "#0F172A", outline: "none", WebkitAppearance: "none",
};

const addBtnStyle: React.CSSProperties = {
  flex: 1, padding: "11px", borderRadius: 12, border: "1.5px dashed rgba(0,103,79,0.3)",
  background: "#F0FDF4", color: "#00674F", fontFamily: font, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  WebkitTapHighlightColor: "transparent",
};

const removeBtnStyle: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 12, border: "1.5px solid rgba(225,29,72,0.2)",
  background: "#FFF1F2", color: "#E11D48", fontFamily: font, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  WebkitTapHighlightColor: "transparent",
};
