"use client";

import { Plus, Minus, MapPin } from "lucide-react";
import { QuoteItem } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex gap-1 mt-1 flex-wrap">
      {options.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && toggleTag(tag)}
            className={`inline-flex items-center px-1.5 rounded text-[5.5px] font-black uppercase tracking-wide transition-all leading-none ${readOnly ? "cursor-default opacity-50 grayscale" : "cursor-pointer hover:scale-110 active:scale-95"} ${isActive
                ? "bg-rose-500 text-white shadow-sm hover:opacity-90"
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
  readOnly = false
}: ItinerarySequenceProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] text-primary flex items-center justify-center">
          <MapPin size={18} />
        </div>
        <h2 className="text-lg font-bold text-primary">Itinerary Sequence</h2>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-[#e8eaed] shadow-sm shadow-primary/[0.02] flex flex-col md:flex-row gap-4 md:gap-10 items-start p-4 md:p-6 rounded-[24px]"
          >
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-6 flex justify-center">
                {index === items.length - 1 && items.length > 1 && !readOnly && (
                  <button
                    onClick={onRemoveLastDay}
                    className="h-6 w-6 rounded-full text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center active:scale-95"
                    title="Remove Last Day"
                  >
                    <Minus size={14} strokeWidth={4} />
                  </button>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex flex-col items-center justify-center shadow-lg shadow-primary/10">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Day</span>
                <span className="text-base font-bold">{item.day_number}</span>
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
                <div className="md:col-span-12 lg:col-span-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0 inline-block">Destination Preset</label>
                      <Select 
                        value={item.applied_preset_id || "custom"}
                        disabled={readOnly}
                        onValueChange={(val) => {
                          if (!val) return;
                          onApplyPreset(index, val === "custom" ? "" : val);
                        }}
                      >
                        <SelectTrigger 
                          className={`!h-[36px] !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary text-[10px] w-full ${readOnly ? "opacity-60 grayscale cursor-default" : ""}`}
                        >
                          <SelectValue>
                            {item.applied_preset_id 
                              ? dbPresets.find(p => p.id === item.applied_preset_id)?.title 
                              : "-- Custom Destination --"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark min-w-[280px]">
                          <SelectItem value="custom" className="text-[12px] font-bold py-2">-- Custom Destination --</SelectItem>
                          {dbPresets.map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-[12px] font-medium py-2">
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!item.applied_preset_id && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 ml-1 mb-0 inline-block">Custom Destination</label>
                        <input
                          type="text"
                          className="input !py-1.5 !px-3 !bg-emerald-50/20 !border-emerald-100 font-bold text-primary disabled:opacity-50 disabled:grayscale transition-all"
                          style={{ height: '36px', fontSize: '12px' }}
                          placeholder="e.g. Siargao Island"
                          value={item.destination || ""}
                          onChange={(e) => onUpdateItem(index, { destination: e.target.value })}
                          disabled={readOnly}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4 space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0 inline-block">Est. KM</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="input !py-0 !px-3 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary pr-8 !rounded-lg disabled:opacity-50 disabled:grayscale transition-all"
                          style={{ fontSize: '11px', height: '32px' }}
                          value={item.km || ""}
                          onChange={(e) => onUpdateItem(index, { km: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          disabled={readOnly}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-tertiary opacity-40 uppercase">KM</span>
                      </div>
                    </div>

                    {dbAccommodations.length > 0 && (
                      <div className="col-span-8 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0 inline-block">Accommodation</label>
                        <Select
                          value={item.guest_accommodation_id || "custom"}
                          disabled={readOnly}
                          onValueChange={(val) => {
                            if (!val) return;
                            const actualVal = val === "custom" ? "" : val;
                            const isTransitioningToCustom = actualVal === "" && item.guest_accommodation_id !== "";
                            
                            const accom = dbAccommodations.find(a => a.id === actualVal);
                            
                            const updates: any = { guest_accommodation_id: actualVal };
                            
                            if (accom) {
                              // Filling from preset
                              updates.guest_accommodation_name = accom.name;
                              updates.guest_accommodation_amount = accom.amount;
                            } else if (isTransitioningToCustom) {
                              // Clean slate for new manual entry
                              updates.guest_accommodation_name = "";
                              updates.guest_accommodation_amount = 0;
                            }
                            
                            onUpdateItem(index, updates);
                          }}
                        >
                          <SelectTrigger className={`!h-[32px] !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary text-[10px] w-full !rounded-lg ${readOnly ? "opacity-60 grayscale cursor-default" : ""}`}>
                            <SelectValue>
                              {item.guest_accommodation_id 
                                ? dbAccommodations.find(a => a.id === item.guest_accommodation_id)?.name 
                                : "-- Custom Accommodation --"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="dark min-w-[320px]">
                            <SelectItem value="custom" className="text-[12px] font-bold py-2">-- Custom Accommodation --</SelectItem>
                            {dbAccommodations.map(a => (
                              <SelectItem key={a.id} value={a.id} className="text-[12px] font-medium py-2">
                                {a.name} <span className="opacity-50 text-[10px] ml-2">(₱{a.amount?.toLocaleString()})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Custom Accommodation Entry */}
                  {!item.guest_accommodation_id && (
                    <div className="grid grid-cols-12 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="col-span-8 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 ml-1 mb-0 inline-block">Custom Accommodation</label>
                        <input
                          type="text"
                          className="input !py-1 !px-3 !bg-emerald-50/10 !border-emerald-100/50 font-bold text-primary !rounded-lg disabled:opacity-50 disabled:grayscale transition-all"
                          style={{ height: '32px', fontSize: '11px' }}
                          placeholder="Name of Hotel/Stay"
                          value={item.guest_accommodation_name || ""}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            onUpdateItem(index, {
                              guest_accommodation_name: newVal,
                              ...(!newVal.trim() ? { guest_accommodation_amount: 0 } : {})
                            });
                          }}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className={`text-[9px] font-black uppercase tracking-widest ml-1 mb-0 inline-block transition-colors ${!item.guest_accommodation_name?.trim() ? 'text-gray-400' : 'text-emerald-600'}`}>Price</label>
                        <div className="relative">
                          <input
                            type="number"
                            disabled={!item.guest_accommodation_name?.trim() || readOnly}
                            className="input !py-1 !px-3 !bg-emerald-50/10 !border-emerald-100/50 font-bold text-primary pr-6 !rounded-lg disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed transition-all"
                            style={{ height: '32px', fontSize: '11px' }}
                            placeholder="0"
                            value={item.guest_accommodation_amount || ""}
                            onChange={(e) => onUpdateItem(index, { guest_accommodation_amount: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-emerald-600/40">₱</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-12 lg:col-span-7 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-0 inline-block">Daily Log / Details</label>
                    <span className="text-[9px] font-bold text-primary bg-[#f0f2f5] px-2 py-0.5 rounded-lg">
                      {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <textarea
                    className="w-full min-h-[72px] p-3 bg-[#f8f9fb] border border-[#e8eaed] rounded-xl font-medium leading-relaxed outline-none transition-all focus:border-primary/30 focus:bg-white disabled:opacity-50 disabled:grayscale"
                    style={{ fontSize: '12px', resize: 'vertical' }}
                    placeholder="Briefly describe the day's activities..."
                    value={item.itinerary_details || ""}
                    onChange={(e) => onUpdateItem(index, { itinerary_details: e.target.value })}
                    disabled={readOnly}
                  />
                </div>

                <div className="md:col-span-12 pt-2 border-t border-gray-50 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary ml-1 mb-0 inline-block">Cost Association Tags</label>
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
        ))}
      </div>

      {!readOnly && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onAddDay}
            className="h-10 px-8 bg-white border border-[#e8eaed] text-text-tertiary font-black text-[10px] uppercase tracking-widest hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center gap-2 rounded-xl shadow-sm active:scale-95"
          >
            <Plus size={14} /> Add Day to Trip
          </button>
        </div>
      )}
    </section>
  );
}
