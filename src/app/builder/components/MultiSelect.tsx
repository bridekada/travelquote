"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: { id: string; label: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = "Select...",
  className,
  disabled
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const toggleOption = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = React.useMemo(() => {
    if (selectedIds.length === 0) return "None Selected";
    const selectedLabels = options
      .filter(o => selectedIds.includes(o.id))
      .map(o => o.label);
    return selectedLabels.join(", ");
  }, [selectedIds, options]);

  const dropdownContent = isOpen && ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${coords.top + 4}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 9999
      }}
      className="bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar !p-1.5 space-y-0.5">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={cn(
                "flex w-full items-center !py-2.5 !px-5 rounded-xl transition-all text-left border border-transparent !outline-none !gap-2",
                isSelected 
                  ? "bg-slate-50/50 text-emerald-800" 
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "!mr-5 flex h-5 w-5 items-center justify-center rounded-full transition-all shrink-0",
                isSelected ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-slate-50 border border-slate-200"
              )}>
                {isSelected && <Check className="h-3 w-3" strokeWidth={4} />}
              </div>
              <span className="truncate text-[11px] font-bold leading-none !m-0">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={cn(
          "!h-[34px] !px-4 !bg-white !shadow-sm !border !border-slate-300 !font-bold !text-primary !text-[11px] !w-full !rounded-xl !transition-all !flex !items-center !justify-between !outline-none !focus:ring-4 !focus:ring-emerald-500/5",
          isOpen && "!border-emerald-500/30 !ring-4 !ring-emerald-500/5",
          disabled && "!opacity-60 !grayscale !cursor-default",
          className
        )}
      >
        <span className="!truncate !text-primary !m-0 !leading-none">{displayLabel}</span>
        <ChevronDown className={cn("!h-3 !w-3 !shrink-0 !text-slate-400 !transition-transform !duration-200 !m-0", isOpen && "!rotate-180")} />
      </button>
      {dropdownContent}
    </div>
  );
}
