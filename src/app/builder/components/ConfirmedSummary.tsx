"use client";

import React from "react";

import { CheckCircle, Clock, ShieldCheck, Map as MapIcon, Receipt, Trash2, Plus, X, Settings, ArrowRight, CreditCard, Car, ChevronLeft, BedDouble, Printer, FileText, Check } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import { QuoteData } from "./types";

import { 

  modalOverlay, modalCard, modalTitle, modalFormSpace, 

  inputStyle, labelStyle, sectionLabel, btnPrimary, btnSecondary, btnAction,

  btnPillarPrimary, btnPillarSecondary,

  inputFocus, inputBlur

} from "@/lib/styles";

import { PremiumModalWrapper, premiumFormStyles } from "@/app/admin/components/PremiumModalWrapper";

import { AdminSelect } from "@/app/admin/components/AdminSelect";

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

  onRefresh?: () => void;

  disbursements: any[];

  isDisbursementModalOpen: boolean;

  setIsDisbursementModalOpen: (v: boolean) => void;

  handleAddDisbursement: (data: any) => void;

  handleVoidDisbursement: (id: string) => void;

  isDisbursementSaving?: boolean;

  editingPayment: any;

  setEditingPayment: (v: any) => void;

  editingDisbursement: any;

  setEditingDisbursement: (v: any) => void;

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

  dbMiscPresets = [],

  onRefresh,

  disbursements,

  isDisbursementModalOpen,

  setIsDisbursementModalOpen,

  handleAddDisbursement,

  handleVoidDisbursement,

  isDisbursementSaving = false,

  editingPayment,

  setEditingPayment,

  editingDisbursement,

  setEditingDisbursement

}: ConfirmedSummaryProps) {

  const [showAdminReport, setShowAdminReport] = React.useState(false);

  const [selectedMethod, setSelectedMethod] = React.useState("GCash");

  const getLocalDateString = (dateInput?: any) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-CA');
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const details = quote.selected_package_details || {};

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalDisbursed = disbursements.reduce((sum, d) => sum + (d.amount || 0), 0);

  const balanceRemaining = Math.max(0, (details.total_amount || 0) - totalPaid);

  const paymentProgress = details.total_amount > 0 ? (totalPaid / details.total_amount) * 100 : 0;

  const isFullyPaid = balanceRemaining <= 0;

  // Derived Inclusions & Exclusions (Mirroring Quotation Text Logic)

  const incs: string[] = [];

  const excs: string[] = [];

  // 1. Vehicle Logic

  const fleetModels = quote.fleet?.map(v => v.model).filter(Boolean) || [];

  if (details.inclusions?.vehicle) {

    const vehicleLabel = fleetModels.length > 0 

      ? `Vehicles: ${fleetModels.join(", ")}` 

      : `Vehicle: ${quote.vehicle_model || 'Standard Unit'}`;

    incs.push(vehicleLabel);

  } else {

    excs.push('Vehicle Rental');

  }

  // 2. Fuel Logic

  const totalKM = quote.items?.reduce((sum, item) => sum + (item.km || 0), 0) || 0;

  const hasFleet = (quote.fleet || []).length > 0;

  if (details.inclusions?.fuel && totalKM > 0 && hasFleet) {

    incs.push('Fuel Consumption');

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

    if (m.hide_in_quote) return; // Skip completely if flagged as hidden from quote

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

  const commissionBase = quote.selected_package_total || details.total_amount || 0;

  const commissionAmount = Math.round((commissionBase * commissionPercentage) / (100 + commissionPercentage));

  const baseRate = (details.total_amount || 0) - commissionAmount;

  return (

    <div className="flex flex-col min-h-screen bg-[#f8f9fb]">

      <header className="h-16 bg-white border-b border-[#e8eaed] sticky top-0 z-50 shadow-sm safe-top !p-0">

        <div className="w-full h-full !px-4 md:!px-8 lg:!px-10 flex items-center justify-between">

          {/* Left Block */}

          <div className="flex items-center gap-3 md:gap-6 shrink-0">

            <button 

              onClick={onBack} 

              className="h-10 md:!h-11 px-4 md:!px-8 !bg-[#1a2138] !text-white !rounded-xl !text-xs md:!text-sm !font-black !flex items-center gap-2 md:gap-3 hover:!opacity-95 disabled:opacity-30 transition-all !shadow-xl !shadow-primary/10 shrink-0"

            >

              <ChevronLeft size={18} strokeWidth={2.5} className="text-white" />

              <span>Back</span>

            </button>

            <div className="flex flex-col min-w-0">

              <h1 className="text-base md:text-xl font-bold text-primary tracking-tight truncate">Confirmed Record</h1>

              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary leading-none hidden sm:block">Deal Locked in System</p>

            </div>

          </div>

          {/* Right Block - Action Area */}

          <div className="flex items-center gap-2 md:gap-3 shrink-0">

             <button 

               onClick={() => {

                 onRefresh?.();

                 setShowAdminReport(true);

               }}

               className="h-10 md:!h-11 px-3 md:!px-6 bg-blue-50 text-blue-700 border border-blue-200/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-1 md:gap-2"

             >

               <FileText size={16} /> Trip Report

             </button>

             {!isFullyPaid && (

               <button 

                 onClick={() => { setEditingPayment(null); setIsPaymentModalOpen(true); }}

                 className="h-10 md:!h-11 px-3 md:!px-6 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-1 md:gap-2 disabled:opacity-30"

               >

                 <Plus size={16} /> Record Payment

               </button>

             )}

             <button 

                onClick={() => { setEditingDisbursement(null); setIsDisbursementModalOpen(true); }}

                className="h-10 md:!h-11 px-3 md:!px-6 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center justify-center gap-1 md:gap-2"

              >

                <Plus size={16} /> Record Disbursement

              </button>

             <button 

               onClick={onReconfigure}

               className="h-10 md:!h-11 px-3 md:!px-6 bg-rose-50 text-rose-700 border border-rose-200/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:rose-100 transition-all flex items-center justify-center gap-1 md:gap-2"

             >

               <Settings size={16} /> Reconfigure

             </button>

          </div>

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

               <div className="flex flex-col items-center text-center mb-10">

                  <div className="flex items-center gap-6">

                     <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">

                        <CheckCircle size={24} strokeWidth={3} />

                     </div>

                     <div className="flex items-center gap-4">

                        <h2 className="text-4xl font-black text-primary tracking-tighter">Agreement Finalized</h2>

                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${

                          isFullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'

                        }`}>

                          {isFullyPaid ? <ShieldCheck size={12} /> : <Clock size={12} />}

                          {isFullyPaid ? 'Fully Paid' : 'Payment Collection'}

                        </div>

                     </div>

                  </div>

                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mt-3">

                     {quote.confirmed_at ? `Officially converted on ${new Date(quote.confirmed_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}` : 'Locked in System'}

                  </p>

               </div>

               <div className="flex flex-col items-center border-b border-[#f0f2f5] pb-10">

                  <div className="space-y-4 text-center max-w-2xl w-full">

                     <div className="space-y-2">

                        <p className="text-4xl font-black text-primary leading-tight">{details.package_name}</p>

                        <div className="flex items-center justify-center gap-3 opacity-60">

                           <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{quote.customer_name}</span>

                           {quote.items && quote.items.length > 0 && (

                             <>

                               <div className="w-1 h-1 rounded-full bg-slate-300" />

                               <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">

                                  {quote.eta ? new Date(quote.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' @ ' + new Date(quote.eta).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date(quote.items[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 

                                  {quote.items.length > 1 && ` - ${quote.etd ? new Date(quote.etd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' @ ' + new Date(quote.etd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date(quote.items[quote.items.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}

                               </span>

                             </>

                           )}

                        </div>

                     </div>

                     <div className="flex flex-col md:flex-row items-center justify-center gap-16 pt-2">

                        <div className="space-y-1 text-center">

                           <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Total Agreed Amount</label>

                           <p className="text-5xl font-black text-primary tracking-tighter">₱{Math.round(details.total_amount || 0).toLocaleString()}</p>

                        </div>

                        <div className="space-y-1 text-center">

                           <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Rate Per Pax ({details.pax_count})</label>

                           <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight bg-emerald-50 px-5 py-2 rounded-2xl">₱{Math.round(details.per_pax || 0).toLocaleString()}</p>

                        </div>

                     </div>

                     <div className="mt-4 pt-4 border-t border-dashed border-[#f0f2f5] w-full max-w-md mx-auto !m-0 !p-0 !mt-4 !pt-4 !mx-auto">

                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-60 mb-1 text-center !m-0 !mb-1">Financial Breakdown</p>

                        <div className="w-full flex justify-center">

                           <div className="inline-grid grid-cols-[auto_120px] gap-x-8 gap-y-1 !m-0 !p-0">

                              <span className="text-right opacity-60 text-xs font-bold text-text-tertiary !m-0 !p-0">Base Package Rate:</span>

                              <span className="font-mono text-xs font-bold text-text-tertiary text-right !m-0 !p-0">₱{Math.round(baseRate).toLocaleString()}</span>

                              {details.adjustments?.extra_fees?.map((f: any, i: number) => (

                                <React.Fragment key={i}>

                                   <span className="text-right opacity-60 text-xs font-bold text-indigo-600 !m-0 !p-0">{f.name}:</span>

                                   <span className="font-mono text-xs font-bold text-indigo-600 text-right !m-0 !p-0">+ ₱{f.amount?.toLocaleString()}</span>

                                </React.Fragment>

                              ))}

                              {details.adjustments?.discount > 0 && (

                                <React.Fragment>

                                   <span className="text-right opacity-60 text-xs font-black text-primary/60 pt-2 border-t border-dashed border-[#f0f2f5] !m-0 !p-0 !pt-2">Subtotal before discount:</span>

                                   <span className="font-mono text-xs font-black text-primary/60 pt-2 border-t border-dashed border-[#f0f2f5] text-right !m-0 !p-0 !pt-2">₱{(details.total_amount + details.adjustments.discount).toLocaleString()}</span>

                                   <span className="text-right opacity-60 text-xs font-bold text-emerald-600 !m-0 !p-0">Client Discount:</span>

                                   <span className="font-mono text-xs font-bold text-emerald-600 text-right !m-0 !p-0">- ₱{details.adjustments.discount.toLocaleString()}</span>

                                </React.Fragment>

                              )}

                              <span className="text-right opacity-60 text-xs font-bold text-indigo-600 pt-1 border-t border-dashed border-[#f0f2f5] !m-0 !p-0 !pt-1">Admin Commission ({commissionPercentage}%):</span>

                              <span className="font-mono text-xs font-bold text-indigo-600 pt-1 border-t border-dashed border-[#f0f2f5] text-right !m-0 !p-0 !pt-1">₱{commissionAmount.toLocaleString()}</span>

                              <span className="text-right text-sm font-black text-primary uppercase tracking-tight pt-2 border-t-2 border-primary/10 !m-0 !p-0 !pt-2">Final Agreed Amount:</span>

                              <span className="font-mono text-sm font-black text-primary pt-2 border-t-2 border-primary/10 text-right !m-0 !p-0 !pt-2">₱{Math.round(details.total_amount || 0).toLocaleString()}</span>

                           </div>

                        </div>

                     </div>

                  </div>

               </div>

               <div className="h-10 w-full" />

               <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">

                  <div className="space-y-12">

                     <div className="flex items-center gap-3">

                       <MapIcon size={24} className="text-primary opacity-20" />

                       <h3 className="text-2xl font-black text-primary tracking-tight">Snapshotted Itinerary</h3>

                     </div>

                     <div className="grid grid-cols-1 gap-8 relative">

                        <div className="absolute left-6 top-8 bottom-8 w-px bg-[#f0f2f5] -translate-x-1/2" />

                         {quote.items?.map((item: any, i: number) => {

                           const activeIds = item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0 

                             ? item.selected_vehicle_ids 

                             : (quote.fleet || []).map((v: any) => v.id);

                           const vehicleNames = (quote.fleet || []).filter((v: any) => activeIds.includes(v.id)).map((v: any) => v.model).join(', ');

                           return (

                             <div key={i} className="flex gap-10 items-start relative pb-4">

                                <div className="w-14 h-14 rounded-[22px] bg-white border-4 border-[#f0f2f5] flex flex-col items-center justify-center shrink-0 shadow-sm z-10 sticky top-[72px]">

                                   <span className="text-[8px] font-black uppercase text-emerald-600 leading-none mb-1 tracking-widest">{new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}</span>

                                   <span className="text-lg font-black text-primary leading-none">{new Date(item.date).getDate()}</span>

                                </div>

                                <div className="flex-1 space-y-5 pt-1">

                                   <div className="flex items-baseline gap-3">

                                      <h4 className="text-xl font-black text-primary tracking-tight">{item.destination}</h4>

                                   </div>

                                   {vehicleNames && (

                                     <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl w-fit">

                                        <Car size={12} className="text-slate-400" />

                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">{vehicleNames}</span>

                                     </div>

                                   )}

                                 {item.guest_accommodation_name && (

                                   <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50/50 rounded-xl border border-emerald-100/30 w-fit transition-all hover:bg-emerald-50">

                                      <BedDouble size={12} className="text-emerald-600" />

                                      <div className="flex items-center gap-1.5">

                                         <span className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">Accommodation</span>

                                         <div className="w-1 h-1 rounded-full bg-emerald-200" />

                                         <span className="text-[10px] font-black text-primary uppercase tracking-tight">{item.guest_accommodation_name}</span>

                                      </div>

                                   </div>

                                 )}

                                 {item.tags && item.tags.length > 0 && (

                                   <div className="flex flex-wrap items-center gap-1.5 mt-2">

                                      {item.tags.map((tag: string, ti: number) => (

                                         <span key={ti} className="px-2 py-0.5 bg-rose-50/50 text-rose-400 border border-rose-100/30 rounded text-[7px] font-black uppercase tracking-widest">{tag}</span>

                                      ))}

                                   </div>

                                 )}

                              </div>

                           </div>

                          );

                         })}

                     </div>

                  </div>

                  {/* Sidebar: Inclusions & Exclusions */}

                  <div className="sticky top-24 space-y-12">

                     <div className="flex items-center gap-3">

                       <ShieldCheck size={24} className="text-primary opacity-20" />

                       <h3 className="text-2xl font-black text-primary tracking-tight">Inclusion / Exclusion</h3>

                     </div>

                     <div className="rounded-[32px] p-2 space-y-6">

                        <div className="space-y-4">

                           <div className="flex items-center gap-2">

                              <CheckCircle size={16} className="text-emerald-500" />

                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Verified Inclusions</p>

                           </div>

                           <div className="grid grid-cols-1 gap-0.5 pl-6">

                              {incs.map((inc, i) => (

                                <div key={i} className="flex items-start gap-2 text-[10.5px] font-bold text-black leading-tight">

                                   <span className="text-black shrink-0 opacity-40">-</span>

                                   {inc}

                                </div>

                              ))}

                           </div>

                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-200/50">

                           <div className="flex items-center gap-2">

                              <X size={16} className="text-rose-500" />

                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 uppercase">Verified Exclusions</p>

                           </div>

                           <div className="grid grid-cols-1 gap-0.5 pl-6">

                              {excs.map((exc, i) => (

                                 <div key={i} className="flex items-start gap-2 text-[10.5px] font-bold text-black leading-tight">

                                    <span className="text-black shrink-0 opacity-40">-</span>

                                    {exc}

                                 </div>

                              ))}

                           </div>

                        </div>

                     </div>

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

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                         {/* Card 1: Verified Collections */}

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

                         {/* Card 2: Balance (Outstanding Balance moved to second position) */}

                         <div className={`rounded-2xl p-10 relative group transition-all ${

                            balanceRemaining > 0 ? 'bg-amber-50/40' : 'bg-emerald-50/40'

                         }`}>

                            <div className="relative space-y-4">

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

                         {/* Card 3: Supplier Disbursements (Amber, moved to third position) */}

                         <div className="bg-amber-50/40 rounded-2xl p-10 relative group transition-all">

                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">

                               <Receipt size={48} className="text-amber-600" />

                            </div>

                            <div className="relative space-y-4">

                               <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.25em] leading-loose">Disbursements</p>

                               <div className="flex items-baseline gap-2">

                                  <span className="text-lg font-bold text-amber-600 opacity-30">₱</span>

                                  <span className="text-4xl font-black text-amber-600 tracking-tighter tabular-nums leading-none">{totalDisbursed.toLocaleString()}</span>

                               </div>

                               <div className="flex items-center gap-2">

                                  <div className="px-2 py-0.5 bg-white/60 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest">

                                     Capital Outflow

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

                        className="pt-20 border-t border-slate-100"

                        style={{ marginTop: '40px' }}

                     >

                        <div className="flex flex-col gap-10">

                           {/* Section 1: Customer Collections */}

                           <div className="space-y-4">

                              <div className="flex items-baseline justify-between border-b border-slate-100 pb-3 px-2">

                                 <div>

                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.25em] leading-tight">Transaction Ledger</h3>

                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Verified cryptographic audit trail of manual recordings</p>

                                 </div>

                                 <div className="px-2.5 py-0.5 bg-slate-50 border border-slate-100 text-primary rounded-md text-[9px] font-black uppercase tracking-widest">

                                    {payments.length} {payments.length === 1 ? 'Entry' : 'Entries'}

                                 </div>

                              </div>

                              <div className="space-y-2">

                                 {payments.length > 0 ? (

                                    payments.map((p, idx) => (

                                      <motion.div 

                                         initial={{ opacity: 0, y: 8 }}

                                         animate={{ opacity: 1, y: 0 }}

                                         transition={{ delay: idx * 0.05 }}

                                         key={p.id} 

                                         className="bg-white rounded-[20px] py-3 pl-3 pr-4 border border-[#e8eaed] hover:border-emerald-500/20 hover:shadow-sm transition-all flex items-center justify-between"

                                      >

                                         {/* Left side: Icon, Amount, and the 2-line metadata/notes stack */}

                                         <div className="flex items-center gap-4 flex-1 min-w-0">

                                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">

                                               <CreditCard size={14} />

                                            </div>

                                            <p className="text-[14px] font-black text-emerald-800 tracking-tight tabular-nums shrink-0">₱{p.amount.toLocaleString()}</p>

                                            <div className="w-px h-6 bg-slate-100 shrink-0" />

                                            <div className="flex flex-col min-w-0">

                                               {/* First Line: Created, Updated, Reference (Sized smaller to text-[8px], bold uppercase) */}

                                               <div className="flex items-center gap-2 flex-wrap">

                                                   <span className="text-[8px] text-emerald-700 font-extrabold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100/50">

                                                      DATE: {new Date(p.actual_date || p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

                                                   </span>

                                                   <span className="text-slate-300 text-[10px] font-light">•</span>

                                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">

                                                     created: {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

                                                     {p.creator?.full_name ? ` by ${p.creator.full_name}` : ''}

                                                  </span>

                                                  {p.updated_at && p.updated_at !== p.created_at && (

                                                     <>

                                                        <span className="text-slate-300 text-[10px] font-light">•</span>

                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">

                                                           updated: {new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

                                                           {p.modifier?.full_name ? ` by ${p.modifier.full_name}` : ''}

                                                        </span>

                                                     </>

                                                  )}

                                                  {p.reference_number && (

                                                     <>

                                                        <span className="text-slate-300 text-[10px] font-light">•</span>

                                                        <span className="text-[8px] font-bold text-indigo-400/80 uppercase tracking-wider">#{p.reference_number}</span>

                                                     </>

                                                  )}

                                               </div>

                                               {/* Second Line: Description / Note (Small, gray, below the metadata) */}

                                               {p.notes && (

                                                  <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">

                                                     {p.notes}

                                                  </p>

                                               )}

                                            </div>

                                         </div>

                                         {/* Right side: Action Buttons */}

                                         <div className="flex items-center gap-2 shrink-0 ml-4">

                                            <button 

                                               onClick={() => {

                                                  setEditingPayment(p);

                                                  setSelectedMethod(p.payment_method || 'Cash');

                                                  setIsPaymentModalOpen(true);

                                               }}

                                               className="h-7 w-7 rounded-full text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center shrink-0 border border-slate-100 hover:border-indigo-100 shadow-sm bg-white"

                                               title="Edit Transaction"

                                            >

                                               <Settings size={12} />

                                            </button>

                                            <button 

                                               onClick={() => handleVoidPayment(p.id)}

                                               className="h-7 w-7 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0 border border-slate-100 hover:border-red-100 shadow-sm bg-white"

                                               title="Void Transaction"

                                            >

                                               <Trash2 size={12} />

                                            </button>

                                         </div>

                                      </motion.div>

                                    ))

                                 ) : (

                                    <div className="py-12 bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">

                                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No manual transactions recorded yet</p>

                                    </div>

                                 )}

                              </div>

                           </div>

                           {/* Section 2: Supplier Disbursements */}

                           <div className="space-y-4">

                              <div className="flex items-baseline justify-between border-b border-slate-100 pb-3 px-2">

                                 <div>

                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.25em] leading-tight">Disbursements</h3>

                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cryptographic log of shouldered out-of-pocket costs</p>

                                 </div>

                                 <div className="px-2.5 py-0.5 bg-slate-50 border border-slate-100 text-primary rounded-md text-[9px] font-black uppercase tracking-widest">

                                    {disbursements.length} {disbursements.length === 1 ? 'Entry' : 'Entries'}

                                 </div>

                              </div>

                              <div className="space-y-2">

                                 {disbursements.length > 0 ? (

                                    disbursements.map((d, idx) => (

                                      <motion.div 

                                         initial={{ opacity: 0, y: 8 }}

                                         animate={{ opacity: 1, y: 0 }}

                                         transition={{ delay: idx * 0.05 }}

                                         key={d.id} 

                                         className="bg-white rounded-[20px] py-3 pl-3 pr-4 border border-[#e8eaed] hover:border-amber-500/20 hover:shadow-sm transition-all flex items-center justify-between"

                                      >

                                         {/* Left side: Icon, Amount, and the 2-line metadata/notes stack */}

                                         <div className="flex items-center gap-4 flex-1 min-w-0">

                                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">

                                               <Receipt size={14} />

                                            </div>

                                            <p className="text-[14px] font-black text-amber-800 tracking-tight tabular-nums shrink-0">₱{d.amount.toLocaleString()}</p>

                                            <div className="w-px h-6 bg-slate-100 shrink-0" />

                                            <div className="flex flex-col min-w-0">

                                               {/* First Line: Created, Updated, Reference (Sized smaller to text-[8px], bold uppercase) */}

                                               <div className="flex items-center gap-2 flex-wrap">

                                                   <span className="text-[8px] text-amber-700 font-extrabold uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50">

                                                      DATE: {new Date(d.actual_date || d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

                                                   </span>

                                                   <span className="text-slate-300 text-[10px] font-light">•</span>

                                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">

                                                     created: {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

                                                     {d.creator?.full_name ? ` by ${d.creator.full_name}` : ''}

                                                  </span>

                                                  {d.updated_at && d.updated_at !== d.created_at && (

                                                     <>

                                                        <span className="text-slate-300 text-[10px] font-light">•</span>

                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">

                                                           updated: {new Date(d.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

                                                           {d.modifier?.full_name ? ` by ${d.modifier.full_name}` : ''}

                                                        </span>

                                                     </>

                                                  )}

                                                  {d.reference_number && (

                                                     <>

                                                        <span className="text-slate-300 text-[10px] font-light">•</span>

                                                        <span className="text-[8px] font-bold text-indigo-400/80 uppercase tracking-wider">#{d.reference_number}</span>

                                                     </>

                                                  )}

                                               </div>

                                               {/* Second Line: Description / Note (Small, gray, below the metadata) */}

                                               {d.notes && (

                                                  <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">

                                                     {d.notes}

                                                  </p>

                                               )}

                                            </div>

                                         </div>

                                         {/* Right side: Action Buttons */}

                                         <div className="flex items-center gap-2 shrink-0 ml-4">

                                            <button 

                                               onClick={() => {

                                                  setEditingDisbursement(d);

                                                  setIsDisbursementModalOpen(true);

                                               }}

                                               className="h-7 w-7 rounded-full text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center shrink-0 border border-slate-100 hover:border-indigo-100 shadow-sm bg-white"

                                               title="Edit Disbursement"

                                            >

                                               <Settings size={12} />

                                            </button>

                                            <button 

                                               onClick={() => handleVoidDisbursement(d.id)}

                                               className="h-7 w-7 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0 border border-slate-100 hover:border-red-100 shadow-sm bg-white"

                                               title="Void Disbursement"

                                            >

                                               <Trash2 size={12} />

                                            </button>

                                         </div>

                                      </motion.div>

                                    ))

                                 ) : (

                                    <div className="py-12 bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">

                                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No supplier disbursements recorded yet</p>

                                    </div>

                                 )}

                              </div>

                           </div>

                        </div>

                     </div>

                  </div>

               </div>

            </div>

         </div>

      </main>

      <AnimatePresence>

        {isPaymentModalOpen && (

          <PremiumModalWrapper

            isOpen={isPaymentModalOpen}

            onClose={() => setIsPaymentModalOpen(false)}

            title={editingPayment ? "Edit Payment" : "Record Payment"}

            subtitle="Update collection status and transaction records"

            icon={<CreditCard size={18} strokeWidth={2.5} />}

            maxWidth="440px"

          >

             <form onSubmit={(e: any) => {

               e.preventDefault();

               handleAddPayment({

                 amount: e.target.amount.value,

                 reference: e.target.reference.value,

                 notes: e.target.notes.value,

                 actual_date: e.target.actual_date.value

               });

             }} className="flex flex-col !gap-6">

                <div className="flex flex-col !gap-5">

                   <div className="!space-y-1">

                     <label className={premiumFormStyles.label}>Date of Transaction</label>

                     <input 

                       type="date" 

                       name="actual_date" 

                       required 

                       defaultValue={editingPayment ? getLocalDateString(editingPayment.actual_date || editingPayment.created_at) : getLocalDateString()}

                       className={premiumFormStyles.input}

                     />

                   </div>

                  <div className="!space-y-1">

                    <label className={premiumFormStyles.label}>Amount (₱)</label>

                    <input 

                      type="number" 

                      name="amount" 

                      required 

                      step="0.01" 

                      defaultValue={editingPayment ? editingPayment.amount : ""}

                      placeholder="0.00" 

                      className={premiumFormStyles.input}

                    />

                  </div>

                  <div className="!space-y-1">

                    <label className={premiumFormStyles.label}>Reference # (Optional)</label>

                    <input 

                      type="text" 

                      name="reference" 

                      defaultValue={editingPayment ? editingPayment.reference_number : ""}

                      placeholder="Ref ID / Transaction #" 

                      className={premiumFormStyles.input}

                    />

                  </div>

                  <div className="!space-y-1">

                    <label className={premiumFormStyles.label}>Details / Notes</label>

                    <textarea 

                      name="notes" 

                      required

                      rows={3}

                      defaultValue={editingPayment ? editingPayment.notes : ""}

                      placeholder="e.g. Deposit for trip booking confirmation" 

                      className={premiumFormStyles.input + " !py-3 !h-auto"}

                    />

                  </div>

                </div>

                <div className="!pt-6 !border-t !border-emerald-500/10 !flex !gap-4">

                  <button 

                    type="button" 

                    onClick={() => setIsPaymentModalOpen(false)} 

                    className={premiumFormStyles.secondaryButton + " !flex-1 !h-14 !text-[13px]"}

                  >

                    Cancel

                  </button>

                  <button 

                    type="submit" 

                    disabled={isSaving} 

                    className={premiumFormStyles.button + " !flex-[1.5] !h-14 !text-[13px]"}

                  >

                    {isSaving ? (

                      <>

                        <Clock size={16} className="animate-spin opacity-50" />

                        <span>Saving...</span>

                      </>

                    ) : (

                      <>

                        <Check size={16} strokeWidth={2.5} className="opacity-80" />

                        <span>{editingPayment ? "Save Changes" : "Confirm Transaction"}</span>

                      </>

                    )}

                  </button>

                </div>

             </form>

          </PremiumModalWrapper>

        )}

      </AnimatePresence>

      <AnimatePresence>

        {isDisbursementModalOpen && (

          <PremiumModalWrapper

            isOpen={isDisbursementModalOpen}

            onClose={() => setIsDisbursementModalOpen(false)}

            title={editingDisbursement ? "Edit Disbursement" : "Record Supplier Disbursement"}

            subtitle="Update out-of-pocket advanced costs and supplier fees"

            icon={<Receipt size={18} strokeWidth={2.5} />}

            maxWidth="440px"

          >

             <form onSubmit={(e: any) => {

               e.preventDefault();

               handleAddDisbursement({

                 amount: e.target.amount.value,

                 reference: e.target.reference.value,

                 notes: e.target.notes.value,

                 actual_date: e.target.actual_date.value

               });

             }} className="flex flex-col !gap-6">

                <div className="flex flex-col !gap-5">

                   <div className="!space-y-1">

                     <label className={premiumFormStyles.label}>Date of Disbursement</label>

                     <input 

                       type="date" 

                       name="actual_date" 

                       required 

                       defaultValue={editingDisbursement ? getLocalDateString(editingDisbursement.actual_date || editingDisbursement.created_at) : getLocalDateString()}

                       className={premiumFormStyles.input}

                     />

                   </div>

                  <div className="!space-y-1">

                    <label className={premiumFormStyles.label}>Amount (₱)</label>

                    <input 

                      type="number" 

                      name="amount" 

                      required 

                      step="0.01" 

                      defaultValue={editingDisbursement ? editingDisbursement.amount : ""}

                      placeholder="0.00" 

                      className={premiumFormStyles.input}

                    />

                  </div>

                  <div className="!space-y-1">

                    <label className={premiumFormStyles.label}>Reference # (Optional)</label>

                    <input 

                      type="text" 

                      name="reference" 

                      defaultValue={editingDisbursement ? editingDisbursement.reference_number : ""}

                      placeholder="Ref ID / Receipt #" 

                      className={premiumFormStyles.input}

                    />

                  </div>

                  <div className="!space-y-1">

                    <label className={premiumFormStyles.label}>Details / Notes</label>

                    <textarea 

                      name="notes" 

                      required

                      rows={3}

                      defaultValue={editingDisbursement ? editingDisbursement.notes : ""}

                      placeholder="e.g. Out-of-pocket payment for hotel accommodation deposit" 

                      className={premiumFormStyles.input + " !py-3 !h-auto"}

                    />

                  </div>

                </div>

                <div className="!pt-6 !border-t !border-emerald-500/10 !flex !gap-4">

                  <button 

                    type="button" 

                    onClick={() => setIsDisbursementModalOpen(false)} 

                    className={premiumFormStyles.secondaryButton + " !flex-1 !h-14 !text-[13px]"}

                  >

                    Cancel

                  </button>

                  <button 

                    type="submit" 

                    disabled={isDisbursementSaving} 

                    className={premiumFormStyles.button + " !flex-[1.5] !h-14 !text-[13px]"}

                  >

                    {isDisbursementSaving ? (

                      <>

                        <Clock size={16} className="animate-spin opacity-50" />

                        <span>Saving...</span>

                      </>

                    ) : (

                      <>

                        <Check size={16} strokeWidth={2.5} className="opacity-80" />

                        <span>{editingDisbursement ? "Save Changes" : "Confirm Advance"}</span>

                      </>

                    )}

                  </button>

                </div>

             </form>

          </PremiumModalWrapper>

        )}

      </AnimatePresence>

      <AdminReportModal 

         isOpen={showAdminReport}

         onClose={() => setShowAdminReport(false)}

         quote={quote}

         details={details}

         incs={incs}

         totalPaid={totalPaid}

         dbMiscPresets={dbMiscPresets}

      />

    </div>

  );

}

interface AdminReportModalProps {

  isOpen: boolean;

  onClose: () => void;

  quote: QuoteData;

  details: any;

  incs: string[];

  totalPaid: number;

  dbMiscPresets: any[];

}

function AdminReportModal({ isOpen, onClose, quote, details, incs, totalPaid, dbMiscPresets }: AdminReportModalProps) {

  if (!isOpen) return null;

  // Helper to check inclusions (fuzzy match)

  const isIncluded = (key: string) => {

    return incs.some(inc => inc.toLowerCase().includes(key.toLowerCase()));

  };

  // Helper to get misc value by ID

  const getMiscTotal = (id: string) => {

    return quote.items?.reduce((sum, item) => sum + (item.dynamic_costs?.[id] || 0), 0) || 0;

  };

  // Replicate fuel calculation logic from matrix utils

  const calculateDailyFuel = (item: any) => {

    if (item.fuel_cost_manual !== undefined && item.fuel_cost_manual !== null && item.fuel_cost_manual > 0) return item.fuel_cost_manual;

    if (!item.km || item.km <= 0) return 0;

    const activeFleet = (quote.fleet && quote.fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)

      ? quote.fleet.filter((v: any) => item.selected_vehicle_ids!.includes(v.id))

      : quote.fleet;

    if (activeFleet && activeFleet.length > 0) {

      return activeFleet.reduce((acc, v: any) => {

        const kmpl = v.km_per_l || 10;

        const price = v.fuel_price || 60;

        return acc + (item.km / kmpl) * price;

      }, 0);

    }

    const kmpl = item.km_per_l || 10;

    const price = item.fuel_price || 0;

    return (item.km / kmpl) * price;

  };

  // Calculate Expenses

  const expenses: { label: string; amount: number; included: boolean }[] = [];

  // 1. Fleet Rate

  const fleetRate = quote.items?.reduce((sum, item) => {

    const activeFleet = (quote.fleet && quote.fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)

      ? quote.fleet.filter((v: any) => item.selected_vehicle_ids!.includes(v.id))

      : quote.fleet;

    const dailyRate = (activeFleet && activeFleet.length > 0)

      ? activeFleet.reduce((acc, v: any) => acc + (v.daily_rate || 0), 0)

      : (item.vehicle_rate || 0);

    return sum + dailyRate;

  }, 0) || 0;

  expenses.push({ label: "Fleet Rate", amount: fleetRate, included: !!details.inclusions?.vehicle });

  // 2. Fuel

  const fuelCost = quote.items?.reduce((sum, item) => sum + calculateDailyFuel(item), 0) || 0;

  expenses.push({ label: "Fuel", amount: fuelCost, included: isIncluded("Fuel") });

  // 3. Guest Accom

  const guestAccom = quote.items?.reduce((sum, item) => sum + (item.guest_accommodation_amount || 0), 0) || 0;

  expenses.push({ label: "Guest Accom", amount: guestAccom, included: isIncluded("Accommodation") });

  // 4. Matrix Miscellaneous

  dbMiscPresets.forEach(preset => {

    const amount = getMiscTotal(preset.id);

    const pName = preset.name.toLowerCase().trim();

    // Exact exclusions to prevent duplication with primary categories added above

    const primaryCategories = ["fleet rate", "fuel", "guest accom"];

    if (primaryCategories.includes(pName)) return;

    if (amount > 0) {

      expenses.push({ label: preset.name, amount: amount, included: isIncluded(preset.name) });

    }

  });

  // Calculate totals based on Official Package Details

  const agreedTotal = details.total_amount || 0;

  const totalExpenses = agreedTotal;

  const net = totalExpenses - totalPaid;

  const reportText = `

Travel Details

Tour Date: ${quote.items && quote.items.length > 0 ? `${new Date(quote.items[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${new Date(quote.items[quote.items.length-1].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'N/A'}

Pick Up Time (ETA): ${quote.eta ? new Date(quote.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}

Drop-off Time (ETD): ${quote.etd ? new Date(quote.etd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}

Pick Up Location: ${quote.pickup_location || 'TBA'}

Contact Person: ${quote.customer_name}

Contact Number: ${quote.contact_number || 'N/A'}

__________

Expenses

${expenses.filter(e => e.included).map(e => `${e.label}: ₱${Math.round(e.amount).toLocaleString()}`).join('\n')}

LESS RESERVATION: ₱${Math.round(totalPaid).toLocaleString()}

__________

Itinerary (Include Accomodation if applicable)

${quote.items?.map(item => {

  const activeIds = item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0 

    ? item.selected_vehicle_ids 

    : (quote.fleet || []).map((v: any) => v.id);

  const vNames = (quote.fleet || []).filter((v: any) => activeIds.includes(v.id)).map((v: any) => v.model).join(', ');

  const detailsStr = item.itinerary_details ? `\nDetails:\n*****\n${item.itinerary_details}\n*****` : '';

  return `Day ${item.day_number}: ${item.destination} (Car: ${vNames || 'n/a'}) (Accoms: ${item.guest_accommodation_name || 'n/a'})${detailsStr}`;

}).join('\n\n')}

  `.trim();

  const [showCopied, setShowCopied] = React.useState(false);

  const handleCopy = () => {

    navigator.clipboard.writeText(reportText);

    setShowCopied(true);

    setTimeout(() => setShowCopied(false), 2000);

  };

  return (

    <PremiumModalWrapper

      isOpen={isOpen}

      onClose={onClose}

      title="Trip Report"

      subtitle="Internal Operational Summary"

      icon={<FileText size={22} />}

      maxWidth="540px"

    >

      <div className="flex flex-col h-full max-h-[70vh] min-h-0">

        <style>{`

          .admin-report-scroll::-webkit-scrollbar {

            width: 10px;

          }

          .admin-report-scroll::-webkit-scrollbar-track {

            background: #f8fafc;

            border-radius: 10px;

          }

          .admin-report-scroll::-webkit-scrollbar-thumb {

            background: #cbd5e1; /* Initial subtle grey */

            border-radius: 10px;

            border: 2px solid #fffdfa;

            transition: all 0.2s ease-in-out;

          }

          .admin-report-scroll:hover::-webkit-scrollbar-thumb {

            background: #10b981; /* Emerald glow on hover */

          }

          .admin-report-scroll::-webkit-scrollbar-thumb:hover {

            background: #059669 !important;

          }

          .btn-operational {

            height: 3rem !important; /* 48px */

            border-radius: 0.75rem !important; /* 12px squircle */

            font-size: 10px !important;

            font-weight: 900 !important;

            text-transform: uppercase !important;

            letter-spacing: 0.1em !important;

            transition: all 0.2s ease-in-out !important;

          }

          .btn-copy { 

            background: #1e3a8a !important; 

            box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.3) !important;

          }

          .btn-copy:hover { background: #1e40af !important; }

          .btn-print { 

            background: #1a2138 !important; 

            box-shadow: 0 10px 15px -3px rgba(26, 33, 56, 0.3) !important;

          }

          .btn-print:hover { background: #2a3454 !important; }

        `}</style>

        <div className="flex-1 px-2 pt-2 pb-4 min-h-0">

           <div 

             className="bg-[#fffdfa] rounded-[24px] border border-slate-200 shadow-sm !overflow-y-scroll admin-report-scroll !p-8"

             style={{ height: '420px' }}

           >

              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-slate-700 select-all !pl-0">

                <span className="font-black text-primary">Travel Details</span>

                {"\n"}Tour Date: {quote.items && quote.items.length > 0 ? `${new Date(quote.items[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${new Date(quote.items[quote.items.length-1].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'N/A'}

                {"\n"}Pick Up Time (ETA): {quote.eta ? new Date(quote.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}

                {"\n"}Drop-off Time (ETD): {quote.etd ? new Date(quote.etd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}

                {"\n"}Pick Up Location: {quote.pickup_location || 'TBA'}

                {"\n"}Contact Person: {quote.customer_name}

                {"\n"}Contact Number: {quote.contact_number || 'N/A'}

                {"\n"}__________

                {"\n"}<span className="font-black text-primary">Expenses</span>

                {"\n"}{expenses.filter(e => e.included).map(e => `${e.label}: ₱${Math.round(e.amount).toLocaleString()}`).join('\n')}

                {"\n"}<span className="font-black text-rose-600">LESS RESERVATION: ₱{Math.round(totalPaid).toLocaleString()}</span>

                {"\n"}__________

                {"\n"}<span className="font-black text-primary">Itinerary (Include Accomodation if applicable)</span>

                {"\n"}{quote.items?.map(item => {

                  const activeIds = item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0 

                    ? item.selected_vehicle_ids 

                    : (quote.fleet || []).map((v: any) => v.id);

                  const vNames = (quote.fleet || []).filter((v: any) => activeIds.includes(v.id)).map((v: any) => v.model).join(', ');

                  const detailsStr = item.itinerary_details ? `\nDetails:\n*****\n${item.itinerary_details}\n*****` : '';

                  return `Day ${item.day_number}: ${item.destination} (Car: ${vNames || 'n/a'}) (Accoms: ${item.guest_accommodation_name || 'n/a'})${detailsStr}`;

                }).join('\n\n')}

              </pre>

           </div>

        </div>

        <div className="!pt-6 flex items-center justify-center gap-3 shrink-0 border-t border-slate-50 !mt-2 no-print">

          <button 

            type="button"

            onClick={handleCopy}

            disabled={showCopied}

            className={`btn-operational btn-copy flex-1 text-white transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${showCopied ? '!bg-blue-500' : ''}`}

          >

            {showCopied ? (

              <>

                <Check size={14} />

                <span>COPIED!</span>

              </>

            ) : (

              <>

                <ArrowRight size={14} className="rotate-[-45deg]" /> 

                <span>COPY REPORT</span>

              </>

            )}

          </button>

          <button 

            type="button"

            onClick={() => window.print()}

            className="btn-operational btn-print flex-1 text-white transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"

          >

            <Printer size={14} />

            <span>PRINT REPORT</span>

          </button>

        </div>

      </div>

    </PremiumModalWrapper>

  );

}

