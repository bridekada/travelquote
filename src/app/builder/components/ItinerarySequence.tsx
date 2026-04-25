"use client";

import { Plus, Minus, MapPin, Trash2 } from "lucide-react";
import { QuoteItem } from "./types";
import { btnAction } from "@/lib/styles";
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
                : "bg-[#f0f2f5] text-text-tertiary/40 hover:text-text-tertiary/70 hover:bg-[#e8eaed]"
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
    <div className="w-full !px-2 md:!px-4 lg:!px-6 !mt-4 md:!mt-6">
      <section>
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 hover:border-slate-200/60 hover:bg-yellow-50/25">
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
                <div className="md:col-span-12 lg:col-span-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0 inline-block">Itinerary</label>
                      <Select 
                        value={item.applied_preset_id || "custom"}
                        disabled={readOnly}
                        onValueChange={(val) => {
                          if (!val) return;
                          onApplyPreset(index, val === "custom" ? "" : val);
                        }}
                      >
                        <SelectTrigger 
                          className={`!h-[34px] !px-4 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary !text-[11px] w-full !rounded-xl ${readOnly ? "opacity-60 grayscale cursor-default" : ""}`}
                        >
                          <SelectValue>
                            {item.applied_preset_id 
                              ? dbPresets.find(p => p.id === item.applied_preset_id)?.title 
                              : "Custom Itinerary"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark min-w-[280px]">
                          <SelectItem value="custom" className="text-[12px] font-bold py-2">Custom Itinerary</SelectItem>
                          {dbPresets.map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-[12px] font-medium py-2">
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!item.applied_preset_id && (
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0 inline-block">Custom Itinerary</label>
                        <input
                          type="text"
                          className="input !h-[34px] !px-4 !bg-rose-50/20 !border-rose-100 font-bold text-primary !text-[11px] disabled:opacity-50 disabled:grayscale transition-all"
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
                      <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0 inline-block">Est. KM</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="input !h-[34px] !pl-4 !pr-10 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary !rounded-xl disabled:opacity-50 disabled:grayscale transition-all !text-[11px]"
                          value={item.km || ""}
                          onChange={(e) => onUpdateItem(index, { km: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          disabled={readOnly}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 !text-[9px] font-black text-text-tertiary opacity-40 uppercase">KM</span>
                      </div>
                    </div>

                  </div>

                </div>

                <div className="md:col-span-12 lg:col-span-7 space-y-2 pr-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-0 inline-block">Daily Log / Details</label>
                  </div>
                  <textarea
                    className="w-full min-h-[72px] !p-4 bg-[#f8f9fb] border border-[#e8eaed] rounded-xl font-medium leading-relaxed outline-none transition-all focus:border-primary/30 focus:bg-white disabled:opacity-50 disabled:grayscale resize-none overflow-hidden"
                    style={{ fontSize: '11px' }}
                    placeholder="Briefly describe the day's activities..."
                    value={item.itinerary_details || ""}
                    onChange={(e) => onUpdateItem(index, { itinerary_details: e.target.value })}
                    onInput={(e: any) => {
                      e.target.style.height = "auto";
                      e.target.style.height = Math.max(72, e.target.scrollHeight) + "px";
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = Math.max(72, el.scrollHeight) + "px";
                      }
                    }}
                    disabled={readOnly}
                  />
                </div>

                <div className="md:col-span-12 lg:col-span-9 space-y-1 pt-2 border-t border-gray-50/50">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4 space-y-1">
                      <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0 inline-block">Accommodation</label>
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
                            updates.guest_accommodation_name = accom.name;
                            updates.guest_accommodation_amount = accom.amount;
                          } else if (isTransitioningToCustom) {
                            updates.guest_accommodation_name = "";
                            updates.guest_accommodation_amount = 0;
                          }
                          onUpdateItem(index, updates);
                        }}
                      >
                        <SelectTrigger className={`!h-[34px] !px-4 !bg-[#f0f2f5]/50 !border-[#e8eaed] font-bold text-primary !text-[11px] w-full !rounded-xl ${readOnly ? "opacity-60 grayscale cursor-default" : ""}`}>
                          <SelectValue>
                            {item.guest_accommodation_id 
                              ? dbAccommodations.find(a => a.id === item.guest_accommodation_id)?.name 
                              : "Custom Accommodation"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark min-w-[320px]">
                          <SelectItem value="custom" className="text-[12px] font-bold py-2">Custom Accommodation</SelectItem>
                          {dbAccommodations.map(a => (
                            <SelectItem key={a.id} value={a.id} className="text-[12px] font-medium py-2">
                              {a.name} <span className="opacity-50 text-[10px] ml-2">(₱{a.amount?.toLocaleString()})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!item.guest_accommodation_id && (
                      <>
                        <div className="col-span-5 space-y-1 animate-in fade-in slide-in-from-left-1 duration-200">
                          <label className="!text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-4 mb-0 inline-block">Custom Accommodation</label>
                          <input
                            type="text"
                            className="input !h-[34px] !px-4 !bg-rose-50/20 !border-rose-100/50 font-bold text-primary !rounded-xl !text-[11px] disabled:opacity-50 disabled:grayscale transition-all"
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
                        <div className="col-span-3 space-y-1 animate-in fade-in slide-in-from-left-1 duration-200">
                          <label className={`text-[9px] font-black uppercase tracking-widest ml-1 mb-0 inline-block transition-colors ${!item.guest_accommodation_name?.trim() ? 'text-text-tertiary' : 'text-text-tertiary'}`}>Price</label>
                          <div className="relative">
                            <input
                              type="number"
                              disabled={!item.guest_accommodation_name?.trim() || readOnly}
                              className="input !py-1 !px-3 !bg-rose-50/20 !border-rose-100/50 font-bold text-primary pr-6 !rounded-lg disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed transition-all"
                              style={{ height: '34px', fontSize: '11px' }}
                              placeholder="0"
                              value={item.guest_accommodation_amount || ""}
                              onChange={(e) => onUpdateItem(index, { guest_accommodation_amount: parseFloat(e.target.value) || 0 })}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-rose-600/40">₱</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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
