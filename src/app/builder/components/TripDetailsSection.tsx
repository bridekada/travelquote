"use client";

import { useMemo } from "react";
import { Users, Car, Fuel, Percent, Calendar as CalendarIcon, Clock, MapPin, Map, Plus, Trash2, Gauge, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const Flatpickr = dynamic(() => import("react-flatpickr"), { ssr: false });
import "flatpickr/dist/flatpickr.css";
import { QuoteData, QuoteVehicle } from "./types";
import { formatForInput } from "./utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TripDetailsSectionProps {
  quote: QuoteData;
  setQuote: (val: QuoteData) => void;
  onEtaChangeRequest: (date: Date, iso: string) => void;
  onEtdChange: (date: Date, iso: string) => void;
  dbVehicles: any[];
  readOnly?: boolean;
  onUpdateFleet: (fleet: QuoteVehicle[]) => void;
}

export default function TripDetailsSection({
  quote,
  setQuote,
  onEtaChangeRequest,
  onEtdChange,
  dbVehicles,
  readOnly = false,
  onUpdateFleet
}: TripDetailsSectionProps) {
  const baseOptions = useMemo(() => ({
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    time_24hr: false,
    altInput: true,
    altFormat: "F j, Y h:i K",
    allowInput: true,
    altInputClass: "input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-emerald-300 !text-[11px] font-semibold text-emerald-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full"
  }), []);

  const etdOptions = useMemo(() => ({
    ...baseOptions,
    altInputClass: "input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-rose-300 !text-[11px] font-semibold text-rose-700 focus:!border-rose-500 focus:!ring-4 focus:!ring-rose-500/5 transition-all w-full",
    minDate: quote.eta ? new Date(quote.eta) : undefined
  }), [baseOptions, quote.eta]);

  const handleAddVehicle = () => {
    const firstV = dbVehicles[0];
    const newVehicle: QuoteVehicle = {
      id: `v-${Date.now()}`,
      model: firstV?.model || "Standard Sedan",
      daily_rate: Number(firstV?.default_rate) || Number(firstV?.rate) || 0,
      km_per_l: Number(firstV?.km_per_l) || 10,
      fuel_price: quote.default_fuel_price || 60
    };
    onUpdateFleet([...(quote.fleet || []), newVehicle]);
  };

  const handleRemoveVehicle = (id: string) => {
    if ((quote.fleet || []).length <= 1) return;
    onUpdateFleet((quote.fleet || []).filter(v => v.id !== id));
  };

  const handleUpdateVehicleRow = (id: string, updates: Partial<QuoteVehicle>) => {
    onUpdateFleet((quote.fleet || []).map(v => v.id === id ? { ...v, ...updates } : v));
  };

  return (
    <div className="w-full !px-2 md:!px-4 lg:!px-6 !mt-4 md:!mt-6">
      <section>
        
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 hover:border-slate-200/60 hover:bg-yellow-50/25">
          {/* Premium In-Card Header */}
          <div className="bg-slate-50/50 border-b border-slate-100 !px-4 md:!px-6 !pl-2 md:!pl-3 !pt-2 !pb-2 md:!pt-3 md:!pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Users size={16} />
              </div>
              <div>
                <h2 className="text-[13px] font-black text-slate-800 tracking-tight leading-none uppercase">Trip Details</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Passenger & Logistics Information</p>
              </div>
            </div>
          </div>
          
          <div className="!p-3 md:!p-5 space-y-4 md:space-y-7">
        {/* Row 1: Identity & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 lg:gap-10">
          <div className="md:col-span-2 space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">Customer Name</label>
            <input 
              type="text" 
              className="input !h-[34px] !px-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
              placeholder="e.g. Maria Clara"
              value={quote.customer_name}
              onChange={(e) => setQuote({...quote, customer_name: e.target.value})}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">Contact No.</label>
            <input 
              type="text" 
              className="input !h-[34px] !px-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
              value={quote.contact_number}
              onChange={(e) => setQuote({...quote, contact_number: e.target.value})}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">PAX Count</label>
            <div className="relative">
              <input 
                type="number" 
                className="input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
                value={quote.pax_count === 0 ? "" : quote.pax_count}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                  if (isNaN(val)) return;
                  setQuote({...quote, pax_count: val});
                }}
                disabled={readOnly}
              />
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">FB Name</label>
            <input 
              type="text" 
              className="input !h-[34px] !px-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
              value={quote.fb_name}
              onChange={(e) => setQuote({...quote, fb_name: e.target.value})}
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Row 2: Timing & Logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10 pt-4 md:pt-7 border-t border-[#f0f2f5]">
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 ml-4 mb-0.5 inline-block">Start (ETA)</label>
            <div className={`relative ${readOnly ? "pointer-events-none opacity-50" : ""} [&_input]:!text-[11px]`}>
              <Flatpickr
                data-enable-time
                className="hidden"
                value={quote.eta}
                disabled={readOnly}
                options={{
                  ...baseOptions,
                  onOpen: () => { (window as any)._isEtaPickerOpen = true; },
                  onClose: () => { 
                    setTimeout(() => { (window as any)._isEtaPickerOpen = false; }, 100); 
                  }
                }}
                onChange={([date]) => {
                  if (!date || !(window as any)._isEtaPickerOpen) return;
                  const newIso = date.toISOString();
                  const d1 = new Date(date);
                  const d2 = new Date(quote.eta);
                  const isSameDay = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
                  if (!isSameDay) onEtaChangeRequest(date, newIso);
                }}
              />
              <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600/50" size={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-rose-600 ml-4 mb-0.5 inline-block">End (ETD)</label>
            <div className={`relative ${readOnly ? "pointer-events-none opacity-50" : ""} [&_input]:!text-[11px]`}>
              <Flatpickr
                data-enable-time
                className="hidden"
                value={quote.etd}
                disabled={readOnly}
                options={etdOptions}
                onChange={([date]) => {
                  if (!date) return;
                  onEtdChange(date, date.toISOString());
                }}
              />
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-600/50" size={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">Pickup Location</label>
            <div className="relative">
              <input 
                type="text" 
                className="input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
                placeholder="e.g. Cebu City"
                value={quote.pickup_location || ""} 
                onChange={(e) => setQuote({...quote, pickup_location: e.target.value})} 
                disabled={readOnly}
              />
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">Drop-off Location</label>
            <div className="relative">
              <input 
                type="text" 
                className="input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
                placeholder="e.g. Moalboal"
                value={quote.dropoff_location || ""} 
                onChange={(e) => setQuote({...quote, dropoff_location: e.target.value})} 
                disabled={readOnly}
              />
              <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
          </div>
        </div>

        {/* Row 3: Vehicle Fleet */}
        <div className="!mt-4 md:!mt-5 mb-2 md:mb-3 py-2 md:py-3 border-y border-[#f0f2f5] space-y-4">
          <div className="flex items-center justify-between ml-1">
             <div className="flex flex-col">
                <label className="!text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Vehicle Fleet</label>
             </div>
             {!readOnly && (
                <button 
                  onClick={handleAddVehicle}
                  className="!h-[32px] !px-4 !bg-emerald-600 !text-white !rounded-full !text-[10px] !font-black !uppercase !tracking-widest !border-none !shadow-sm hover:!bg-emerald-700 hover:!shadow-md !transition-all !flex !items-center !gap-2 group"
                >
                  <Plus size={12} className="group-hover:rotate-90 !transition-transform" />
                  <span>Add Vehicle</span>
                </button>
             )}
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(quote.fleet || []).map((v, idx) => (
                <motion.div 
                  key={v.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="grid grid-cols-1 md:grid-cols-5 items-end gap-4 md:gap-6 lg:gap-10 p-4 bg-slate-50/40 border border-slate-100 rounded-[20px] relative group/row"
                >
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="!text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Selection</label>
                    <div className="relative">
                      <Select 
                        value={v.model || ""}
                        disabled={readOnly}
                        onValueChange={(model) => {
                          if (!model) return;
                          const sv = dbVehicles.find(dv => dv.model === model);
                          handleUpdateVehicleRow(v.id, {
                            model,
                            daily_rate: Number(sv?.default_rate) || Number(sv?.rate) || 0,
                            km_per_l: Number(sv?.km_per_l) || 10
                          });
                        }}
                      >
                        <SelectTrigger className="!h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 w-full rounded-xl transition-all hover:border-emerald-200">
                          <SelectValue placeholder="Select Vehicle" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-1.5 !min-w-[200px] !max-w-[320px]">
                          {dbVehicles.map(dv => (
                            <SelectItem key={dv.id} value={dv.model} className="!text-[10px] font-semibold py-2 px-3 cursor-pointer focus:bg-emerald-50 rounded-xl transition-colors mb-0.5">
                              <div className="flex flex-col">
                                <span className="leading-tight">{dv.model}</span>
                                <span className="opacity-50 text-[9px] font-medium leading-tight">{dv.pax_capacity} PAX — {dv.km_per_l || 10} KM/L</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="!text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Daily Rate (₱)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 transition-all w-full" 
                        value={v.daily_rate}
                        onChange={(e) => handleUpdateVehicleRow(v.id, { daily_rate: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                      />
                      <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="!text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Base Fuel Price (₱)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 transition-all w-full" 
                        value={v.fuel_price}
                        onChange={(e) => handleUpdateVehicleRow(v.id, { fuel_price: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                      />
                      <Fuel className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="!text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">KM/L</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="input !h-[34px] !pl-10 !pr-4 !bg-white shadow-sm !border-slate-300 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 transition-all w-full" 
                        value={v.km_per_l}
                        onChange={(e) => handleUpdateVehicleRow(v.id, { km_per_l: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                      />
                      <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    </div>
                  </div>

                  {!readOnly && (quote.fleet || []).length > 1 && (
                    <button 
                      onClick={() => handleRemoveVehicle(v.id)}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 !h-[32px] !w-[32px] flex items-center justify-center rounded-xl bg-white text-rose-500 hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-xl opacity-0 group-hover/row:opacity-100 z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Row 4: Finance */}
        <div className="!mt-3 md:!mt-4 pt-2 md:pt-3 border-t border-[#f0f2f5]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10">
            <div className="space-y-1.5">
              <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 ml-4 mb-0.5 inline-block">Admin Commission (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="100"
                  className="input !h-[34px] !pl-10 !pr-4 !bg-amber-50/10 shadow-sm !border-amber-300 !text-[11px] font-semibold text-amber-700 focus:!border-amber-500 focus:!ring-4 focus:!ring-amber-500/5 transition-all w-full" 
                  value={quote.admin_commission === 0 ? "" : quote.admin_commission}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    if (isNaN(val)) return;
                    setQuote({...quote, admin_commission: val});
                  }}
                  disabled={readOnly}
                />
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600/50" size={14} />
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </section>
    </div>
  );
}
