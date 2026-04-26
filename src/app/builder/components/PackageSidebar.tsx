"use client";

import { useState } from "react";
import { Plus, X, Settings, ChevronDown, Trash2, CheckCircle, Star, Sparkles, CreditCard, Receipt, ShieldCheck, FileText, ArrowRight, Save, Layout, Car, Fuel, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExtraFee } from "./types";

interface PackageSidebarProps {
  packages: any[];
  selectedPackageId: string | null;
  onSelectPackage: (name: string, id: string | null) => void;
  onAddPackage: () => void;
  onRemovePackage: (index: number) => void;
  onUpdatePackage: (index: number, updates: any) => void;
  onToggleMisc: (pkgIndex: number, miscId: string) => void;
  openConfigId: string | null;
  setOpenConfigId: (id: string | null) => void;
  dbMiscPresets: any[];
  extraFees: ExtraFee[];
  discount: number;
  onAddCustomFee: (name: string, amount: number) => void;
  onRemoveExtraFee: (id: string) => void;
  onUpdateDiscount: (val: number) => void;
  notes: string;
  onUpdateNotes: (val: string) => void;
  includeItinerary: boolean;
  onToggleItinerary: (val: boolean) => void;
  onPreview: () => void;
  onViewSaved: () => void;
  grandTotal: number;
  quoteId?: string | null;
  readOnly?: boolean;
}
export default function PackageSidebar({
  packages,
  selectedPackageId,
  onSelectPackage,
  onAddPackage,
  onRemovePackage,
  onUpdatePackage,
  onToggleMisc,
  openConfigId,
  setOpenConfigId,
  dbMiscPresets,
  extraFees,
  discount,
  onAddCustomFee,
  onRemoveExtraFee,
  onUpdateDiscount,
  notes,
  onUpdateNotes,
  includeItinerary,
  onToggleItinerary,
  onPreview,
  onViewSaved,
  grandTotal,
  quoteId,
  readOnly = false
}: PackageSidebarProps) {
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");

  const handleAddFee = () => {
    if (!newFeeName.trim()) return;
    onAddCustomFee(newFeeName, parseFloat(newFeeAmount) || 0);
    setNewFeeName("");
    setNewFeeAmount("");
  };

  const selectedPkg = packages.find(p => p.id === selectedPackageId);

  return (
    <div className="w-full lg:w-[480px] bg-white lg:border-l border-t lg:border-t-0 border-slate-300 shadow-sm transition-all flex flex-col shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] overflow-hidden lg:shadow-2xl">
      <div className="px-4 md:px-8 lg:!px-12 pt-6 md:pt-8 lg:!pt-10 pb-6 md:pb-8 lg:!pb-10 flex-1 lg:overflow-y-auto space-y-8 md:space-y-10 custom-scrollbar">
        
        <div className="space-y-6 md:space-y-8">
          <div className="text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Select Proposed Package</p>
          </div>
          <div className="flex flex-col gap-4">
            {packages.map((pkg, i) => {
              const isSelected = selectedPackageId === pkg.id;
              const isOpen = openConfigId === (pkg.id || `pkg-${i}`);
              
              return (
                <motion.div 
                  key={pkg.id || i} 
                  layout
                  whileTap={readOnly ? {} : { scale: 0.98 }}
                  className={`package-card-premium ${isSelected ? "is-selected" : "is-unselected"} ${readOnly ? "cursor-default pointer-events-none" : ""}`}
                  onClick={() => !readOnly && onSelectPackage(pkg.name, pkg.id || null)}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center card-header-spacious">
                    <div className="flex items-center gap-2">
                       <div className={`px-2.5 py-1 rounded-md text-[7px] font-black uppercase tracking-[0.2em] shadow-sm ${
                        isSelected ? "bg-white/10 text-white/50 border border-white/5" : "bg-gray-50 text-text-tertiary border border-gray-100"
                      }`}>
                        Package {i + 1}
                      </div>
                      {packages.length > 1 && !readOnly && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePackage(i);
                          }}
                          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${
                            isSelected ? "text-white/20 hover:text-rose-400 hover:bg-white/5" : "text-gray-300 hover:text-rose-500 hover:bg-rose-50"
                          }`}
                          title="Remove package option"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pkg.is_recommended && (
                        <div className={`px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-[0.12em] flex items-center gap-1.5 shadow-sm ${
                          isSelected 
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white" 
                            : "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-100/50"
                        }`}>
                          <Sparkles size={8} className={isSelected ? "text-white" : "text-emerald-500"} fill="currentColor" /> 
                          Recommended
                        </div>
                      )}
                      {isSelected && (
                         <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircle size={18} fill="currentColor" className="text-emerald-400 drop-shadow-glow" />
                         </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Package Name */}
                  <div className="package-name-spacious">
                     <input 
                       type="text"
                       value={pkg.name || ""}
                       onChange={(e) => onUpdatePackage(i, { name: e.target.value })}
                       onClick={(e) => e.stopPropagation()}
                       className="package-title-input disabled:opacity-50"
                       placeholder="Enter package name..."
                       disabled={readOnly}
                     />
                  </div>

                  {/* Card Bottom / Price & CTA */}
                  <div className="card-footer-spacious flex items-end justify-between gap-4">
                    <div className="flex flex-col">
                      <span className={`text-[8px] font-black uppercase tracking-[0.25em] mb-1 transition-colors ${isSelected ? "text-white/40" : "text-text-tertiary/40"}`}>
                        Proposal Amount
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <span className={`text-base font-bold mr-1 transition-colors ${isSelected ? "text-white/30" : "text-primary/10"}`}>₱</span>
                          <span className={`text-2xl md:text-3xl font-black tracking-tighter leading-none transition-colors ${isSelected ? "text-white" : "text-primary"}`}>
                            {Math.round(pkg.total).toLocaleString()}
                          </span>
                        </div>
                        {pkg.commissionAmount > 0 && (
                          <div className={`px-2 py-0.5 rounded-md text-[8px] font-bold lowercase tracking-tight transition-all flex items-center gap-1 ${
                            isSelected ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}>
                            + ₱{Math.round(pkg.commissionAmount).toLocaleString()} commission
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenConfigId(isOpen ? null : (pkg.id || `pkg-${i}`));
                      }}
                      disabled={readOnly}
                      className={`flex items-center gap-1.5 !px-4 !h-[28px] !min-h-0 !min-w-0 rounded-lg !text-[8.5px] font-black uppercase tracking-widest transition-all shadow-sm group/btn ${
                        isSelected 
                          ? "!bg-white !text-primary hover:bg-gray-100 active:scale-95" 
                          : "!bg-[#121a30] !text-white hover:opacity-90 active:scale-95"
                      } ${readOnly ? "opacity-30 grayscale cursor-default" : ""}`}
                    >
                      {isOpen ? <X size={10} /> : <Settings size={11} className="group-hover/btn:rotate-45 transition-transform" />}
                      <span className="leading-none">Config</span>
                      <ChevronDown size={10} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="w-full mt-6 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={`!p-3 rounded-2xl border ${isSelected ? "bg-white/5 border-white/5" : "bg-gray-50/50 border-gray-100"} grid grid-cols-1 !gap-0`}>
                          {[
                            { id: 'vehicle', label: 'Vehicle Rate', checked: pkg.config.includes_vehicle, update: { includes_vehicle: !pkg.config.includes_vehicle }, icon: <Car size={10} /> },
                            { id: 'fuel', label: 'Fuel Cost', checked: pkg.config.includes_fuel, update: { includes_fuel: !pkg.config.includes_fuel }, icon: <Fuel size={10} /> },
                            { id: 'accom', label: 'Guest Accom', checked: pkg.config.includes_accommodation, update: { includes_accommodation: !pkg.config.includes_accommodation }, icon: <Users size={10} /> },
                          ].map((inc) => (
                            <label key={inc.id} className="flex items-center justify-between !px-3 !py-1 rounded-xl cursor-pointer hover:bg-black/5 transition-all group/opt">
                              <span className={`!text-[8.5px] font-black uppercase tracking-[0.1em] flex items-center gap-2 ${isSelected ? "text-orange-200/60" : "text-orange-700/60"}`}>
                                {inc.label}
</span>
                              <input 
                                type="checkbox" 
                                checked={inc.checked} 
                                onChange={() => !readOnly && onUpdatePackage(i, inc.update)}
                                className="w-4 h-4 rounded border-orange-900/30 !text-orange-900 !accent-orange-900 focus:ring-0 transition-all cursor-pointer disabled:opacity-30 disabled:grayscale"
                                disabled={readOnly}
                              />
                            </label>
                          ))}

                          {dbMiscPresets.length > 0 && <div className={`h-px my-2 ${isSelected ? "bg-white/5" : "bg-gray-200/50"}`} />}
                          
                          {dbMiscPresets.map((misc) => {
                            const isIncluded = (pkg.config.includes_misc_ids || []).includes(misc.id);
                            return (
                              <label key={misc.id} className="flex items-center justify-between !px-3 !py-1 rounded-xl cursor-pointer hover:bg-black/5 transition-all group/opt">
                                <span className={`!text-[8.5px] font-black uppercase tracking-[0.1em] ${isSelected ? "text-orange-200/60" : "text-orange-700/60"}`}>{misc.name}</span>
                                <input 
                                  type="checkbox" 
                                  checked={isIncluded} 
                                  onChange={() => !readOnly && onToggleMisc(i, misc.id)}
                                  className="w-4 h-4 rounded border-orange-900/30 !text-orange-900 !accent-orange-900 focus:ring-0 transition-all cursor-pointer disabled:opacity-30 disabled:grayscale"
                                  disabled={readOnly}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            
            {!readOnly && (
              <motion.button 
                whileHover={{ scale: 1.01, borderColor: "rgba(16, 185, 129, 0.2)" }}
                whileTap={{ scale: 0.99 }}
                onClick={onAddPackage}
                className="w-full h-16 rounded-[24px] border-2 border-dashed border-gray-100 flex items-center justify-center gap-3 text-text-tertiary hover:text-primary transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                  <Plus size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Alternative Package</span>
              </motion.button>
            )}
          </div>
        </div>

        <div className="h-px bg-gray-50 w-full !mt-10" />
        <div className="space-y-6 pt-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Final Adjustments</p>
             <button 
               onClick={() => setIsAdjustOpen(!isAdjustOpen)}
               className={`h-7 w-7 flex items-center justify-center rounded-full transition-all ${isAdjustOpen ? "bg-primary text-white" : "text-primary bg-gray-100 hover:bg-gray-100"} ${readOnly ? "opacity-20 grayscale pointer-events-none" : ""}`}
             >
               {isAdjustOpen ? <X size={12} /> : <Plus size={12} />}
             </button>
          </div>

          <div className="space-y-4">
            {isAdjustOpen && (
              <div className="p-6 bg-gray-50/50 rounded-[20px] space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-tertiary ml-1">Fee Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Early Bird Discount" 
                    className="w-full bg-white border border-slate-300 shadow-sm transition-all rounded-xl px-4 py-3 text-xs font-bold outline-none ring-primary/20 focus:ring-1"
                    value={newFeeName}
                    onChange={(e) => setNewFeeName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-tertiary">Amount (₱)</label>
                    <span className="text-[7px] font-bold text-text-tertiary/50 uppercase tracking-widest leading-none">
                      Use <span className="text-rose-500">-</span> for discount, <span className="text-emerald-600">+</span> for markup
                    </span>
                  </div>
                  <input 
                    type="number" 
                    placeholder="Enter amount..." 
                    className="w-full bg-white border border-slate-300 shadow-sm transition-all rounded-xl px-4 py-3 text-xs font-bold outline-none ring-primary/20 focus:ring-1"
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleAddFee}
                  className="w-full h-8 bg-primary text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add adjustment
                </button>
              </div>
            )}

            <div className="space-y-3">
              {extraFees.map(fee => (
                <div key={fee.id} className="flex justify-between items-center px-4 py-3 bg-white border border-gray-50 rounded-xl group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-text-tertiary/60">
                      <Receipt size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-primary">{fee.name}</p>
                      <p className="text-[9px] font-bold text-text-tertiary">Adjustment Item</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-black ${fee.amount < 0 ? 'text-rose-500' : 'text-primary'}`}>
                      {fee.amount < 0 ? '-' : '+'} ₱{Math.abs(fee.amount).toLocaleString()}
                    </span>
                    {!readOnly && (
                      <button onClick={() => onRemoveExtraFee(fee.id)} className="text-text-tertiary/20 hover:text-rose-500 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 mt-4 border-t border-gray-100/50">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary mb-1">Grand Total</span>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-black tracking-tighter text-primary">₱{Math.round(grandTotal).toLocaleString()}</span>
                      </div>
                      {selectedPkg?.commissionAmount > 0 && (
                        <div className="mt-1.5 text-[9px] font-black text-emerald-600 flex items-center gap-1.5 uppercase tracking-widest">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          Includes ₱{Math.round(selectedPkg.commissionAmount).toLocaleString()} commission
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={12} /> Live Calculation
                    </div>
                  </div>
                </div>
              </div>

              {/* Finalization Section (Operational Context & Buttons) */}
              <div className="!mt-12 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Additional Notes</span>
                  </div>
                  <textarea 
                    className="w-full min-h-[100px] !px-6 !py-5 bg-white border border-slate-300 shadow-sm rounded-[24px] text-[13px] font-medium text-text-secondary focus:ring-0 focus:border-primary/20 outline-none transition-all placeholder:opacity-30 resize-none disabled:opacity-40 overflow-hidden"
                    placeholder="Add operational details..."
                    value={notes || ""}
                    onChange={(e) => onUpdateNotes(e.target.value)}
                    onInput={(e: any) => {
                      e.target.style.height = "auto";
                      e.target.style.height = Math.max(100, e.target.scrollHeight) + "px";
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = Math.max(100, el.scrollHeight) + "px";
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>
                <div className="h-px bg-gray-100/80 w-full !my-8" />
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Quotation Text</span>
                        <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Customize generated text</p>
                     </div>
                     <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">Include Itinerary</span>
                        <button 
                          onClick={() => !readOnly && onToggleItinerary(!includeItinerary)}
                          disabled={readOnly}
                          className={`w-8 h-4 rounded-full transition-all relative ${includeItinerary ? 'bg-emerald-500' : 'bg-gray-200'} ${readOnly ? "opacity-30 grayscale cursor-default" : ""}`}
                        >
                          <motion.div 
                            animate={{ x: includeItinerary ? 16 : 2 }}
                            className="w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm"
                          />
                        </button>
                     </div>
                   </div>

                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => !readOnly && onViewSaved()}
                        disabled={readOnly}
                        className={`h-[52px] !px-8 bg-white border border-gray-100 rounded-[20px] shadow-sm transition-all group flex items-center justify-center gap-3 shrink-0 ${readOnly ? "opacity-50 grayscale cursor-default" : "hover:shadow-md"}`}
                      >
                         <Layout size={14} className="text-text-tertiary group-hover:text-primary transition-colors" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary group-hover:text-primary transition-colors">Last Saved Quote</span>
                      </button>

                      <button 
                        onClick={() => !readOnly && quoteId && onPreview()}
                        disabled={readOnly || !quoteId}
                        className={`flex-1 h-[52px] ${
                          readOnly 
                            ? "bg-gray-100 text-text-tertiary shadow-none cursor-default" 
                            : !quoteId
                            ? "bg-gray-100 text-text-tertiary border border-dashed border-gray-200 cursor-not-allowed opacity-60"
                            : "bg-[#006644] text-white shadow-xl shadow-emerald-900/10 hover:bg-[#005538] hover:-translate-y-0.5 active:scale-[0.98]"
                        } rounded-[20px] transition-all flex items-center justify-center gap-3 px-8`}
                      >
                         <div className="flex flex-col items-start translate-x-1">
                           <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">
                             {readOnly ? "Final Price Snapshot" : !quoteId ? "Draft Record" : "Quote Generation"}
                           </span>
                           <span className="text-sm font-black italic tracking-tight">
                             {!quoteId ? "Save Record First" : `₱${Math.round(grandTotal).toLocaleString()}`}
                           </span>
                         </div>
                         {!readOnly && quoteId && <ArrowRight size={18} className="opacity-40" />}
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
