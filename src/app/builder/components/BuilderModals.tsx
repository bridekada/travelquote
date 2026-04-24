"use client";

import { AlertTriangle, CheckCircle, Info, X, Copy, Check, Printer, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { polishQuotation } from "@/app/actions/ai-actions";

import "./styles/QuotationDocument.css";

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
  userRole?: string;
  showPolish?: boolean;
}

export function QuotationPreviewModal({
  text,
  setText,
  onClose,
  onConfirm,
  onCancel,
  isSaving,
  openDialog,
  userRole,
  showPolish = true
}: QuotationPreviewModalProps) {
  const [isPolishing, setIsPolishing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const originalText = useRef(text);

  const handlePolish = async () => {
    setIsPolishing(true);
    try {
      const result = await polishQuotation(text);
      setText(result);
    } catch (err: any) {
      console.error('AI Polish technical error:', err);
      openDialog({
        title: "AI Service Busy",
        message: "The Gemini AI service is currently experiencing high traffic or connectivity issues. Please try clicking 'Polish' again in a few seconds.",
        type: "warning"
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleRevert = () => {
    setText(originalText.current);
  };
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

  const handleSave = async () => {
    await onConfirm();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md quotation-document-premium">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="bg-white rounded-[48px] w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-white/60 relative"
      >
        <div className="px-12 pt-14 pb-10 bg-white text-center relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center relative mb-6 premium-header-icon text-slate-400">
            <Printer size={28} strokeWidth={1.5} className="relative" />
          </div>
          <h3 className="text-3xl font-black tracking-tight leading-none italic title-gradient">Quotation Document</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-4 opacity-60">Final Review & System Validation</p>
          <button onClick={onClose} className="absolute top-12 right-12 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:rotate-90">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-12 pb-12 bg-white custom-scrollbar">
          <div className="relative group paper-container rounded-[40px] px-16 py-16 min-h-[600px]">
            <div className="absolute top-8 right-10 flex items-center gap-3 px-4 py-2 rounded-full live-badge">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] uppercase font-black tracking-[0.2em] italic">Live Intelligence Editor</span>
            </div>
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-[15px] font-medium outline-none resize-none overflow-hidden mt-10" 
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

        <div className="px-12 py-10 bg-white flex items-center justify-center gap-6 no-print shrink-0 border-t border-slate-50">
           <button 
             onClick={handleCopy}
             className="btn-premium bg-white text-slate-600 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex items-center gap-3 shadow-sm"
           >
             <Copy size={18} className="opacity-40" /> Copy
           </button>

           <button 
             onClick={handlePrint}
             className="btn-premium bg-white text-slate-600 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex items-center gap-3 shadow-sm"
           >
             <Printer size={18} className="opacity-40" /> Print
           </button>

            {userRole === 'super_admin' && showPolish && (
              <>
                <div className="w-px h-8 bg-slate-100 mx-2" />
                <button 
                   onClick={handlePolish}
                   disabled={isPolishing}
                   className="btn-premium bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/20 hover:bg-black active:scale-[0.98] disabled:opacity-50 flex items-center gap-4"
                >
                   {isPolishing ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <Sparkles className="w-5 h-5 text-emerald-400" />
                   )}
                   {isPolishing ? "Polishing..." : "Polish with AI"}
                </button>

                {text !== originalText.current && (
                  <button 
                    onClick={handleRevert}
                    className="h-14 w-14 flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-200 rounded-2xl hover:bg-white hover:border-primary/20 transition-all active:scale-95"
                    title="Revert to original"
                  >
                    <RotateCcw size={20} />
                  </button>
                )}
              </>
            )}

            {showPolish && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`btn-premium rounded-2xl shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 ${
                  showSaved 
                    ? "bg-emerald-50 text-emerald-600 shadow-emerald-500/5 border border-emerald-100" 
                    : "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : showSaved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Saved!
                  </>
                ) : (
                  "Commit Record"
                )}
              </button>
            )}

            <div className="w-px h-8 bg-slate-100 mx-2" />

            <button 
              onClick={onClose}
              className="btn-premium bg-primary text-white rounded-2xl shadow-2xl shadow-primary/20 hover:opacity-90 active:scale-[0.98]"
            >
              Back to Builder
            </button>
        </div>
      </motion.div>
    </div>
  );
}
