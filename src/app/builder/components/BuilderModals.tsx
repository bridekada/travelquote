"use client";

import { AlertTriangle, CheckCircle, Info, X, Copy, Printer } from "lucide-react";
import { motion } from "framer-motion";

interface PremiumDialogProps {
  config: {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'warning';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  };
  onClose: () => void;
}

export function PremiumDialog({ config, onClose }: PremiumDialogProps) {
  if (!config.isOpen) return null;

  const isWarning = config.type === 'warning';
  const isSuccess = config.type === 'success';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] w-full max-w-xs shadow-2xl overflow-hidden border border-white/20 flex flex-col items-center text-center p-8 relative"
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative mb-4 ${
          isWarning ? "bg-rose-50 text-rose-500" : 
          isSuccess ? "bg-emerald-50 text-emerald-500" :
          "bg-indigo-50 text-indigo-500"
        }`}>
           <div className={`absolute inset-0 rounded-2xl animate-pulse opacity-20 ${
             isWarning ? "bg-rose-200" : isSuccess ? "bg-emerald-200" : "bg-indigo-200"
           }`} />
           {isWarning ? <AlertTriangle size={22} strokeWidth={2.5} className="relative" /> : 
            isSuccess ? <CheckCircle size={22} strokeWidth={2.5} className="relative" /> : 
            <Info size={22} strokeWidth={2.5} className="relative" />}
        </div>
        
        <h3 className="text-[15px] font-bold text-primary tracking-tight">{config.title}</h3>
        <p className="text-[12px] font-medium text-text-secondary leading-relaxed mt-3">{config.message}</p>
        
        <div className="grid grid-cols-2 gap-3 w-full mt-8">
           {config.type === 'confirm' || config.type === 'warning' ? (
             <>
               <button 
                 onClick={onClose}
                 className="h-10 bg-[#f8f9fb] text-primary border border-[#e8eaed] rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white hover:border-primary/20 transition-all active:scale-[0.98]"
               >
                 {config.cancelText || "No, Keep it"}
               </button>
               <button 
                 onClick={() => {
                   config.onConfirm?.();
                   onClose();
                 }}
                 className={`h-10 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] text-white shadow-lg transition-all active:scale-[0.98] ${
                   isWarning ? "bg-rose-500 shadow-rose-500/20 hover:bg-rose-600" : "bg-primary shadow-primary/20 hover:opacity-90"
                 }`}
               >
                 {config.confirmText || "Yes, Proceed"}
               </button>
             </>
           ) : (
             <button 
               onClick={onClose}
               className="col-span-2 h-10 bg-primary text-white rounded-xl font-black text-[9px] uppercase tracking-[0.15em] shadow-lg shadow-primary/20 transition-all active:scale-95"
             >
               Got it
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}

interface QuotationPreviewModalProps {
  text: string;
  setText: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving: boolean;
  openDialog: (config: any) => void;
}

export function QuotationPreviewModal({
  text,
  setText,
  onClose,
  onConfirm,
  onCancel,
  isSaving,
  openDialog
}: QuotationPreviewModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    openDialog({
      title: "Copied!",
      message: "Quotation has been copied to your clipboard and is ready to paste.",
      type: "success"
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/20 relative"
      >
        <div className="px-8 pt-8 pb-6 bg-white text-center relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative mb-4 bg-primary/5 text-primary">
            <div className="absolute inset-0 rounded-2xl animate-pulse opacity-20 bg-primary/10" />
            <Printer size={22} strokeWidth={2.5} className="relative" />
          </div>
          <h3 className="text-xl font-black text-primary tracking-tight leading-none italic">Quotation Document</h3>
          <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.15em] mt-2 opacity-60">Final Review & Edit</p>
          <button onClick={onClose} className="absolute top-8 right-8 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-text-tertiary">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 bg-white custom-scrollbar">
          <div className="relative group bg-[#f8f9fb] rounded-2xl p-6 border border-[#e8eaed]">
            <div className="absolute top-4 right-6 flex items-center gap-2 transition-opacity">
              <span className="text-[9px] uppercase font-black tracking-widest text-primary/30 italic">Live Editor</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-[13px] leading-[1.8] text-primary/80 outline-none resize-none overflow-hidden font-medium mt-4" 
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              onInput={(e: any) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }
              }}
            />
          </div>
        </div>

        <div className="px-8 py-6 bg-white flex items-center justify-center gap-3 no-print shrink-0 border-t border-[#f0f2f5]">
           <button 
             onClick={handleCopy}
             className="h-11 px-6 bg-[#f8f9fb] text-primary border border-[#e8eaed] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-primary/20 transition-all active:scale-[0.98] flex items-center gap-2"
           >
             <Copy size={16} /> Copy
           </button>

           <button 
             onClick={handlePrint}
             className="h-11 px-6 bg-[#f8f9fb] text-primary border border-[#e8eaed] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-primary/20 transition-all active:scale-[0.98] flex items-center gap-2"
           >
             <Printer size={16} /> Print
           </button>

           <div className="w-px h-6 bg-[#e8eaed] mx-1" />

           <button 
             onClick={onClose}
             className="h-11 px-8 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
           >
             Back to Builder
           </button>
        </div>
      </motion.div>
    </div>
  );
}
