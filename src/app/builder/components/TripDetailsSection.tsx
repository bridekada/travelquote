"use client";

import { Users, Car, Fuel, Percent, Calendar as CalendarIcon, Clock } from "lucide-react";
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
  dbVehicles: any[];
  readOnly?: boolean;
}

export default function TripDetailsSection({
  quote,
  setQuote,
  dbVehicles,
  readOnly = false
}: TripDetailsSectionProps) {
  return (
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
              className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale transition-all" 
              placeholder="e.g. Maria Clara"
              value={quote.customer_name}
              onChange={(e) => setQuote({...quote, customer_name: e.target.value})}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">FB Name / Alias</label>
            <input 
              type="text" 
              className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale" 
              value={quote.fb_name}
              onChange={(e) => setQuote({...quote, fb_name: e.target.value})}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Contact No.</label>
            <input 
              type="text" 
              className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale" 
              value={quote.contact_number}
              onChange={(e) => setQuote({...quote, contact_number: e.target.value})}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-10 pt-6 md:pt-10 border-t border-[#f0f2f5]">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">PAX Count</label>
            <div className="relative">
              <input 
                type="number" 
                className="input !pl-12 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale" 
                value={quote.pax_count}
                onChange={(e) => setQuote({...quote, pax_count: parseInt(e.target.value) || 1})}
                disabled={readOnly}
              />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40" size={18} />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Vehicle Selection (Auto-fit)</label>
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
                <SelectTrigger className="!h-[42px] !pl-12 !pr-10 !bg-[#f0f2f5]/50 !border-[#e8eaed] text-sm font-bold w-full">
                  <SelectValue>
                    {(() => {
                      const v = dbVehicles.find(v => v.model === quote.vehicle_model);
                      if (!v) return quote.vehicle_model || "-- Select Vehicle --";
                      return `${v.model} (${v.pax_capacity} PAX) — ${v.km_per_l || 10} KM/L`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark min-w-[320px]">
                  {dbVehicles.map(v => (
                    <SelectItem key={v.id} value={v.model} className="text-[13px] font-bold py-2">
                      {v.model} <span className="opacity-50 text-[11px] font-medium ml-2">({v.pax_capacity} PAX) — {v.km_per_l || 10} KM/L</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Base Fuel Price</label>
            <div className="relative">
              <input 
                type="number" 
                className="input !pl-12 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale" 
                value={quote.default_fuel_price || 60}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setQuote({
                    ...quote, 
                    default_fuel_price: val,
                    items: quote.items.map(item => ({ ...item, fuel_price: val }))
                  });
                }}
                disabled={readOnly}
              />
              <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary opacity-40" size={18} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-10 pt-6 md:pt-10 border-t border-[#f0f2f5]">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1 mb-0.5 inline-block">Start (ETA)</label>
            <div className={`relative ${readOnly ? "pointer-events-none opacity-50" : ""}`}>
              <Flatpickr
                data-enable-time
                className="input date-input-compact !pl-12 !pr-4 !bg-emerald-50/20 !border-emerald-100/50 font-bold w-full"
                value={quote.eta}
                disabled={readOnly}
                options={{
                  dateFormat: "Y-m-d H:i",
                  enableTime: true,
                  time_24hr: false,
                  altInput: true,
                  altFormat: "F j, Y h:i K",
                }}
                onChange={([date]) => {
                  if (!date) return;
                  const newEta = date.toISOString();
                  let newEtd = quote.etd;
                  if (newEta && newEtd && new Date(newEta) >= new Date(newEtd)) {
                    const adjustedEtd = new Date(newEta);
                    adjustedEtd.setHours(adjustedEtd.getHours() + 1);
                    newEtd = adjustedEtd.toISOString();
                  }
                  setQuote({ ...quote, eta: newEta, etd: newEtd });
                }}
              />
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 opacity-40" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 ml-1 mb-0.5 inline-block">End (ETD)</label>
            <div className={`relative ${readOnly ? "pointer-events-none opacity-50" : ""}`}>
              <Flatpickr
                data-enable-time
                className="input date-input-compact !pl-12 !pr-4 !bg-rose-50/20 !border-rose-100/50 font-bold w-full"
                value={quote.etd}
                disabled={readOnly}
                options={{
                  dateFormat: "Y-m-d H:i",
                  enableTime: true,
                  time_24hr: false,
                  altInput: true,
                  altFormat: "F j, Y h:i K",
                  minDate: quote.eta ? new Date(quote.eta) : undefined
                }}
                onChange={([date]) => {
                  if (!date) return;
                  setQuote({ ...quote, etd: date.toISOString() });
                }}
              />
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-600 opacity-40" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Pickup Location</label>
            <input 
              type="text" 
              className="input !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale" 
              style={{ fontSize: '10px' }} 
              value={quote.pickup_location || ""} 
              onChange={(e) => setQuote({...quote, pickup_location: e.target.value})} 
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Drop-off Location</label>
            <input 
              type="text" 
              className="input !h-10 !px-6 !bg-[#f8f9fb] !border-[#e8eaed] text-sm font-bold disabled:opacity-50 disabled:grayscale" 
              style={{ fontSize: '10px' }} 
              value={quote.dropoff_location || ""} 
              onChange={(e) => setQuote({...quote, dropoff_location: e.target.value})} 
              disabled={readOnly}
            />
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
                className="input !pl-12 !bg-amber-50/30 !border-amber-200 text-sm font-bold disabled:opacity-50 disabled:grayscale" 
                value={quote.admin_commission || 0}
                onChange={(e) => setQuote({...quote, admin_commission: parseFloat(e.target.value) || 0})}
                disabled={readOnly}
              />
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 opacity-60" size={18} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
