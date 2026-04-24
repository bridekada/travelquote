"use client";

import { AlertTriangle, CheckCircle, Info, X, Copy, Check, Printer, Sparkles, Loader2, RotateCcw, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { polishQuotation } from "@/app/actions/ai-actions";
import { 
  modalOverlay, modalCard, btnPillarPrimary, btnPillarSecondary, 
  btnAction, btnSecondary, modalTitle, btnPrimary
} from "@/lib/styles";
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
    <div style={modalOverlay}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ ...modalCard, width: '100%', maxWidth: '320px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
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
        
        <h3 style={modalTitle}>{config.title}</h3>
        <p className="text-[12px] font-medium text-text-secondary leading-relaxed mt-3">{config.message}</p>
        
        <div className="grid grid-cols-2 gap-3 w-full mt-8">
           {config.type === 'confirm' || config.type === 'warning' ? (
             <>
               <button 
                 onClick={onClose}
                 style={btnSecondary}
                 className="h-10 text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98]"
               >
                 {config.cancelText || "No, Keep it"}
               </button>
               <button 
                 onClick={() => {
                   config.onConfirm?.();
                   onClose();
                 }}
                 style={isWarning ? { ...btnPrimary, background: '#F43F5E' } : btnPrimary}
                 className="h-10 text-[9px] uppercase tracking-[0.15em] shadow-lg transition-all active:scale-[0.98]"
               >
                 {config.confirmText || "Yes, Proceed"}
               </button>
             </>
           ) : (
             <button 
               onClick={onClose}
               style={btnPrimary}
               className="col-span-2 h-10 text-[9px] uppercase tracking-[0.15em] shadow-lg transition-all active:scale-95"
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
    <div style={modalOverlay} className="quotation-document-premium">
      <motion.div 
        initial={{ opacity: 0, scale: 0.99, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ ...modalCard, width: '100%', maxWidth: '880px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0, background: '#FDFDFD' }}
      >
        {/* --- Sophisticated Header --- */}
        <div className="px-12 pt-10 pb-8 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
               <h3 className="text-xl font-medium tracking-tight text-slate-800">Quotation Document</h3>
             </div>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em] ml-4.5">System ID: {new Date().getTime().toString().slice(-8)} • Final Validation</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Live AI Sync</span>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors">
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* --- Executive Drafting Area --- */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 flex justify-center custom-scrollbar">
          <div className="w-full max-w-[800px] bg-white my-8 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_15px_45px_-10px_rgba(0,0,0,0.05)] border border-slate-100/60 rounded-sm relative flex">
            
            {/* Architectural Gutter */}
            <div className="w-20 border-r border-slate-50 bg-slate-50/20 flex flex-col items-center pt-14 gap-8 shrink-0">
               <div className="text-[9px] font-black text-slate-200 rotate-90 whitespace-nowrap tracking-[0.5em] uppercase mt-8">OPERATIONAL DRAFT</div>
               <div className="w-px h-24 bg-slate-100" />
            </div>

            <div className="flex-1 p-14 relative">
              <textarea 
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[14px] text-slate-700 font-medium outline-none resize-none overflow-hidden leading-[2.2] tracking-normal" 
                style={{ 
                  fontFamily: '"Inter", sans-serif',
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
                  backgroundSize: '100% 2.8rem',
                  paddingTop: '0.2rem'
                }}
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
        </div>

        {/* --- Unified Action Dock --- */}
        <div className="px-12 py-8 bg-white border-t border-slate-100 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
             <button 
               onClick={handleCopy}
               className="h-11 px-6 rounded-xl border border-slate-100 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest shadow-sm active:scale-95"
             >
               <Copy size={15} strokeWidth={2} /> Copy
             </button>
             <button 
               onClick={handlePrint}
               className="h-11 px-6 rounded-xl border border-slate-100 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest shadow-sm active:scale-95"
             >
               <Printer size={15} strokeWidth={2} /> Print
             </button>
          </div>

          <div className="flex items-center gap-4">
            {userRole === 'super_admin' && showPolish && (
              <button 
                 onClick={handlePolish}
                 disabled={isPolishing}
                 className="h-11 px-8 rounded-xl bg-slate-900 text-white hover:bg-black transition-all flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95 disabled:opacity-50"
              >
                 {isPolishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={15} className="text-emerald-400" />}
                 {isPolishing ? "Polishing" : "AI Polish"}
              </button>
            )}

            {showPolish && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`h-11 px-10 rounded-xl transition-all flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 ${
                  showSaved 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                    : "bg-emerald-600 text-white shadow-emerald-600/10 hover:bg-emerald-700"
                }`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSaved ? <Check size={16} /> : <Plus size={16} />}
                {isSaving ? "Saving" : showSaved ? "Saved" : "Commit Record"}
              </button>
            )}

            <div className="w-px h-6 bg-slate-100 mx-1" />

            <button 
              onClick={onClose}
              className="h-11 px-6 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-[10px] font-bold uppercase tracking-widest active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
