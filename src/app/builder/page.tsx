"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, Save, MapPin, Users, Car, Calendar, 
  Plus, Trash2, Calculator, Info, Fuel, Map as MapIcon, Minus,
  Settings, Clock, Sparkles, CreditCard, Receipt, ShieldCheck, Percent, Star,
  ChevronRight, ArrowRight, Loader2, Copy, Printer, CheckCircle, X, FileText, Check, AlertTriangle, BedDouble, ChevronDown
} from "lucide-react";
import { AREA_DEFAULTS } from "@/data/presets";
import { useAuth } from "@/lib/auth";

// --- Types ---
interface ExtraFee {
  id: string;
  name: string;
  amount: number;
}

interface QuoteItem {
  id?: string;
  day_number: number;
  date: string;
  destination: string;
  itinerary_details: string;
  vehicle_rate: number;
  km: number;
  km_per_l: number;
  fuel_price: number;
  dynamic_costs: Record<string, number>;
  row_total: number;
  is_manual?: boolean;
  applied_preset_id?: string;
  tags: string[];
  guest_accommodation_id?: string;
  guest_accommodation_amount?: number;
}

interface QuoteData {
  id?: string | null;
  customer_name: string;
  fb_name: string;
  contact_number: string;
  pax_count: number;
  eta: string;
  etd: string;
  vehicle_model: string;
  pickup_location: string;
  dropoff_location: string;
  notes: string;
  default_fuel_price: number;
  admin_commission: number;
  status?: string;
  quotation_text?: string | null;
  selected_package?: string | null;
  selected_package_total?: number | null;
  selected_package_details?: any | null;
  confirmed_at?: string | null;
  items: QuoteItem[];
  extra_fees_json?: ExtraFee[];
  discount_total?: number;
}
 
function TagSelector({ options, selectedTags, onChange }: { options: string[], selectedTags: string[], onChange: (tags: string[]) => void }) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {options.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`inline-flex items-center px-1.5 rounded text-[5.5px] font-black uppercase tracking-wide transition-all leading-none cursor-pointer hover:scale-110 active:scale-95 ${
              isActive 
                ? "bg-rose-500 text-white shadow-sm hover:bg-rose-600" 
                : "bg-[#f0f2f5] text-text-tertiary/40 hover:text-text-tertiary/70 hover:bg-[#e8eaed]"
            }`}
            style={{ height: '14px', minHeight: '14px', padding: '0 6px' }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

// --- Helper Components ---
function ConfirmedSummary({ quote, onReconfigure, onBack }: { quote: any, onReconfigure: () => void, onBack: () => void }) {
  const baseDetails = quote.selected_package_details || {
    package_name: quote.selected_package || 'Custom Bundle',
    total_amount: quote.selected_package_total || quote.grand_total,
    pax_count: quote.pax_count,
    per_pax: Math.round((quote.selected_package_total || quote.grand_total) / (quote.pax_count || 1)),
    inclusions: { vehicle: true, fuel: true, misc_details: [] },
    itinerary_snapshot: quote.items || []
  };

  const details = {
    ...baseDetails,
    adjustments: baseDetails.adjustments || { 
      extra_fees: quote.extra_fees_json || [], 
      discount: quote.discount_total || 0 
    }
  };

  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { profile } = useAuth();
  
  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, profiles:created_by(full_name)')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [quote.id]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const balanceRemaining = Math.max(0, details.total_amount - totalPaid);
  const isFullyPaid = totalPaid >= details.total_amount;
  const paymentProgress = Math.min(100, (totalPaid / (details.total_amount || 1)) * 100);

  const handleAddPayment = async (formData: any) => {
    try {
      const { error: payError } = await supabase
        .from('payments')
        .insert([{
          quote_id: quote.id,
          amount: parseFloat(formData.amount),
          payment_method: formData.method,
          reference_number: formData.reference,
          notes: formData.notes,
          created_by: profile?.id
        }]);
      
      if (payError) throw payError;

      const newTotalPaid = totalPaid + parseFloat(formData.amount);
      const newStatus = newTotalPaid >= details.total_amount ? 'Payment Complete' : 'Payment Started';

      const { error: statusError } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quote.id);
      
      if (statusError) {
        console.error('Status update after payment failed:', statusError);
        alert(`Payment recorded, but status update failed: ${statusError.message}`);
      }
      
      await fetchPayments();
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment. Please try again.');
    }
  };

  const handleVoidPayment = async (id: string) => {
    if (!confirm('Are you sure you want to void this payment?')) return;
    try {
      const paymentToVoid = payments.find(p => p.id === id);
      if (!paymentToVoid) return;

      const { error: delError } = await supabase.from('payments').delete().eq('id', id);
      if (delError) throw delError;

      const remainingPaid = totalPaid - paymentToVoid.amount;
      let nextStatus = 'Confirmed';
      if (remainingPaid >= details.total_amount) nextStatus = 'Payment Complete';
      else if (remainingPaid > 0) nextStatus = 'Payment Started';

      await supabase.from('quotes').update({ status: nextStatus }).eq('id', quote.id);
      await fetchPayments();
    } catch (err) {
      console.error('Error voiding payment:', err);
    }
  };

  
  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      <header className="h-16 bg-white border-b border-[#e8eaed] sticky top-0 z-50 shadow-sm safe-top">
        <div className="max-w-4xl mx-auto h-full flex items-center justify-between px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="h-10 w-10 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-secondary hover:bg-[#f0f2f5] transition-all">
              <ChevronLeft size={20} />
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
                           <p className="text-4xl font-black text-primary tracking-tighter italic">₱{details.total_amount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-2 translate-y-1">
                           <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Rate Per Pax ({details.pax_count})</label>
                           <p className="text-xl font-bold text-emerald-600 font-mono tracking-tight bg-emerald-50 px-3 py-1 rounded-xl">₱{details.per_pax.toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="mt-[66px] mb-[66px] pt-8 pb-10 border-t border-[#f0f2f5] space-y-4 max-w-[280px]">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-60">Bill Breakdown</p>
                           <div className="space-y-3">
                              <div className="flex justify-between items-center text-[11px] font-bold text-text-tertiary">
                                 <span>Base Package Rate</span>
                                 <span className="font-mono">₱{(quote.selected_package_total || (details.total_amount - (details.adjustments?.extra_fees?.reduce((a: any, b: any) => a + b.amount, 0) || 0) + (details.adjustments?.discount || 0))).toLocaleString()}</span>
                              </div>
                              {details.adjustments?.extra_fees?.map((f: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[11px] font-bold text-indigo-600">
                                   <span className="opacity-60">{f.name}</span>
                                   <span className="font-mono">+ ₱{f.amount.toLocaleString()}</span>
                                </div>
                              ))}
                              
                              {(details.adjustments?.discount > 0) && (
                                <div className="pt-2 border-t border-dashed border-[#f0f2f5] flex justify-between items-center text-[11px] font-black text-primary/60">
                                   <span>Subtotal</span>
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
                                 <span className="font-mono">₱{details.total_amount.toLocaleString()}</span>
                              </div>
                           </div>
                        </div>
                  </div>

                   <div className="space-y-8">
                      <div className="bg-[#f8f9fb] rounded-[32px] p-10 space-y-6">
                         <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-60">Verified Inclusions</p>
                         <div className="grid grid-cols-1 gap-3">
                            {details.inclusions.vehicle && <div className="flex items-center gap-3 text-sm font-bold text-primary"><CheckCircle size={16} className="text-emerald-500" /> Professional Transport</div>}
                            {details.inclusions.fuel && <div className="flex items-center gap-3 text-sm font-bold text-primary"><CheckCircle size={16} className="text-emerald-500" /> Fuel & Logistics included</div>}
                            {details.inclusions.misc_details.map((m: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 text-sm font-bold text-primary">
                                 <CheckCircle size={16} className="text-emerald-500" strokeWidth={2.5} /> {m.name}
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
               </div>

               <div className="h-[40.5px] w-full" />
               <div className="space-y-[40.5px]">
                  <div className="flex items-center gap-3">
                    <MapIcon size={20} className="text-primary opacity-20" />
                    <h3 className="text-xl font-black text-primary tracking-tight italic">Snapshotted Itinerary</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-8 relative">
                     <div className="absolute left-6 top-8 bottom-8 w-px bg-[#f0f2f5] -translate-x-1/2" />
                     {details.itinerary_snapshot.map((day: any, i: number) => (
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
            <div className="bg-white rounded-[48px] !p-[40.5px] shadow-2xl shadow-primary/[0.05] border border-[#e8eaed] relative overflow-hidden w-full">
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
                           <div>
                              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-0.5 opacity-60">Complete audit trail for this quotation</p>
                           </div>
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
                                 {p.notes && <span className="text-[9px] font-medium text-text-tertiary italic truncate max-w-[150px]">{p.notes.length > 20 ? p.notes.substring(0, 20) + '…' : p.notes}</span>}
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
                    className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center">
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
                      <div className="pt-3 border-t border-[#f0f2f5]">
                        <button type="submit" className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">
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



function QuoteBuilderFallback() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Loading Builder...</p>
      </div>
    </div>
  );
}

export default function QuoteBuilderPage() {
  return (
    <Suspense fallback={<QuoteBuilderFallback />}>
      <QuoteBuilder />
    </Suspense>
  );
}

function QuoteBuilder() {
  const router = useRouter();
  const { profile, loading: authLoading, selectedOperatorId } = useAuth();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('id');
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [dbPresets, setDbPresets] = useState<any[]>([]);
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const [dbMiscPresets, setDbMiscPresets] = useState<any[]>([]);
  const [dbPackagePresets, setDbPackagePresets] = useState<any[]>([]);
  const [livePackages, setLivePackages] = useState<any[]>([]);
  const [dbAccommodations, setDbAccommodations] = useState<any[]>([]);
  const [initialQuotationText, setInitialQuotationText] = useState<string>("");

  // Helper to format ISO dates for datetime-local input
  const formatForInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      // Use local timezone offset to prevent day-jumps
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };

  const [isReconfiguring, setIsReconfiguring] = useState(false);
  
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");

  const [discount, setDiscount] = useState<number>(0);
  const [openConfigId, setOpenConfigId] = useState<string | null>(null);

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'warning';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: 'confirm'
  });

  const openDialog = (config: Partial<typeof dialogConfig>) => {
    setDialogConfig(prev => ({ ...prev, ...config, isOpen: true }));
  };

  const [quote, setQuote] = useState<QuoteData>({
    customer_name: "",
    fb_name: "",
    contact_number: "",
    pax_count: 1,
    eta: "",
    etd: "",
    vehicle_model: "",
    pickup_location: "",
    dropoff_location: "",
    notes: "",
    default_fuel_price: 60,
    admin_commission: 0,
    status: "Draft",
    selected_package: null,
    selected_package_total: null,
    selected_package_details: null,
    confirmed_at: null,
    items: []
  });

  const parseTags = (tagStr: string | null) => {
    if (!tagStr) return [];
    return tagStr.split(',').map(t => t.trim()).filter(Boolean);
  };

  // Fetch dynamic agency data
  useEffect(() => {
    const fetchAgencyData = async () => {
      if (!selectedOperatorId) return;

      const [presetsRes, vehiclesRes, miscRes, pkgRes, accomRes] = await Promise.all([
        supabase.from('itinerary_presets').select('*').eq('operator_id', selectedOperatorId).order('title'),
        supabase.from('vehicles').select('*').eq('operator_id', selectedOperatorId).eq('is_active', true).order('pax_capacity'),
        supabase.from('misc_presets').select('*').eq('operator_id', selectedOperatorId).order('name'),
        supabase.from('package_presets').select('*').eq('operator_id', selectedOperatorId).order('display_order'),
        supabase.from('guest_accommodation').select('*').eq('operator_id', selectedOperatorId).order('pax_count')
      ]);

      if (presetsRes.data) setDbPresets(presetsRes.data);
      if (vehiclesRes.data) setDbVehicles(vehiclesRes.data);
      if (miscRes.data) setDbMiscPresets(miscRes.data);
      if (pkgRes.data) setDbPackagePresets(pkgRes.data);
      if (accomRes.data) setDbAccommodations(accomRes.data);
    };

    if (!authLoading && profile) {
      fetchAgencyData();
    }
  }, [selectedOperatorId, authLoading, profile]);

  // Handle Default Selection (Recommended)
  useEffect(() => {
    if (dbPackagePresets.length > 0 && !isLoaded) {
       // Only initialize if we're not loading an existing quote (which has its own logic)
       if (!quoteId) {
         setLivePackages(dbPackagePresets);
       }
    }
  }, [dbPackagePresets, quoteId, isLoaded]);

  useEffect(() => {
    if (livePackages.length > 0 && !selectedPackageId && !quoteId) {
      const recommended = livePackages.find(p => p.is_recommended);
      if (recommended) {
        setSelectedPackageName(recommended.title);
        setSelectedPackageId(recommended.id);
      }
    }
  }, [livePackages, selectedPackageId, quoteId]);

  // Load Existing Quote if ID present
  useEffect(() => {
    const loadQuote = async () => {
      if (!quoteId || !selectedOperatorId || isLoaded) return;

      const { data: qData, error: qError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
      
      if (qError) { console.error('Error loading quote:', qError); return; }

      const { data: itemsData, error: iError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('day_number');

      if (iError) { console.error('Error loading items:', iError); return; }

      // Map DB data to Frontend interface
      setQuote({
        id: qData.id,
        customer_name: qData.customer_name || "",
        fb_name: qData.fb_name || "",
        contact_number: qData.contact_number || "",
        pax_count: qData.pax_count || 1,
        eta: formatForInput(qData.eta),
        etd: formatForInput(qData.etd),
        vehicle_model: qData.vehicle_model || "",
        pickup_location: qData.pickup_location || "",
        dropoff_location: qData.dropoff_location || "",
        notes: qData.notes || "",
        status: qData.status || "Draft",
        selected_package: qData.selected_package || null,
        selected_package_total: qData.selected_package_total || null,
        selected_package_details: qData.selected_package_details || null,
        confirmed_at: qData.confirmed_at || null,
        default_fuel_price: qData.default_fuel_price || 60,
        admin_commission: qData.admin_commission || 0,
        extra_fees_json: qData.extra_fees_json || [],
        discount_total: qData.discount_total || 0,
        items: (itemsData || []).map(item => ({
          id: item.id,
          day_number: item.day_number,
          date: item.date,
          destination: item.destination || "",
          itinerary_details: item.itinerary_details || "",
          vehicle_rate: item.vehicle_rate || 0,
          km: item.km || 0,
          km_per_l: item.km_per_l || 10,
          fuel_price: item.fuel_price || 60,
          dynamic_costs: item.dynamic_costs || {},
          row_total: item.row_total || 0,
          applied_preset_id: item.applied_preset_id || "", 
          tags: parseTags(item.tags),
          guest_accommodation_id: item.guest_accommodation_id || "",
          guest_accommodation_amount: item.guest_accommodation_amount || 0,
          is_manual: true // Treat loaded quotes as manual so we don't snap back to defaults immediately
        }))
      });

      if (qData.extra_fees_json) setExtraFees(qData.extra_fees_json);
      if (qData.discount_total) setDiscount(qData.discount_total);
      if (qData.package_options_json) setLivePackages(qData.package_options_json);
      else if (dbPackagePresets.length > 0) setLivePackages(dbPackagePresets);

      if (qData.selected_package) setSelectedPackageName(qData.selected_package);
      if (qData.selected_package_id) setSelectedPackageId(qData.selected_package_id);
      if (qData.quotation_text) setInitialQuotationText(qData.quotation_text);
      
      setIsLoaded(true);
    };

    if (!authLoading && profile) {
      loadQuote();
    }
  }, [quoteId, selectedOperatorId, authLoading, profile, isLoaded]);

  // Handle Date Changes (Automatic Row Generation)
  useEffect(() => {
    // If it's an existing quote but hasn't finished loading yet, WAIT.
    if (quoteId && !isLoaded) return;
    
    if (quote.eta && quote.etd) {
      const start = new Date(quote.eta);
      const end = new Date(quote.etd);
      
      if (end >= start) {
        // Normalize both to midnight to count actual days, ignoring time discrepancies
        const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const days = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const newItems: QuoteItem[] = [];
        
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          const existing = quote.items.find(item => item.day_number === i + 1);
          if (existing) {
            newItems.push({ ...existing, date: dateStr });
          } else {
            newItems.push({
              day_number: i + 1,
              date: dateStr,
              destination: "",
              itinerary_details: "",
              vehicle_rate: 0,
              km: 0,
              km_per_l: 10,
              fuel_price: quote.default_fuel_price,
              dynamic_costs: {},
              tags: [],
              guest_accommodation_id: "",
              guest_accommodation_amount: 0,
              row_total: 0
            });
          }
        }

        const itemsChanged = JSON.stringify(quote.items) !== JSON.stringify(newItems);
        if (itemsChanged) {
          setQuote(prev => ({ ...prev, items: newItems }));
        }
      }
    }
  }, [quote.eta, quote.etd, quote.items.length, quoteId, isLoaded, quote.default_fuel_price]);

  // Auto-Vehicle Selection based on Pax
  useEffect(() => {
    if (dbVehicles.length > 0) {
      const fitting = dbVehicles.filter(v => v.pax_capacity >= quote.pax_count);
      if (fitting.length > 0) {
        const smallest = fitting[0];
        if (quote.vehicle_model !== smallest.model) {
          setQuote(prev => ({ ...prev, vehicle_model: smallest.model }));
        }
      }
    }
  }, [quote.pax_count, dbVehicles]);

  // Auto-Accommodation Selection based on Pax (closest >= pax_count)
  useEffect(() => {
    if (dbAccommodations.length === 0 || quote.items.length === 0) return;
    
    // Find closest accommodation where pax_count >= quote.pax_count
    const sorted = [...dbAccommodations].sort((a, b) => a.pax_count - b.pax_count);
    const match = sorted.find(a => a.pax_count >= quote.pax_count) || sorted[sorted.length - 1];
    if (!match) return;

    // Check if ANY item needs an accommodation set (and isn't manually locked)
    const needsUpdate = quote.items.some(item => !item.guest_accommodation_id && !item.is_manual);
    if (!needsUpdate) return;

    setQuote(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (!item.guest_accommodation_id && !item.is_manual) {
          const updated = { ...item, guest_accommodation_id: match.id, guest_accommodation_amount: match.amount };
          updated.row_total = calculateRowTotal(updated);
          return updated;
        }
        return item;
      })
    }));
  }, [quote.pax_count, dbAccommodations, quote.items]);

  // Update costs when vehicle changes
  useEffect(() => {
    if (quote.vehicle_model && dbVehicles.length > 0) {
      const v = dbVehicles.find(v => v.model === quote.vehicle_model);
      if (v) {
        setQuote(prev => ({
          ...prev,
          items: prev.items.map(item => {
            const updated = {
              ...item,
              vehicle_rate: item.is_manual ? item.vehicle_rate : (v.default_rate || 0),
              km_per_l: item.is_manual ? item.km_per_l : (v.km_per_l || 10),
              fuel_price: item.fuel_price || prev.default_fuel_price
            };
            return {
              ...updated,
              row_total: calculateRowTotal(updated)
            };
          })
        }));
      }
    }
  }, [quote.vehicle_model, dbVehicles, quote.items.length, quote.default_fuel_price]);

  // Intelligent Cost Reconciliation (Backfill Missing Defaults Safely)
  useEffect(() => {
    // If it's an existing quote but hasn't finished loading yet, WAIT.
    if (quoteId && !isLoaded) return;
    if (dbMiscPresets.length === 0 || quote.items.length === 0) return;

    const newItems = quote.items.map(item => {
      let changed = false;
      const dCosts = { ...item.dynamic_costs };
      let vRate = item.vehicle_rate;
      let kpl = item.km_per_l;
      
      // 1. Backfill Miscellaneous Presets - BASED ON TAGS
      // Only default the value if the fee's name is in the row's tags
      dbMiscPresets.forEach(p => {
        const isTagged = (item.tags || []).includes(p.name);
        if (dCosts[p.id] === undefined) {
           // Initialization logic: default based on tags
           dCosts[p.id] = isTagged ? (p.default_amount || 0) : 0;
           changed = true;
        }
      });

      // 2. Backfill Vehicle Rate if missing/zero and not manual
      // This helps initialize new rows or sync vehicle selection for new quotes
      const v = dbVehicles.find(veh => veh.model === quote.vehicle_model);
      if (v && vRate === 0 && !item.is_manual) {
        vRate = v.default_rate || 0;
        kpl = v.km_per_l || 10;
        changed = true;
      }

      if (changed) {
        const updated = { 
          ...item, 
          vehicle_rate: vRate,
          km_per_l: kpl,
          dynamic_costs: dCosts 
        };
        updated.row_total = calculateRowTotal(updated);
        return updated;
      }
      return item;
    });

    const itemsChanged = JSON.stringify(quote.items) !== JSON.stringify(newItems);
    if (itemsChanged) {
      setQuote(prev => ({ ...prev, items: newItems }));
    }
  }, [dbMiscPresets, dbVehicles, quote.items, quote.vehicle_model, isLoaded]);

  // Recalculate all row totals when admin commission changes
  useEffect(() => {
    if (quote.items.length === 0) return;
    setQuote(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        row_total: (() => {
          const fuel = (!item.km || !item.km_per_l || item.km_per_l <= 0) ? 0 : (item.km / item.km_per_l) * (item.fuel_price || 0);
          const dynamicTotal = Object.values(item.dynamic_costs || {}).reduce((a: number, b: any) => a + (b || 0), 0);
          const baseTotal = item.vehicle_rate + fuel + dynamicTotal;
          return baseTotal * (1 + (prev.admin_commission || 0) / 100);
        })()
      }))
    }));
  }, [quote.admin_commission]);

  // --- Calculations ---
  const calculateFuelCost = (item: QuoteItem) => {
    if (!item.km || !item.km_per_l || item.km_per_l <= 0) return 0;
    return (item.km / item.km_per_l) * (item.fuel_price || 0);
  };

  const calculateRowTotal = (item: QuoteItem) => {
    const fuel = calculateFuelCost(item);
    const dynamicTotal = Object.values(item.dynamic_costs || {}).reduce((a, b: any) => a + (b || 0), 0);
    const accomAmount = item.guest_accommodation_amount || 0;
    const baseTotal = item.vehicle_rate + fuel + accomAmount + dynamicTotal;
    return baseTotal * (1 + (quote.admin_commission || 0) / 100);
  };

  const handleUpdateItem = (index: number, updates: Partial<QuoteItem>, manual = false) => {
    setQuote(prev => {
      const newItems = [...prev.items];
      let updated = { ...newItems[index], ...updates };
      if (manual) updated.is_manual = true;

      // Handle Tag-based pricing triggers (Match by Name)
      if (updates.tags) {
        const dCosts = { ...updated.dynamic_costs };
        dbMiscPresets.forEach(p => {
          const isTagged = updates.tags!.includes(p.name);
          // Only force value if the tag state is changed
          // This allows users to still manually override the value in the matrix later
          dCosts[p.id] = isTagged ? (p.default_amount || 0) : 0;
        });
        updated.dynamic_costs = dCosts;
      }

      updated.row_total = calculateRowTotal(updated);
      newItems[index] = updated;
      return { ...prev, items: newItems };
    });
  };

  const handleApplyPreset = (index: number, pId: string) => {
    const p = dbPresets.find(preset => preset.id === pId);
    if (!p) return;
    handleUpdateItem(index, {
      destination: p.title,
      itinerary_details: p.details || "",
      km: p.default_km || 0,
      // Total Reset...
      vehicle_rate: 0,
      km_per_l: 0,
      dynamic_costs: {},
      applied_preset_id: pId,
      tags: parseTags(p.tags),
      is_manual: false
    }, false);
  };

  const totals = useMemo(() => {
    // Priority: livePackages (current session overrides) -> fallback default
    const packagesToCompute = livePackages.length > 0 
      ? livePackages 
      : [{ name: 'Total Amount', includes_vehicle: true, includes_fuel: true, includes_accommodation: true, includes_misc_ids: dbMiscPresets.map(p => p.id) }];

    const packageTotals = packagesToCompute.map(pkg => {
      let sum = 0;
      const commission = quote.admin_commission || 0;
      quote.items.forEach(item => {
        let rowBase = 0;
        if (pkg.includes_vehicle) rowBase += item.vehicle_rate;
        if (pkg.includes_fuel) rowBase += calculateFuelCost(item);
        if (pkg.includes_accommodation) rowBase += (item.guest_accommodation_amount || 0);
        (pkg.includes_misc_ids || []).forEach((mId: string) => {
          rowBase += (item.dynamic_costs[mId] || 0);
        });
        sum += rowBase * (1 + commission / 100);
      });
      return { 
        name: pkg.name || pkg.title || 'Untitled Package', 
        total: sum,
        is_recommended: pkg.is_recommended,
        id: pkg.id,
        config: pkg // keep a reference to the config for re-selection logic if needed
      };
    });

    const commissionRate = quote.admin_commission || 0;
    let grandTotalBase = 0;
    quote.items.forEach(item => {
      const rowBase = item.vehicle_rate + calculateFuelCost(item) + (item.guest_accommodation_amount || 0) + Object.values(item.dynamic_costs || {}).reduce((a, b: any) => a + (b || 0), 0);
      grandTotalBase += rowBase * (1 + commissionRate / 100);
    });

    const adjustments = extraFees.reduce((a, b) => a + (b.amount || 0), 0) - (discount || 0);
    
    // Calculate selection-based totals
    const selectedPkg = packageTotals.find(p => p.name === selectedPackageName);
    const selectedPkgPrice = selectedPkg ? selectedPkg.total : grandTotalBase;
    const finalGrandTotal = selectedPkgPrice + adjustments;

    return {
      packages: packageTotals,
      grandTotal: finalGrandTotal,
      selectedPkgPrice,
      totalExtraFees: extraFees.reduce((a, b) => a + (b.amount || 0), 0)
    };
  }, [quote.items, extraFees, discount, livePackages, dbMiscPresets, selectedPackageName, quote.admin_commission]);

  const handleAddExtraFee = (presetId: string) => {
    const p = dbMiscPresets.find(m => m.id === presetId);
    if (!p) return;
    setExtraFees([...extraFees, { id: Math.random().toString(), name: p.name, amount: p.default_amount }]);
  };

  const handleAddCustomExtraFee = () => {
    if (!newFeeName || !newFeeAmount) return;
    setExtraFees([...extraFees, { 
      id: Math.random().toString(), 
      name: newFeeName, 
      amount: parseFloat(newFeeAmount) || 0 
    }]);
    setNewFeeName("");
    setNewFeeAmount("");
    setIsAdjustOpen(false);
  };

  const handleUpdatePackageOption = (pkgIndex: number, updates: any) => {
    setLivePackages(prev => {
      const next = [...prev];
      next[pkgIndex] = { ...next[pkgIndex], ...updates };
      return next;
    });
  };

  const handleToggleMiscInclusion = (pkgIndex: number, miscId: string) => {
    setLivePackages(prev => {
      const next = [...prev];
      const pkg = { ...next[pkgIndex] };
      const currentMisc = pkg.includes_misc_ids || [];
      if (currentMisc.includes(miscId)) {
        pkg.includes_misc_ids = currentMisc.filter((id: string) => id !== miscId);
      } else {
        pkg.includes_misc_ids = [...currentMisc, miscId];
      }
      next[pkgIndex] = pkg;
      return next;
    });
  };

  const handleAddCustomPackage = () => {
    const customCount = livePackages.filter(p => p.is_custom).length;
    const newName = `Custom Option ${customCount + 1}`;
    
    const newPkg = {
      id: `custom-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      includes_vehicle: true,
      includes_fuel: true,
      includes_accommodation: true,
      includes_misc_ids: [],
      is_recommended: false,
      is_custom: true
    };
    
    setLivePackages([...livePackages, newPkg]);
    setSelectedPackageName(newPkg.name);
    setSelectedPackageId(newPkg.id);
    setOpenConfigId(newPkg.id); // Open config immediately so they can rename it
  };

  const handleRemovePackage = (index: number) => {
    if (livePackages.length <= 1) return;
    const pkg = livePackages[index];
    if (selectedPackageId === pkg.id) {
      setSelectedPackageId(null);
      setSelectedPackageName("");
    }
    setLivePackages(prev => prev.filter((_, i) => i !== index));
  };

  const compileQuotationText = (currentQuote: any, currentItems: any[], currentFees: any[], currentDiscount: number, currentTotals: any) => {
    const tourSummary = currentItems.map(i => i.destination).filter(Boolean).slice(0, 3).join(" + ");
    const duration = `${currentItems.length}D${currentItems.length - 1}N`;
    
    let text = `Hi ${currentQuote.customer_name},

`;
    text += `Here’s our estimated cost for ${duration} | ${currentQuote.pax_count} pax | ${tourSummary}

`;
    
    text += `--- ITINERARY ---

`;
    currentItems.forEach((item, idx) => {
      text += `Day ${idx + 1}:
${item.destination}
`;
      if (item.itinerary_details) {
        const details = item.itinerary_details.split('\n').filter(Boolean);
        details.forEach((d: string) => text += `• ${d.replace(/^•\s*/, '')}\n`);
      }
      text += `\n`;
    });

    text += `--- PACKAGE OPTIONS ---

`;
    currentTotals.packages.forEach((pkg: any, idx: number) => {
      text += `Option ${idx + 1}: ${pkg.name}

`;
      text += `💰 ₱${pkg.total.toLocaleString()} total
`;
      text += `👥 ₱${Math.round(pkg.total / (currentQuote.pax_count || 1)).toLocaleString()}/pax

`;
      
      text += (pkg.config.includes_vehicle ? "✔" : "❌") + ` Vehicle\n`;
      text += (pkg.config.includes_fuel ? "✔" : "❌") + ` Fuel Cost\n`;
      text += (pkg.config.includes_accommodation ? "✔" : "❌") + ` Guest Accommodation\n`;
      
      dbMiscPresets.forEach(m => {
        const isIncluded = (pkg.config.includes_misc_ids || []).includes(m.id);
        text += (isIncluded ? "✔" : "❌") + ` ${m.name}\n`;
      });

        // Accommodation line
        const hasAccom = currentItems.some(i => i.guest_accommodation_id && i.guest_accommodation_amount > 0);
        if (hasAccom) {
          const accomNames = [...new Set(currentItems
            .filter(i => i.guest_accommodation_id)
            .map(i => {
              const a = dbAccommodations.find(ac => ac.id === i.guest_accommodation_id);
              return a ? a.name : null;
            })
            .filter(Boolean)
          )];
          text += `✔ Accommodation (${accomNames.join(', ')})\n`;
        }
      text += `\n`;
    });

    if (currentFees.length > 0 || currentDiscount > 0) {
      text += `--- ADJUSTMENTS ---

`;
      currentFees.forEach(fee => {
        text += `• ${fee.name}: + ₱${fee.amount.toLocaleString()}\n`;
      });
      if (currentDiscount > 0) {
        text += `• Discount Applied: - ₱${currentDiscount.toLocaleString()}\n`;
      }
      text += `\n`;
    }

    if (currentQuote.notes) {
      text += `--- NOTES ---

`;
      text += currentQuote.notes + `\n`;
    }
    
    return text;
  };

  const handleFinish = async () => {
    const text = compileQuotationText(quote, quote.items, extraFees, discount, totals);
    setPreviewText(text);
    setIsPreviewOpen(true);
  };

  const finalizeSave = async (customStatus?: string, shouldNavigate = true) => {
    setIsSaving(true);
    try {
      const freshText = compileQuotationText(quote, quote.items, extraFees, discount, totals);
      const quotePayload: any = {
          operator_id: selectedOperatorId,
          created_by: profile?.id,
          customer_name: quote.customer_name,
          fb_name: quote.fb_name,
          contact_number: quote.contact_number,
          pax_count: quote.pax_count,
          eta: quote.eta ? new Date(quote.eta).toISOString() : null,
          etd: quote.etd ? new Date(quote.etd).toISOString() : null,
          vehicle_model: quote.vehicle_model,
          pickup_location: quote.pickup_location,
          dropoff_location: quote.dropoff_location,
          notes: quote.notes,
          quotation_text: freshText,
          grand_total: totals.grandTotal,
          extra_fees_json: extraFees,
          extra_fees_total: totals.totalExtraFees,
          discount_total: discount,
          status: customStatus || (quote.status === 'Confirmed' ? 'Confirmed' : (quote.status || 'Draft')),
          admin_commission: quote.admin_commission,
          selected_package: selectedPackageName,
          selected_package_id: selectedPackageId?.startsWith('custom-') ? null : selectedPackageId,
          package_options_json: livePackages
      };

      // Snapshot logic for confirmations
      if ((customStatus === 'Confirmed' || (customStatus === undefined && quote.status === 'Confirmed')) && selectedPackageId) {
        quotePayload.confirmed_at = new Date().toISOString();
        const selectedPkg = totals.packages.find(p => p.id === selectedPackageId);

        if (selectedPkg) {
          quotePayload.selected_package_total = totals.selectedPkgPrice;
          
          const pConfig = selectedPkg.config;
          quotePayload.selected_package_details = {
            package_name: selectedPkg.name,
            total_amount: totals.grandTotal,
            pax_count: quote.pax_count,
            per_pax: Math.round(totals.grandTotal / (quote.pax_count || 1)),
            inclusions: {
              vehicle: pConfig?.includes_vehicle || false,
              fuel: pConfig?.includes_fuel || false,
              accommodation: pConfig?.includes_accommodation || false,
              misc_details: (pConfig?.includes_misc_ids || []).map((mId: string) => {
                const m = dbMiscPresets.find(preset => preset.id === mId);
                return { name: m?.name || 'Unknown', amount: m?.default_amount || 0 };
              })
            },
            adjustments: {
              extra_fees: extraFees,
              discount: discount
            },
            itinerary_snapshot: quote.items.map(item => ({
              day: item.day_number,
              date: item.date,
              destination: item.destination,
              details: item.itinerary_details
            }))
          };
        }
      }

      let currentQuoteId = quoteId || quote.id;
      
      if (currentQuoteId) {
        const { error: uError } = await supabase.from('quotes').update(quotePayload).eq('id', currentQuoteId);
        if (uError) throw uError;
        const { error: dError } = await supabase.from('quote_items').delete().eq('quote_id', currentQuoteId);
        if (dError) throw dError;
      } else {
        const { data: quoteDb, error: qError } = await supabase.from('quotes').insert([quotePayload]).select().single();
        if (qError) throw qError;
        currentQuoteId = quoteDb.id;
      }
      
      const itemsToSave = quote.items.map(i => ({
        quote_id: currentQuoteId,
        day_number: i.day_number,
        date: i.date,
        destination: i.destination,
        itinerary_details: i.itinerary_details as string,
        vehicle_rate: i.vehicle_rate,
        km: i.km,
        km_per_l: i.km_per_l,
        fuel_price: i.fuel_price,
        dynamic_costs: i.dynamic_costs,
        row_total: i.row_total,
        tags: i.tags.join(', '),
        applied_preset_id: i.applied_preset_id || null,
        guest_accommodation_id: i.guest_accommodation_id || null,
        guest_accommodation_amount: i.guest_accommodation_amount || 0
      }));

      const { error: iError } = await supabase.from('quote_items').insert(itemsToSave);
      if (iError) throw iError;
      
      if (shouldNavigate) {
        router.push('/dashboard?tab=quotes');
      } else {
        setInitialQuotationText(freshText);
        setQuote(prev => ({ 
          ...prev, 
          status: customStatus || prev.status, 
          quotation_text: freshText,
          selected_package_details: quotePayload.selected_package_details || prev.selected_package_details,
          selected_package_total: quotePayload.selected_package_total || prev.selected_package_total,
          confirmed_at: quotePayload.confirmed_at || prev.confirmed_at,
          id: currentQuoteId 
        }));

        // Update URL with new quote ID so buttons (Cancel, Preview) become active
        if (!quoteId && currentQuoteId) {
          window.history.replaceState({}, '', `/builder?id=${currentQuoteId}`);
        }
        
        // If we were reconfiguring a confirmed quote, return to the summary view
        if (customStatus === 'Confirmed' || quote.status === 'Confirmed') {
          setIsReconfiguring(false);
        }

        const isNewlyConfirmed = customStatus === 'Confirmed' && quote.status !== 'Confirmed';
        const isAlreadyConfirmed = quote.status === 'Confirmed' || quote.status === 'Payment Started' || quote.status === 'Payment Complete';

        let dialogTitle = "Changes Saved";
        let dialogMessage = "The quotation record and text summary have been updated successfully.";

        if (isNewlyConfirmed) {
          dialogTitle = "Agreement Finalized";
          dialogMessage = "The quotation has been locked and moved to the operational ledger.";
        } else if (isAlreadyConfirmed) {
          dialogTitle = "Record Updated";
          dialogMessage = "The confirmed record and snapshot have been successfully updated.";
        }

        openDialog({
          title: dialogTitle,
          message: dialogMessage,
          type: "success"
        });
      }
    } catch (e: any) { 
      openDialog({
        title: "System Error",
        message: e.message,
        type: "warning"
      });
    } finally { setIsSaving(false); }
  };

  const handleConfirmQuote = async () => {
    if (!selectedPackageId) {
      openDialog({
        title: "Selection Required",
        message: "Please select which package the client chose first.",
        type: "alert"
      });
      return;
    }
    
    openDialog({
      title: "Confirm Quotation",
      message: `Are you sure you want to officially confirm this quote with the package: ${selectedPackageName}? This will lock the record for billing.`,
      type: "confirm",
      onConfirm: () => finalizeSave('Confirmed', false),
      confirmText: "Yes, Confirm Now"
    });
  };

  const handleCancelQuote = async () => {
    openDialog({
      title: "Cancel Quotation",
      message: "Are you sure you want to cancel this quotation? This will mark it as 'Cancelled' in your records.",
      type: "warning",
      onConfirm: () => finalizeSave('Cancelled'),
      confirmText: "Yes, Cancel It",
      cancelText: "No, Keep It"
    });
  };

  const handleDirectSave = async () => {
    if (!quote.customer_name) return;
    const isCurrentlyConfirmed = ['Confirmed', 'Payment Started', 'Payment Complete'].includes(quote.status || '');
    const statusToSave = isCurrentlyConfirmed ? quote.status : (quote.status || 'Draft');
    await finalizeSave(statusToSave, false);
  };

  // Show loading spinner while fetching existing quote data
  if (quoteId && !isLoaded) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Loading Quotation...</p>
        </div>
      </div>
    );
  }

  const isImpersonating = profile?.role === 'super_admin';
  const isConfirmedFlow = ['Confirmed', 'Payment Started', 'Payment Complete'].includes(quote.status || '');

  if (isConfirmedFlow && !isReconfiguring) {
    return (
      <>
        <ConfirmedSummary 
          quote={quote} 
          onReconfigure={() => {
            // Reset dialog state when entering reconfigure to prevent ghost popups
            setDialogConfig(prev => ({ ...prev, isOpen: false }));
            setIsReconfiguring(true);
          }}
          onBack={() => router.push('/dashboard?tab=quotes')}
        />
        <PremiumDialog 
          config={dialogConfig} 
          onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))} 
        />
      </>
    );
  }
  const isDeadQuote = ['Cancelled', 'Lost'].includes(quote.status || '');

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">
      
      <header className={`h-16 bg-white border-b border-[#e8eaed] sticky ${isImpersonating ? 'top-[31px]' : 'top-0'} z-50 shadow-sm shadow-primary/[0.02] safe-top`}>
        <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button onClick={() => router.push('/dashboard?tab=quotes')} className="h-10 w-10 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-secondary hover:bg-[#f0f2f5] transition-all shrink-0" aria-label="Go back">
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base md:text-xl font-bold text-primary tracking-tight truncate">
                {isDeadQuote ? quote.customer_name || 'Quotation' : (quoteId ? 'Edit Quotation' : 'New Quotation')}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary leading-none hidden sm:block">
                {isDeadQuote ? 'Read Only' : (quoteId ? 'Updating Record' : 'Standard Station Mode')}
              </p>
            </div>
          </div>

          {isDeadQuote ? (
            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              quote.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              {quote.status}
            </div>
          ) : (
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={handleCancelQuote}
              disabled={isSaving || !(quoteId || quote.id)}
              className="h-10 md:!h-11 px-3 md:!px-5 border border-[#e8eaed] text-text-tertiary rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-1 md:gap-2 disabled:opacity-30 disabled:grayscale"
              aria-label="Cancel Quote"
            >
              <X size={16} />
              <span className="hidden md:inline">Cancel Quote</span>
            </button>

            <div className="h-8 w-px bg-gray-100 mx-0.5 md:mx-2 hidden sm:block" />

            {quoteId && quote.status !== 'Confirmed' && quote.items.length > 0 && (
              <button 
                onClick={handleConfirmQuote}
                disabled={isSaving || !selectedPackageId || !quote.customer_name}
                className="h-10 md:!h-11 px-3 md:!px-6 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1 md:gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-30 disabled:grayscale"
              >
                <CheckCircle size={16} />
                <span className="hidden md:inline">Confirm Quote</span>
              </button>
            )}

            <button 
              onClick={handleDirectSave}
              disabled={isSaving || !quote.customer_name?.trim()}
              className="h-10 md:!h-11 px-4 md:!px-8 bg-[#1a2138] text-white rounded-xl text-xs md:text-sm font-black flex items-center gap-2 md:gap-3 hover:opacity-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-xl shadow-primary/10"
            >
              {isSaving ? "Saving..." : (
                <>
                  <Save size={18} /> 
                  <span className="hidden sm:inline">{quote.status === 'Confirmed' ? 'Save & Update' : 'Save Quote'}</span>
                </>
              )}
            </button>
          </div>
          )}
        </div>
      </header>

      <div className={`flex-1 flex flex-col lg:flex-row justify-center overflow-hidden ${isDeadQuote ? 'pointer-events-none opacity-60 select-none' : ''}`}>
        <div className="max-w-[1400px] w-full flex flex-col lg:flex-row overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:!p-12 space-y-8 md:space-y-12">
            
            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] text-primary flex items-center justify-center">
                  <Users size={18} />
                </div>
                <h2 className="text-lg font-bold text-primary">Trip Details</h2>
              </div>
              
              <div className="bg-white rounded-3xl border border-[#e8eaed] p-4 md:p-6 lg:!p-[40.5px] shadow-sm shadow-primary/[0.02] space-y-6 md:space-y-[33px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Customer Name</label>
                    <input 
                      type="text" 
                      className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" 
                      placeholder="e.g. Maria Clara"
                      value={quote.customer_name}
                      onChange={(e) => setQuote({...quote, customer_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">FB Name / Alias</label>
                    <input 
                      type="text" 
                      className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" 
                      value={quote.fb_name}
                      onChange={(e) => setQuote({...quote, fb_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Contact No.</label>
                    <input 
                      type="text" 
                      className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" 
                      value={quote.contact_number}
                      onChange={(e) => setQuote({...quote, contact_number: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10 pt-6 md:pt-10 border-t border-[#f0f2f5]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">PAX Count</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="input !pl-12 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" 
                        value={quote.pax_count}
                        onChange={(e) => setQuote({...quote, pax_count: parseInt(e.target.value) || 1})}
                      />
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40" size={18} />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Vehicle Selection (Auto-fit)</label>
                    <div className="relative">
                      <select 
                        className="input !pl-12 !pr-10 !bg-[#f0f2f5]/50 !border-[#e8eaed] appearance-none text-sm font-bold leading-normal pt-1" 
                        value={quote.vehicle_model}
                        onChange={(e) => setQuote({...quote, vehicle_model: e.target.value})}
                      >
                        {dbVehicles.map(v => (
                          <option key={v.id} value={v.model}>{v.model} ({v.pax_capacity} PAX)</option>
                        ))}
                      </select>
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40" size={18} />
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40 rotate-90" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Base Fuel Price</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="input !pl-12 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" 
                        value={quote.default_fuel_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setQuote({
                            ...quote, 
                            default_fuel_price: val,
                            items: quote.items.map(item => ({ ...item, fuel_price: val }))
                          });
                        }}
                      />
                      <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40" size={18} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-10 pt-6 md:pt-10 border-t border-[#f0f2f5]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1 mb-0.5 inline-block">Start (ETA)</label>
                      <input 
                        type="datetime-local" 
                        className="input !px-3 !bg-emerald-50/20 !border-emerald-100 text-sm font-bold" 
                        style={{ fontSize: '10px' }}
                        value={quote.eta} 
                        onChange={(e) => {
                        const newEta = e.target.value;
                        let newEtd = quote.etd;
                        if (newEta && newEtd && new Date(newEta) >= new Date(newEtd)) {
                          const adjustedEtd = new Date(newEta);
                          adjustedEtd.setHours(adjustedEtd.getHours() + 1);
                          newEtd = formatForInput(adjustedEtd.toISOString());
                        }
                        setQuote({...quote, eta: newEta, etd: newEtd});
                      }} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 ml-1 mb-0.5 inline-block">End (ETD)</label>
                      <input 
                        type="datetime-local" 
                        className="input !px-3 !bg-rose-50/20 !border-rose-100 text-sm font-bold" 
                        style={{ fontSize: '10px' }}
                        value={quote.etd} 
                        min={quote.eta}
                      onChange={(e) => {
                        const newEtd = e.target.value;
                        if (quote.eta && newEtd && new Date(newEtd) <= new Date(quote.eta)) {
                          return; 
                        }
                        setQuote({...quote, etd: newEtd});
                      }} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Pickup Location</label>
                    <input type="text" className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" style={{ fontSize: '10px' }} value={quote.pickup_location} onChange={(e) => setQuote({...quote, pickup_location: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Drop-off Location</label>
                    <input type="text" className="input !h-10 !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold" style={{ fontSize: '10px' }} value={quote.dropoff_location} onChange={(e) => setQuote({...quote, dropoff_location: e.target.value})} />
                  </div>
                </div>

                <div className="pt-6 md:pt-10 border-t border-[#f0f2f5]">
                  <div className="max-w-[200px] space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 ml-1 mb-0.5 inline-block">Admin Commission (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        max="100"
                        className="input !pl-12 !bg-amber-50/30 !border-amber-200 text-sm font-bold" 
                        value={quote.admin_commission}
                        onChange={(e) => setQuote({...quote, admin_commission: parseFloat(e.target.value) || 0})}
                      />
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 opacity-60" size={18} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] text-primary flex items-center justify-center">
                  <MapIcon size={18} />
                </div>
                <h2 className="text-lg font-bold text-primary">Itinerary Sequence</h2>
              </div>

              <div className="space-y-8">
                {quote.items.map((item, index) => (
                  <div 
                    key={index} 
                    style={{ padding: '10px 16px', borderRadius: '32px' }}
                    className="bg-white border border-[#e8eaed] shadow-sm shadow-primary/[0.02] flex flex-col md:flex-row gap-4 md:gap-10 items-start mb-3"
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-6 flex justify-center">
                        {index === quote.items.length - 1 && quote.items.length > 1 && (
                          <button 
                             onClick={() => {
                               if (!quote.etd) return;
                               const d = new Date(quote.etd);
                               d.setDate(d.getDate() - 1);
                               setQuote({ ...quote, etd: formatForInput(d.toISOString()) });
                             }}
                             className="h-6 w-6 rounded-full text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center active:scale-95"
                             title="Remove Last Day"
                          >
                             <Minus size={14} strokeWidth={4} />
                          </button>
                        )}
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-primary text-white flex flex-col items-center justify-center shadow-lg shadow-primary/10">
                        <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60">Day</span>
                        <span className="text-lg font-bold">{item.day_number}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-2">
                        <div className="md:col-span-12 lg:col-span-5 space-y-1.5">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black uppercase tracking-widest text-text-tertiary ml-1.5 mb-0 inline-block">Itinerary Name</label>
                            <select 
                              className="input !py-1.5 !pl-3 !pr-8 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary"
                              style={{ height: 'auto', minHeight: '32px', fontSize: '10px' }}
                              value={item.applied_preset_id || ""}
                              onChange={(e) => handleApplyPreset(index, e.target.value)}
                            >
                              <option value="">-- Custom Entry --</option>
                              {dbPresets.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                          </div>
                          
                          <div className="flex items-end gap-3">
                          <div className="space-y-1">
                             <label className="text-[8.5px] font-black uppercase tracking-widest text-text-tertiary ml-1.5 mb-0 inline-block">Est. KM</label>
                             <div className="relative w-[100px]">
                               <input 
                                 type="number"
                                 className="input !py-0 !px-2 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary pr-8 !rounded-md"
                                 style={{ fontSize: '10px', height: '20px', minHeight: '20px' }}
                                 value={item.km || ""}
                                 onChange={(e) => handleUpdateItem(index, { km: parseFloat(e.target.value) || 0 })}
                                 placeholder="0"
                               />
                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-tertiary opacity-40 uppercase">KM</span>
                             </div>
                          </div>

                          {dbAccommodations.length > 0 && (
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black uppercase tracking-widest text-text-tertiary ml-1.5 mb-0 inline-block">Accommodation</label>
                              <select
                                className="input !py-0 !pl-2 !pr-6 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary !rounded-md"
                                style={{ fontSize: '10px', height: '20px', minHeight: '20px', width: '160px' }}
                                value={item.guest_accommodation_id || ""}
                                onChange={(e) => {
                                  const accom = dbAccommodations.find(a => a.id === e.target.value);
                                  handleUpdateItem(index, { 
                                    guest_accommodation_id: e.target.value || "",
                                    guest_accommodation_amount: accom ? accom.amount : 0
                                  }, true);
                                }}
                              >
                                <option value="">-- None --</option>
                                {dbAccommodations.map(a => (
                                  <option key={a.id} value={a.id}>{a.name} ({a.pax_count}pax · ₱{a.amount?.toLocaleString()})</option>
                                ))}
                              </select>
                            </div>
                          )}
                          </div>
                        </div>

                        <div className="md:col-span-12 lg:col-span-7 space-y-2">
                          <div className="flex justify-between items-center px-1.5">
                            <label className="text-[8.5px] font-black uppercase tracking-widest text-text-tertiary mb-0 inline-block">Detailed Itinerary</label>
                            <span className="text-[8px] font-bold text-primary bg-[#f0f2f5] px-2 py-0.5 rounded-lg">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <textarea 
                            className="w-full min-h-[60px] p-3 bg-[#f8f9fb] border border-[#e8eaed] rounded-[10px] font-medium leading-relaxed outline-none transition-all focus:border-[var(--color-accent)] focus:bg-white focus:shadow-[0_0_0_4px_var(--color-accent-light)]" 
                            style={{ fontSize: '10px', resize: 'vertical', fontFamily: 'var(--font-primary)' }}
                            placeholder="Itinerary details..."
                            value={item.itinerary_details}
                            onChange={(e) => handleUpdateItem(index, { itinerary_details: e.target.value })}
                          />
                        </div>

                        <div className="md:col-span-12 pt-1 border-t border-gray-50/50 space-y-1">
                           <label className="text-[8.5px] font-black uppercase tracking-widest text-text-tertiary ml-1.5 mb-0 inline-block">Operational Tags</label>
                           <TagSelector 
                             selectedTags={item.tags || []} 
                             onChange={(newTags) => handleUpdateItem(index, { tags: newTags })} 
                             options={dbMiscPresets.map(p => p.name)}
                           />
                        </div>
                      </div>
                      <div className="h-1 w-full" />
                    </div>
                  </div>
                ))}
              </div>

               <div className="flex justify-center pt-6">
                  <button 
                     onClick={() => {
                        if (!quote.etd) return;
                        const d = new Date(quote.etd);
                        d.setDate(d.getDate() + 1);
                        setQuote({ ...quote, etd: formatForInput(d.toISOString()) });
                     }}
                     style={{ padding: "10px 24px", borderRadius: "16px" }} className="bg-white border border-gray-100 text-text-tertiary font-black text-[10px] uppercase tracking-widest hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                     <Plus size={14} /> Add Day to Trip
                  </button>
               </div>
            </section>

            <section className="space-y-6">
               <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] text-primary flex items-center justify-center">
                  <Calculator size={18} />
                </div>
                <h2 className="text-lg font-bold text-primary">Operational Matrix (Spreadsheet)</h2>
              </div>
              
              <div className="flex items-center gap-6 px-1 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Automated via Tag</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Confirmed Selection</span>
                </div>
              </div>

              {(() => {
                const accomColWidth = dbAccommodations.length > 0 ? 120 : 0;
                const dynamicColsWidth = dbMiscPresets.length * 120;
                const matrixWidth = Math.max(1200, 800 + accomColWidth + dynamicColsWidth);
                
                const colTotals = quote.items.reduce((acc, item) => {
                  acc.rate += item.vehicle_rate || 0;
                  acc.km += item.km || 0;
                  acc.fuel += calculateFuelCost(item);
                  acc.accom += item.guest_accommodation_amount || 0;
                  acc.grand += item.row_total || 0;
                  
                  dbMiscPresets.forEach(p => {
                    acc.misc[p.id] = (acc.misc[p.id] || 0) + (item.dynamic_costs[p.id] || 0);
                  });
                  return acc;
                }, { rate: 0, km: 0, fuel: 0, accom: 0, grand: 0, misc: {} as Record<string, number> });

                return (
                  <div className="bg-white rounded-3xl border border-[#e8eaed] shadow-sm shadow-primary/[0.02] overflow-x-auto scroll-shadow">
                    <table className="w-full text-left border-collapse" style={{ minWidth: `${matrixWidth}px` }}>
                      <thead>
                        <tr className="bg-[#f8f9fb] text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="!pl-10 pr-4 py-8 border-b border-[#f0f2f5]">Day</th>
                          <th className="px-4 py-8 border-b border-[#f0f2f5]">Destination</th>
                          <th className="px-4 py-8 border-b border-[#f0f2f5]">Unit Rate</th>
                          <th className="px-4 py-8 border-b border-[#f0f2f5]">Est. KM</th>
                          <th className="px-4 py-8 border-b border-[#f0f2f5]">KM/L</th>
                          <th className="px-4 py-8 border-b border-[#f0f2f5]">Fuel</th>
                          {dbAccommodations.length > 0 && (
                            <th className="px-4 py-8 border-b border-[#f0f2f5] text-teal-600">Guest Accom</th>
                          )}
                          {dbMiscPresets.map(p => (
                            <th key={p.id} className="px-4 py-8 border-b border-[#f0f2f5] text-indigo-500">{p.name}</th>
                          ))}
                          <th className="pl-4 !pr-10 py-8 border-b border-[#f0f2f5] text-right">Row Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f2f5]">
                        {quote.items.map((item, index) => (
                          <tr key={index} className="group hover:bg-[#f8f9fb]/50 transition-colors">
                            <td className="!pl-10 pr-4 py-6 font-black text-gray-900 border-none">D{item.day_number}</td>
                            <td className="px-4 py-6 border-none">
                               <input type="text" className="w-full bg-transparent border-none text-xs font-bold text-primary focus:ring-0 p-0" value={item.destination} onChange={(e) => handleUpdateItem(index, { destination: e.target.value })} />
                            </td>
                            <td className="px-4 py-6 border-none text-xs">
                               <div className="flex items-center gap-1">
                                 <span className="text-[10px] font-bold text-gray-300">₱</span>
                                 <input type="number" className="w-[80px] bg-transparent border-none text-xs font-black text-primary focus:ring-0 p-0" value={item.vehicle_rate} onChange={(e) => handleUpdateItem(index, { vehicle_rate: parseFloat(e.target.value) || 0 })} />
                               </div>
                            </td>
                            <td className="px-4 py-6 border-none">
                               <input type="number" className="w-[60px] bg-transparent border-none text-xs font-bold text-text-secondary focus:ring-0 p-0" value={item.km} onChange={(e) => handleUpdateItem(index, { km: parseFloat(e.target.value) || 0 })} />
                            </td>
                            <td className="px-4 py-6 border-none">
                               <input type="number" className="w-[60px] bg-transparent border-none text-xs font-bold text-indigo-400/70 focus:ring-0 p-0" placeholder="L/100" value={item.km_per_l} onChange={(e) => handleUpdateItem(index, { km_per_l: parseFloat(e.target.value) || 10 })} />
                            </td>
                            <td className="px-4 py-6 border-none">
                               <div className="text-xs font-black text-rose-500 whitespace-nowrap">₱{Math.round(calculateFuelCost(item)).toLocaleString()}</div>
                            </td>
                            
                            {dbAccommodations.length > 0 && (
                              <td className="px-4 py-6 border-none relative">
                                <input type="number" className={`w-[70px] bg-transparent border-none text-xs font-bold focus:ring-0 p-0 ${(item.guest_accommodation_amount || 0) > 0 ? 'text-teal-600' : 'text-text-tertiary/40'}`} placeholder="0" value={item.guest_accommodation_amount || 0} onChange={(e) => handleUpdateItem(index, { guest_accommodation_amount: parseFloat(e.target.value) || 0 })} />
                              </td>
                            )}

                            {dbMiscPresets.map(p => {
                              const val = item.dynamic_costs[p.id] || 0;
                              const isTagDriven = (item.tags || []).includes(p.name);
                              return (
                                <td key={p.id} className="px-4 py-6 border-none relative">
                                  <input 
                                    type="number" 
                                    className={`w-[70px] bg-transparent border-none text-xs font-bold focus:ring-0 p-0 ${isTagDriven && val > 0 ? 'text-indigo-600' : 'text-text-tertiary/40'}`}
                                    placeholder="0" 
                                    value={val} 
                                    onChange={(e) => {
                                      const newCosts = { ...item.dynamic_costs, [p.id]: parseFloat(e.target.value) || 0 };
                                      handleUpdateItem(index, { dynamic_costs: newCosts });
                                    }} 
                                  />
                                </td>
                              );
                            })}

                            <td className="pl-4 !pr-10 py-6 text-right border-none">
                               <div className="text-sm font-black text-primary whitespace-nowrap">₱{Math.round(item.row_total).toLocaleString()}</div>
                               {quote.admin_commission > 0 && (
                                 <div className="text-[9px] font-bold text-amber-500 whitespace-nowrap mt-0.5">+{quote.admin_commission}% from ₱{Math.round(item.row_total / (1 + quote.admin_commission / 100)).toLocaleString()}</div>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#f8f9fb] border-t-2 border-primary/10">
                          <td className="!pl-10 pr-4 py-8 font-black text-primary border-none text-[10px] uppercase tracking-widest">Totals</td>
                          <td className="px-4 py-8 border-none"></td>
                          <td className="px-4 py-8 border-none text-xs font-black text-primary">₱{Math.round(colTotals.rate).toLocaleString()}</td>
                          <td className="px-4 py-8 border-none text-xs font-black text-text-secondary">{colTotals.km.toLocaleString()} KM</td>
                          <td className="px-4 py-8 border-none text-xs font-black text-indigo-400/70">--</td>
                          <td className="px-4 py-8 border-none text-xs font-black text-rose-500">₱{Math.round(colTotals.fuel).toLocaleString()}</td>
                          
                          {dbAccommodations.length > 0 && (
                            <td className="px-4 py-8 border-none text-xs font-black text-teal-600">₱{Math.round(colTotals.accom).toLocaleString()}</td>
                          )}

                          {dbMiscPresets.map(p => (
                            <td key={p.id} className="px-4 py-8 border-none text-xs font-black text-indigo-600">
                              ₱{Math.round(colTotals.misc[p.id] || 0).toLocaleString()}
                            </td>
                          ))}

                          <td className="pl-4 !pr-10 py-8 text-right border-none">
                             <div className="text-sm font-black text-primary whitespace-nowrap">₱{Math.round(colTotals.grand).toLocaleString()}</div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </section>

            <footer className="h-32 lg:h-64" />
          </main>

          {/* ── Sidebar: Inline on mobile, fixed aside on desktop ── */}
          <div className="w-full lg:w-[480px] bg-white lg:border-l border-t lg:border-t-0 border-[#e8eaed] flex flex-col shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] overflow-hidden lg:shadow-2xl">
            <div className="px-4 md:px-8 lg:!px-12 pt-6 md:pt-8 lg:!pt-10 pb-6 md:pb-8 lg:!pb-10 flex-1 lg:overflow-y-auto space-y-8 md:space-y-10 custom-scrollbar">
              
              <div className="space-y-6 md:space-y-8">
                <div className="text-center">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Select Proposed Package</p>
                </div>
                <div className="flex flex-col gap-4">
                  {totals.packages.map((pkg, i) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const isOpen = openConfigId === pkg.id;
                    
                    return (
                      <div 
                        key={pkg.id || i} 
                        className={`w-full rounded-2xl border transition-all relative flex flex-col p-6 cursor-pointer group ${
                          isSelected 
                            ? "bg-[#1a2138] border-[#1a2138] text-white shadow-2xl shadow-primary/20 scale-[1.02]" 
                            : "bg-white border-gray-100 text-primary hover:border-primary/20 hover:shadow-xl"
                        }`}
                        onClick={() => {
                          setSelectedPackageName(pkg.name);
                          setSelectedPackageId(pkg.id || null);
                        }}
                      >
                        {/* Status Row */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-1.5">
                            {livePackages.length > 1 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePackage(i);
                                }}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                  isSelected ? "text-white/20 hover:text-rose-400" : "text-gray-300 hover:text-rose-500"
                                }`}
                                title="Remove this package option"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <div className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest ${
                              isSelected ? "bg-white/10 text-white/50" : "bg-gray-50 text-text-tertiary"
                            }`}>
                              Option {i + 1}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {pkg.is_recommended && (
                              <div className={`px-2.5 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                isSelected ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              }`}>
                                <Star size={8} fill="currentColor" /> Recommended
                              </div>
                            )}
                            {isSelected && <CheckCircle size={18} fill="currentColor" className="text-emerald-500" />}
                          </div>
                        </div>

                        {/* Package Header */}
                        <div className="mb-2">
                           <input 
                             type="text"
                             value={pkg.name || ""}
                             onChange={(e) => handleUpdatePackageOption(i, { name: e.target.value })}
                             onClick={(e) => e.stopPropagation()}
                             className={`w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-[13px] md:text-sm font-black tracking-tight leading-snug transition-colors placeholder:opacity-20 pointer-events-auto ${
                               isSelected ? "text-white !placeholder-white/20" : "text-primary !placeholder-primary/20"
                             }`}
                             placeholder="Enter package name..."
                           />
                        </div>

                        {/* Action Row */}
                        <div className="mt-auto flex items-end justify-between gap-4">
                          <div className="flex flex-col">
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 transition-colors ${isSelected ? "text-white/60" : "text-text-tertiary/40"}`}>Proposal Amount</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-base font-bold italic transition-colors ${isSelected ? "text-white/40" : "text-primary/20"}`}>₱</span>
                              <span className={`text-2xl md:text-3xl font-black tracking-tighter italic leading-none transition-colors ${isSelected ? "text-white" : "text-primary"}`}>
                                {pkg.total.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenConfigId(isOpen ? null : (pkg.id || `pkg-${i}`));
                            }}
                            className={`flex items-center gap-1.5 px-3 !h-7 !min-h-0 !min-w-0 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-sm ${
                              isSelected 
                                ? "!bg-white !text-primary hover:bg-white/90" 
                                : "!bg-[#1a2138] !text-white hover:opacity-90"
                            }`}
                          >
                            {isOpen ? <X size={10} /> : <Settings size={10} />}
                            <span className="leading-none">Configure</span>
                            <ChevronDown size={10} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="w-full mt-4 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={`p-4 rounded-xl border ${isSelected ? "bg-white/5 border-white/10" : "bg-gray-50/50 border-gray-100"} grid grid-cols-1 gap-2`}>
                                {/* Inline Renaming */}
                                <div className="px-3 py-2">
                                  <label className={`text-[8px] font-black uppercase tracking-widest mb-1.5 block ${isSelected ? "text-white/40" : "text-text-tertiary/40"}`}>Option Label</label>
                                  <input 
                                    type="text"
                                    value={pkg.name}
                                    onChange={(e) => handleUpdatePackageOption(i, { name: e.target.value })}
                                    className={`w-full bg-transparent border-b text-[10px] font-bold focus:outline-none focus:border-emerald-500 transition-all py-1 ${
                                      isSelected ? "text-white border-white/10" : "text-primary border-gray-200"
                                    }`}
                                    placeholder="Enter package name..."
                                  />
                                </div>

                                <div className={`h-px my-1 ${isSelected ? "bg-white/10" : "bg-gray-200/50"}`} />

                                {[
                                  { id: 'vehicle', label: 'Vehicle Rate', checked: pkg.config.includes_vehicle, update: { includes_vehicle: !pkg.config.includes_vehicle } },
                                  { id: 'fuel', label: 'Fuel Cost', checked: pkg.config.includes_fuel, update: { includes_fuel: !pkg.config.includes_fuel } },
                                  { id: 'accom', label: 'Guest Accom', checked: pkg.config.includes_accommodation, update: { includes_accommodation: !pkg.config.includes_accommodation } },
                                ].map((inc) => (
                                  <label key={inc.id} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 transition-all">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? "text-white/60" : "text-text-tertiary"}`}>{inc.label}</span>
                                    <input 
                                      type="checkbox" 
                                      checked={inc.checked} 
                                      onChange={() => handleUpdatePackageOption(i, inc.update)}
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                    />
                                  </label>
                                ))}

                                {dbMiscPresets.length > 0 && <div className={`h-px my-1 ${isSelected ? "bg-white/10" : "bg-gray-200/50"}`} />}
                                
                                {dbMiscPresets.map((misc) => {
                                  const isIncluded = (pkg.config.includes_misc_ids || []).includes(misc.id);
                                  return (
                                    <label key={misc.id} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 transition-all">
                                      <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? "text-white/60" : "text-text-tertiary"}`}>{misc.name}</span>
                                      <input 
                                        type="checkbox" 
                                        checked={isIncluded} 
                                        onChange={() => handleToggleMiscInclusion(i, misc.id)}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                      />
                                    </label>
                                  );
                                })}

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  
                  {/* Add Custom Package Button */}
                  <button 
                    onClick={handleAddCustomPackage}
                    className="w-full h-16 rounded-3xl border-2 border-dashed border-gray-100 flex items-center justify-center gap-3 text-text-tertiary hover:border-primary/20 hover:text-primary transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-all">
                      <Plus size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Custom Option</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-50 w-full !mt-10" />
              <div className="space-y-6 pt-6">
                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Additional Fees</p>
                   <button 
                     onClick={() => setIsAdjustOpen(!isAdjustOpen)}
                     className={`h-7 w-7 flex items-center justify-center rounded-full transition-all ${isAdjustOpen ? "bg-primary text-white" : "text-primary bg-gray-50 hover:bg-gray-100"}`}
                   >
                     {isAdjustOpen ? <X size={12} /> : <Plus size={12} />}
                   </button>
                </div>

                {isAdjustOpen && (
                  <div className="p-4 md:p-6 bg-gray-50/50 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      placeholder="Fee Label" 
                      className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none ring-primary/20 focus:ring-1"
                      value={newFeeName}
                      onChange={(e) => setNewFeeName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Amount" 
                        className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none ring-primary/20 focus:ring-1"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomExtraFee()}
                      />
                      <button 
                        onClick={handleAddCustomExtraFee}
                        className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all"
                      >
                        Add Now
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-50">
                  {extraFees.map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center py-4 text-xs group">
                      <span className="text-text-tertiary font-black uppercase tracking-widest text-[8px] italic">{fee.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-primary italic text-sm">₱ {fee.amount.toLocaleString()}</span>
                        <button onClick={() => setExtraFees(extraFees.filter(f => f.id !== fee.id))} className="text-gray-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center py-6">
                    <div className="flex items-center gap-2">
                       <CreditCard size={12} className="text-emerald-500 opacity-40" />
                       <span className="font-black text-[9px] uppercase tracking-widest text-text-tertiary">Discount Applied</span>
                    </div>
                    <div className="flex items-center gap-1 font-black italic text-emerald-600">
                      <span className="text-[10px]">- ₱</span>
                      <input 
                        type="number" 
                        className="w-20 text-right bg-transparent border-none focus:ring-0 p-0 text-sm font-black italic tracking-tighter" 
                        placeholder="0" 
                        value={discount || ""} 
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-6 !pt-10">
                 <div className="w-full space-y-3 pb-8 border-b border-gray-50">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-text-tertiary/60">
                      <span>Base Package</span>
                      <span>₱ {totals.selectedPkgPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-text-tertiary/60">
                      <span>Adjustments</span>
                      <span>₱ {totals.totalExtraFees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-emerald-600">
                      <span>Discount</span>
                      <span>- ₱ {discount.toLocaleString()}</span>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-center gap-3">
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-text-tertiary/30">Final Balance</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-primary/10 italic">₱</span>
                      <span className="text-4xl md:text-6xl font-black italic tracking-tighter text-primary">{totals.grandTotal.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-6 !pt-10 pb-10">
                 <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Operational Context</p>
                 </div>
                 <textarea 
                    className="w-full min-h-[120px] px-4 md:!px-8 py-4 md:!py-6 bg-gray-50/50 border-transparent rounded-2xl md:rounded-[32px] text-xs font-bold leading-relaxed resize-none focus:bg-white focus:border-gray-100 transition-all outline-none text-text-secondary placeholder:text-text-tertiary/20 shadow-inner" 
                    placeholder="Add operational details..."
                    value={quote.notes}
                    onChange={(e) => setQuote({...quote, notes: e.target.value})}
                 />
              </div>
            </div>

            <div className="px-4 md:px-8 lg:!px-12 py-3 md:!py-4 border-t border-[#f0f2f5] bg-white flex items-center gap-2 md:gap-3 safe-bottom">
               {initialQuotationText && (
                 <button 
                   onClick={() => {
                     setPreviewText(initialQuotationText);
                     setIsPreviewOpen(true);
                   }}
                   className="h-12 px-3 md:px-5 bg-[#f8f9fb] border border-[#e8eaed] text-text-tertiary rounded-2xl font-black text-[9px] tracking-[0.1em] uppercase hover:bg-[#f0f2f5] hover:text-primary transition-all flex items-center justify-center gap-2 shrink-0"
                 >
                   <Copy size={14} className="opacity-40" />
                   <span className="hidden md:inline">Previously Saved Quote</span>
                   <span className="md:hidden">Prev</span>
                 </button>
               )}
               <button 
                 onClick={handleFinish}
                 disabled={isSaving || quote.items.length === 0}
                 className="flex-1 h-12 bg-primary text-white rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase shadow-lg shadow-primary/10 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
               >
                 Current Live Quote 
                 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
      {isPreviewOpen && (
        <QuotationPreviewModal 
          text={previewText} 
          setText={setPreviewText} 
          onClose={() => setIsPreviewOpen(false)}
          onConfirm={handleConfirmQuote}
          onCancel={handleCancelQuote}
          isSaving={isSaving}
          openDialog={openDialog}
        />
      )}
      </AnimatePresence>

      <PremiumDialog 
        config={dialogConfig} 
        onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}

function PremiumDialog({ config, onClose }: { config: any, onClose: () => void }) {
  if (!config.isOpen) return null;

  const isWarning = config.type === 'warning';
  const isSuccess = config.type === 'success';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden border border-white/20 flex flex-col items-center text-center relative"
        style={{ padding: '24px' }}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${
          isWarning ? "bg-rose-50 text-rose-500" : 
          isSuccess ? "bg-emerald-50 text-emerald-500" :
          "bg-indigo-50 text-indigo-500"
        }`} style={{ marginBottom: '12px' }}>
           <div className={`absolute inset-0 rounded-2xl animate-pulse opacity-20 ${
             isWarning ? "bg-rose-200" : isSuccess ? "bg-emerald-200" : "bg-indigo-200"
           }`} />
           {isWarning ? <AlertTriangle size={22} strokeWidth={2.5} className="relative" /> : isSuccess ? <CheckCircle size={22} strokeWidth={2.5} className="relative" /> : <Info size={22} strokeWidth={2.5} className="relative" />}
        </div>
        
        <h3 className="text-sm font-black text-primary tracking-tight leading-none italic">{config.title}</h3>
        <p className="text-[11px] font-bold text-text-tertiary leading-relaxed" style={{ marginTop: '8px' }}>{config.message}</p>
        
        <div className="grid grid-cols-2 gap-3 w-full" style={{ marginTop: '16px' }}>
           {config.type === 'confirm' || config.type === 'warning' ? (
             <>
               <button 
                 onClick={onClose}
                 className="h-10 bg-[#f8f9fb] text-primary border border-[#e8eaed] rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white hover:border-primary/20 transition-all active:scale-[0.98]"
               >
                 {config.cancelText || "No, Keep it"}
               </button>
               <button 
                 onClick={() => {
                   config.onConfirm?.();
                   onClose();
                 }}
                 className={`h-10 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] text-white shadow-lg transition-all active:scale-[0.98] ${
                   isWarning ? "bg-rose-500 shadow-rose-500/20 hover:bg-rose-600" : "bg-primary shadow-primary/20 hover:opacity-90"
                 }`}
               >
                 {config.confirmText || "Yes, Proceed"}
               </button>
             </>
           ) : (
             <button 
               onClick={onClose}
               className="col-span-2 h-10 bg-primary text-white rounded-xl font-black text-[9px] uppercase tracking-[0.15em] shadow-lg shadow-primary/20 transition-all active:scale-95"
             >
               Got it
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}

function QuotationPreviewModal({ text, setText, onClose, onConfirm, onCancel, isSaving, openDialog }: any) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    openDialog({
      title: "Copied!",
      message: "Quotation has been copied to your clipboard and is ready to paste.",
      type: "success"
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl md:rounded-[40px] w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] md:max-h-[80vh] overflow-hidden border border-white/20 relative"
      >
        <div className="px-10 py-6 border-b border-[#f0f2f5] bg-white text-center relative">
          <h3 className="text-lg font-black text-primary tracking-tight leading-none">Quotation Preview</h3>
          <p className="text-[8px] text-text-tertiary font-bold uppercase tracking-widest mt-1.5">Final Review & Edit</p>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-[#f0f2f5] rounded-full transition-colors active:scale-90 text-text-tertiary">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:!px-12 py-6 md:!py-8 bg-white custom-scrollbar">
          <div className="relative group">
            <div className="absolute -top-4 right-0 text-[7px] uppercase font-black tracking-widest text-primary/10 group-hover:text-primary/40 transition-colors italic">Editable Zone</div>
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-[13px] leading-[1.6] text-text-secondary outline-none resize-none overflow-hidden font-medium" 
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              onInput={(e: any) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }
              }}
            />
          </div>
        </div>

        <div className="px-10 py-8 bg-white border-t border-[#f0f2f5] flex items-center justify-center gap-2 no-print shrink-0">
           <button 
             onClick={handleCopy}
             className="!h-9 !px-4 bg-[#6366f1]/10 text-[#6366f1] rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-[#6366f1] hover:text-white transition-all flex items-center justify-center gap-2"
           >
             <Copy size={12} /> Copy
           </button>

           <button 
             onClick={handlePrint}
             className="!h-9 !px-4 bg-[#1e293b]/10 text-[#1e293b] rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-[#1e293b] hover:text-white transition-all flex items-center justify-center gap-2"
           >
             <Printer size={12} /> Print
           </button>

           <div className="w-px h-5 bg-[#e8eaed] mx-1" />

           <button 
             onClick={onClose}
             className="!h-9 !px-6 bg-[#f8f9fb] border border-[#e8eaed] text-text-tertiary rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-[#f0f2f5] hover:text-primary transition-all active:scale-[0.98]"
           >
             Close Review
           </button>
        </div>
      </motion.div>
    </div>
  );
}
