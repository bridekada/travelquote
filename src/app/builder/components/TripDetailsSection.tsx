"use client";

import { useMemo } from "react";
import { Users, Car, Fuel, Percent, Calendar as CalendarIcon, Clock, MapPin, Map } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
const Flatpickr = dynamic(() => import("react-flatpickr"), { ssr: false });
import "flatpickr/dist/flatpickr.css";
import { QuoteData } from "./types";
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
}

export default function TripDetailsSection({
  quote,
  setQuote,
  onEtaChangeRequest,
  onEtdChange,
  dbVehicles,
  readOnly = false
}: TripDetailsSectionProps) {
  const baseOptions = useMemo(() => ({
    dateFormat: "Y-m-d H:i",
    enableTime: true,
    time_24hr: false,
    altInput: true,
    altFormat: "F j, Y h:i K",
    allowInput: true,
    altInputClass: "input !h-[34px] !pl-10 !pr-4 !bg-emerald-50/20 !border-emerald-100/50 !text-[11px] font-semibold text-emerald-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full"
  }), []);

  const etdOptions = useMemo(() => ({
    ...baseOptions,
    altInputClass: "input !h-[34px] !pl-10 !pr-4 !bg-rose-50/20 !border-rose-100/50 !text-[11px] font-semibold text-rose-700 focus:!border-rose-500 focus:!ring-4 focus:!ring-rose-500/5 transition-all w-full",
    minDate: quote.eta ? new Date(quote.eta) : undefined
  }), [baseOptions, quote.eta]);

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
              className="input !h-[34px] !px-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
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
              className="input !h-[34px] !px-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
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
                className="input !h-[34px] !pl-10 !pr-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
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
              className="input !h-[34px] !px-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
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
                    // Small delay to ensure the final onChange fires before we lock the door
                    setTimeout(() => { (window as any)._isEtaPickerOpen = false; }, 100); 
                  }
                }}
                onChange={([date]) => {
                  if (!date || !(window as any)._isEtaPickerOpen) return;
                  
                  const newIso = date.toISOString();
                  const d1 = new Date(date);
                  const d2 = new Date(quote.eta);
                  const isSameDay = 
                    d1.getFullYear() === d2.getFullYear() &&
                    d1.getMonth() === d2.getMonth() &&
                    d1.getDate() === d2.getDate();

                  if (!isSameDay) {
                    onEtaChangeRequest(date, newIso);
                  }
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
                className="input !h-[34px] !pl-10 !pr-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
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
                className="input !h-[34px] !pl-10 !pr-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
                placeholder="e.g. Moalboal"
                value={quote.dropoff_location || ""} 
                onChange={(e) => setQuote({...quote, dropoff_location: e.target.value})} 
                disabled={readOnly}
              />
              <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
          </div>
        </div>

        {/* Row 3: Operations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10 pt-4 md:pt-7 border-t border-[#f0f2f5]">
          <div className="md:col-span-2 space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">Vehicle Selection (Auto-fit)</label>
            <div className={`relative ${readOnly ? "pointer-events-none opacity-50" : ""}`}>
              <Select 
                value={quote.vehicle_model}
                disabled={readOnly}
                onValueChange={(model) => {
                  if (!model) return;
                  const selectedVehicle = dbVehicles.find(v => v.model === model);
                  const rate = selectedVehicle ? Number(selectedVehicle.default_rate) || Number(selectedVehicle.rate) || 0 : 0;
                  const kmpl = selectedVehicle ? Number(selectedVehicle.km_per_l) || 10 : 10;
                  setQuote({
                    ...quote, 
                    vehicle_model: model,
                    items: quote.items.map(item => ({ 
                      ...item, 
                      vehicle_rate: rate,
                      km_per_l: kmpl
                    }))
                  });
                }}
              >
                <SelectTrigger className="!h-[34px] !pl-10 !pr-10 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 w-full hover:border-emerald-200 transition-all rounded-xl shadow-sm">
                  <SelectValue>
                    {(() => {
                      const v = dbVehicles.find(v => v.model === quote.vehicle_model);
                      if (!v) return quote.vehicle_model || "-- SELECT VEHICLE --";
                      return `${v.model} (${v.pax_capacity} PAX) — ${v.km_per_l || 10} KM/L`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-1.5 min-w-[320px]">
                  {dbVehicles.map(v => (
                    <SelectItem 
                      key={v.id} 
                      value={v.model} 
                      className="!text-[11px] font-semibold py-2.5 px-4 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl transition-colors mb-0.5 last:mb-0"
                    >
                      <span>{v.model}</span>
                      <span className="opacity-50 text-[10px] font-medium ml-2">({v.pax_capacity} PAX) — {v.km_per_l || 10} KM/L</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-4 mb-0.5 inline-block">Base Fuel Price</label>
            <div className="relative">
              <input 
                type="number" 
                className="input !h-[34px] !pl-10 !pr-4 !bg-slate-50/50 !border-slate-200 !text-[11px] font-semibold text-slate-700 focus:!border-emerald-500 focus:!ring-4 focus:!ring-emerald-500/5 transition-all w-full" 
                value={quote.default_fuel_price === 0 ? "" : quote.default_fuel_price}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                  if (isNaN(val)) return;
                  setQuote({
                    ...quote, 
                    default_fuel_price: val,
                    items: quote.items.map(item => ({ ...item, fuel_price: val }))
                  });
                }}
                disabled={readOnly}
              />
              <Fuel className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
          </div>
        </div>

        {/* Row 4: Finance */}
        <div className="pt-4 md:pt-7 border-t border-[#f0f2f5]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10">
            <div className="space-y-1.5">
              <label className="!text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 ml-4 mb-0.5 inline-block">Admin Commission (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="100"
                  className="input !h-[34px] !pl-10 !pr-4 !bg-amber-50/20 !border-amber-100 !text-[11px] font-semibold text-amber-700 focus:!border-amber-500 focus:!ring-4 focus:!ring-amber-500/5 transition-all w-full" 
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
