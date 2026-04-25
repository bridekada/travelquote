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
import "./styles/InfoDialog.css";

interface InfoDialogProps {
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

export function InfoDialog({ config, onClose }: InfoDialogProps) {
  if (!config.isOpen) return null;

  const isWarning = config.type === 'warning' || config.type === 'alert';
  const isSuccess = config.type === 'success';

  return (
    <div style={modalOverlay} className={`info-dialog-scope type-${config.type}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="dialog-card flex flex-col items-center"
      >
        <div className="icon-container">
           <div className={`absolute inset-0 rounded-[1.25rem] animate-pulse opacity-20 ${
             isWarning ? "bg-rose-200" : isSuccess ? "bg-emerald-200" : "bg-sky-200"
           }`} />
           {isWarning ? <AlertTriangle size={16} strokeWidth={2.5} className="relative" /> : 
            isSuccess ? <CheckCircle size={16} strokeWidth={2.5} className="relative" /> : 
            <Info size={16} strokeWidth={2.5} className="relative" />}
        </div>

        <h3 className="dialog-title">{config.title}</h3>
        <p className="dialog-message">{config.message}</p>

        <div className="flex flex-col w-full gap-3">
          <button 
            onClick={() => {
              if (config.onConfirm) config.onConfirm();
              onClose();
            }}
            className={`btn-pillar ${
              isWarning ? "bg-rose-500 text-white shadow-rose-200" : 
              isSuccess ? "bg-emerald-800 text-white shadow-emerald-100" : 
              "bg-slate-900 text-white shadow-slate-200"
            }`}
          >
            {config.confirmText || (isWarning ? "Yes, Proceed" : isSuccess ? "Got It" : "Confirm")}
          </button>
          
          {(config.type === 'confirm' || config.type === 'warning' || config.onConfirm) && (
            <button 
              onClick={onClose}
              className="btn-pillar btn-pillar-secondary"
            >
              {config.cancelText || "No, Keep It"}
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
        style={{ ...modalCard, width: '100%', maxWidth: '740px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        <div className="px-12 pt-12 pb-8 text-center relative flex flex-col items-center">
          <div className="w-14 h-14 rounded-[20px] flex items-center justify-center relative mb-4 premium-header-icon text-slate-400">
            <Printer size={24} strokeWidth={1.5} className="relative" />
          </div>
          <h3 className="text-2xl font-black tracking-tight leading-tight title-gradient">Quotation Document</h3>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mt-3 opacity-60">Final Review & System Validation</p>
          
          <div className="flex items-center gap-3 mt-8 no-print">
            {userRole === 'super_admin' && showPolish && (
              <>
                <button 
                   onClick={handlePolish}
                   disabled={isPolishing}
                   style={{ ...btnAction, height: '42px', padding: '0 24px', borderRadius: '10px' }}
                   className="transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-[10px]"
                >
                   {isPolishing ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <Sparkles className="w-4 h-4" />
                   )}
                   <span className="ml-2">{isPolishing ? "Polishing..." : "Polish with AI"}</span>
                </button>

                {text !== originalText.current && (
                  <button 
                    onClick={handleRevert}
                    style={{ ...btnSecondary, width: '42px', height: '42px', padding: 0, borderRadius: '10px' }}
                    className="flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all active:scale-95 shadow-sm bg-white"
                    title="Revert to original"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                <div className="w-px h-6 bg-slate-200 mx-1" />
              </>
            )}

            {showPolish && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                style={{ ...btnAction, height: '42px', padding: '0 28px', borderRadius: '10px' }}
                className="shadow-xl transition-all hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-[10px]"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : showSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-1.5" />
                    Save Quotation
                  </>
                )}
              </button>
            )}
          </div>

          <button onClick={onClose} className="absolute top-10 right-10 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:rotate-90">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto !px-6 pb-12 custom-scrollbar">
          <div className="relative group paper-container rounded-[32px] !my-5 px-12 py-16 min-h-[500px]">
            <div className="absolute top-8 right-10 flex items-center gap-2.5 px-3 py-1.5 rounded-full live-badge">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] uppercase font-black tracking-[0.2em] italic">Live Intelligence Editor</span>
            </div>
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 p-0 pl-16 pr-4 text-[14px] font-medium outline-none resize-none overflow-hidden mt-8" 
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

        <div className="!px-6 !pt-6 !pb-4 flex items-center justify-center gap-4 no-print shrink-0 border-t border-slate-50 bg-slate-50/40">
            <button 
              onClick={handleCopy}
              style={{ ...btnSecondary, height: '36px', padding: '0 20px', borderRadius: '8px' }}
              className="!text-[10px] !uppercase !tracking-[0.15em] !font-black transition-all active:scale-[0.98] flex items-center gap-2 !shadow-sm !bg-[#1a2138] !text-white hover:!bg-[#2a3454] !border-none"
            >
              <Copy size={12} className="opacity-80" /> Copy
            </button>

            <button 
              onClick={handlePrint}
              style={{ ...btnSecondary, height: '36px', padding: '0 20px', borderRadius: '8px' }}
              className="!text-[10px] !uppercase !tracking-[0.15em] !font-black transition-all active:scale-[0.98] flex items-center gap-2 !shadow-sm !bg-[#1a2138] !text-white hover:!bg-[#2a3454] !border-none"
            >
              <Printer size={12} className="opacity-80" /> Print
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button 
              onClick={onClose}
              style={{ ...btnSecondary, height: '36px', padding: '0 20px', borderRadius: '8px', borderColor: '#10B981', color: '#10B981' }}
              className="!text-[10px] !uppercase !tracking-[0.15em] !font-black transition-all active:scale-[0.98] !shadow-sm !bg-[#1a2138] !text-white hover:!bg-[#2a3454] !border-none"
            >
              Back
            </button>
        </div>
      </motion.div>
    </div>
  );
}
