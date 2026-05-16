"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Search, ChevronDown, Check, Plus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: any[];
  getLabel: (option: any) => string;
  getValue: (option: any) => string;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  customItem?: {
    value: string;
    label: string;
  };
  creatable?: boolean;
  renderOption?: (option: any) => React.ReactNode;
  clearable?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  getLabel,
  getValue,
  placeholder,
  searchPlaceholder = "Search...",
  disabled = false,
  className = "",
  customItem,
  creatable = false,
  renderOption,
  clearable = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });
  
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const updateCoords = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, []);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside or scrolling
  React.useEffect(() => {
    const handleEvents = (event: any) => {
      if (
        isOpen && 
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        // If we are closing and the search was cleared, and it was a custom value, we might want to clear it?
        // Actually, let's just reset search to empty when closing normally.
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleEvents);
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleEvents);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen, updateCoords]);

  // Focus input when opened and handle manual text pre-fill
  React.useEffect(() => {
    if (isOpen) {
      // If it's a custom value (not in options), pre-fill the search
      if (value && !options.some(opt => getValue(opt) === value)) {
        setSearch(value);
      }
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select(); // Auto-select for easy "backspace to clear"
        }
      }, 10);
    }
  }, [isOpen, value, options, getValue]);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(opt => 
      getLabel(opt).toLowerCase().includes(lowerSearch)
    );
  }, [options, search, getLabel]);

  const selectedOption = React.useMemo(() => 
    options.find(opt => getValue(opt) === value)
  , [options, getValue, value]);

  const displayLabel = React.useMemo(() => {
    if (selectedOption) return getLabel(selectedOption);
    if (customItem?.value === value) return customItem.label;
    if (value && !selectedOption) return value; // Show raw value if not in options
    return placeholder;
  }, [selectedOption, customItem, value, getLabel, placeholder]);

  const showCreatable = creatable && search && !options.some(opt => getLabel(opt).toLowerCase() === search.toLowerCase());
  const showClearManual = creatable && value && !search && !options.some(opt => getValue(opt) === value);

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 px-3 text-[11px] font-bold text-slate-700 whitespace-nowrap transition-all outline-none select-none",
          "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-emerald-500 ring-4 ring-emerald-500/5",
          className
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Portal Dropdown */}
      {isOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            top: coords.top + 4,
            left: coords.left,
            width: Math.max(coords.width, 320),
          }}
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
            {/* Search Input Section */}
            <div className="bg-slate-50/90 backdrop-blur-md !p-2.5 border-b border-slate-100">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={13} />
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full !h-[36px] bg-white border border-slate-200 rounded-xl !pl-10 !pr-3 text-[11px] font-bold text-slate-700 placeholder:text-slate-300 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all shadow-sm"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsOpen(false);
                    if (e.key === "Enter") {
                       if (showCreatable) {
                         onValueChange(search);
                         setIsOpen(false);
                         setSearch("");
                       } else if (showClearManual) {
                         onValueChange("");
                         setIsOpen(false);
                         setSearch("");
                       }
                    }
                  }}
                />
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto custom-scrollbar !p-1.5 space-y-0.5">
              {showCreatable && (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(search);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 text-[11px] font-bold !py-2.5 !px-4 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-left border border-emerald-100 mb-1"
                >
                  <Plus size={14} />
                  <span>Use "{search}"</span>
                </button>
              )}
              
              {showClearManual && (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange("");
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 text-[11px] font-bold !py-2.5 !px-4 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all text-left border border-slate-100 mb-1"
                >
                  <XCircle size={14} />
                  <span>Clear current value</span>
                </button>
              )}

              {customItem && (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(customItem.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] !py-2.5 !px-4 rounded-xl border border-transparent transition-all mb-1",
                    value === customItem.value 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                      : "bg-emerald-50/50 text-emerald-600 hover:bg-emerald-600 hover:text-white text-left"
                  )}
                >
                  {customItem.label}
                  {value === customItem.value && <Check size={12} strokeWidth={3} />}
                </button>
              )}
              
              {filteredOptions.length === 0 && !showCreatable ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 opacity-30">
                  <Search size={20} className="text-slate-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">No results found</span>
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const optVal = getValue(opt);
                  const isActive = value === optVal;
                  return (
                    <button
                      key={optVal}
                      type="button"
                      onClick={() => {
                        onValueChange(optVal);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between text-[11px] font-bold !py-2 !px-4 rounded-xl transition-all text-left border border-transparent",
                        isActive 
                          ? "bg-slate-100 text-slate-900 border-slate-200" 
                          : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span className="truncate leading-tight">
                        {renderOption ? renderOption(opt) : getLabel(opt)}
                      </span>
                      {isActive && <Check size={12} strokeWidth={2.5} className="text-emerald-500 shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
