"use client";

import { Plus, Minus, MapPin, Trash2, Globe, Link } from "lucide-react";
import { QuoteItem } from "./types";
import { btnAction } from "@/lib/styles";
import { SearchableSelect } from "./SearchableSelect";
import { MultiSelect } from "./MultiSelect";

interface TagSelectorProps {
  options: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

function TagSelector({ options, selectedTags, onChange, readOnly = false }: TagSelectorProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="flex gap-1.5 mt-1 flex-wrap">
      {options.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && toggleTag(tag)}
            className={`inline-flex items-center px-2 rounded text-[9px] font-black uppercase tracking-wide transition-all leading-none ${readOnly ? "cursor-default opacity-50 grayscale" : "cursor-pointer hover:scale-110 active:scale-95"} ${isActive
                ? "bg-rose-500 text-white shadow-sm hover:opacity-90"
                : "bg-[#f0f2f5] text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:ring-1 hover:ring-rose-200"
              }`}
            style={{ height: '20px', minHeight: '20px', padding: '0 8px' }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

interface ItinerarySequenceProps {
  items: QuoteItem[];
  dbPresets: any[];
  dbAccommodations: any[];
  dbMiscPresets: any[];
  onApplyPreset: (index: number, pId: string) => void;
  onUpdateItem: (index: number, updates: Partial<QuoteItem>) => void;
  onAddDay: () => void;
  onRemoveLastDay: () => void;
  readOnly?: boolean;
  fleet?: any[];
}

export default function ItinerarySequence({
  items,
  dbPresets,
  dbAccommodations,
  dbMiscPresets,
  onApplyPreset,
  onUpdateItem,
  onAddDay,
  onRemoveLastDay,
  readOnly = false,
  fleet = []
}: ItinerarySequenceProps) {
  return (
    <div className="w-full !px-2 md:!px-4 lg:!px-6 !mt-4 md:!mt-6">
      <section>
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/30 transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 hover:border-slate-200/60 hover:bg-yellow-50/25">
          {/* Premium In-Card Header */}
          <div className="bg-slate-50/50 border-b border-slate-100 !px-4 md:!px-6 !pl-2 md:!pl-3 !pt-2 !pb-2 md:!pt-3 md:!pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MapPin size={16} />
              </div>
              <div>
                <h2 className="text-[13px] font-black text-slate-800 tracking-tight leading-none uppercase">Itinerary Sequence</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Route & Accommodation Details</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row gap-3 md:gap-6 items-start !p-4 md:!p-6 transition-colors hover:bg-slate-50/30"
              >
              <div className="flex flex-col items-center gap-2 shrink-0">
                <span className="text-[11px] font-black uppercase text-primary tracking-tight whitespace-nowrap mb-[-2px]">
                  {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <div className="w-12 h-12 rounded-xl bg-primary text-white flex flex-col items-center justify-center shadow-lg shadow-primary/10">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Day</span>
                  <span className="text-base font-bold">{item.day_number}</span>
                </div>
                {index === items.length - 1 && items.length > 1 && !readOnly && (
                  <button
                    onClick={onRemoveLastDay}
                    className="h-7 w-7 rounded-full text-rose-500 hover:text-rose-600 bg-rose-50/50 hover:bg-rose-100/50 transition-all flex items-center justify-center active:scale-90 mt-1 shadow-sm border border-rose-100/50"
                    title="Remove Last Day"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>

            <div className="flex-1 min-w-0">
              {/* Top Section: Itinerary + Est KM + Itinerary Details (Dynamic Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
                
                {/* Column 1-8 (or 1-4 if expanded) contains the inputs */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Row 1: Itinerary Select (Creatable) */}
                  <div className="space-y-1">
                    <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0.5 inline-block">Itinerary</label>
                    <SearchableSelect
                      value={item.applied_preset_id || item.destination || ""}
                      onValueChange={(val) => onApplyPreset(index, val)}
                      options={dbPresets}
                      getLabel={(p) => p.title}
                      getValue={(p) => p.id}
                      placeholder="Select or type itinerary..."
                      searchPlaceholder="Search or type new..."
                      disabled={readOnly}
                      creatable={true}
                      clearable={true}
                      className={`!h-[34px] !px-4 !bg-white shadow-sm !border-slate-300 font-bold text-primary !text-[11px] w-full !rounded-xl ${readOnly ? "opacity-60 grayscale cursor-default" : ""}`}
                    />
                  </div>

                  {/* Row 2: Est KM */}
                  <div className="space-y-1">
                    <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0.5 inline-block">Est. KM</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input !h-[34px] !pl-4 !pr-10 !bg-white shadow-sm !border-slate-300 font-bold text-primary !rounded-xl disabled:opacity-50 disabled:grayscale transition-all !text-[11px]"
                        value={item.km || ""}
                        onChange={(e) => onUpdateItem(index, { km: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        disabled={readOnly}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 !text-[9px] font-black text-text-tertiary opacity-40 uppercase">KM</span>
                    </div>
                  </div>
                </div>

                {/* Itinerary Details - EXPANDS to col-span-8 if Custom Name is HIDDEN */}
                <div className="md:col-span-12 lg:col-span-8 space-y-2 pr-4 transition-all duration-300">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-0.5 inline-block">Itinerary Details</label>
                  </div>
                  <textarea
                    className="w-full min-h-[100px] !p-3 bg-white shadow-sm border border-slate-300 rounded-xl font-medium leading-relaxed outline-none transition-all focus:border-primary/30 focus:bg-white disabled:opacity-50 disabled:grayscale resize-none overflow-hidden"
                    style={{ fontSize: '10px' }}
                    placeholder="Notes..."
                    value={item.itinerary_details || ""}
                    onChange={(e) => onUpdateItem(index, { itinerary_details: e.target.value })}
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
              </div>

              {/* Bottom Section: Accommodation + Tags */}
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                {/* Row 1: Accommodation & Pricing */}
                <div className="grid grid-cols-12 gap-3 md:gap-4 items-end">
                  <div className="col-span-4 space-y-1">
                    <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0.5 inline-block">Accommodation</label>
                    <SearchableSelect
                      value={item.guest_accommodation_id || item.guest_accommodation_name || ""}
                      onValueChange={(val) => {
                        const accom = dbAccommodations.find(a => a.id === val);
                        const updates: any = { 
                          guest_accommodation_id: accom ? val : "",
                          guest_accommodation_name: accom ? accom.name : val,
                          guest_accommodation_amount: accom ? accom.amount : 0 // Clear price on manual change
                        };
                        onUpdateItem(index, updates);
                      }}
                      options={dbAccommodations}
                      getLabel={(a) => a.name}
                      getValue={(a) => a.id}
                      placeholder="Select or type accommodation..."
                      searchPlaceholder="Search or type new..."
                      disabled={readOnly}
                      creatable={true}
                      clearable={true}
                      renderOption={(a) => (
                        <>
                          {a.name} <span className="opacity-50 text-[10px] ml-2">({a.pax_count} Pax | ₱{a.amount?.toLocaleString()})</span>
                        </>
                      )}
                      className={`!h-[34px] !px-4 !bg-white shadow-sm !border-slate-300 font-bold text-primary !text-[11px] w-full !rounded-xl ${readOnly ? "opacity-60 grayscale cursor-default" : ""}`}
                    />
                  </div>

                  <div className="col-span-4 space-y-1 animate-in fade-in slide-in-from-left-1 duration-200">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Manual Price (₱)</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input !py-1 !px-3 !bg-rose-50/10 shadow-sm !border-rose-300/50 font-bold text-primary pr-6 !rounded-lg disabled:opacity-40 disabled:grayscale transition-all"
                        style={{ height: '34px', fontSize: '11px' }}
                        placeholder="0"
                        value={item.guest_accommodation_amount || ""}
                        onChange={(e) => onUpdateItem(index, { guest_accommodation_amount: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-rose-600/40">₱</span>
                    </div>
                  </div>

                  <div className="col-span-4 space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0.5 inline-block">Hotel Link (URL)</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="input !py-1 !pl-10 !pr-3 !bg-white shadow-sm !border-slate-300 font-bold text-primary !rounded-lg disabled:opacity-40 disabled:grayscale transition-all"
                        style={{ height: '34px', fontSize: '11px' }}
                        placeholder="https://..."
                        value={item.accommodation_url || ""}
                        onChange={(e) => onUpdateItem(index, { accommodation_url: e.target.value })}
                        disabled={readOnly}
                      />
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      {item.accommodation_url && (
                        <a 
                          href={item.accommodation_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <Link size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Vehicle Selection */}
                <div className="pt-2 border-t border-gray-50 grid grid-cols-12 gap-3 md:gap-4">
                  <div className="col-span-4 space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0.5 inline-block">Active Vehicle For This Date</label>
                    <MultiSelect
                      options={fleet.map((v, i) => {
                        const sameModels = fleet.filter(f => f.model === v.model);
                        const label = sameModels.length > 1 
                          ? `${v.model} #${sameModels.findIndex(f => f.id === v.id) + 1}`
                          : v.model;
                        return { id: v.id, label };
                      })}
                      selectedIds={(item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0 
                        ? item.selected_vehicle_ids 
                        : fleet.map(v => v.id))
                        .filter(id => fleet.some(v => v.id === id))
                      }
                      onChange={(newIds) => onUpdateItem(index, { selected_vehicle_ids: newIds })}
                      disabled={readOnly}
                      className="!rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0.5 inline-block">Cost Association Tags</label>
                    <TagSelector
                      selectedTags={item.tags || []}
                      onChange={(newTags) => onUpdateItem(index, { tags: newTags })}
                      options={dbMiscPresets.map(p => p.name)}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

          {!readOnly && (
            <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-center">
              <button
                onClick={onAddDay}
                style={{ ...btnAction, height: '38px', padding: '0 20px' }}
                className="group transition-all hover:opacity-90 active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} /> 
                <span>Add Day to Trip</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
