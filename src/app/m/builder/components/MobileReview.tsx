"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import {
  Copy, Check, RotateCcw, Loader2, FileText, Save, ShieldCheck,
  Plus, Trash2, CreditCard, Receipt, Settings, X, Clock, CheckCircle2,
} from "lucide-react";
import { QuoteData } from "@/app/builder/components/types";
import ConfirmSheet from "../../components/ConfirmSheet";

const font = "'Inter', system-ui, sans-serif";
const CONFIRMED = ["Confirmed", "Payment Started", "Payment Complete"];

interface MobileReviewProps {
  quote: QuoteData;
  role?: string;
  totals: any;
  dbMiscPresets?: any[];
  payments: any[];
  disbursements: any[];
  extraFees: any[];
  discount: number;
  selectedPackageId: string | null;
  includeItinerary: boolean;
  setIncludeItinerary: (v: boolean) => void;
  isSaving: boolean;
  isReconfiguring: boolean;
  readOnly?: boolean;
  compileText: () => string;
  onPolish: (text: string) => Promise<string>;
  onSaveDraft: (text: string) => void;
  onConfirm: (text: string) => void;
  onReconfigure: () => void;
  onAddPayment: (data: any, editing: any | null) => Promise<void>;
  onVoidPayment: (id: string) => void;
  onAddDisbursement: (data: any, editing: any | null) => Promise<void>;
  onVoidDisbursement: (id: string) => void;
}

export default function MobileReview(props: MobileReviewProps) {
  const { quote, isReconfiguring } = props;
  const isConfirmed = CONFIRMED.includes(quote.status || "") && !!quote.id;
  if (isConfirmed && !isReconfiguring) return <CommandCenter {...props} />;
  return <ReviewEditor {...props} />;
}

/* ────────────────────────── Review Editor ────────────────────────── */

function ReviewEditor({
  quote, role, totals, includeItinerary, setIncludeItinerary, selectedPackageId,
  isSaving, readOnly, compileText, onSaveDraft, onConfirm,
}: MobileReviewProps) {
  const [text, setText] = useState(() => compileText());
  const [original] = useState(text);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { alert("Copy failed"); }
  };
  const confirmDisabled = !selectedPackageId || !quote.customer_name?.trim();
  const commissionPct = quote.admin_commission || 0;
  const commissionAmount = totals.packages?.find((p: any) => p.id === selectedPackageId)?.commissionAmount || 0;

  return (
    <div>
      {/* Include itinerary toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#F8FAFC", borderRadius: 12, marginBottom: 12, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
        <input type="checkbox" checked={includeItinerary} onChange={(e) => setIncludeItinerary(e.target.checked)} style={{ width: 17, height: 17, accentColor: "#00674F" }} />
        <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Include itinerary in quotation text</span>
      </label>

      {/* Editor */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={readOnly}
        rows={16}
        style={{
          width: "100%", padding: 12, borderRadius: 14, fontSize: 12.5, lineHeight: 1.5,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 500,
          border: "1.5px solid rgba(0,0,0,0.08)", background: "#ffffff", color: "#0F172A",
          outline: "none", resize: "vertical", WebkitAppearance: "none",
        }}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={() => setText(compileText())} style={actionBtn}>
          <RotateCcw size={14} /> Regenerate
        </button>
        <button onClick={copy} style={actionBtn}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
        {role === "super_admin" && text !== original && (
          <button onClick={() => setText(original)} style={actionBtn}>
            <RotateCcw size={14} /> Revert
          </button>
        )}
      </div>

      {/* Grand total */}
      <div style={{ marginTop: 14, padding: "14px 16px", background: "#F0FDF4", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#00674F", textTransform: "uppercase", letterSpacing: "0.06em" }}>Grand Total</span>
          <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: "#003829" }}>₱{Math.round(totals.grandTotal).toLocaleString()}</span>
        </div>
        {commissionPct > 0 && commissionAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,103,79,0.12)" }}>
            <span style={{ fontFamily: font, fontSize: 10.5, fontWeight: 600, color: "#6366F1" }}>Incl. Admin Commission ({commissionPct}%)</span>
            <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 800, color: "#6366F1" }}>₱{Math.round(commissionAmount).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Save / Confirm — hidden for view-only (dead) quotes */}
      {!readOnly && (
        <>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => onSaveDraft(text)} disabled={isSaving} style={{ ...saveBtn, background: "#ffffff", color: "#003829", border: "1.5px solid rgba(0,56,41,0.2)" }}>
              {isSaving ? <Loader2 className="animate-spin" size={15} /> : <><Save size={15} /> Save Draft</>}
            </button>
            <button
              onClick={() => onConfirm(text)}
              disabled={isSaving || confirmDisabled}
              title={confirmDisabled ? "Select a package first" : undefined}
              style={{ ...saveBtn, opacity: isSaving || confirmDisabled ? 0.5 : 1 }}
            >
              <ShieldCheck size={15} /> Confirm
            </button>
          </div>
          {confirmDisabled && (
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#94A3B8", textAlign: "center", margin: "8px 0 0" }}>
              {!quote.customer_name?.trim() ? "Add a customer name (Step 1) to confirm." : "Select a package in Step 3 to confirm."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ────────────────────────── Command Center ────────────────────────── */

function CommandCenter({
  quote, totals, dbMiscPresets = [], payments, disbursements, onReconfigure,
  onAddPayment, onVoidPayment, onAddDisbursement, onVoidDisbursement,
}: MobileReviewProps) {
  const [payOpen, setPayOpen] = useState(false);
  const [disbOpen, setDisbOpen] = useState(false);
  const [editingPay, setEditingPay] = useState<any | null>(null);
  const [editingDisb, setEditingDisb] = useState<any | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [voidTarget, setVoidTarget] = useState<{ kind: "payment" | "disbursement"; id: string } | null>(null);
  const [voiding, setVoiding] = useState(false);

  const details = quote.selected_package_details || {};
  const totalAgreed = details.total_amount || quote.grand_total || 0;
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDisbursed = disbursements.reduce((s, d) => s + (d.amount || 0), 0);
  const balance = Math.max(Math.round((totalAgreed - totalPaid) * 100) / 100, 0);
  const progress = totalAgreed > 0 ? Math.min((totalPaid / totalAgreed) * 100, 100) : 0;
  const fullyPaid = balance <= 0.01 && totalAgreed > 0;

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

  // ── Trip Report generation (mirrors desktop AdminReportModal) ──
  const buildReport = () => {
    const items = quote.items || [];
    const fmtLong = (d?: string) => (d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");
    const fmtTime = (d?: string) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBA");
    const tourDate = items.length > 0 ? `${fmtLong(items[0].date)} - ${fmtLong(items[items.length - 1].date)}` : "N/A";

    // Expenses — only those included in the selected package AND with a value > 0
    const inclu: any = details.inclusions || {};
    const c = totals.colTotals || { rate: 0, fuel: 0, accom: 0, misc: {} };
    const expLines: string[] = [];
    const pushExp = (label: string, amount: number, included: boolean) => {
      if (included && amount > 0) expLines.push(`${label}: ₱${Math.round(amount).toLocaleString()}`);
    };
    pushExp("Fleet Rate", c.rate || 0, !!inclu.vehicle);
    pushExp("Fuel", c.fuel || 0, !!inclu.fuel);
    pushExp("Guest Accom", c.accom || 0, !!inclu.accommodation);
    dbMiscPresets.forEach((p: any) => {
      const pName = (p.name || "").toLowerCase().trim();
      if (["fleet rate", "fuel", "guest accom"].includes(pName)) return; // avoid duplicating primary categories
      const amount = c.misc?.[p.id] || 0;
      const inPkg = (inclu.misc_details || []).some((md: any) => (md.name || "").toLowerCase().trim() === pName);
      pushExp(p.name, amount, inPkg);
    });

    // Itinerary — per-day line with vehicle + accommodation, plus optional details block
    const itinLines = items.map((item: any) => {
      const ids = item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0 ? item.selected_vehicle_ids : (quote.fleet || []).map((v: any) => v.id);
      const vNames = (quote.fleet || []).filter((v: any) => ids.includes(v.id)).map((v: any) => v.model).join(", ");
      const detailsStr = item.itinerary_details ? `\nDetails:\n*****\n${item.itinerary_details}\n*****` : "";
      return `Day ${item.day_number}: ${item.destination} (Car: ${vNames || "n/a"}) (Accoms: ${item.guest_accommodation_name || "n/a"})${detailsStr}`;
    }).join("\n\n");

    return [
      "Travel Details",
      `Tour Date: ${tourDate}`,
      `Pick Up Time (ETA): ${fmtTime(quote.eta)}`,
      `Drop-off Time (ETD): ${fmtTime(quote.etd)}`,
      `Pick Up Location: ${quote.pickup_location || "TBA"}`,
      `Contact Person: ${quote.customer_name || ""}`,
      `Contact Number: ${quote.contact_number || "N/A"}`,
      "__________",
      "Expenses",
      expLines.join("\n"),
      `LESS RESERVATION: ₱${Math.round(totalPaid).toLocaleString()}`,
      "__________",
      "Itinerary (Include Accomodation if applicable)",
      itinLines,
    ].join("\n\n");
  };

  const copyReport = async () => {
    try { await navigator.clipboard.writeText(buildReport()); setReportCopied(true); setTimeout(() => setReportCopied(false), 2000); } catch { alert("Copy failed"); }
  };

  // ── Financial breakdown (base rate / commission / fees / discount / final) ──
  const commissionPct = quote.admin_commission || 0;
  const discountAmount = quote.discount_total || details.adjustments?.discount || 0;
  const feeList: any[] = quote.extra_fees_json || details.adjustments?.extra_fees || [];
  const extraFeesTotal = feeList.reduce((s, f) => s + (f.amount || 0), 0);
  const commissionBase = quote.selected_package_total || (totalAgreed - extraFeesTotal + discountAmount);
  const commissionAmount = Math.round((commissionBase * commissionPct) / (100 + commissionPct));
  const baseRate = commissionBase - commissionAmount;

  // ── Verified inclusions / exclusions ──
  const inc: any = details.inclusions || {};
  const fleetNames = (quote.fleet || []).map((v: any) => v.model).filter(Boolean);
  const accomNames = Array.from(new Set((quote.items || []).map((i) => i.guest_accommodation_name).filter(Boolean)));
  const incs: string[] = [];
  const excs: string[] = [];
  if (inc.vehicle) incs.push(fleetNames.length ? `Vehicle: ${fleetNames.join(", ")}` : `Vehicle: ${quote.vehicle_model || "Standard Unit"}`);
  else excs.push("Vehicle Rental");
  if (inc.fuel && totals.colTotals.fuel > 0) incs.push("Fuel Consumption"); else excs.push("Fuel Consumption");
  if (inc.accommodation && totals.colTotals.accom > 0) incs.push(accomNames.length ? `Guest Accommodation (${accomNames.join(", ")})` : "Guest Accommodation");
  else excs.push("Guest Accommodation");
  (inc.misc_details || []).forEach((m: any) => { if (m?.name) incs.push(m.name); });
  excs.push("Guest meals", "Entrance fees", "Activity fees");

  // ── Snapshotted itinerary (frozen at confirmation, falls back to live items) ──
  const snapshot: any[] = (details.itinerary_snapshot && details.itinerary_snapshot.length)
    ? details.itinerary_snapshot
    : (quote.items || []).map((i) => {
        const ids = i.selected_vehicle_ids && i.selected_vehicle_ids.length > 0 ? i.selected_vehicle_ids : (quote.fleet || []).map((v) => v.id);
        const vehicles = (quote.fleet || []).filter((v) => ids.includes(v.id)).map((v) => v.model).join(", ");
        return { day: i.day_number, date: i.date, destination: i.destination, details: i.itinerary_details, vehicles, guest_accommodation_name: i.guest_accommodation_name, tags: i.tags };
      });

  return (
    <div>
      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 9999, background: fullyPaid ? "#DCFCE7" : "#FEF3C7", color: fullyPaid ? "#166534" : "#D97706", fontFamily: font, fontSize: 11, fontWeight: 700 }}>
          {fullyPaid ? <ShieldCheck size={13} /> : <Clock size={13} />} {fullyPaid ? "Fully Paid" : "Payment Collection"}
        </span>
        <span style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>
          Confirmed {quote.confirmed_at ? fmtDate(quote.confirmed_at) : ""}
        </span>
      </div>

      {/* Agreement summary */}
      <div style={{ background: "#003829", borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{details.package_name || "Package"}</div>
        <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 2 }}>{quote.customer_name}</div>
        <div style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginTop: 8 }}>₱{Math.round(totalAgreed).toLocaleString()}</div>
        <div style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#4ADE80" }}>₱{Math.round(totalAgreed / (quote.pax_count || 1)).toLocaleString()}/pax · {quote.pax_count} pax</div>
      </div>

      {/* Financial KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <KPI label="Collected" value={totalPaid} color="#059669" bg="#ECFDF5" />
        <KPI label="Outstanding" value={balance} color="#E11D48" bg="#FFF1F2" settled={fullyPaid} />
        <KPI label="Disbursed" value={totalDisbursed} color="#D97706" bg="#FFFBEB" />
      </div>
      <div style={{ height: 6, borderRadius: 9999, background: "#F1F5F9", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${progress}%`, borderRadius: 9999, background: "linear-gradient(90deg, #059669, #10B981)", transition: "width 0.4s" }} />
      </div>

      {/* ── Financial breakdown ── */}
      <RecordSection title="Price Breakdown">
        <BreakdownRow label="Base Package Rate" value={`₱${Math.round(baseRate).toLocaleString()}`} />
        {commissionPct > 0 && <BreakdownRow label={`Admin Commission (${commissionPct}%)`} value={`₱${Math.round(commissionAmount).toLocaleString()}`} color="#6366F1" />}
        {feeList.map((f, i) => (
          <BreakdownRow key={i} label={f.name || "Fee"} value={`${f.amount < 0 ? "−" : "+"}₱${Math.abs(f.amount || 0).toLocaleString()}`} color={f.amount < 0 ? "#E11D48" : "#334155"} />
        ))}
        {discountAmount > 0 && <BreakdownRow label="Client Discount" value={`−₱${Math.round(discountAmount).toLocaleString()}`} color="#E11D48" />}
        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "8px 0" }} />
        <BreakdownRow label="Final Agreed Amount" value={`₱${Math.round(totalAgreed).toLocaleString()}`} bold />
      </RecordSection>

      {/* ── Inclusions / Exclusions ── */}
      <RecordSection title="Inclusions & Exclusions">
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ChipHead color="#059669">Included</ChipHead>
            {incs.map((t, i) => <IncExcRow key={i} text={t} included />)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ChipHead color="#E11D48">Excluded</ChipHead>
            {excs.map((t, i) => <IncExcRow key={i} text={t} />)}
          </div>
        </div>
      </RecordSection>

      {/* ── Itinerary snapshot ── */}
      {snapshot.length > 0 && (
        <RecordSection title="Itinerary (as confirmed)">
          {snapshot.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < snapshot.length - 1 ? 12 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#F0FDF4", color: "#00674F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 11, fontWeight: 800 }}>{s.day}</div>
                {i < snapshot.length - 1 && <div style={{ width: 1.5, flex: 1, background: "rgba(0,0,0,0.08)", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>{s.date ? new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""}</div>
                <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{s.destination || "TBA"}</div>
                {s.details && <div style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#64748B", marginTop: 1, whiteSpace: "pre-wrap" }}>{s.details}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {s.vehicles && <MetaChip>{s.vehicles}</MetaChip>}
                  {s.guest_accommodation_name && <MetaChip>{s.guest_accommodation_name}</MetaChip>}
                  {(s.tags || []).map((t: string, ti: number) => <MetaChip key={ti}>{t}</MetaChip>)}
                </div>
              </div>
            </div>
          ))}
        </RecordSection>
      )}

      {/* Payments ledger */}
      <LedgerSection
        title="Payments" icon={<CreditCard size={13} color="#059669" />} iconBg="#ECFDF5"
        rows={payments} color="#065F46"
        onAdd={fullyPaid ? undefined : () => { setEditingPay(null); setPayOpen(true); }}
        onEdit={(p) => { setEditingPay(p); setPayOpen(true); }}
        onVoid={(id) => setVoidTarget({ kind: "payment", id })}
      />
      <div style={{ height: 12 }} />
      <LedgerSection
        title="Disbursements" icon={<Receipt size={13} color="#D97706" />} iconBg="#FFFBEB"
        rows={disbursements} color="#92400E"
        onAdd={() => { setEditingDisb(null); setDisbOpen(true); }}
        onEdit={(d) => { setEditingDisb(d); setDisbOpen(true); }}
        onVoid={(id) => setVoidTarget({ kind: "disbursement", id })}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => setReportOpen(true)} style={{ ...actionBtn, flex: 1 }}>
          <FileText size={14} /> Trip Report
        </button>
        <button onClick={onReconfigure} style={{ ...actionBtn, flex: 1 }}>
          <Settings size={14} /> Reconfigure
        </button>
      </div>

      {/* Trip Report viewer */}
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} text={reportOpen ? buildReport() : ""} copied={reportCopied} onCopy={copyReport} />

      {/* Sheets */}
      <LedgerSheet open={payOpen} title={editingPay ? "Edit Payment" : "Record Payment"} editing={editingPay} onClose={() => setPayOpen(false)} onSubmit={async (d) => { await onAddPayment(d, editingPay); setPayOpen(false); }} />
      <LedgerSheet open={disbOpen} title={editingDisb ? "Edit Disbursement" : "Record Disbursement"} editing={editingDisb} onClose={() => setDisbOpen(false)} onSubmit={async (d) => { await onAddDisbursement(d, editingDisb); setDisbOpen(false); }} />

      <ConfirmSheet
        open={!!voidTarget}
        title={`Void this ${voidTarget?.kind ?? "transaction"}?`}
        message="This permanently removes the record and updates the billing ledger. This cannot be undone."
        confirmLabel="Void"
        destructive
        loading={voiding}
        onConfirm={async () => {
          if (!voidTarget) return;
          setVoiding(true);
          try {
            if (voidTarget.kind === "payment") await onVoidPayment(voidTarget.id);
            else await onVoidDisbursement(voidTarget.id);
            setVoidTarget(null);
          } finally {
            setVoiding(false);
          }
        }}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
}

function RecordSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "13px 14px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      <div style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function BreakdownRow({ label, value, color = "#334155", bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: bold ? 0 : 6 }}>
      <span style={{ fontFamily: font, fontSize: bold ? 13 : 12, fontWeight: bold ? 800 : 600, color: bold ? "#0F172A" : "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontFamily: font, fontSize: bold ? 15 : 12.5, fontWeight: bold ? 800 : 700, color: bold ? "#0F172A" : color, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ChipHead({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ fontFamily: font, fontSize: 9.5, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{children}</div>;
}

function IncExcRow({ text, included }: { text: string; included?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 4 }}>
      <span style={{ color: included ? "#059669" : "#CBD5E1", fontSize: 11, fontWeight: 900, lineHeight: 1.4, flexShrink: 0 }}>{included ? "✓" : "✕"}</span>
      <span style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: included ? "#334155" : "#94A3B8", lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: font, fontSize: 9.5, fontWeight: 600, color: "#475569", background: "#F1F5F9", padding: "2px 7px", borderRadius: 9999, whiteSpace: "nowrap" }}>{children}</span>;
}

function KPI({ label, value, color, bg, settled }: { label: string; value: number; color: string; bg: string; settled?: boolean }) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: 12, padding: "10px 11px", minWidth: 0 }}>
      <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {settled ? "Settled" : `₱${Math.round(value).toLocaleString()}`}
      </div>
    </div>
  );
}

function LedgerSection({ title, icon, iconBg, rows, color, onAdd, onEdit, onVoid }: {
  title: string; icon: React.ReactNode; iconBg: string; rows: any[]; color: string;
  onAdd?: () => void; onEdit: (r: any) => void; onVoid: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
          <span style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
        </div>
        {onAdd && (
          <button onClick={onAdd} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 9, border: "none", background: "#003829", color: "#fff", fontFamily: font, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={12} /> Record
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "14px", background: "rgba(241,245,249,0.5)", border: "1px dashed #E2E8F0", borderRadius: 12, textAlign: "center", fontFamily: font, fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>
          None recorded
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#fff", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color }}>₱{(r.amount || 0).toLocaleString()}</div>
              <div style={{ fontFamily: font, fontSize: 10, fontWeight: 500, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {new Date(r.actual_date || r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {r.reference_number ? ` · #${r.reference_number}` : ""}{r.notes ? ` · ${r.notes}` : ""}
              </div>
              {(r.creator?.full_name || r.modifier?.full_name) && (
                <div style={{ fontFamily: font, fontSize: 9, fontWeight: 600, color: "#CBD5E1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {r.creator?.full_name ? `by ${r.creator.full_name}` : ""}{r.modifier?.full_name && r.modifier.full_name !== r.creator?.full_name ? ` · upd ${r.modifier.full_name}` : ""}
                </div>
              )}
            </div>
            <button onClick={() => onEdit(r)} style={miniBtn} aria-label="Edit"><Settings size={13} color="#64748B" /></button>
            <button onClick={() => onVoid(r.id)} style={{ ...miniBtn, background: "#FFF1F2" }} aria-label="Void"><Trash2 size={13} color="#E11D48" /></button>
          </div>
        ))
      )}
    </div>
  );
}

function ReportSheet({ open, onClose, text, copied, onCopy }: { open: boolean; onClose: () => void; text: string; copied: boolean; onCopy: () => void }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1099 }} />
        <Drawer.Content style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1100, outline: "none", maxHeight: "90dvh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
          </div>
          <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: font }}>Trip Report</h3>
              <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 500, color: "#94A3B8", fontFamily: font }}>Internal operational summary</p>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Close"><X size={14} color="#64748B" /></button>
          </div>
          <div style={{ padding: "12px 20px", overflowY: "auto", flex: 1, minHeight: 0 }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.6, color: "#334155", background: "#F8FAFC", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: 14 }}>{text}</pre>
          </div>
          <div style={{ padding: "10px 20px", paddingBottom: "calc(20px + var(--mobile-safe-bottom, 0px))", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button onClick={onCopy} style={{ ...saveBtn, width: "100%", opacity: copied ? 0.85 : 1 }}>
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy Report</>}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function LedgerSheet({ open, title, editing, onClose, onSubmit }: { open: boolean; title: string; editing: any | null; onClose: () => void; onSubmit: (data: any) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await onSubmit({ amount: fd.get("amount"), reference: fd.get("reference"), notes: fd.get("notes"), actual_date: fd.get("actual_date"), method: "Cash" });
    setSaving(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1099 }} />
        <Drawer.Content style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1100, outline: "none", maxHeight: "88dvh" }}>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
          </div>
          <div style={{ padding: "10px 20px 28px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: font }}>{title}</h3>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Close"><X size={14} color="#64748B" /></button>
            </div>
            <form onSubmit={submit}>
              <SheetField label="Date"><input name="actual_date" type="date" defaultValue={editing?.actual_date?.slice(0, 10) || today} required style={sheetInput} /></SheetField>
              <SheetField label="Amount (₱)"><input name="amount" type="number" step="0.01" inputMode="decimal" defaultValue={editing?.amount || ""} required style={sheetInput} /></SheetField>
              <SheetField label="Reference # (optional)"><input name="reference" defaultValue={editing?.reference_number || ""} style={sheetInput} /></SheetField>
              <SheetField label="Notes"><textarea name="notes" defaultValue={editing?.notes || ""} rows={2} style={{ ...sheetInput, height: "auto", paddingTop: 10, resize: "vertical" }} /></SheetField>
              <button type="submit" disabled={saving} style={{ ...saveBtn, width: "100%", marginTop: 4, opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 className="animate-spin" size={15} /> : <><CheckCircle2 size={15} /> Save</>}
              </button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 11,
  border: "1.5px solid rgba(0,0,0,0.08)", background: "#ffffff", color: "#475569",
  fontFamily: font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent",
};

const saveBtn: React.CSSProperties = {
  flex: 1, padding: "14px", borderRadius: 12, border: "none", background: "#003829", color: "#ffffff",
  fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent",
};

const miniBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "none", background: "#F1F5F9",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
  WebkitTapHighlightColor: "transparent",
};

const sheetInput: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 12px", borderRadius: 12, fontSize: 14,
  fontFamily: font, fontWeight: 500, border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff", color: "#0F172A", outline: "none", WebkitAppearance: "none",
};
