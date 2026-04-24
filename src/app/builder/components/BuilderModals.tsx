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
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ ...modalCard, width: '100%', maxWidth: '1100px', maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        <div className="px-12 pt-14 pb-10 text-center relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center relative mb-6 premium-header-icon text-slate-400">
            <Printer size={28} strokeWidth={1.5} className="relative" />
          </div>
          <h3 className="text-3xl font-black tracking-tight leading-none italic title-gradient">Quotation Document</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-4 opacity-60">Final Review & System Validation</p>
          <button onClick={onClose} className="absolute top-12 right-12 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:rotate-90">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-16 pb-12 custom-scrollbar">
          <div className="relative group paper-container rounded-[40px] pl-32 pr-16 py-20 min-h-[650px]">
            <div className="absolute top-10 right-12 flex items-center gap-3 px-4 py-2 rounded-full live-badge">
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

        <div className="px-12 py-10 flex items-center justify-center gap-5 no-print shrink-0 border-t border-slate-50 bg-slate-50/50">
           <button 
             onClick={handleCopy}
             style={{ ...btnSecondary, height: '52px', padding: '0 36px', borderRadius: '14px' }}
             className="text-[11px] uppercase tracking-[0.1em] font-black hover:bg-white transition-all active:scale-[0.98] flex items-center gap-3 shadow-sm"
           >
             <Copy size={18} className="opacity-60" /> Copy
           </button>

           <button 
             onClick={handlePrint}
             style={{ ...btnSecondary, height: '52px', padding: '0 36px', borderRadius: '14px' }}
             className="text-[11px] uppercase tracking-[0.1em] font-black hover:bg-white transition-all active:scale-[0.98] flex items-center gap-3 shadow-sm"
           >
             <Printer size={18} className="opacity-60" /> Print
           </button>

            {userRole === 'super_admin' && showPolish && (
              <>
                <div className="w-px h-8 bg-slate-200 mx-2" />
                <button 
                   onClick={handlePolish}
                   disabled={isPolishing}
                   style={{ ...btnAction, height: '52px', padding: '0 40px', borderRadius: '14px' }}
                   className="active:scale-[0.98] disabled:opacity-50 text-[11px]"
                >
                   {isPolishing ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <Sparkles className="w-5 h-5" />
                   )}
                   <span className="ml-1">{isPolishing ? "Polishing..." : "Polish with AI"}</span>
                </button>

                {text !== originalText.current && (
                  <button 
                    onClick={handleRevert}
                    style={{ ...btnSecondary, width: '52px', height: '52px', padding: 0, borderRadius: '14px' }}
                    className="flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all active:scale-95 shadow-sm"
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
                style={{ ...btnAction, height: '52px', padding: '0 44px', borderRadius: '14px' }}
                className="shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 text-[11px]"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : showSaved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Plus size={18} className="mr-1" />
                    Commit Record
                  </>
                )}
              </button>
            )}

            <div className="w-px h-8 bg-slate-200 mx-2" />

            <button 
              onClick={onClose}
              style={{ ...btnSecondary, height: '52px', padding: '0 36px', borderRadius: '14px', borderColor: '#10B981', color: '#10B981' }}
              className="text-[11px] uppercase tracking-[0.1em] font-black hover:bg-emerald-50 transition-all active:scale-[0.98] shadow-sm"
            >
              Back to Builder
            </button>
        </div>
      </motion.div>
    </div>
  );
}
