"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, ArrowDownUp, SortDesc, Calendar, Users, Check } from "lucide-react";
import { Drawer } from "vaul";
import MobileStatsRow from "./components/MobileStatsRow";
import MobileFilterChips from "./components/MobileFilterChips";
import MobileQuoteCard from "./components/MobileQuoteCard";
import ConfirmSheet from "../components/ConfirmSheet";
import PullToRefresh from "../components/PullToRefresh";

const ALL_STATUSES = [
  "Draft", "Quotation Sent", "Follow-up Needed",
  "Confirmed", "Payment Started", "Payment Complete",
  "Lost", "Cancelled",
];

const CONFIRMED_STATUSES = ["Confirmed", "Payment Started", "Payment Complete"];
const PENDING_STATUSES = ["Draft", "Quotation Sent", "Follow-up Needed"];

export default function MobileDashboardPage() {
  const router = useRouter();
  const { profile, selectedOperatorId } = useAuth();

  // Data
  const [quotes, setQuotes] = useState<any[]>([]);
  const [paymentTotals, setPaymentTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [agentFilter, setAgentFilter] = useState("All");
  const [sortMethod, setSortMethod] = useState<"priority" | "updated">("priority");

  // Bottom sheet states
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  // Visible count for lazy loading
  const [visibleCount, setVisibleCount] = useState(20);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Data Fetching ──
  const fetchData = useCallback(async () => {
    if (!profile || !selectedOperatorId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*, creator:created_by(full_name), modifier:updated_by(full_name)")
        .eq("operator_id", selectedOperatorId)
        .order("eta", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error fetching quotes:", error);
        return;
      }

      setQuotes(data || []);

      // Fetch payment totals
      const quoteIds = (data || []).map((q: any) => q.id);
      if (quoteIds.length > 0) {
        const { data: paymentsRes } = await supabase
          .from("payments")
          .select("quote_id, amount")
          .in("quote_id", quoteIds);

        const totals: Record<string, number> = {};
        (paymentsRes || []).forEach((p: any) => {
          totals[p.quote_id] = (totals[p.quote_id] || 0) + (p.amount || 0);
        });
        setPaymentTotals(totals);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedOperatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, quoteStatusFilter, dateFilter, agentFilter]);

  // ── Filtering & Sorting ──
  const { filteredQuotes, statusCounts } = useMemo(() => {
    // Base filter: search + agent + date
    const baseFiltered = quotes.filter((q) => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        let durationStr = "";
        if (q.eta && q.etd) {
          const d1 = new Date(q.eta);
          const d2 = new Date(q.etd);
          d1.setHours(0, 0, 0, 0);
          d2.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const nights = diffDays - 1;
          durationStr = `${diffDays}D${nights > 0 ? `${nights}N` : ""}`;
        }
        const paxStr = q.pax_count ? `${q.pax_count}pax` : "";
        const fleetText = (q.fleet_json || q.fleet || []).map((v: any) => v.model).join(" ").toLowerCase();
        const matchesSearch = (
          q.customer_name?.toLowerCase().includes(query) ||
          q.vehicle_model?.toLowerCase().includes(query) ||
          fleetText.includes(query) ||
          durationStr.toLowerCase().includes(query) ||
          paxStr.toLowerCase().includes(query) ||
          q.quotation_description?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Agent filter
      if (agentFilter !== "All" && q.creator?.full_name !== agentFilter) return false;

      // Date filter
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

      return true;
    });

    // Status counts
    const counts: Record<string, number> = { All: baseFiltered.length };
    ALL_STATUSES.forEach((s) => {
      counts[s] = baseFiltered.filter((q) => q.status === s).length;
    });

    // Status filter
    let filtered = quoteStatusFilter === "All"
      ? baseFiltered
      : baseFiltered.filter((q) => q.status === quoteStatusFilter);

    // Sort
    if (sortMethod === "updated") {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
    } else {
      // Priority sort
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const getStatusPriority = (status: string, eta: string) => {
        if (!eta) return 2;
        const tripDate = new Date(eta);
        tripDate.setHours(0, 0, 0, 0);
        const isPast = tripDate < now;

        if (["Lost", "Cancelled"].includes(status) || (isPast && !["Draft", "Quotation Sent", "Follow-up Needed"].includes(status))) return 2;
        if (["Draft", "Quotation Sent", "Follow-up Needed"].includes(status)) return 0;
        if (["Confirmed", "Payment Started", "Payment Complete"].includes(status)) return 1;
        return 2;
      };

      filtered = [...filtered].sort((a, b) => {
        const pA = getStatusPriority(a.status, a.eta);
        const pB = getStatusPriority(b.status, b.eta);
        if (pA !== pB) return pA - pB;
        if (!a.eta && !b.eta) return 0;
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        const dateA = new Date(a.eta).getTime();
        const dateB = new Date(b.eta).getTime();
        if (pA === 2) return dateB - dateA;
        return dateA - dateB;
      });
    }

    return { filteredQuotes: filtered, statusCounts: counts };
  }, [quotes, searchQuery, quoteStatusFilter, sortMethod, dateFilter, agentFilter]);

  // ── Agent list (derived from quotes) ──
  const agentList = useMemo(() => {
    const names = new Set<string>();
    quotes.forEach((q) => {
      if (q.creator?.full_name) names.add(q.creator.full_name);
    });
    return Array.from(names).sort();
  }, [quotes]);

  // ── Stats ──
  const stats = useMemo(() => {
    const confirmed = quotes.filter((q) => CONFIRMED_STATUSES.includes(q.status || ""));
    return {
      total: quotes.length,
      confirmed: confirmed.length,
      revenue: confirmed.reduce((sum, q) => sum + (q.grand_total || 0), 0),
      pending: quotes.filter((q) => PENDING_STATUSES.includes(q.status || "")).length,
    };
  }, [quotes]);

  // ── Actions ──
  const handleDuplicate = async (id: string) => {
    router.push(`/m/builder?copyFrom=${id}`);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Cascade delete: payments → disbursements → quote_items → quote
      const { error: paymentsErr } = await supabase.from("payments").delete().eq("quote_id", deleteTarget.id);
      if (paymentsErr) throw new Error(`Failed to delete payments: ${paymentsErr.message}`);

      const { error: disbursementsErr } = await supabase.from("disbursements").delete().eq("quote_id", deleteTarget.id);
      if (disbursementsErr) throw new Error(`Failed to delete disbursements: ${disbursementsErr.message}`);

      const { error: itemsErr } = await supabase.from("quote_items").delete().eq("quote_id", deleteTarget.id);
      if (itemsErr) throw new Error(`Failed to delete quote items: ${itemsErr.message}`);

      const { error: quoteErr } = await supabase.from("quotes").delete().eq("id", deleteTarget.id);
      if (quoteErr) throw new Error(`Failed to delete quote: ${quoteErr.message}`);

      setDeleteTarget(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const visibleQuotes = filteredQuotes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredQuotes.length;

  return (
    <PullToRefresh onRefresh={fetchData}>
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ marginBottom: 16 }}
      >
        <h2
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: "#0F172A",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Welcome, {profile?.full_name?.split(" ")[0] || "there"} 👋
        </h2>
        <p
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "#94A3B8",
            margin: 0,
            marginTop: 2,
          }}
        >
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </motion.div>

      {/* Stats Row */}
      <div style={{ marginBottom: 18 }}>
        <MobileStatsRow
          totalQuotes={stats.total}
          confirmedCount={stats.confirmed}
          revenue={stats.revenue}
          pendingCount={stats.pending}
        />
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search
          size={16}
          color="#94A3B8"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder="Search quotes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            height: 44,
            paddingLeft: 40,
            paddingRight: searchQuery ? 40 : 16,
            borderRadius: 14,
            fontSize: 14,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            border: "1.5px solid rgba(0,0,0,0.08)",
            background: "#ffffff",
            color: "#0F172A",
            outline: "none",
            WebkitAppearance: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#00674F")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.08)")}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#F1F5F9",
              border: "none",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} color="#64748B" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <MobileFilterChips
          statuses={ALL_STATUSES}
          counts={statusCounts}
          activeFilter={quoteStatusFilter}
          onFilterChange={setQuoteStatusFilter}
        />

        {/* Date Filter Button */}
        <button
          onClick={() => setIsDateOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: "nowrap",
            border: dateFilter !== "All Time" ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.08)",
            background: dateFilter !== "All Time" ? "#003829" : "#ffffff",
            color: dateFilter !== "All Time" ? "#ffffff" : "#475569",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Calendar size={13} />
          {dateFilter}
        </button>

        {/* Agent Filter Button */}
        <button
          onClick={() => setIsAgentOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: "nowrap",
            border: agentFilter !== "All" ? "1.5px solid #003829" : "1.5px solid rgba(0,0,0,0.08)",
            background: agentFilter !== "All" ? "#003829" : "#ffffff",
            color: agentFilter !== "All" ? "#ffffff" : "#475569",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Users size={13} />
          {agentFilter === "All" ? "All Agents" : agentFilter}
        </button>

        {/* Sort Toggle */}
        <button
          onClick={() => setSortMethod((s) => (s === "priority" ? "updated" : "priority"))}
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1.5px solid rgba(0,0,0,0.08)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: sortMethod === "updated" ? "#00674F" : "#94A3B8",
            WebkitTapHighlightColor: "transparent",
            marginLeft: "auto",
          }}
          title={sortMethod === "priority" ? "Sort by priority" : "Sort by updated"}
        >
          {sortMethod === "priority" ? <ArrowDownUp size={16} /> : <SortDesc size={16} />}
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
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif" }}>Filter by Date</h3>
              {["All Time", "Created Today", "Last 7 Days", "This Month", "This Year"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setDateFilter(opt); setIsDateOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 12, border: "none",
                    background: dateFilter === opt ? "#F0FDF4" : "transparent", cursor: "pointer", width: "100%", textAlign: "left",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Calendar size={16} color={dateFilter === opt ? "#00674F" : "#94A3B8"} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: dateFilter === opt ? 700 : 500, color: dateFilter === opt ? "#003829" : "#334155", fontFamily: "'Inter', system-ui, sans-serif" }}>{opt}</span>
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
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif" }}>Filter by Agent</h3>
              {["All", ...agentList].map((name) => (
                <button
                  key={name}
                  onClick={() => { setAgentFilter(name); setIsAgentOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 12, border: "none",
                    background: agentFilter === name ? "#F0FDF4" : "transparent", cursor: "pointer", width: "100%", textAlign: "left",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Users size={16} color={agentFilter === name ? "#00674F" : "#94A3B8"} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: agentFilter === name ? 700 : 500, color: agentFilter === name ? "#003829" : "#334155", fontFamily: "'Inter', system-ui, sans-serif" }}>{name === "All" ? "All Agents" : name}</span>
                  {agentFilter === name && <Check size={16} color="#00674F" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Quote List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" size={24} color="#00674F" />
        </div>
      ) : filteredQuotes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: "center",
            padding: "48px 24px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "#64748B", margin: 0 }}>
            {searchQuery ? "No quotes found" : "No quotes yet"}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#94A3B8", margin: 0, marginTop: 4 }}>
            {searchQuery ? "Try a different search" : "Tap + to create your first quote"}
          </p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            {visibleQuotes.map((quote, i) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              >
                <MobileQuoteCard
                  quote={quote}
                  paymentTotal={paymentTotals[quote.id] || 0}
                  onTap={(id) => router.push(`/m/builder?id=${id}`)}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + 20)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                border: "1.5px solid rgba(0,103,79,0.15)",
                background: "#F0FDF4",
                color: "#00674F",
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 4,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Load More ({filteredQuotes.length - visibleCount} remaining)
            </button>
          )}

          {/* Count label */}
          <p
            style={{
              textAlign: "center",
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              color: "#CBD5E1",
              marginTop: 16,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? "s" : ""}
          </p>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmSheet
        open={!!deleteTarget}
        title={`Delete quote for "${deleteTarget?.title}"?`}
        message="This also removes its payments, disbursements and line items. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PullToRefresh>
  );
}
