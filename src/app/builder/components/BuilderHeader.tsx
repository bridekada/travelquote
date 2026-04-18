"use client";

import { ChevronLeft, X, CheckCircle, Save, FileText } from "lucide-react";

interface BuilderHeaderProps {
  isSaving: boolean;
  isDeadQuote: boolean;
  status: string;
  customerName: string;
  quoteId: string | null;
  itemsCount: number;
  selectedPackageId: string | null;
  onBack: () => void;
  onSave: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  isImpersonating: boolean;
}

export default function BuilderHeader({
  isSaving,
  isDeadQuote,
  status,
  customerName,
  quoteId,
  itemsCount,
  selectedPackageId,
  onBack,
  onSave,
  onCancel,
  onConfirm,
  isImpersonating
}: BuilderHeaderProps) {
  return (
    <header className={`h-16 bg-white border-b border-[#e8eaed] sticky ${isImpersonating ? 'top-[31px]' : 'top-0'} z-50 shadow-sm shadow-primary/[0.02] safe-top`}>
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-4 md:px-6 lg:px-10">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button 
            onClick={onBack} 
            className="h-10 w-10 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-secondary hover:bg-[#f0f2f5] transition-all shrink-0" 
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base md:text-xl font-bold text-primary tracking-tight truncate">
              {isDeadQuote ? customerName || 'Quotation' : (quoteId ? 'Edit Quotation' : 'New Quotation')}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary leading-none hidden sm:block">
              {isDeadQuote ? 'Read Only' : (quoteId ? 'Updating Record' : 'Standard Station Mode')}
            </p>
          </div>
        </div>

        {isDeadQuote ? (
          <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
            status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' : 
            status === 'Lost' ? 'bg-amber-50 text-amber-600 border-amber-300' :
            'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            {status}
          </div>
        ) : (
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={onCancel}
              disabled={isSaving}
              className="h-10 md:!h-11 px-3 md:!px-5 border border-[#e8eaed] text-text-tertiary rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-1 md:gap-2 disabled:opacity-30 disabled:grayscale"
              aria-label="Cancel Quote"
            >
              <X size={16} />
              <span className="hidden md:inline">Cancel Quote</span>
            </button>

            <div className="h-8 w-px bg-gray-100 mx-0.5 md:mx-2 hidden sm:block" />

            {quoteId && status !== 'Confirmed' && itemsCount > 0 && (
              <button 
                onClick={onConfirm}
                disabled={isSaving || !selectedPackageId || !customerName}
                className="h-10 md:!h-11 px-3 md:!px-6 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1 md:gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-30 disabled:grayscale"
              >
                <CheckCircle size={16} />
                <span className="hidden md:inline">Confirm Quote</span>
              </button>
            )}


            <button 
              onClick={onSave}
              disabled={isSaving || !customerName?.trim()}
              className="h-10 md:!h-11 px-4 md:!px-8 bg-[#1a2138] text-white rounded-xl text-xs md:text-sm font-black flex items-center gap-2 md:gap-3 hover:opacity-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-xl shadow-primary/10"
            >
              {isSaving ? "Saving..." : (
                <>
                  <Save size={18} /> 
                  <span className="hidden sm:inline">{status === 'Confirmed' ? 'Save & Update' : 'Save Quote'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
