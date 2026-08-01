"use client";

import { useState } from "react";
import { QuoteData, QuoteVehicle } from "@/app/builder/components/types";
import MobileSearchSelect from "./MobileSearchSelect";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, Users, AtSign, Calendar, Clock, MapPin, Map as MapIcon,
  Percent, FileText, Car, Banknote, Fuel, Gauge, Plus, Trash2,
} from "lucide-react";

const font = "'Inter', system-ui, sans-serif";

interface MobileTripFormProps {
  quote: QuoteData;
  dbVehicles: any[];
  quoteTitlePresets: string[];
  readOnly?: boolean;
  setField: (key: keyof QuoteData, value: any) => void;
  onEtaChange: (iso: string) => void;
  onEtdChange: (iso: string) => void;
  onUpdateCommission: (v: number) => void;
  onUpdateFleet: (fleet: QuoteVehicle[]) => void;
}

export default function MobileTripForm({
  quote, dbVehicles, quoteTitlePresets, readOnly,
  setField, onEtaChange, onEtdChange, onUpdateCommission, onUpdateFleet,
}: MobileTripFormProps) {
  const fleet = quote.fleet || [];
  // Draft string so partially-typed values ("10.") survive re-render; null = show canonical value.
  const [commDraft, setCommDraft] = useState<string | null>(null);

  const addVehicle = () => {
    const first = dbVehicles[0];
    const newV: QuoteVehicle = {
      id: `v-${Date.now()}`,
      model: first?.model || "Standard Sedan",
      daily_rate: Number(first?.default_rate) || Number(first?.rate) || 0,
      km_per_l: Number(first?.km_per_l) || 10,
      fuel_price: quote.default_fuel_price || 60,
    };
    onUpdateFleet([...fleet, newV]);
  };

  const removeVehicle = (id: string) => {
    if (fleet.length <= 1) return;
    onUpdateFleet(fleet.filter((v) => v.id !== id));
  };

  const patchVehicle = (id: string, patch: Partial<QuoteVehicle>) => {
    onUpdateFleet(fleet.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const selectModel = (id: string, model: string) => {
    const dbV = dbVehicles.find((dv) => dv.model === model);
    if (dbV) {
      patchVehicle(id, {
        model,
        daily_rate: Number(dbV.default_rate) || Number(dbV.rate) || 0,
        km_per_l: Number(dbV.km_per_l) || 10,
      });
    } else {
      patchVehicle(id, { model });
    }
  };

  return (
    <div style={readOnly ? { pointerEvents: "none", opacity: 0.75 } : undefined}>
      {/* ── Identity ── */}
      <SectionLabel>Customer</SectionLabel>
      <Field label="Customer Name" icon={<User size={14} color="#94A3B8" />}>
        <input
          value={quote.customer_name}
          onChange={(e) => setField("customer_name", e.target.value)}
          placeholder="e.g. Maria Clara"
          style={inputStyle}
        />
      </Field>
      <Row>
        <Field label="Contact No." icon={<Phone size={14} color="#94A3B8" />}>
          <input
            value={quote.contact_number}
            onChange={(e) => setField("contact_number", e.target.value)}
            inputMode="tel"
            placeholder="09xx..."
            style={inputStyle}
          />
        </Field>
        <Field label="FB Name" icon={<AtSign size={14} color="#94A3B8" />}>
          <input
            value={quote.fb_name}
            onChange={(e) => setField("fb_name", e.target.value)}
            placeholder="Facebook name"
            style={inputStyle}
          />
        </Field>
      </Row>
      <Field label="Pax Count" icon={<Users size={14} color="#94A3B8" />}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StepperBtn onClick={() => setField("pax_count", Math.max(1, (Number(quote.pax_count) || 1) - 1))}>−</StepperBtn>
          <input
            value={quote.pax_count || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") { setField("pax_count", 0); return; }
              const n = parseInt(v);
              if (!isNaN(n)) setField("pax_count", n);
            }}
            inputMode="numeric"
            style={{ ...inputStyle, textAlign: "center", width: 70, flex: "none" }}
          />
          <StepperBtn onClick={() => setField("pax_count", (Number(quote.pax_count) || 0) + 1)}>+</StepperBtn>
        </div>
      </Field>

      {/* ── Timing ── */}
      <SectionLabel>Schedule</SectionLabel>
      <Row>
        <Field label="Start (ETA)" icon={<Calendar size={14} color="#00674F" />}>
          <input
            type="datetime-local"
            value={quote.eta || ""}
            onChange={(e) => onEtaChange(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="End (ETD)" icon={<Clock size={14} color="#E11D48" />}>
          <input
            type="datetime-local"
            value={quote.etd || ""}
            min={quote.eta || undefined}
            onChange={(e) => onEtdChange(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </Row>
      <Row>
        <Field label="Pickup" icon={<MapPin size={14} color="#94A3B8" />}>
          <input
            value={quote.pickup_location || ""}
            onChange={(e) => setField("pickup_location", e.target.value)}
            placeholder="e.g. Cebu City"
            style={inputStyle}
          />
        </Field>
        <Field label="Drop-off" icon={<MapIcon size={14} color="#94A3B8" />}>
          <input
            value={quote.dropoff_location || ""}
            onChange={(e) => setField("dropoff_location", e.target.value)}
            placeholder="e.g. Moalboal"
            style={inputStyle}
          />
        </Field>
      </Row>

      {/* ── Fleet ── */}
      <SectionLabel>Fleet</SectionLabel>
      <AnimatePresence initial={false}>
        {fleet.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "#F8FAFC",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: font, fontSize: 10, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Vehicle {i + 1}
              </span>
              {fleet.length > 1 && (
                <button onClick={() => removeVehicle(v.id)} style={miniIconBtn} aria-label="Remove vehicle">
                  <Trash2 size={13} color="#E11D48" />
                </button>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <MobileSearchSelect
                value={v.model}
                onValueChange={(model) => selectModel(v.id, model)}
                options={dbVehicles}
                getLabel={(dv: any) => dv.model}
                getValue={(dv: any) => dv.model}
                renderOption={(dv: any) => (
                  <span>
                    {dv.model}
                    <span style={{ color: "#94A3B8", fontWeight: 500 }}> · {dv.pax_capacity} PAX · {dv.km_per_l || 10} KM/L</span>
                  </span>
                )}
                title="Select Vehicle"
                placeholder="Choose a vehicle"
                creatable
                icon={<Car size={14} color="#94A3B8" />}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <MiniField label="Rate" icon={<Banknote size={12} color="#94A3B8" />}>
                <input
                  value={v.daily_rate || ""}
                  onChange={(e) => patchVehicle(v.id, { daily_rate: parseFloat(e.target.value) || 0 })}
                  inputMode="decimal"
                  placeholder="0"
                  style={miniInputStyle}
                />
              </MiniField>
              <MiniField label="Fuel ₱" icon={<Fuel size={12} color="#94A3B8" />}>
                <input
                  value={v.fuel_price || ""}
                  onChange={(e) => patchVehicle(v.id, { fuel_price: parseFloat(e.target.value) || 0 })}
                  inputMode="decimal"
                  placeholder="0"
                  style={miniInputStyle}
                />
              </MiniField>
              <MiniField label="KM/L" icon={<Gauge size={12} color="#94A3B8" />}>
                <input
                  value={v.km_per_l || ""}
                  onChange={(e) => patchVehicle(v.id, { km_per_l: parseFloat(e.target.value) || 0 })}
                  inputMode="decimal"
                  placeholder="0"
                  style={miniInputStyle}
                />
              </MiniField>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button onClick={addVehicle} style={addBtnStyle}>
        <Plus size={15} strokeWidth={2.5} /> Add Vehicle
      </button>

      {/* ── Finance & Description ── */}
      <SectionLabel>Details</SectionLabel>
      <Field label="Admin Commission (%)" icon={<Percent size={14} color="#D97706" />}>
        <input
          value={commDraft ?? (quote.admin_commission || "")}
          onChange={(e) => {
            const v = e.target.value;
            setCommDraft(v);
            if (v === "") { onUpdateCommission(0); return; }
            const n = parseFloat(v);
            if (!isNaN(n)) onUpdateCommission(Math.min(100, Math.max(0, n)));
          }}
          onBlur={() => setCommDraft(null)}
          inputMode="decimal"
          placeholder="0"
          style={inputStyle}
        />
      </Field>
      <Field label="Quotation Description" icon={<FileText size={14} color="#94A3B8" />}>
        <MobileSearchSelect
          value={quote.quotation_description || ""}
          onValueChange={(v) => setField("quotation_description", v)}
          options={quoteTitlePresets}
          getLabel={(p: string) => p}
          getValue={(p: string) => p}
          title="Quotation Description"
          placeholder="Select or type description..."
          creatable
          clearable
        />
      </Field>
    </div>
  );
}

/* ── Layout helpers ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "18px 0 10px 2px" }}>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 10 }}>{children}</div>;
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12, flex: 1, minWidth: 0 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function MiniField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: font, fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function StepperBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 44, height: 44, borderRadius: 12, border: "1.5px solid rgba(0,0,0,0.08)",
        background: "#ffffff", fontSize: 20, fontWeight: 700, color: "#00674F", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 12px", borderRadius: 12, fontSize: 14,
  fontFamily: font, fontWeight: 500, border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff", color: "#0F172A", outline: "none", WebkitAppearance: "none",
};

const miniInputStyle: React.CSSProperties = {
  width: "100%", height: 40, padding: "0 8px", borderRadius: 10, fontSize: 13,
  fontFamily: font, fontWeight: 600, border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff", color: "#0F172A", outline: "none", WebkitAppearance: "none",
};

const miniIconBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: "none", background: "#FFF1F2",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const addBtnStyle: React.CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 12, border: "1.5px dashed rgba(0,103,79,0.3)",
  background: "#F0FDF4", color: "#00674F", fontFamily: font, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  WebkitTapHighlightColor: "transparent",
};
