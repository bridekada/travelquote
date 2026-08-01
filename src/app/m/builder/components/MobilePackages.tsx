"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Sparkles, Trash2, Plus, Settings, Car, Fuel, Users, Receipt, X,
} from "lucide-react";
import { QuoteData, ExtraFee } from "@/app/builder/components/types";

const font = "'Inter', system-ui, sans-serif";

interface MobilePackagesProps {
  quote: QuoteData;
  livePackages: any[];
  packagesComputed: { id: string; name: string; total: number; commissionAmount: number; is_recommended?: boolean; config: any }[];
  dbMiscPresets: any[];
  colTotals?: { rate: number; fuel: number; accom: number; misc: Record<string, number> };
  selectedPackageId: string | null;
  extraFees: ExtraFee[];
  grandTotal: number;
  readOnly?: boolean;
  onSelectPackage: (name: string, id: string) => void;
  onUpdatePackage: (idx: number, updates: any) => void;
  onToggleMisc: (pkgIdx: number, miscId: string) => void;
  onAddPackage: () => void;
  onRemovePackage: (idx: number) => void;
  onAddFee: (name: string, amount: number) => void;
  onRemoveFee: (id: string) => void;
  onUpdateNotes: (v: string) => void;
}

export default function MobilePackages({
  quote, livePackages, packagesComputed, dbMiscPresets, colTotals, selectedPackageId,
  extraFees, grandTotal, readOnly, onSelectPackage, onUpdatePackage, onToggleMisc,
  onAddPackage, onRemovePackage, onAddFee, onRemoveFee, onUpdateNotes,
}: MobilePackagesProps) {
  const [configIdx, setConfigIdx] = useState<number | null>(null);
  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const pax = quote.pax_count || 1;

  const computedFor = (id: string) => packagesComputed.find((p) => p.id === id);

  const submitFee = () => {
    if (!feeName.trim()) return;
    onAddFee(feeName.trim(), parseFloat(feeAmount) || 0);
    setFeeName("");
    setFeeAmount("");
  };

  return (
    <div style={readOnly ? { pointerEvents: "none", opacity: 0.75 } : undefined}>
      {/* ── Package cards ── */}
      <SectionLabel>Proposed Packages</SectionLabel>
      {livePackages.map((pkg, i) => {
        const computed = computedFor(pkg.id);
        const total = computed?.total || 0;
        const commission = computed?.commissionAmount || 0;
        const selected = selectedPackageId === pkg.id;
        const isConfig = configIdx === i;
        // Presets store their label in `title`; custom packages use `name`. Resolve both.
        const pkgName = pkg.name || pkg.title || "";

        return (
          <div
            key={pkg.id}
            style={{
              background: "#ffffff",
              border: selected ? "1.5px solid #003829" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              marginBottom: 10,
              overflow: "hidden",
              boxShadow: selected ? "0 4px 14px rgba(0,56,41,0.12)" : "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              onClick={() => onSelectPackage(pkgName || `Package ${i + 1}`, pkg.id)}
              style={{ padding: "14px", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                  border: selected ? "none" : "1.5px solid #CBD5E1",
                  background: selected ? "#00674F" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <input
                      value={pkgName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdatePackage(i, { name: e.target.value })}
                      placeholder={`Package ${i + 1}`}
                      style={{
                        flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none",
                        fontFamily: font, fontSize: 14.5, fontWeight: 700, color: "#0F172A", padding: 0,
                      }}
                    />
                    {pkg.is_recommended && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#FFFBEB", color: "#D97706", fontFamily: font, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 9999, flexShrink: 0 }}>
                        <Sparkles size={9} /> REC
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
                    ₱{Math.round(total).toLocaleString()}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>
                    ₱{Math.round(total / pax).toLocaleString()}/pax
                    {commission > 0 && <span style={{ color: "#6366F1" }}> · incl. ₱{Math.round(commission).toLocaleString()} comm</span>}
                  </div>
                </div>
              </div>

              {/* Card actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setConfigIdx(isConfig ? null : i)} style={cfgBtn(isConfig)}>
                  <Settings size={12} /> {isConfig ? "Done" : "Configure"}
                </button>
                {livePackages.length > 1 && (
                  <button onClick={() => onRemovePackage(i)} style={{ ...cfgBtn(false), marginLeft: "auto", borderColor: "rgba(225,29,72,0.2)", background: "#FFF1F2", color: "#E11D48" }} aria-label="Remove package">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Config panel */}
            <AnimatePresence initial={false}>
              {isConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ fontFamily: font, fontSize: 10, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "12px 0 8px" }}>
                      What&apos;s included
                    </div>
                    <IncToggle label="Vehicle Rate" icon={<Car size={13} />} amount={colTotals?.rate} on={!!pkg.includes_vehicle} onToggle={() => onUpdatePackage(i, { includes_vehicle: !pkg.includes_vehicle })} />
                    <IncToggle label="Fuel Cost" icon={<Fuel size={13} />} amount={colTotals?.fuel} on={!!pkg.includes_fuel} onToggle={() => onUpdatePackage(i, { includes_fuel: !pkg.includes_fuel })} />
                    <IncToggle label="Guest Accommodation" icon={<Users size={13} />} amount={colTotals?.accom} on={!!pkg.includes_accommodation} onToggle={() => onUpdatePackage(i, { includes_accommodation: !pkg.includes_accommodation })} />
                    {dbMiscPresets.map((m) => (
                      <IncToggle
                        key={m.id}
                        label={m.name}
                        icon={<Receipt size={13} />}
                        amount={colTotals?.misc?.[m.id]}
                        on={(pkg.includes_misc_ids || []).includes(m.id)}
                        onToggle={() => onToggleMisc(i, m.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <button onClick={onAddPackage} style={addBtnStyle}>
        <Plus size={15} strokeWidth={2.5} /> Add Alternative Package
      </button>

      {/* ── Adjustments ── */}
      <SectionLabel>Adjustments</SectionLabel>
      <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: extraFees.length ? 12 : 0 }}>
          <input
            value={feeName}
            onChange={(e) => setFeeName(e.target.value)}
            placeholder="Fee / discount name"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            inputMode="decimal"
            placeholder="±₱"
            style={{ ...inputStyle, width: 90, flex: "none" }}
          />
          <button onClick={submitFee} style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: "#003829", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }} aria-label="Add adjustment">
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ fontFamily: font, fontSize: 10, fontWeight: 500, color: "#94A3B8" }}>
          Use a negative amount (e.g. -500) for a discount.
        </div>

        {extraFees.map((fee) => (
          <div key={fee.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 10px", background: "#ffffff", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}>
            <Receipt size={13} color={fee.amount < 0 ? "#E11D48" : "#64748B"} />
            <span style={{ flex: 1, fontFamily: font, fontSize: 12.5, fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fee.name}</span>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: fee.amount < 0 ? "#E11D48" : "#0F172A" }}>
              {fee.amount < 0 ? "−" : "+"}₱{Math.abs(fee.amount).toLocaleString()}
            </span>
            <button onClick={() => onRemoveFee(fee.id)} style={{ width: 24, height: 24, borderRadius: 7, border: "none", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }} aria-label="Remove">
              <X size={12} color="#64748B" />
            </button>
          </div>
        ))}
      </div>

      {/* ── Internal notes ── */}
      <SectionLabel>Internal Notes</SectionLabel>
      <textarea
        value={quote.notes || ""}
        onChange={(e) => onUpdateNotes(e.target.value)}
        placeholder="Internal notes — will NOT appear on the quotation."
        rows={3}
        style={{ ...inputStyle, height: "auto", paddingTop: 10, resize: "vertical", lineHeight: 1.4 }}
      />

      {/* ── Grand total ── */}
      <div style={{ marginTop: 16, padding: "16px", background: "#003829", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: "#4ADE80", textTransform: "uppercase", letterSpacing: "0.08em" }}>Grand Total</div>
          <div style={{ fontFamily: font, fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
            {selectedPackageId ? "Selected package + adjustments" : "Select a package above"}
          </div>
        </div>
        <div style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
          ₱{Math.round(grandTotal).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "18px 0 10px 2px" }}>{children}</div>;
}

function IncToggle({ label, icon, on, amount, onToggle }: { label: string; icon: React.ReactNode; on: boolean; amount?: number; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", marginBottom: 6,
        borderRadius: 10, border: on ? "1.5px solid rgba(0,103,79,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
        background: on ? "#F0FDF4" : "#ffffff", cursor: "pointer", WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
        border: on ? "none" : "1.5px solid #CBD5E1", background: on ? "#00674F" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {on && <Check size={12} color="#fff" strokeWidth={3} />}
      </span>
      <span style={{ color: on ? "#00674F" : "#94A3B8", display: "flex", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontFamily: font, fontSize: 12.5, fontWeight: 600, color: on ? "#003829" : "#64748B", lineHeight: 1.3, overflowWrap: "anywhere" }}>{label}</span>
      {typeof amount === "number" && amount > 0 && (
        <span style={{ flexShrink: 0, fontFamily: font, fontSize: 12, fontWeight: 800, color: on ? "#00674F" : "#94A3B8" }}>
          ₱{Math.round(amount).toLocaleString()}
        </span>
      )}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 12px", borderRadius: 10, fontSize: 14,
  fontFamily: font, fontWeight: 500, border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff", color: "#0F172A", outline: "none", WebkitAppearance: "none",
};

const addBtnStyle: React.CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 12, border: "1.5px dashed rgba(0,103,79,0.3)",
  background: "#F0FDF4", color: "#00674F", fontFamily: font, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  WebkitTapHighlightColor: "transparent",
};

function cfgBtn(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9,
    border: active ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.1)",
    background: active ? "#003829" : "#ffffff", color: active ? "#ffffff" : "#64748B",
    fontFamily: font, fontSize: 11, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent",
  };
}
