"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, ChevronDown, ChevronUp,
  CreditCard, Receipt, AlertCircle, FileText,
  Calendar, Users, Check,
} from "lucide-react";
import { Drawer } from "vaul";
import PullToRefresh from "../components/PullToRefresh";
import { fetchOperatorTransactions } from "@/lib/transactions";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters (mirror desktop PaymentTrackerView + mobile dashboard pattern)
  const [dateFilter, setDateFilter] = useState("All Time");
  const [agentFilter, setAgentFilter] = useState("All");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile || !selectedOperatorId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const { data: quotesData, error } = await supabase
        .from("quotes")
        .select("*, creator:created_by(full_name), modifier:updated_by(full_name)")
        .eq("operator_id", selectedOperatorId)
        .order("eta", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error fetching quotes:", error);
        setLoadError(error.message || "Could not load quotes.");
        return;
      }
      setQuotes(quotesData || []);

      const quoteIds = (quotesData || []).map((q: any) => q.id);
      if (quoteIds.length > 0) {
        const select = "*, creator:created_by(full_name), modifier:updated_by(full_name)";
        const [paymentsRes, disbursementsRes] = await Promise.all([
          fetchOperatorTransactions("payments", selectedOperatorId, quoteIds, select, "actual_date"),
          fetchOperatorTransactions("disbursements", selectedOperatorId, quoteIds, select, "actual_date"),
        ]);

        setPayments(paymentsRes.data);
        setDisbursements(disbursementsRes.data);
        if (paymentsRes.error || disbursementsRes.error) {
          setLoadError(paymentsRes.error || disbursementsRes.error);
        }
      } else {
        setPayments([]);
        setDisbursements([]);
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

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, dateFilter, agentFilter]);

  // Quotes with at least one transaction, filtered by agent/date/search, sorted by recency
  const transactionQuotes = useMemo(() => {
    let result = quotes.filter((q) => {
      // Agent filter
      if (agentFilter !== "All" && q.creator?.full_name !== agentFilter) return false;

      // Date filter (on created_at, mirrors desktop PaymentTrackerView)
      if (dateFilter !== "All Time" && q.created_at) {
        const createdDate = new Date(q.created_at);
        const now = new Date();
        if (dateFilter === "Created Today") {
          if (createdDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "Last 7 Days") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (createdDate < sevenDaysAgo) return false;
        } else if (dateFilter === "This Month") {
          if (createdDate.getMonth() !== now.getMonth() || createdDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === "This Year") {
          if (createdDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return (
        payments.some((p) => p.quote_id === q.id) ||
        disbursements.some((d) => d.quote_id === q.id)
      );
    });

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
  }, [quotes, payments, disbursements, searchQuery, agentFilter, dateFilter]);

  // Agent list (derived from quotes with transactions)
  const agentList = useMemo(() => {
    const names = new Set<string>();
    quotes.forEach((q) => {
      if (q.creator?.full_name) names.add(q.creator.full_name);
    });
    return Array.from(names).sort();
  }, [quotes]);

  // Stats — scoped to the currently filtered list so the cards match what's shown
  const stats = useMemo(() => {
    const visibleIds = new Set(transactionQuotes.map((q) => q.id));
    const collected = payments
      .filter((p) => visibleIds.has(p.quote_id))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const disbursed = disbursements
      .filter((d) => visibleIds.has(d.quote_id))
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const pending = transactionQuotes.reduce((sum, q) => {
      const agreed = q.grand_total || q.selected_package_total || 0;
      const paid = payments
        .filter((p) => p.quote_id === q.id)
        .reduce((s, p) => s + (p.amount || 0), 0);
      return sum + Math.max(agreed - paid, 0);
    }, 0);
    return { collected, pending, disbursed };
  }, [payments, disbursements, transactionQuotes]);

  // Stats above stay scoped to the full filtered set; only the rendered list is paged.
  const visibleQuotes = transactionQuotes.slice(0, visibleCount);
  const hasMore = visibleCount < transactionQuotes.length;

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
      <div style={{ position: "relative", marginBottom: 12 }}>
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

      {/* Filter Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setIsDateOpen(true)} style={filterBtnStyle(dateFilter !== "All Time")}>
          <Calendar size={13} />
          {dateFilter}
        </button>
        <button onClick={() => setIsAgentOpen(true)} style={filterBtnStyle(agentFilter !== "All")}>
          <Users size={13} />
          {agentFilter === "All" ? "All Agents" : agentFilter}
        </button>
      </div>

      {/* Date Filter Bottom Sheet */}
      <Drawer.Root open={isDateOpen} onOpenChange={setIsDateOpen}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
          <Drawer.Content style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1000, outline: "none" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
            </div>
            <div style={{ padding: "12px 20px 28px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: font }}>Filter by Date</h3>
              {["All Time", "Created Today", "Last 7 Days", "This Month", "This Year"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setDateFilter(opt); setIsDateOpen(false); }}
                  style={sheetOptionStyle(dateFilter === opt)}
                >
                  <Calendar size={16} color={dateFilter === opt ? "#00674F" : "#94A3B8"} />
                  <span style={sheetOptionLabelStyle(dateFilter === opt)}>{opt}</span>
                  {dateFilter === opt && <Check size={16} color="#00674F" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Agent Filter Bottom Sheet */}
      <Drawer.Root open={isAgentOpen} onOpenChange={setIsAgentOpen}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
          <Drawer.Content style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1000, outline: "none", maxHeight: "70dvh" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
            </div>
            <div style={{ padding: "12px 20px 28px", overflowY: "auto" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: font }}>Filter by Agent</h3>
              {["All", ...agentList].map((name) => (
                <button
                  key={name}
                  onClick={() => { setAgentFilter(name); setIsAgentOpen(false); }}
                  style={sheetOptionStyle(agentFilter === name)}
                >
                  <Users size={16} color={agentFilter === name ? "#00674F" : "#94A3B8"} />
                  <span style={sheetOptionLabelStyle(agentFilter === name)}>{name === "All" ? "All Agents" : name}</span>
                  {agentFilter === name && <Check size={16} color="#00674F" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Partial failure: some data loaded, so warn inline rather than hiding what we have */}
      {!loading && loadError && transactionQuotes.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 12, background: "#FFF1F2", border: "1px solid rgba(225,29,72,0.15)", borderRadius: 12 }}>
          <AlertCircle size={15} color="#E11D48" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 11.5, fontWeight: 600, color: "#E11D48" }}>
            Some transactions couldn&apos;t be loaded — totals may be incomplete.
          </span>
          <button onClick={fetchData} style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 8, border: "none", background: "#E11D48", color: "#fff", fontFamily: font, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {/* Payment Group Cards */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" size={24} color="#00674F" />
        </div>
      ) : loadError && transactionQuotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 24px", fontFamily: font }}>
          <AlertCircle size={22} color="#E11D48" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "#E11D48", margin: 0 }}>Couldn&apos;t load transactions</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#94A3B8", margin: "4px 0 12px", overflowWrap: "anywhere" }}>{loadError}</p>
          <button
            onClick={fetchData}
            style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "#003829", color: "#fff", fontFamily: font, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      ) : transactionQuotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", fontFamily: font }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#64748B", margin: 0 }}>
            {searchQuery || dateFilter !== "All Time" || agentFilter !== "All"
              ? "No matching transactions"
              : "No transactions yet"}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#94A3B8", margin: "4px 0 0" }}>
            {searchQuery || dateFilter !== "All Time" || agentFilter !== "All"
              ? "Try different search or filters"
              : "Payments will appear once recorded on quotes"}
          </p>
        </div>
      ) : (
        visibleQuotes.map((quote) => {
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

      {/* Load More */}
      {!loading && hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + 20)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 14,
            border: "1.5px solid rgba(0,103,79,0.15)",
            background: "#F0FDF4",
            color: "#00674F",
            fontFamily: font,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            marginTop: 4,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Load More ({transactionQuotes.length - visibleCount} remaining)
        </button>
      )}
    </PullToRefresh>
  );
}

const filterBtnStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: font,
  whiteSpace: "nowrap",
  border: active ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.08)",
  background: active ? "#003829" : "#ffffff",
  color: active ? "#ffffff" : "#475569",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
});

const sheetOptionStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "13px 14px",
  borderRadius: 12,
  border: "none",
  background: active ? "#F0FDF4" : "transparent",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  WebkitTapHighlightColor: "transparent",
});

const sheetOptionLabelStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  fontSize: 14,
  fontWeight: active ? 700 : 500,
  color: active ? "#003829" : "#334155",
  fontFamily: font,
});

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
