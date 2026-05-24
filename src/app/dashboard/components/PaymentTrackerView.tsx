"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  CreditCard, 
  Receipt, 
  Search, 
  TrendingUp, 
  ArrowRight,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Coins,
  Sliders,
  Settings
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { cardStyle, labelStyle, sectionLabel } from "@/lib/styles";

interface PaymentTrackerViewProps {
  quotes: any[];
  payments: any[];
  disbursements: any[];
  searchQuery: string;
  onManageQuote: (quoteId: string) => void;
  agentFilter?: string;
  dateFilter?: string;
}

export default function PaymentTrackerView({
  quotes,
  payments,
  disbursements,
  searchQuery,
  onManageQuote,
  agentFilter = "All",
  dateFilter = "All Time"
}: PaymentTrackerViewProps) {
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const toggleExpand = (quoteId: string) => {
    setExpandedQuoteId(prev => prev === quoteId ? null : quoteId);
  };

  // Find all quotes that have at least one payment or disbursement and match the filters
  const transactionQuotes = useMemo(() => {
    return quotes.filter(quote => {
      // 1. Check if it matches agent filter
      if (agentFilter !== "All" && quote.creator?.full_name !== agentFilter) {
        return false;
      }

      // 2. Check if it matches date filter
      if (dateFilter !== "All Time" && quote.created_at) {
        const createdDate = new Date(quote.created_at);
        const now = new Date();
        let matchesDate = true;
        
        if (dateFilter === "Created Today") {
          matchesDate = createdDate.toDateString() === now.toDateString();
        } else if (dateFilter === "Last 7 Days") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchesDate = createdDate >= sevenDaysAgo;
        } else if (dateFilter === "This Month") {
          matchesDate = createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === "This Year") {
          matchesDate = createdDate.getFullYear() === now.getFullYear();
        }
        
        if (!matchesDate) return false;
      }

      const hasPayments = payments.some(p => p.quote_id === quote.id);
      const hasDisbursements = disbursements.some(d => d.quote_id === quote.id);
      return hasPayments || hasDisbursements;
    });
  }, [quotes, payments, disbursements, agentFilter, dateFilter]);

  // Apply search query filtering and sort by most recently updated date
  const filteredQuotes = useMemo(() => {
    let result = transactionQuotes;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = transactionQuotes.filter(q => {
        const customerName = (q.customer_name || '').toLowerCase();
        const fbName = (q.fb_name || '').toLowerCase();
        const vehicleModel = (q.vehicle_model || '').toLowerCase();
        const notes = (q.notes || '').toLowerCase();
        
        // Also match any related payments reference or notes
        const quotePayments = payments.filter(p => p.quote_id === q.id);
        const hasMatchingPayment = quotePayments.some(p => 
          (p.reference_number || '').toLowerCase().includes(query) ||
          (p.notes || '').toLowerCase().includes(query) ||
          (p.payment_method || '').toLowerCase().includes(query)
        );

        // Match disbursements
        const quoteDisbursements = disbursements.filter(d => d.quote_id === q.id);
        const hasMatchingDisbursement = quoteDisbursements.some(d => 
          (d.reference_number || '').toLowerCase().includes(query) ||
          (d.notes || '').toLowerCase().includes(query)
        );

        return (
          customerName.includes(query) ||
          fbName.includes(query) ||
          vehicleModel.includes(query) ||
          notes.includes(query) ||
          hasMatchingPayment ||
          hasMatchingDisbursement
        );
      });
    }

    // Sort by updated_at (most recently updated first), falling back to created_at
    return [...result].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [transactionQuotes, searchQuery, payments, disbursements]);

  return (
    <div className="payment-tracker-container space-y-6 pb-20">

      {/* Main List */}
      <div className="flex flex-col gap-3">
        {filteredQuotes.length > 0 ? (
          filteredQuotes.map((quote) => {
            const quotePayments = payments.filter(p => p.quote_id === quote.id);
            const quoteDisbursements = disbursements.filter(d => d.quote_id === quote.id);
            
            const totalAgreed = quote.grand_total || quote.selected_package_total || 0;
            const totalPaid = quotePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
            const totalDisbursed = quoteDisbursements.reduce((acc, d) => acc + (d.amount || 0), 0);
            const isFullyPaid = totalPaid >= totalAgreed && totalAgreed > 0;
            const paymentProgress = totalAgreed > 0 ? Math.min((totalPaid / totalAgreed) * 100, 100) : 0;
            const balanceRemaining = Math.max(Math.round((totalAgreed - totalPaid) * 100) / 100, 0);
            const commissionPct = quote.admin_commission || 0;
            const commissionBase = quote.selected_package_total || totalAgreed || 0;
            const commissionAmount = Math.round((commissionBase * commissionPct) / (100 + commissionPct));

            const isExpanded = expandedQuoteId === quote.id;

            // Formatted Date String Helper
            const formatDateStr = (iso: string) => {
              if (!iso) return "";
              return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            };

            const clientInitials = quote.customer_name
              ? quote.customer_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              : 'Q';

            return (
              <div 
                key={quote.id} 
                style={cardStyle}
                className={cn(
                  "relative group cursor-pointer transition-all hover:border-primary/30 flex flex-col gap-4 !p-5 shadow-sm rounded-3xl overflow-hidden",
                  isExpanded ? "border-emerald-500/30 shadow-lg ring-1 ring-emerald-500/5" : "border-slate-100 hover:border-slate-200"
                )}
              >
                {/* Header/Summary Row */}
                <div 
                  onClick={() => toggleExpand(quote.id)}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full select-none"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-primary font-black text-[10px] group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      {clientInitials}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2.5 flex-nowrap">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight truncate max-w-[200px] !mb-0 shrink-0">
                          {quote.customer_name}
                        </h3>
                        <span className={cn(
                          "flex items-center gap-1 py-0.5 px-2 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all leading-none whitespace-nowrap shrink-0",
                          quote.status === "Payment Complete" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          quote.status === "Payment Started" ? "bg-sky-50 text-sky-700 border-sky-100" :
                          "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            quote.status === "Payment Complete" ? "bg-emerald-500" :
                            quote.status === "Payment Started" ? "bg-sky-500" :
                            "bg-slate-400"
                          )} />
                          {quote.status}
                        </span>
                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider whitespace-nowrap shrink-0 ml-1">
                          COMMS: ₱{commissionAmount.toLocaleString()}
                        </span>
                      </div>

                      {/* Row 2: Date */}
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                        <Calendar size={10} className="text-slate-400 shrink-0" />
                        {formatDateStr(quote.eta)} - {formatDateStr(quote.etd)}
                      </div>

                      {/* Row 3: Duration & Pax (below date) */}
                      <div className="flex items-center gap-2 mt-1.5 flex-nowrap">
                        {quote.eta && quote.etd && (() => {
                          const d1 = new Date(quote.eta);
                          const d2 = new Date(quote.etd);
                          d1.setHours(0,0,0,0);
                          d2.setHours(0,0,0,0);
                          const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          const nights = diffDays - 1;
                          return (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[8px] font-black tracking-tighter border border-emerald-100/50 shrink-0">
                              {diffDays}D{nights > 0 ? `${nights}N` : ""}
                            </span>
                          );
                        })()}
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black tracking-tighter border border-blue-100/50 uppercase shrink-0">
                          {quote.pax_count} Pax
                        </span>
                      </div>

                      {/* Row 4: Created & Updated Metas */}
                      <div className="flex items-center gap-2 mt-1.5 opacity-60">
                        {quote.creator?.full_name && (
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Created: {quote.creator.full_name} {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : ''}
                          </span>
                        )}
                        {quote.creator?.full_name && quote.modifier?.full_name && <span className="text-slate-300 opacity-40 text-[7px]">|</span>}
                        {quote.modifier?.full_name && (
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Updated: {quote.modifier.full_name} {quote.updated_at ? new Date(quote.updated_at).toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Indices */}
                  <div className="flex flex-wrap items-center gap-6 justify-between lg:justify-end w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Deal Value */}
                    <div className="text-right">
                      <p style={sectionLabel} className="!text-[8px] leading-none mb-1">Package Value</p>
                      <p className="text-xs font-bold text-slate-800 tracking-tight">
                        ₱{totalAgreed.toLocaleString()}
                      </p>
                    </div>

                    <div className="w-px h-6 bg-slate-100 hidden lg:block" />

                    {/* Paid */}
                    <div className="text-right">
                      <p style={sectionLabel} className="!text-[8px] leading-none mb-1 !text-emerald-600">Collected</p>
                      <p className="text-xs font-bold text-emerald-600 tracking-tight">
                        ₱{totalPaid.toLocaleString()}
                      </p>
                    </div>

                    {/* Outflow */}
                    <div className="text-right">
                      <p style={sectionLabel} className="!text-[8px] leading-none mb-1 !text-amber-600">Disbursement</p>
                      <p className="text-xs font-bold text-amber-600 tracking-tight">
                        ₱{totalDisbursed.toLocaleString()}
                      </p>
                    </div>

                    {/* Outstanding */}
                    <div className="text-right">
                      <p style={sectionLabel} className="!text-[8px] leading-none mb-1 !text-rose-600">Outstanding</p>
                      {balanceRemaining <= 0.01 ? (
                        <p className="text-xs font-bold text-emerald-600 tracking-tight uppercase">
                          Settled
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-rose-600 tracking-tight">
                          ₱{balanceRemaining.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="w-px h-6 bg-slate-100 hidden lg:block" />

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Open Deal Settings / Builder */}
                      <a
                        href={`/builder?id=${quote.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100/50 border border-slate-100 transition-all cursor-pointer bg-slate-50/20 shadow-sm"
                        title="Configure Deal Settings"
                      >
                        <Settings size={14} strokeWidth={2.2} />
                      </a>

                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleExpand(quote.id); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer bg-slate-50/20"
                      >
                        {isExpanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
                      </div>
                    </div>
                  </div>
                </div>



                {/* Progress bar underneath header */}
                <div className="h-[2px] w-full bg-slate-100 rounded-full relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${paymentProgress}%` }}
                    className={cn(
                      "h-full rounded-full absolute left-0 top-0",
                      isFullyPaid ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-emerald-500"
                    )}
                  />
                </div>

                {/* Expanded Ledger View */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div className="border-t border-slate-50 bg-[#fafbfe]/30 p-6 md:p-8 space-y-6">
                        {/* Vertical Stacked Layout: Inflow and Outflow lists */}
                        <div className="flex flex-col gap-8">
                          {/* Inflow Panel (Collections) */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100/50 text-emerald-600 flex items-center justify-center">
                                  <CreditCard size={12} strokeWidth={2.5} />
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Payments</h4>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded text-[8px] font-black tracking-widest uppercase">
                                {quotePayments.length} {quotePayments.length === 1 ? 'Entry' : 'Entries'}
                              </span>
                            </div>

                            {/* Payments List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {quotePayments.length > 0 ? (
                                quotePayments.map((p) => (
                                  <div 
                                    key={p.id}
                                    className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-4 hover:border-emerald-500/20 transition-all hover:shadow-xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {/* Left Icon Badge */}
                                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100/80 text-slate-400 flex items-center justify-center shrink-0">
                                        <CreditCard size={12} className="opacity-70" />
                                      </div>

                                      {/* Amount block */}
                                      <span className="text-[13px] font-black text-emerald-800 tracking-tight tabular-nums min-w-[65px]">
                                        ₱{p.amount.toLocaleString()}
                                      </span>

                                      {/* Vertical separator */}
                                      <div className="w-px h-6 bg-slate-100 shrink-0" />

                                      {/* Metadata block */}
                                      <div className="flex flex-col gap-1 min-w-0 flex-1 justify-center">
                                        {/* Row 1: TRX DATE Pill, dot, REFERENCE, dot, Description notes */}
                                        <div className="flex items-center gap-1.5 flex-wrap text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded text-[8px] font-extrabold shrink-0">
                                            TRX DATE: {new Date(p.actual_date || p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </span>
                                          
                                          {p.reference_number && (
                                            <>
                                              <span className="text-slate-300">•</span>
                                              <span className="text-indigo-500 font-extrabold tracking-wider">
                                                REFERENCE: #{p.reference_number}
                                              </span>
                                            </>
                                          )}

                                          <span className="text-slate-300">•</span>
                                          
                                          <span className="text-slate-500 font-bold tracking-tight normal-case truncate max-w-[200px]" title={p.notes || "No description"}>
                                            {p.notes ? p.notes : <span className="text-slate-300 italic text-[8.5px]">No description</span>}
                                          </span>
                                        </div>

                                        {/* Row 2: Created & Updated Metas (below Trx Date) */}
                                        <div className="flex items-center gap-1.5 flex-wrap text-[7px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5 opacity-65">
                                          <span>
                                            CREATED: {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} BY {p.creator?.full_name || 'SYSTEM'}
                                          </span>

                                          {p.updated_at && p.updated_at !== p.created_at && p.modifier?.full_name && (
                                            <>
                                              <span className="text-slate-300 opacity-60">•</span>
                                              <span>
                                                UPDATED: {new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} BY {p.modifier.full_name}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="py-8 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                  <AlertCircle size={16} className="text-slate-300 mb-2" />
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">No customer payments recorded</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Outflow Panel (Disbursements) */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100/50 text-amber-600 flex items-center justify-center">
                                  <Receipt size={12} strokeWidth={2.5} />
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Disbursements</h4>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded text-[8px] font-black tracking-widest uppercase">
                                {quoteDisbursements.length} {quoteDisbursements.length === 1 ? 'Entry' : 'Entries'}
                              </span>
                            </div>

                            {/* Disbursements List */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {quoteDisbursements.length > 0 ? (
                                quoteDisbursements.map((d) => (
                                  <div 
                                    key={d.id}
                                    className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-4 hover:border-amber-500/20 transition-all hover:shadow-xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {/* Left Icon Badge */}
                                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100/80 text-slate-400 flex items-center justify-center shrink-0">
                                        <Receipt size={12} className="opacity-70" />
                                      </div>

                                      {/* Amount block */}
                                      <span className="text-[13px] font-black text-amber-800 tracking-tight tabular-nums min-w-[65px]">
                                        ₱{d.amount.toLocaleString()}
                                      </span>

                                      {/* Vertical separator */}
                                      <div className="w-px h-6 bg-slate-100 shrink-0" />

                                      {/* Metadata block */}
                                      <div className="flex flex-col gap-1 min-w-0 flex-1 justify-center">
                                        {/* Row 1: TRX DATE Pill, dot, REFERENCE, dot, Description notes */}
                                        <div className="flex items-center gap-1.5 flex-wrap text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                          <span className="text-amber-700 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded text-[8px] font-extrabold shrink-0">
                                            TRX DATE: {new Date(d.actual_date || d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </span>
                                          
                                          {d.reference_number && (
                                            <>
                                              <span className="text-slate-300">•</span>
                                              <span className="text-indigo-500 font-extrabold tracking-wider">
                                                REFERENCE: #{d.reference_number}
                                              </span>
                                            </>
                                          )}

                                          <span className="text-slate-300">•</span>
                                          
                                          <span className="text-slate-500 font-bold tracking-tight normal-case truncate max-w-[200px]" title={d.notes || "No description"}>
                                            {d.notes ? d.notes : <span className="text-slate-300 italic text-[8.5px]">No description</span>}
                                          </span>
                                        </div>

                                        {/* Row 2: Created & Updated Metas (below Trx Date) */}
                                        <div className="flex items-center gap-1.5 flex-wrap text-[7px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5 opacity-65">
                                          <span>
                                            CREATED: {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} BY {d.creator?.full_name || 'SYSTEM'}
                                          </span>

                                          {d.updated_at && d.updated_at !== d.created_at && d.modifier?.full_name && (
                                            <>
                                              <span className="text-slate-300 opacity-60">•</span>
                                              <span>
                                                UPDATED: {new Date(d.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} BY {d.modifier.full_name}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="py-8 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                  <AlertCircle size={16} className="text-slate-300 mb-2" />
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">No disbursements recorded</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Footer Action Area */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Quotation Reference ID: {quote.id}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="py-24 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center mb-4">
              <Search size={28} />
            </div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">No Matching Transactions</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 max-w-sm px-6">
              Ensure you have typed a valid name, model, reference number, or notes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
