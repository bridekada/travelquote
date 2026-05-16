"use client";

import { AlertTriangle, CheckCircle, Info, Copy, Check, Printer, Sparkles, Loader2, RotateCcw, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { polishQuotation } from "@/app/actions/ai-actions";
import { 
  modalOverlay, btnSecondary, btnPillarPrimary, btnPillarSecondary
} from "@/lib/styles";
import { PremiumModalWrapper } from "@/app/admin/components/PremiumModalWrapper";
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
  onConfirm: (text: string) => void;
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
  const [showCopied, setShowCopied] = useState(false);
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
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    // Explicitly pass the current text to the parent's save function
    await onConfirm(text);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <PremiumModalWrapper
      isOpen={true}
      onClose={onClose}
      title="Quotation Document"
      subtitle="Final Review & System Validation"
      icon={<Printer size={22} />}
      maxWidth="540px"
    >
      <div className="quotation-document-premium flex flex-col min-h-0">
        <style>{`
          .quotation-editor-scroll::-webkit-scrollbar {
            width: 10px;
          }
          .quotation-editor-scroll::-webkit-scrollbar-track {
            background: #fffaf0;
            border-radius: 10px;
          }
          .quotation-editor-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
            border: 2px solid #fffaf0;
            transition: all 0.2s ease-in-out;
          }
          .quotation-editor-scroll:hover::-webkit-scrollbar-thumb {
            background: #10b981;
          }
          .quotation-editor-scroll::-webkit-scrollbar-thumb:hover {
            background: #059669 !important;
          }
          .btn-operational {
            height: 3rem !important; /* 48px */
            border-radius: 0.75rem !important; /* 12px squircle */
            font-size: 10px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
            transition: all 0.2s ease-in-out !important;
          }
          .editor-toolbar {
            margin-bottom: 0.75rem !important;
          }
          .btn-polish { 
            background: rgba(240, 247, 255, 0.7) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(219, 234, 254, 0.8) !important;
            color: #2563eb !important;
            min-width: 200px !important;
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.05) !important;
          }
          .btn-polish:hover { 
            background: rgba(219, 234, 254, 0.8) !important;
            color: #1d4ed8 !important;
          }
          .btn-copy { 
            background: #1e3a8a !important; 
            box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.3) !important;
          }
          .btn-copy:hover { background: #1e40af !important; }
          .btn-print { 
            background: #1a2138 !important; 
            box-shadow: 0 10px 15px -3px rgba(26, 33, 56, 0.3) !important;
          }
          .btn-print:hover { background: #2a3454 !important; }
          .btn-save { 
            background: #064e3b !important; 
            box-shadow: 0 10px 15px -3px rgba(6, 78, 59, 0.3) !important;
          }
          .btn-save:hover { background: #065f46 !important; }
          .btn-revert {
            background: #ffffff !important;
            border: 1px solid rgba(226, 232, 240, 0.8) !important;
            color: #94a3b8 !important;
          }
          .btn-revert:hover {
            background: rgba(240, 253, 244, 0.7) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(167, 243, 208, 0.5) !important;
            color: #059669 !important;
            box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.05) !important;
          }
          .quotation-document-premium {
            overflow: hidden !important;
          }
          .paper-container {
            background: #fffdfa !important;
            box-shadow: 
              0 1px 2px rgba(0,0,0,0.02),
              0 20px 50px -12px rgba(0,0,0,0.04) !important;
          }
        `}</style>

        {/* Editor Toolbar */}
        <div className="editor-toolbar flex items-center justify-center gap-3 no-print shrink-0">
          {userRole === 'super_admin' && showPolish && (
            <div className="flex items-center gap-3">
              <button 
                 onClick={handlePolish}
                 disabled={isPolishing}
                 className="btn-operational btn-polish px-12 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
              >
                 {isPolishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                 <span>{isPolishing ? "POLISHING..." : "POLISH WITH AI"}</span>
              </button>

              {text !== originalText.current && (
                <button 
                  onClick={handleRevert}
                  className="btn-revert w-12 h-12 flex items-center justify-center transition-all active:scale-95 rounded-xl shadow-sm"
                  title="Revert to original"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Document Editor Area */}
        <div className="relative paper-container rounded-[24px] border border-slate-200 shadow-sm flex flex-col bg-[#fffdfa] h-[400px] overflow-hidden">
          {/* Metadata Badge */}
          <div className="absolute top-6 right-8 flex items-center gap-3 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100/50 shadow-sm z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] uppercase font-black tracking-widest italic">Live Intelligence Editor</span>
          </div>
          
          <textarea 
            className="w-full flex-1 bg-transparent border-none focus:ring-0 text-[12px] font-mono leading-relaxed outline-none resize-none overflow-y-auto quotation-editor-scroll text-slate-700 mt-6" 
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer-actions pt-6 flex items-center justify-center gap-3 no-print shrink-0 border-t border-slate-50">
            <button 
              onClick={handleCopy}
              disabled={showCopied}
              className={`btn-operational btn-copy flex-1 text-white transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${showCopied ? '!bg-blue-500' : ''}`}
            >
              {showCopied ? (
                <>
                  <Check size={14} />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <ArrowRight size={14} className="rotate-[-45deg]" /> 
                  <span>COPY REPORT</span>
                </>
              )}
            </button>

            <button 
              onClick={handlePrint}
              className="btn-operational btn-print flex-1 text-white transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <Printer size={14} />
              <span>PRINT REPORT</span>
            </button>

            {showPolish && (
              <button 
                onClick={handleSave}
                disabled={isSaving || showSaved}
                className={`btn-operational btn-save flex-1 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg ${showSaved ? '!bg-emerald-500' : ''}`}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : showSaved ? (
                  <>
                    <Check size={16} />
                    <span>SAVED!</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>SAVE QUOTE</span>
                  </>
                )}
              </button>
            )}
        </div>
      </div>
    </PremiumModalWrapper>
  );
}
