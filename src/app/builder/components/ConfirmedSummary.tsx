"use client";

import { CheckCircle, Clock, ShieldCheck, Map as MapIcon, Receipt, Trash2, Plus, X, Settings, ArrowRight, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuoteData } from "./types";
import { 
  modalOverlay, modalCard, modalTitle, modalFormSpace, 
  inputStyle, labelStyle, sectionLabel, btnPrimary, btnSecondary, btnAction,
  btnPillarPrimary, btnPillarSecondary,
  inputFocus, inputBlur
} from "@/lib/styles";

interface ConfirmedSummaryProps {
  quote: QuoteData;
  onReconfigure: () => void;
  onBack: () => void;
  payments: any[];
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (v: boolean) => void;
  handleAddPayment: (data: any) => void;
  handleVoidPayment: (id: string) => void;
  isSaving?: boolean;
  dbMiscPresets?: any[];
}

export default function ConfirmedSummary({
  quote,
  onReconfigure,
  onBack,
  payments,
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  handleAddPayment,
  handleVoidPayment,
  isSaving = false,
  dbMiscPresets = []
}: ConfirmedSummaryProps) {
  const details = quote.selected_package_details || {};
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceRemaining = Math.max(0, (details.total_amount || 0) - totalPaid);
  const paymentProgress = details.total_amount > 0 ? (totalPaid / details.total_amount) * 100 : 0;
  const isFullyPaid = balanceRemaining <= 0;

  // Derived Inclusions & Exclusions (Mirroring Quotation Text Logic)
  const incs: string[] = [];
  const excs: string[] = [];

  // 1. Vehicle Logic
  if (details.inclusions?.vehicle) {
    incs.push(`Vehicle: ${quote.vehicle_model || 'Standard Unit'}`);
  } else {
    excs.push('Vehicle Rental');
  }

  // 2. Fuel Logic
  const totalFuel = quote.items?.reduce((sum, item) => {
    // Basic fuel calc if needed, or use row_total components if available
    // For summary, we can approximate or check if fuel was actually a factor
    const fuelCost = (item.km / (item.km_per_l || 10)) * (item.fuel_price || 60);
    return sum + (item.fuel_cost_manual || fuelCost);
  }, 0) || 0;

  if (details.inclusions?.fuel && totalFuel > 0) {
    incs.push('Fuel & Logistics included');
  } else {
    excs.push('Fuel Consumption');
  }

  // 3. Accommodation Logic
  const uniqueHotels = Array.from(new Set(quote.items?.map(i => i.guest_accommodation_name).filter(Boolean)));
  const totalAccom = quote.items?.reduce((sum, item) => sum + (item.guest_accommodation_amount || 0), 0) || 0;

  if (details.inclusions?.accommodation && totalAccom > 0) {
    const hotelLabel = uniqueHotels.length > 0 ? `Guest Accommodation (${uniqueHotels.join(", ")})` : "Guest Accommodation";
    incs.push(hotelLabel);
  } else {
    excs.push('Guest Accommodation');
  }

  // 4. Misc Persistence Logic
  dbMiscPresets.forEach(m => {
    const isIncludedInConfig = (details.inclusions?.misc_details || []).some((md: any) => md.name === m.name);
    const totalValue = quote.items?.reduce((sum, item) => {
      return sum + (item.dynamic_costs?.[m.id] || 0);
    }, 0) || 0;

    if (isIncludedInConfig && totalValue > 0) {
      incs.push(m.name);
    } else {
      excs.push(m.name);
    }
  });

  // Financial Calculations
  const commissionPercentage = quote.admin_commission || 0;
  const commissionAmount = Math.round(((details.total_amount || 0) * commissionPercentage) / (100 + commissionPercentage));
  const baseRate = (details.total_amount || 0) - commissionAmount;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      <header className="h-16 bg-white border-b border-[#e8eaed] sticky top-0 z-50 shadow-sm safe-top">
        <div className="w-full h-full grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 lg:px-10">
          {/* Left Block */}
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={onBack} className="h-10 w-10 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-secondary hover:bg-[#f0f2f5] transition-all">
              <CheckCircle size={20} className="text-emerald-500" />
            </button>
            <h1 className="text-xl font-bold text-primary tracking-tight italic">Confirmed Record</h1>
          </div>

          {/* Center Block - Geometric Center */}
          <div className="flex items-center gap-3 whitespace-nowrap">
             {!isFullyPaid && (
               <button 
                 onClick={() => setIsPaymentModalOpen(true)}
                 style={{ ...btnAction, height: '40px' }}
               >
                 <Plus size={16} /> Record Payment
               </button>
             )}
             <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                <CheckCircle size={12} /> Confirmed Deal
             </div>
          </div>

          {/* Right Block - Balancing Spacer */}
          <div className="flex justify-end shrink-0" />
        </div>
      </header>

      <main 
        className="flex-1 w-full pb-32 flex flex-col items-center px-4 md:px-6 lg:px-10"
        style={{ paddingTop: 0 }}
      >
         {/* Section 1: Agreement Info Card */}
         <div className="bg-white rounded-3xl md:rounded-[48px] p-4 md:p-6 lg:!p-[40.5px] shadow-2xl shadow-primary/[0.05] border border-[#e8eaed] relative overflow-hidden w-full max-w-4xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full -mr-40 -mt-40 opacity-40 blur-3xl" />
            
            <div className="relative">
               <div className="flex items-center gap-4 mb-12">
                  <div className="w-16 h-16 rounded-[24px] bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                     <CheckCircle size={32} strokeWidth={3} />
                  </div>
                  <div>
                     <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-primary tracking-tighter">Agreement Finalized</h2>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                          isFullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {isFullyPaid ? <ShieldCheck size={12} /> : <Clock size={12} />}
                          {isFullyPaid ? 'Fully Paid' : 'Payment Collection'}
                        </div>
                     </div>
                     <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-1">
                        {quote.confirmed_at ? `Officially converted on ${new Date(quote.confirmed_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}` : 'Locked in System'}
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-[40.5px] pb-[81px] border-b border-[#f0f2f5]">
                  <div className="space-y-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#6366f1] ml-1">Confirmed Package</label>
                        <p className="text-3xl font-black text-primary italic leading-none">{details.package_name}</p>
                     </div>

                     <div className="flex items-baseline gap-10">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Total Agreed Amount</label>
                           <p className="text-4xl font-black text-primary tracking-tighter italic">₱{Math.round(details.total_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="space-y-2 translate-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Rate Per Pax ({details.pax_count})</label>
                           <p className="text-xl font-bold text-emerald-600 font-mono tracking-tight bg-emerald-50 px-3 py-1 rounded-xl">₱{Math.round(details.per_pax || 0).toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="mt-8 mb-16 pt-8 pb-10 border-t border-[#f0f2f5] space-y-4 max-w-[280px]">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-60">Bill Breakdown</p>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-[11px] font-bold text-text-tertiary">
                              <span>Base Package Rate</span>
                              <span className="font-mono">₱{Math.round(baseRate).toLocaleString()}</span>
                           </div>
                           {details.adjustments?.extra_fees?.map((f: any, i: number) => (
                             <div key={i} className="flex justify-between items-center text-[11px] font-bold text-indigo-600">
                                <span className="opacity-60">{f.name}</span>
                                <span className="font-mono">+ ₱{f.amount?.toLocaleString()}</span>
                             </div>
                           ))}
                           
                           {details.adjustments?.discount > 0 && (
                             <div className="pt-2 border-t border-dashed border-[#f0f2f5] flex justify-between items-center text-[11px] font-black text-primary/60">
                                <span>Subtotal before discount</span>
                                <span className="font-mono">₱{(details.total_amount + details.adjustments.discount).toLocaleString()}</span>
                             </div>
                           )}

                           {details.adjustments?.discount > 0 && (
                             <div key="discount" className="flex justify-between items-center text-[11px] font-bold text-emerald-600">
                                <span className="opacity-60 italic">Client Discount</span>
                                <span className="font-mono">- ₱{details.adjustments.discount.toLocaleString()}</span>
                             </div>
                           )}

                           <div className="pt-2 border-t border-dashed border-[#f0f2f5] flex justify-between items-center text-[11px] font-bold text-indigo-600">
                              <span className="opacity-60">Admin Commission ({commissionPercentage}%)</span>
                              <span className="font-mono">₱{commissionAmount.toLocaleString()}</span>
                           </div>
                           
                           <div className="pt-3 border-t-2 border-primary/10 flex justify-between items-center text-[12px] font-black text-primary uppercase tracking-tight">
                              <span>Final Agreed Amount</span>
                              <span className="font-mono">₱{Math.round(details.total_amount || 0).toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="bg-[#f8f9fb] rounded-[32px] p-8 space-y-10">
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-emerald-500" />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Verified Inclusions</p>
                           </div>
                           <div className="grid grid-cols-1 gap-1.5">
                              {incs.map((inc, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm font-bold text-primary italic">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                                   {inc}
                                </div>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-4 pt-8 border-t border-slate-200/50">
                           <div className="flex items-center gap-2">
                              <X size={14} className="text-rose-400" />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 uppercase">Verified Exclusions</p>
                           </div>
                           <div className="grid grid-cols-1 gap-1.5 opacity-60">
                              {excs.map((exc, i) => (
                                 <div key={i} className="flex items-center gap-3 text-sm font-bold text-text-secondary italic">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    {exc}
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="h-10 w-full" />
               <div className="space-y-10">
                  <div className="flex items-center gap-3">
                    <MapIcon size={20} className="text-primary opacity-20" />
                    <h3 className="text-xl font-black text-primary tracking-tight italic">Snapshotted Itinerary</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-8 relative">
                     <div className="absolute left-6 top-8 bottom-8 w-px bg-[#f0f2f5] -translate-x-1/2" />
                     {quote.items?.map((item: any, i: number) => (
                        <div key={i} className="flex gap-10 items-start relative pb-4">
                           <div className="w-12 h-12 rounded-[18px] bg-white border-4 border-[#f0f2f5] flex flex-col items-center justify-center shrink-0 shadow-sm z-10 sticky top-[72px]">
                              <span className="text-[7px] font-black uppercase opacity-40 leading-none mb-0.5">D{item.day_number}</span>
                              <span className="text-xs font-black text-primary leading-none">{new Date(item.date).getDate()}</span>
                           </div>
                           <div className="flex-1 space-y-4 pt-1">
                              <div className="space-y-1.5">
                                 <div className="flex items-center justify-between">
                                    <h4 className="text-base font-black text-primary tracking-tight">{item.destination}</h4>
                                 </div>
                                 <p className="text-[11px] font-bold text-text-tertiary leading-relaxed max-w-2xl">{item.itinerary_details}</p>
                              </div>

                              {item.guest_accommodation_name && (
                                <div className="flex items-center gap-4 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/30 max-w-md transition-all hover:bg-emerald-50">
                                   <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                      <Receipt size={14} />
                                   </div>
                                   <div>
                                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Confirmed Stay</p>
                                      <p className="text-[11px] font-black text-primary leading-none mt-0.5 italic">{item.guest_accommodation_name}</p>
                                   </div>
                                </div>
                              )}

                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                   {item.tags.map((tag: string, ti: number) => (
                                     <span key={ti} className="px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded text-[7px] font-black uppercase tracking-widest">{tag}</span>
                                   ))}
                                </div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Section 2: Financial Command Center */}
         <div 
           className="w-full max-w-4xl mx-auto"
           style={{ marginTop: '20px' }}
         >
            <div className="relative">
               {/* Decorative Background Elements */}
               <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
               <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

               <div className="bg-white rounded-3xl md:rounded-[48px] p-4 md:p-6 lg:!p-[40.5px] shadow-2xl shadow-primary/[0.05] border border-[#e8eaed] relative overflow-hidden">
                  <div className="relative space-y-16">
                     
                     {/* Dashboard Header Blocks */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50/40 rounded-2xl p-10 relative group transition-all">
                           <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
                              <ShieldCheck size={48} className="text-emerald-600" />
                           </div>
                           <div className="relative space-y-4">
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.25em] leading-loose">Verified Collections</p>
                              <div className="flex items-baseline gap-2">
                                 <span className="text-lg font-bold text-emerald-600 opacity-30">₱</span>
                                 <span className="text-4xl font-black text-primary tracking-tighter tabular-nums leading-none">{totalPaid.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="px-2 py-0.5 bg-white/60 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest">
                                    Audited Ledger
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Card 2: Balance */}
                        <div className={`rounded-2xl p-12 relative group transition-all ${
                           balanceRemaining > 0 ? 'bg-amber-50/40' : 'bg-emerald-50/40'
                        }`}>
                           <div className="relative space-y-5">
                              <p className={`text-[9px] font-black uppercase tracking-[0.25em] leading-loose ${
                                 balanceRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'
                              }`}>Outstanding Balance</p>
                              <div className="flex items-baseline gap-2">
                                 {balanceRemaining > 0 && <span className="text-lg font-bold text-amber-600 opacity-30">₱</span>}
                                 <span className={`text-4xl font-black tracking-tighter tabular-nums leading-none ${
                                    balanceRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'
                                 }`}>
                                    {balanceRemaining > 0 ? balanceRemaining.toLocaleString() : 'SETTLED'}
                                 </span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                    balanceRemaining > 0 ? 'bg-white/60 text-amber-600' : 'bg-white/60 text-emerald-600'
                                 }`}>
                                    {balanceRemaining > 0 ? 'Awaiting Remittance' : 'Contract Complete'}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4 pt-10">
                         <div className="flex items-end justify-between px-8">
                            <div className="flex items-center gap-2.5">
                               <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                  <motion.div
                                    animate={paymentProgress < 100 ? { rotate: 360 } : {}}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Settings size={14} strokeWidth={2.5} />
                                  </motion.div>
                               </div>
                               <div>
                                  <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Agreement Milestone</h4>
                                  <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest opacity-40">Financial Progression</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <span className="text-2xl font-black text-primary tracking-tighter tabular-nums leading-none">{paymentProgress.toFixed(0)}%</span>
                            </div>
                         </div>
  
                         <div className="relative pt-2">
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${paymentProgress}%` }}
                                  transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                                  className={`h-full relative group ${
                                     isFullyPaid ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-primary'
                                  }`}
                               >
                                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                               </motion.div>
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[7px] font-black uppercase tracking-[0.3em] text-text-tertiary/30 px-12">
                               <span>Deposit Pending</span>
                               <span>Full Settlement</span>
                            </div>
                         </div>
                      </div>

                     {/* Transaction Ledger Section */}
                     <div 
                        className="pt-16 border-t border-slate-100"
                        style={{ marginTop: '14px' }}
                     >
                        <div className="flex flex-col md:flex-row items-baseline md:items-center justify-between gap-6 mb-10 px-8">
                           <div className="space-y-1.5 font-sans">
                              <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.25em] leading-tight">Transaction Ledger</h3>
                              <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest opacity-40 leading-relaxed">Verified cryptographic audit trail of manual recordings</p>
                           </div>
                           <div className="px-3 py-1 bg-slate-50 border border-slate-100 text-primary rounded-md text-[9px] font-black uppercase tracking-widest">
                              {payments.length} {payments.length === 1 ? 'Entry' : 'Entries'}
                           </div>
                        </div>

                        <div className="space-y-4">
                           {payments.length > 0 ? (
                             payments.map((p, idx) => (
                              <motion.div 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: idx * 0.05 }}
                                 key={p.id} 
                                 className="group bg-white rounded-3xl p-6 border border-[#e8eaed] hover:border-primary/20 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.03)] transition-all flex flex-col md:flex-row md:items-center gap-8"
                              >
                                 <div className="flex items-center gap-6 md:flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-[#f8f9fb] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0 shadow-sm border border-gray-50">
                                       <CreditCard size={24} />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                       <div className="flex items-center gap-4">
                                          <p className="text-2xl font-black text-primary tracking-tighter tabular-nums">₱{p.amount.toLocaleString()}</p>
                                          <div className="px-3 py-1 bg-emerald-50 border border-emerald-100/50 rounded-full flex items-center gap-1.5">
                                             <ShieldCheck size={10} className="text-emerald-600" />
                                             <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Verified Instance</span>
                                          </div>
                                       </div>
                                       <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                          <span className="text-[11px] font-black text-primary/40 uppercase tracking-widest">{p.payment_method}</span>
                                          <div className="w-1 h-1 rounded-full bg-gray-200" />
                                          <span className="text-[11px] font-medium text-text-tertiary">{new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                          {p.reference_number && (
                                             <span className="text-[11px] font-black text-indigo-500/60 uppercase tracking-widest">#{p.reference_number}</span>
                                          )}
                                       </div>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-6 justify-end md:shrink-0">
                                    {p.notes && (
                                       <div className="hidden lg:block">
                                          <p className="text-[10px] font-medium text-text-tertiary italic bg-[#f8f9fb] px-4 py-2 rounded-xl border border-gray-100 max-w-[200px] truncate">
                                             "{p.notes}"
                                          </p>
                                       </div>
                                    )}
                                    <button 
                                       onClick={() => handleVoidPayment(p.id)}
                                       className="h-12 w-12 rounded-2xl text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-transparent hover:border-red-100 group/btn"
                                       title="Void Transaction"
                                    >
                                       <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                 </div>
                              </motion.div>
                             ))
                           ) : (
                              <div className="py-20 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center group">
                                 <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-emerald-100 mb-6 border border-slate-100 group-hover:scale-105 transition-transform shadow-sm">
                                    <Receipt size={32} />
                                 </div>
                                 <div className="space-y-2 px-6">
                                    <h4 className="text-[12px] font-black text-primary uppercase tracking-[0.2em] opacity-80">No Capital Inflow Detected</h4>
                                    <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest opacity-40 max-w-[280px] leading-relaxed">
                                       Financial ledger is currently empty. Record your first payment to initiate audit trail.
                                    </p>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Section 3: Action Buttons */}
         <div 
           className="pb-32 space-y-10 w-full max-w-4xl"
           style={{ marginTop: '20px' }}
         >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-10 flex-wrap">
               <button 
                  onClick={onReconfigure}
                  className="active:scale-95 group"
                  style={btnPillarSecondary}
               >
                  <Settings size={18} className="opacity-60 group-hover:rotate-45 transition-transform" /> Reconfigure Quote
               </button>
               <button 
                  onClick={onBack}
                  className="active:scale-95 group"
                  style={btnPillarPrimary}
               >
                  Back to Dashboard <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
         </div>
      </main>

      <AnimatePresence>
        {isPaymentModalOpen && (
          <div style={modalOverlay}>
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               transition={{ type: 'spring', damping: 25, stiffness: 300 }}
               style={{ ...modalCard, width: '100%', maxWidth: '540px' }}
             >
               <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 style={modalTitle}>Record Payment</h3>
                    <p style={{ ...sectionLabel, color: 'var(--color-brand)', marginTop: '4px' }}>Update collection status</p>
                  </div>
                  <button 
                    onClick={() => setIsPaymentModalOpen(false)} 
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900"
                  >
                    <X size={20} />
                  </button>
               </div>

               <form onSubmit={(e: any) => {
                 e.preventDefault();
                 handleAddPayment({
                   amount: e.target.amount.value,
                   method: e.target.method.value,
                   reference: e.target.reference.value,
                   notes: e.target.notes.value
                 });
               }} style={modalFormSpace}>
                 <div className="space-y-6">
                   <div>
                      <p style={{ ...sectionLabel, marginBottom: '20px' }}>Transaction Details</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label style={labelStyle}>Payment Method</label>
                          <select 
                            name="method" 
                            required 
                            style={inputStyle}
                            onFocus={inputFocus}
                            onBlur={inputBlur}
                          >
                            <option value="GCash">GCash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label style={labelStyle}>Amount (₱)</label>
                          <input 
                            type="number" 
                            name="amount" 
                            required 
                            step="0.01" 
                            placeholder="0.00" 
                            style={inputStyle}
                            onFocus={inputFocus}
                            onBlur={inputBlur}
                          />
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label style={labelStyle}>Reference # (Optional)</label>
                        <input 
                          type="text" 
                          name="reference" 
                          placeholder="Ref ID" 
                          style={inputStyle}
                          onFocus={inputFocus}
                          onBlur={inputBlur}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label style={labelStyle}>Notes (Optional)</label>
                        <input 
                          type="text" 
                          name="notes" 
                          placeholder="Internal Notes" 
                          style={inputStyle}
                          onFocus={inputFocus}
                          onBlur={inputBlur}
                        />
                      </div>
                   </div>
                 </div>

                 <div className="pt-8">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    style={{
                      ...btnAction,
                      width: '100%',
                      height: '52px',
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Clock size={18} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recording Transaction...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Confirm Transaction Record</span>
                      </>
                    )}
                  </button>
                </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
