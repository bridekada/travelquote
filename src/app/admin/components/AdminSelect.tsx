"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: any[];
  getLabel: (option: any) => string;
  getValue: (option: any) => string;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AdminSelect({
  value,
  onValueChange,
  options,
  getLabel,
  getValue,
  placeholder,
  searchPlaceholder = "Search...",
  disabled = false,
  className = ""
}: AdminSelectProps) {
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
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) updateCoords();
    setIsOpen(!isOpen);
  };

  React.useEffect(() => {
    const handleEvents = (event: any) => {
      if (
        isOpen && 
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
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

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

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
    return placeholder;
  }, [selectedOption, value, placeholder, getLabel]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={cn(
          "!flex !w-full !items-center !justify-between !gap-2 !h-11 !px-4 !bg-emerald-50/20 !border-2 !border-slate-100/80 !rounded-xl !text-[13px] !font-semibold !text-slate-800 !transition-all !outline-none !select-none",
          "focus:!bg-white focus:!border-emerald-500/40 focus:!ring-4 focus:!ring-emerald-500/5",
          isOpen && "!border-emerald-500/40 !ring-4 !ring-emerald-500/5 !bg-white",
          disabled && "!opacity-50 !cursor-not-allowed",
          className
        )}
      >
        <span className={cn("truncate", !selectedOption && "!text-slate-300")}>{displayLabel}</span>
        <ChevronDown className={cn("!size-4 !text-slate-400 !transition-transform !duration-200", isOpen && "!rotate-180")} />
      </button>

      {isOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[1000] animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: coords.top + 6,
            left: coords.left,
            width: coords.width,
          }}
        >
          <div className="!bg-white/95 !backdrop-blur-xl !border !border-emerald-500/20 !shadow-2xl !rounded-xl !overflow-hidden !flex !flex-col">
            <div className="!p-1.5 !border-b !border-slate-100">
              <div className="relative">
                <Search className="absolute !left-2.5 !top-1/2 -!translate-y-1/2 !text-slate-400" size={12} />
                <input
                  ref={inputRef}
                  type="text"
                  className="!w-full !h-8 !bg-slate-50 !border !border-slate-100 !rounded-md !pl-8 !pr-2 !text-[11px] !font-bold !text-slate-700 !placeholder:text-slate-300 focus:!border-emerald-500/30 focus:!bg-white !outline-none !transition-all"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
                />
              </div>
            </div>

            <div className="!max-h-[200px] !overflow-y-auto custom-scrollbar !p-1 !space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="!py-4 !text-center">
                  <span className="!text-[9px] !font-black !uppercase !tracking-widest !text-slate-300">No results</span>
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
                        "!flex !w-full !items-center !justify-between !text-[12px] !font-semibold !py-1.5 !px-3 !rounded-lg !transition-all !text-left !border !border-transparent",
                        isActive 
                          ? "!bg-emerald-600 !text-white !shadow-md !shadow-emerald-600/10" 
                          : "!bg-white !text-slate-600 hover:!bg-emerald-50 hover:!text-emerald-700"
                      )}
                    >
                      <span className="truncate">{getLabel(opt)}</span>
                      {isActive && <Check size={12} strokeWidth={3} />}
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
