"use client";

import { CheckCircle, Clock, ShieldCheck, Map as MapIcon, Receipt, Trash2, Plus, X, Settings, ArrowRight, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuoteData } from "./types";
import { 
  modalOverlay, modalCard, modalTitle, modalFormSpace, 
  inputStyle, labelStyle, sectionLabel, btnPrimary,
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
  isSaving = false
}: ConfirmedSummaryProps) {
  const details = quote.selected_package_details || {};
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceRemaining = Math.max(0, (details.total_amount || 0) - totalPaid);
  const paymentProgress = details.total_amount > 0 ? (totalPaid / details.total_amount) * 100 : 0;
  const isFullyPaid = balanceRemaining <= 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      <header className="h-16 bg-white border-b border-[#e8eaed] sticky top-0 z-50 shadow-sm safe-top">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="h-10 w-10 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-secondary hover:bg-[#f0f2f5] transition-all">
              <CheckCircle size={20} className="text-emerald-500" />
            </button>
            <h1 className="text-xl font-bold text-primary tracking-tight italic">Confirmed Record</h1>
          </div>
          <div className="flex items-center gap-3">
             {!isFullyPaid && (
               <button 
                 onClick={() => setIsPaymentModalOpen(true)}
                 className="h-10 px-5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
               >
                 <Plus size={16} /> Record Payment
               </button>
             )}
             <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                <CheckCircle size={12} /> Confirmed Deal
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full p-4 md:p-6 lg:!p-[40.5px] space-y-6 md:space-y-[40.5px] flex flex-col items-center">
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
                           <p className="text-4xl font-black text-primary tracking-tighter italic">₱{details.total_amount?.toLocaleString()}</p>
                        </div>
                        <div className="space-y-2 translate-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Rate Per Pax ({details.pax_count})</label>
                           <p className="text-xl font-bold text-emerald-600 font-mono tracking-tight bg-emerald-50 px-3 py-1 rounded-xl">₱{details.per_pax?.toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="mt-16 mb-16 pt-8 pb-10 border-t border-[#f0f2f5] space-y-4 max-w-[280px]">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-60">Bill Breakdown</p>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-[11px] font-bold text-text-tertiary">
                              <span>Base Package Rate</span>
                              <span className="font-mono">₱{((details.total_amount || 0) - (details.adjustments?.extra_fees?.reduce((a: any, b: any) => a + b.amount, 0) || 0) + (details.adjustments?.discount || 0)).toLocaleString()}</span>
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
                           
                           <div className="pt-3 border-t-2 border-primary/10 flex justify-between items-center text-[12px] font-black text-primary uppercase tracking-tight">
                              <span>Final Agreed Amount</span>
                              <span className="font-mono">₱{details.total_amount?.toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="bg-[#f8f9fb] rounded-[32px] p-10 space-y-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-60">Verified Inclusions</p>
                        <div className="grid grid-cols-1 gap-3">
                           {details.inclusions?.vehicle && <div className="flex items-center gap-3 text-sm font-bold text-primary"><CheckCircle size={16} className="text-emerald-500" /> Professional Transport</div>}
                           {details.inclusions?.fuel && <div className="flex items-center gap-3 text-sm font-bold text-primary"><CheckCircle size={16} className="text-emerald-500" /> Fuel & Logistics included</div>}
                           {details.inclusions?.misc_details?.map((m: any, i: number) => (
                             <div key={i} className="flex items-center gap-3 text-sm font-bold text-primary">
                                <CheckCircle size={16} className="text-emerald-500" strokeWidth={2.5} /> {m.name}
                             </div>
                           ))}
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
                     {details.itinerary_snapshot?.map((day: any, i: number) => (
                        <div key={i} className="flex gap-10 items-start relative">
                           <div className="w-12 h-12 rounded-[18px] bg-white border-4 border-[#f0f2f5] flex flex-col items-center justify-center shrink-0 shadow-sm z-10">
                              <span className="text-[7px] font-black uppercase opacity-40 leading-none mb-0.5">D{day.day}</span>
                              <span className="text-xs font-black text-primary leading-none">{new Date(day.date).getDate()}</span>
                           </div>
                           <div className="pt-2">
                              <p className="font-black text-primary text-base italic leading-none">{day.destination}</p>
                              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-1 opacity-60">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                              {day.details && (
                                <p className="text-xs font-medium text-text-tertiary leading-relaxed mt-4 p-5 bg-[#f8f9fb] rounded-2xl border border-gray-50 max-w-2xl">{day.details}</p>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Section 2: Financial Command Center */}
         <div className="w-full max-w-4xl pt-16">
            <div className="relative">
               {/* Decorative Background Elements */}
               <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
               <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

               <div className="bg-white rounded-[48px] p-2 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.08)] border border-gray-100 relative overflow-hidden">
                  <div className="p-8 md:p-12 space-y-12">
                     
                     {/* Dashboard Header Blocks */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card 1: Collected */}
                        <div className="bg-gradient-to-br from-[#f8fcfb] to-white border border-emerald-100/50 rounded-[32px] p-8 relative overflow-hidden group shadow-sm shadow-emerald-500/5">
                           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                              <ShieldCheck size={48} className="text-emerald-600" />
                           </div>
                           <div className="relative space-y-4">
                              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em] ml-1">Total Funds Collected</p>
                              <div className="flex items-baseline gap-2">
                                 <span className="text-xl font-bold text-emerald-700 opacity-40">₱</span>
                                 <span className="text-5xl font-black text-primary tracking-tight tabular-nums">{totalPaid.toLocaleString()}</span>
                              </div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                 <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Verified Revenue</span>
                              </div>
                           </div>
                        </div>

                        {/* Card 2: Balance */}
                        <div className={`border rounded-[32px] p-8 relative overflow-hidden group transition-all shadow-sm ${
                           balanceRemaining > 0 ? 'bg-gradient-to-br from-[#fffcf8] to-white border-amber-100/50 shadow-amber-500/5' : 'bg-gradient-to-br from-[#f8fcfb] to-white border-emerald-100/50 shadow-emerald-500/5'
                        }`}>
                           <div className="relative space-y-4">
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${
                                 balanceRemaining > 0 ? 'text-amber-600/60' : 'text-emerald-600/60'
                              }`}>Outstanding Agreement Balance</p>
                              <div className="flex items-baseline gap-2">
                                 {balanceRemaining > 0 && <span className="text-xl font-bold text-amber-700 opacity-40">₱</span>}
                                 <span className={`text-5xl font-black tracking-tight tabular-nums ${
                                    balanceRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'
                                 }`}>
                                    {balanceRemaining > 0 ? balanceRemaining.toLocaleString() : 'SETTLED'}
                                 </span>
                              </div>
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                                 balanceRemaining > 0 ? 'bg-amber-500/10 border-amber-500/10' : 'bg-emerald-500/10 border-emerald-500/10'
                              }`}>
                                 <span className={`text-[9px] font-black uppercase tracking-widest ${
                                    balanceRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'
                                 }`}>
                                    {balanceRemaining > 0 ? 'Awaiting Remittance' : 'Full Contract Settlement'}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between px-2">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                 <motion.div
                                   animate={paymentProgress < 100 ? { rotate: 360 } : {}}
                                   transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                 >
                                   <Settings size={18} />
                                 </motion.div>
                              </div>
                              <div>
                                 <h4 className="text-xs font-black text-primary uppercase tracking-[0.15em]">Collection Milestone</h4>
                                 <p className="text-[10px] font-medium text-text-tertiary">Billing progress for current quotation</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="text-3xl font-black text-primary tracking-tighter tabular-nums">{paymentProgress.toFixed(0)}%</span>
                           </div>
                        </div>

                        <div className="relative">
                           <div className="h-4 w-full bg-[#f8f9fb] rounded-full overflow-hidden border border-[#e8eaed]/40 p-1 shadow-inner">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${paymentProgress}%` }}
                                 transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                                 className={`h-full rounded-full relative group ${
                                    isFullyPaid ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-primary/80 to-primary'
                                 }`}
                              >
                                 <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.div>
                           </div>
                           <div className="flex justify-between items-center mt-4 text-[9px] font-black uppercase tracking-[0.25em] text-text-tertiary/40 px-2">
                              <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-current" /> Contract Initiated</div>
                              <div className="flex items-center gap-2">Final Settlement <span className="w-1 h-1 rounded-full bg-current" /></div>
                           </div>
                        </div>
                     </div>

                     {/* Transaction Ledger Section */}
                     <div className="pt-12 border-t border-[#f0f2f5]">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                           <div className="space-y-2">
                              <h3 className="text-lg font-black text-primary uppercase tracking-widest">Transaction Ledger</h3>
                              <div className="text-xs font-medium text-text-tertiary flex items-center gap-2">
                                 <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                 <div className="text-xs font-medium text-text-tertiary">Real-time cryptographic audit trail of all manual recordings</div>
                              </div>
                           </div>
                           <div className="px-6 py-3 bg-white border-2 border-[#f0f2f5] text-primary rounded-[20px] text-[11px] font-black uppercase tracking-[0.15em] shadow-sm">
                              {payments.length} {payments.length === 1 ? 'Installment' : 'Installments'} Recorded
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
                              <div className="py-24 bg-[#f8fcfb] rounded-[48px] border-2 border-dashed border-emerald-100/50 flex flex-col items-center justify-center text-center group">
                                 <div className="w-24 h-24 rounded-[36px] bg-white flex items-center justify-center text-emerald-100 mb-8 border border-emerald-50 group-hover:scale-110 transition-transform shadow-sm">
                                    <Receipt size={48} />
                                 </div>
                                 <div className="space-y-2">
                                    <h4 className="text-sm font-black text-emerald-900/40 uppercase tracking-[0.25em]">No Capital Inflow Detected</h4>
                                    <p className="text-[10px] text-emerald-800/30 font-medium max-w-[240px]">Financial ledger is currently empty. Record your first payment to initiate audit trail.</p>
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
         <div className="pt-24 pb-20 space-y-8 w-full max-w-4xl">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
               {quote.status !== 'Payment Complete' && (
               <button 
                  onClick={onReconfigure}
                  className="h-14 px-10 min-w-[220px] justify-center bg-white border border-[#e8eaed] text-text-tertiary rounded-2xl font-black text-[11px] uppercase tracking-widest hover:text-primary hover:border-primary/20 transition-all flex items-center gap-3 shadow-sm hover:shadow-xl active:scale-95 whitespace-nowrap"
               >
                  <Settings size={18} className="opacity-40" /> Reconfigure Quote
               </button>
               )}
               <button 
                  onClick={onBack}
                  className="h-14 px-10 min-w-[220px] justify-center bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-95 transition-all shadow-2xl shadow-primary/20 flex items-center gap-3 active:scale-95 whitespace-nowrap"
               >
                  Back to Dashboard <ArrowRight size={18} />
               </button>
            </div>
            <div className="text-center">
               <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest opacity-40">This is a locked confirmation record. Reconfiguring will unlock the quote for adjustments.</p>
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
                      ...btnPrimary,
                      width: '100%',
                      height: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 12px 24px -6px rgba(16, 185, 129, 0.25)'
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
