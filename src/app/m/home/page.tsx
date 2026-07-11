"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Loader2, FileText, CreditCard, TrendingUp, TrendingDown, Trophy, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PullToRefresh from "../components/PullToRefresh";

const font = "'Inter', system-ui, sans-serif";
const CONFIRMED_STATUSES = ["Confirmed", "Payment Started", "Payment Complete"];

export default function MobileHomePage() {
  const { profile, selectedOperatorId } = useAuth();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [paymentTotals, setPaymentTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [leaderTab, setLeaderTab] = useState<"issuers" | "closers">("issuers");

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
        .eq("operator_id", selectedOperatorId);

      if (error) {
        console.error("Error fetching quotes:", error);
        return;
      }
      setQuotes(data || []);

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
  }, [fetchData]);

  // ── Analytics (mirrors desktop calculateAnalytics) ──
  const analytics = useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const currentQuotes = quotes.filter((q) => new Date(q.created_at) >= periodStart);
    const prevQuotes = quotes.filter(
      (q) => new Date(q.created_at) >= prevPeriodStart && new Date(q.created_at) < periodStart
    );

    const getStats = (list: any[]) => ({
      count: list.length,
      amount: list.reduce((sum, q) => sum + (q.grand_total || 0), 0),
    });

    const calcGrowth = (curr: number, p: number) => {
      if (p === 0) return curr > 0 ? 100 : 0;
      return ((curr - p) / p) * 100;
    };

    const currentTotal = getStats(currentQuotes);
    const prevTotal = getStats(prevQuotes);

    const confirmedList = currentQuotes.filter((q) => CONFIRMED_STATUSES.includes(q.status || ""));
    const confirmedStats = getStats(confirmedList);
    const collection = confirmedList.reduce((sum, q) => sum + (paymentTotals[q.id] || 0), 0);
    const collectionQuotes = confirmedList.filter((q) => (paymentTotals[q.id] || 0) > 0).length;
    const commission = confirmedList.reduce((sum, q) => {
      const commPercent = q.admin_commission || 0;
      const total = q.selected_package_total || q.grand_total || 0;
      return sum + Math.round((total * commPercent) / (100 + commPercent));
    }, 0);

    // Daily trend
    const trend = Array.from({ length: days }, (_, i) => {
      const date = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dayQuotes = currentQuotes.filter(
        (q) => new Date(q.created_at).toDateString() === date.toDateString()
      );
      return {
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        quotes: dayQuotes.length,
        value: dayQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0),
      };
    });

    // Agent leaderboard
    const leaderboardMap: Record<string, { name: string; issuedCount: number; issuedAmount: number; confirmedCount: number; confirmedAmount: number }> = {};
    currentQuotes.forEach((q) => {
      const creatorId = q.created_by;
      const creatorName = q.creator?.full_name || "Unknown Agent";
      if (!leaderboardMap[creatorId]) {
        leaderboardMap[creatorId] = { name: creatorName, issuedCount: 0, issuedAmount: 0, confirmedCount: 0, confirmedAmount: 0 };
      }
      const entry = leaderboardMap[creatorId];
      entry.issuedCount += 1;
      entry.issuedAmount += q.grand_total || 0;
      if (CONFIRMED_STATUSES.includes(q.status || "")) {
        entry.confirmedCount += 1;
        entry.confirmedAmount += q.grand_total || 0;
      }
    });
    const leaderboard = Object.values(leaderboardMap);

    return {
      total: { count: currentTotal.count, growth: calcGrowth(currentTotal.amount, prevTotal.amount) },
      confirmed: { count: confirmedStats.count, amount: confirmedStats.amount },
      collection: { amount: collection, quotes: collectionQuotes },
      commission,
      trend,
      issuers: [...leaderboard].sort((a, b) => b.issuedCount - a.issuedCount).slice(0, 5),
      closers: [...leaderboard].sort((a, b) => b.confirmedAmount - a.confirmedAmount).slice(0, 5),
    };
  }, [quotes, paymentTotals, days]);

  const growthPositive = analytics.total.growth >= 0;
  const leaders = leaderTab === "issuers" ? analytics.issuers : analytics.closers;

  return (
    <PullToRefresh onRefresh={fetchData}>
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ marginBottom: 16 }}
      >
        <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
          Welcome, {profile?.full_name?.split(" ")[0] || "there"} 👋
        </h2>
        <p style={{ fontFamily: font, fontSize: 12, fontWeight: 500, color: "#94A3B8", margin: "2px 0 0" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </motion.div>

      {/* Range Selector */}
      <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 12, padding: 3, marginBottom: 14 }}>
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: "none",
              background: days === d ? "#ffffff" : "transparent",
              boxShadow: days === d ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              color: days === d ? "#003829" : "#64748B",
              fontFamily: font,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {d}D
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" size={24} color="#00674F" />
        </div>
      ) : (
        <>
          {/* Metric Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <MetricCard
              icon={<Zap size={15} color="#6366F1" />}
              iconBg="#EEF2FF"
              label="Quotes Issued"
              value={`${analytics.total.count}`}
              sub={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: growthPositive ? "#059669" : "#E11D48" }}>
                  {growthPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {Math.abs(Math.round(analytics.total.growth))}% vs prev.
                </span>
              }
            />
            <MetricCard
              icon={<FileText size={15} color="#059669" />}
              iconBg="#ECFDF5"
              label="Confirmed"
              value={`P${Math.round(analytics.confirmed.amount).toLocaleString()}`}
              sub={`${analytics.confirmed.count} record${analytics.confirmed.count !== 1 ? "s" : ""}`}
            />
            <MetricCard
              icon={<CreditCard size={15} color="#0891B2" />}
              iconBg="#ECFEFF"
              label="Collection"
              value={`P${Math.round(analytics.collection.amount).toLocaleString()}`}
              sub={`from ${analytics.collection.quotes} quote${analytics.collection.quotes !== 1 ? "s" : ""}`}
            />
            <MetricCard
              icon={<TrendingUp size={15} color="#65A30D" />}
              iconBg="#F7FEE7"
              label="Commission"
              value={`P${Math.round(analytics.commission).toLocaleString()}`}
              sub="confirmed deals"
            />
          </div>

          {/* Trend Chart */}
          <div style={{ ...panelStyle, paddingBottom: 6 }}>
            <div style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: "#0F172A", marginBottom: 2 }}>
              Quotation Trend
            </div>
            <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 500, color: "#94A3B8", marginBottom: 8 }}>
              Daily volume, last {days} days
            </div>
            <div style={{ height: 150, marginLeft: -8, marginRight: -8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trend} margin={{ top: 6, right: 12, left: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mobileTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00674F" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#00674F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: font }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={32}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontFamily: font,
                      fontSize: 11,
                    }}
                    formatter={(value: any, name: any) =>
                      name === "quotes" ? [value, "Quotes"] : [`P${Number(value).toLocaleString()}`, "Value"]
                    }
                  />
                  <Area type="monotone" dataKey="quotes" stroke="#00674F" strokeWidth={2} fill="url(#mobileTrendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agent Leaderboard */}
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} color="#D97706" />
                <span style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: "#0F172A" }}>
                  Agent Leaderboard
                </span>
              </div>
              <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 9, padding: 2 }}>
                {([
                  { key: "issuers", label: "Issuers" },
                  { key: "closers", label: "Closers" },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setLeaderTab(t.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      border: "none",
                      background: leaderTab === t.key ? "#ffffff" : "transparent",
                      boxShadow: leaderTab === t.key ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      color: leaderTab === t.key ? "#003829" : "#64748B",
                      fontFamily: font,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {leaders.length === 0 ? (
              <p style={{ fontFamily: font, fontSize: 12, fontWeight: 500, color: "#94A3B8", textAlign: "center", padding: "16px 0", margin: 0 }}>
                No activity in this period
              </p>
            ) : (
              leaders.map((agent, i) => (
                <div
                  key={agent.name + i}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: i === 0 ? "#FFFBEB" : "#F8FAFC",
                      color: i === 0 ? "#D97706" : "#94A3B8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: font,
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ flex: 1, fontFamily: font, fontSize: 13, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {agent.name}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: font, fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>
                      {leaderTab === "issuers"
                        ? `${agent.issuedCount} quote${agent.issuedCount !== 1 ? "s" : ""}`
                        : `P${Math.round(agent.confirmedAmount).toLocaleString()}`}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 9.5, fontWeight: 600, color: "#94A3B8" }}>
                      {leaderTab === "issuers"
                        ? `P${Math.round(agent.issuedAmount).toLocaleString()} issued`
                        : `${agent.confirmedCount} closed`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </PullToRefresh>
  );
}

function MetricCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 16,
        padding: "13px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontFamily: font, fontSize: 9.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </div>
      <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: "#94A3B8", marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: 16,
  padding: "14px 16px",
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};
