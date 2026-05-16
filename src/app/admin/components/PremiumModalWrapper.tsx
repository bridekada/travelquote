"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  icon?: ReactNode;
}

export function PremiumModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "440px",
  icon
}: PremiumModalWrapperProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Deep Emerald Dim Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 !bg-slate-950/80 !backdrop-blur-[2px]"
          />

          {/* Frosted Emerald Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.99, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className={cn(
              "relative w-full overflow-hidden",
              "!bg-white/95 !backdrop-blur-2xl",
              "!border !border-emerald-500/20 !rounded-[40px]",
              "!shadow-[0_20px_50px_-12px_rgba(0,103,79,0.2),0_0_0_1px_rgba(255,255,255,0.8)_inset]"
            )}
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Emerald Top Highlight */}
            <div className="absolute top-0 inset-x-0 h-px !bg-gradient-to-r !from-transparent !via-emerald-400/30 !to-transparent z-10" />

            {/* Header Section */}
            <div className="!px-8 !pt-8 !pb-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {icon && (
                    <div className="w-11 h-11 !rounded-xl !bg-emerald-900 !text-emerald-50 flex items-center justify-center shadow-lg shadow-emerald-900/20 shrink-0">
                      {icon}
                    </div>
                  )}
                  <div className="!pt-0.5">
                    <h3 className="!text-xl !font-bold !tracking-tight !text-slate-900 !leading-none">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="!text-[12px] !font-medium !text-slate-500 !mt-1.5 !opacity-70">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 !rounded-full !bg-slate-100 hover:!bg-emerald-50 flex items-center justify-center !text-slate-400 hover:!text-emerald-600 transition-all"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="!px-8 !pb-8 !pt-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Refined Emerald Form Tokens
export const premiumFormStyles = {
  label: "!text-[11px] !font-bold !text-emerald-900/60 !tracking-[0.05em] !uppercase !ml-0.5 !mb-1.5 !block",
  input: "!w-full !h-11 !px-4 !bg-emerald-50/20 !border-2 !border-slate-200 !rounded-xl !text-[13px] !font-semibold !text-slate-800 !placeholder:text-slate-300 focus:!bg-white focus:!border-emerald-500/40 focus:!ring-4 focus:!ring-emerald-500/5 !transition-all !outline-none disabled:!opacity-50",
  textarea: "!w-full !min-h-[120px] !p-4 !bg-emerald-50/20 !border-2 !border-slate-200 !rounded-xl !text-[13px] !font-medium !text-slate-800 !placeholder:text-slate-300 focus:!bg-white focus:!border-emerald-500/40 focus:!ring-4 focus:!ring-emerald-500/5 !transition-all !outline-none !resize-none !leading-relaxed",
  button: "!w-full !h-12 !px-6 !bg-emerald-900 !text-white !rounded-[20px] !font-bold !text-[13px] !tracking-wide hover:!bg-emerald-800 !transition-all active:!scale-[0.99] !shadow-lg !shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:!opacity-50",
  secondaryButton: "!w-full !h-12 !px-4 !bg-white !border !border-rose-500/20 !text-rose-600 !rounded-[20px] !font-bold !text-[12px] hover:!bg-rose-50 !transition-all",
  error: "!flex !items-center !gap-2 !p-3 !rounded-xl !bg-rose-50 !text-rose-700 !border !border-rose-100 !text-[11px] !font-bold",
  success: "!flex !items-center !gap-2 !p-3 !rounded-xl !bg-emerald-50 !text-emerald-700 !border !border-emerald-100 !text-[11px] !font-bold",
  group: "!space-y-6 !mb-6",
};
