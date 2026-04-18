"use client";

import { CheckCircle, Clock, ShieldCheck, Map as MapIcon, Receipt, Trash2, Plus, X, Settings, ArrowRight, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuoteData } from "./types";

interface ConfirmedSummaryProps {
  quote: QuoteData;
  onReconfigure: () => void;
  onBack: () => void;
  payments: any[];
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (v: boolean) => void;
  handleAddPayment: (data: any) => void;
  handleVoidPayment: (id: string) => void;
}

export default function ConfirmedSummary({
  quote,
  onReconfigure,
  onBack,
  payments,
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  handleAddPayment,
  handleVoidPayment
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

         <div className="w-full max-w-4xl pt-20 mx-auto">
            <div className="bg-white rounded-[48px] p-10 shadow-2xl shadow-primary/[0.05] border border-[#e8eaed] relative overflow-hidden w-full">
               <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.02] rounded-full -mr-40 -mt-40 blur-3xl shadow-sm" />
               <div className="relative max-w-[92%] mx-auto space-y-12">
                  <div className="flex justify-between items-end">
                     <div className="space-y-1.5">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] opacity-40">Financial Collection</p>
                        <p className="text-3xl font-black text-primary tracking-tighter italic">₱{totalPaid.toLocaleString()}</p>
                     </div>
                     <div className="text-right space-y-1.5">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] opacity-40">Agreement Balance</p>
                        <p className={`text-xl font-black ${balanceRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'} italic`}>
                           {balanceRemaining > 0 ? `₱${balanceRemaining.toLocaleString()}` : 'FULLY PAID'}
                        </p>
                     </div>
                  </div>

                  <div className="space-y-5">
                     <div className="h-2 w-full bg-[#f8f9fb] rounded-full overflow-hidden border border-[#e8eaed]/50">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${paymentProgress}%` }}
                           className={`h-full ${isFullyPaid ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}
                        />
                     </div>
                     <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-text-tertiary opacity-40">
                        <span>Initiated</span>
                        <span>{paymentProgress.toFixed(0)}% Complete</span>
                        <span>Full Settlement</span>
                     </div>
                  </div>

                  <div className="h-px w-full bg-[#f0f2f5] relative z-10" />

                  <div className="relative">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-5">
                           <div className="w-8 h-8 rounded-xl bg-[#f8f9fb] border border-[#e8eaed] flex items-center justify-center text-primary">
                              <Clock size={14} />
                           </div>
                           <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-0.5 opacity-60">Complete audit trail for this quotation</p>
                        </div>
                        <div className="px-5 py-2.5 bg-primary/5 text-primary rounded-full text-[11px] font-black uppercase tracking-widest">
                           {payments.length} Installments
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-2">
                        {payments.length > 0 ? payments.map((p) => (
                           <div key={p.id} className="bg-[#f8f9fb] rounded-xl px-4 py-2.5 border border-[#e8eaed]/50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                                    <Receipt size={12} />
                                 </div>
                                 <p className="text-sm font-black text-primary tracking-tight">₱{p.amount.toLocaleString()}</p>
                                 <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-widest">Confirmed</span>
                                 <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider opacity-70">{p.payment_method} · {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                 {p.reference_number && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">Ref: {p.reference_number}</span>}
                              </div>
                              <button 
                                 onClick={() => handleVoidPayment(p.id)}
                                 className="h-7 w-7 rounded-lg text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0"
                              >
                                 <Trash2 size={13} />
                              </button>
                           </div>
                        )) : (
                           <div className="py-20 bg-[#f8f9fb] rounded-[48px] border-2 border-dashed border-[#e8eaed] flex flex-col items-center justify-center text-center">
                              <div className="w-24 h-24 rounded-[32px] bg-white flex items-center justify-center text-text-tertiary/20 mb-8 shadow-sm">
                                 <Receipt size={48} />
                              </div>
                              <h4 className="text-xl font-black text-primary/30 uppercase tracking-[0.25em]">No Records Found</h4>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="pt-24 pb-20 space-y-8">
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

         <AnimatePresence>
            {isPaymentModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                 <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-2xl font-bold text-primary">Record Payment</h3>
                       <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-[#f0f2f5] rounded-full transition-colors">
                         <X size={24} />
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
                    }} className="space-y-4">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Collection Details</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-secondary ml-1">Payment Method</label>
                            <select name="method" required className="input" style={{ height: '40px' }}>
                              <option value="GCash">GCash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cash">Cash</option>
                              <option value="Credit Card">Credit Card</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-text-secondary ml-1">Amount (₱)</label>
                            <input type="number" name="amount" required step="0.01" max={balanceRemaining} placeholder="0" className="input" style={{ height: '40px' }} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#f0f2f5]">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-text-secondary ml-1">Reference # (Optional)</label>
                          <input type="text" name="reference" placeholder="e.g. GCash Ref ID" className="input" style={{ height: '40px' }} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-text-secondary ml-1">Notes (Optional)</label>
                          <input type="text" name="notes" placeholder="e.g. Initial Deposit" className="input" style={{ height: '40px' }} />
                        </div>
                      </div>
                      <div className="pt-6">
                        <button type="submit" className="w-full h-12 bg-primary text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-95 text-[10px] shadow-lg shadow-primary/20">
                          <CreditCard size={16} />
                          Confirm Transaction Record
                        </button>
                      </div>
                    </form>
                  </motion.div>
              </div>
            )}
         </AnimatePresence>
      </main>
    </div>
  );
}
