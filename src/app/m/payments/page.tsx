"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, ChevronDown, ChevronUp,
  CreditCard, Receipt, AlertCircle, FileText,
} from "lucide-react";
import PullToRefresh from "../components/PullToRefresh";

const font = "'Inter', system-ui, sans-serif";

function formatDateStr(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MobilePaymentsPage() {
  const router = useRouter();
  const { profile, selectedOperatorId } = useAuth();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile || !selectedOperatorId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: quotesData, error } = await supabase
        .from("quotes")
        .select("*, creator:created_by(full_name), modifier:updated_by(full_name)")
        .eq("operator_id", selectedOperatorId)
        .order("eta", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error fetching quotes:", error);
        return;
      }
      setQuotes(quotesData || []);

      const quoteIds = (quotesData || []).map((q: any) => q.id);
      if (quoteIds.length > 0) {
        const [paymentsRes, disbursementsRes] = await Promise.all([
          supabase
            .from("payments")
            .select("*, creator:created_by(full_name), modifier:updated_by(full_name)")
            .in("quote_id", quoteIds)
            .order("actual_date", { ascending: false }),
          supabase
            .from("disbursements")
            .select("*, creator:created_by(full_name), modifier:updated_by(full_name)")
            .in("quote_id", quoteIds)
            .order("actual_date", { ascending: false }),
        ]);

        // Fallback to plain select if the join fails (mirrors desktop behavior)
        let finalPayments = paymentsRes.data || [];
        if (paymentsRes.error) {
          const { data: fallback } = await supabase
            .from("payments").select("*").in("quote_id", quoteIds)
            .order("actual_date", { ascending: false });
          if (fallback) finalPayments = fallback;
        }
        let finalDisbursements = disbursementsRes.data || [];
        if (disbursementsRes.error) {
          const { data: fallback } = await supabase
            .from("disbursements").select("*").in("quote_id", quoteIds)
            .order("actual_date", { ascending: false });
          if (fallback) finalDisbursements = fallback;
        }
        setPayments(finalPayments);
        setDisbursements(finalDisbursements);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedOperatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quotes with at least one transaction, filtered by search, sorted by recency
  const transactionQuotes = useMemo(() => {
    let result = quotes.filter(
      (q) =>
        payments.some((p) => p.quote_id === q.id) ||
        disbursements.some((d) => d.quote_id === q.id)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((q) => {
        const quotePayments = payments.filter((p) => p.quote_id === q.id);
        const quoteDisbursements = disbursements.filter((d) => d.quote_id === q.id);
        return (
          (q.customer_name || "").toLowerCase().includes(query) ||
          (q.fb_name || "").toLowerCase().includes(query) ||
          (q.vehicle_model || "").toLowerCase().includes(query) ||
          (q.notes || "").toLowerCase().includes(query) ||
          quotePayments.some(
            (p) =>
              (p.reference_number || "").toLowerCase().includes(query) ||
              (p.notes || "").toLowerCase().includes(query) ||
              (p.payment_method || "").toLowerCase().includes(query)
          ) ||
          quoteDisbursements.some(
            (d) =>
              (d.reference_number || "").toLowerCase().includes(query) ||
              (d.notes || "").toLowerCase().includes(query)
          )
        );
      });
    }

    return [...result].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [quotes, payments, disbursements, searchQuery]);

  // Overall stats
  const stats = useMemo(() => {
    const collected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const disbursed = disbursements.reduce((sum, d) => sum + (d.amount || 0), 0);
    const pending = transactionQuotes.reduce((sum, q) => {
      const agreed = q.grand_total || q.selected_package_total || 0;
      const paid = payments
        .filter((p) => p.quote_id === q.id)
        .reduce((s, p) => s + (p.amount || 0), 0);
      return sum + Math.max(agreed - paid, 0);
    }, 0);
    return { collected, pending, disbursed };
  }, [payments, disbursements, transactionQuotes]);

  const statCards = [
    { label: "Collected", value: stats.collected, color: "#059669", bg: "#ECFDF5" },
    { label: "Pending", value: stats.pending, color: "#E11D48", bg: "#FFF1F2" },
    { label: "Disbursed", value: stats.disbursed, color: "#D97706", bg: "#FFFBEB" },
  ];

  return (
    <PullToRefresh onRefresh={fetchData}>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: s.bg,
              borderRadius: 14,
              padding: "12px 10px",
              minWidth: 0,
            }}
          >
            <div style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              P{Math.round(s.value).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          placeholder="Search name, reference, notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            height: 44,
            paddingLeft: 40,
            paddingRight: searchQuery ? 40 : 16,
            borderRadius: 14,
            fontSize: 14,
            fontFamily: font,
            fontWeight: 500,
            border: "1.5px solid rgba(0,0,0,0.08)",
            background: "#ffffff",
            color: "#0F172A",
            outline: "none",
            WebkitAppearance: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#00674F")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.08)")}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "#F1F5F9", border: "none", borderRadius: "50%",
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} color="#64748B" />
          </button>
        )}
      </div>

      {/* Payment Group Cards */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" size={24} color="#00674F" />
        </div>
      ) : transactionQuotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", fontFamily: font }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#64748B", margin: 0 }}>
            {searchQuery ? "No matching transactions" : "No transactions yet"}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#94A3B8", margin: "4px 0 0" }}>
            {searchQuery ? "Try a different search" : "Payments will appear once recorded on quotes"}
          </p>
        </div>
      ) : (
        transactionQuotes.map((quote) => {
          const quotePayments = payments.filter((p) => p.quote_id === quote.id);
          const quoteDisbursements = disbursements.filter((d) => d.quote_id === quote.id);
          const totalAgreed = quote.grand_total || quote.selected_package_total || 0;
          const totalPaid = quotePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
          const totalDisbursed = quoteDisbursements.reduce((acc, d) => acc + (d.amount || 0), 0);
          const progress = totalAgreed > 0 ? Math.min((totalPaid / totalAgreed) * 100, 100) : 0;
          const balance = Math.max(Math.round((totalAgreed - totalPaid) * 100) / 100, 0);
          const isExpanded = expandedId === quote.id;

          return (
            <div
              key={quote.id}
              style={{
                background: "#ffffff",
                border: isExpanded ? "1.5px solid rgba(0,103,79,0.25)" : "1px solid rgba(0,0,0,0.06)",
                borderRadius: 16,
                marginBottom: 10,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                style={{ padding: "14px 16px", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {quote.customer_name || "Untitled"}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#94A3B8", marginTop: 2 }}>
                      {formatDateStr(quote.eta)}{quote.etd ? ` - ${formatDateStr(quote.etd)}` : ""}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
                </div>

                {/* Financial summary row */}
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Value</div>
                    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>P{totalAgreed.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em" }}>Collected</div>
                    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: "#059669" }}>P{totalPaid.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.06em" }}>Disbursed</div>
                    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: "#D97706" }}>P{totalDisbursed.toLocaleString()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#E11D48", textTransform: "uppercase", letterSpacing: "0.06em" }}>Balance</div>
                    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: balance <= 0.01 ? "#059669" : "#E11D48" }}>
                      {balance <= 0.01 ? "Settled" : `P${balance.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 9999, background: "#F1F5F9", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    style={{ height: "100%", borderRadius: 9999, background: "linear-gradient(90deg, #059669, #10B981)" }}
                  />
                </div>
              </div>

              {/* Expanded ledger */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: "#FAFBFC", padding: "14px 16px" }}>
                      {/* Payments */}
                      <SectionHeader icon={<CreditCard size={12} color="#059669" strokeWidth={2.5} />} iconBg="#ECFDF5" title="Payments" count={quotePayments.length} />
                      {quotePayments.length > 0 ? (
                        quotePayments.map((p) => (
                          <LedgerEntry key={p.id} amount={p.amount} color="#065F46" date={p.actual_date || p.created_at} reference={p.reference_number} notes={p.notes} creator={p.creator?.full_name} />
                        ))
                      ) : (
                        <EmptyLedger label="No customer payments recorded" />
                      )}

                      {/* Disbursements */}
                      <div style={{ marginTop: 16 }}>
                        <SectionHeader icon={<Receipt size={12} color="#D97706" strokeWidth={2.5} />} iconBg="#FFFBEB" title="Disbursements" count={quoteDisbursements.length} />
                        {quoteDisbursements.length > 0 ? (
                          quoteDisbursements.map((d) => (
                            <LedgerEntry key={d.id} amount={d.amount} color="#92400E" date={d.actual_date || d.created_at} reference={d.reference_number} notes={d.notes} creator={d.creator?.full_name} />
                          ))
                        ) : (
                          <EmptyLedger label="No disbursements recorded" />
                        )}
                      </div>

                      {/* Manage button */}
                      <button
                        onClick={() => router.push(`/m/builder?id=${quote.id}`)}
                        style={{
                          width: "100%",
                          marginTop: 14,
                          padding: "12px",
                          borderRadius: 12,
                          border: "none",
                          background: "#003829",
                          color: "#ffffff",
                          fontFamily: font,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <FileText size={14} /> Manage Quote
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}
    </PullToRefresh>
  );
}

function SectionHeader({ icon, iconBg, title, count }: { icon: React.ReactNode; iconBg: string; title: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <span style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
      </div>
      <span style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {count} {count === 1 ? "entry" : "entries"}
      </span>
    </div>
  );
}

function LedgerEntry({ amount, color, date, reference, notes, creator }: { amount: number; color: string; date: string; reference?: string; notes?: string; creator?: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.05)",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color, letterSpacing: "-0.01em" }}>
          P{(amount || 0).toLocaleString()}
        </span>
        <span style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: "#94A3B8" }}>
          {formatDateStr(date)}
        </span>
      </div>
      {(reference || notes) && (
        <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 500, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {reference && <span style={{ fontWeight: 700, color: "#6366F1" }}>#{reference}</span>}
          {reference && notes && " · "}
          {notes}
        </div>
      )}
      {creator && (
        <div style={{ fontFamily: font, fontSize: 9, fontWeight: 600, color: "#CBD5E1", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          by {creator}
        </div>
      )}
    </div>
  );
}

function EmptyLedger({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "16px",
        background: "rgba(241,245,249,0.5)",
        borderRadius: 12,
        border: "1px dashed #E2E8F0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <AlertCircle size={14} color="#CBD5E1" />
      <span style={{ fontFamily: font, fontSize: 9.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}
