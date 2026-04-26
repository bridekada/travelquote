"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// Modular Components
import BuilderHeader from "./components/BuilderHeader";
import TripDetailsSection from "./components/TripDetailsSection";
import ItinerarySequence from "./components/ItinerarySequence";
import OperationalMatrix from "./components/OperationalMatrix";
import PackageSidebar from "./components/PackageSidebar";
import ConfirmedSummary from "./components/ConfirmedSummary";
import { InfoDialog, QuotationPreviewModal } from "./components/BuilderModals";

// Types & Utils
import { QuoteData, QuoteItem, ExtraFee } from "./components/types";
import { calculateFuelCost, calculateRowTotal, parseTags, formatForInput } from "./components/utils";

function QuoteBuilderFallback() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Loading Builder...</p>
      </div>
    </div>
  );
}

export default function QuoteBuilderPage() {
  return (
    <Suspense fallback={<QuoteBuilderFallback />}>
      <QuoteBuilder />
    </Suspense>
  );
}

function QuoteBuilder() {
  const router = useRouter();
  const { profile, loading: authLoading, selectedOperatorId } = useAuth();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('id');
  
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [isPreviewingSaved, setIsPreviewingSaved] = useState(false);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const [includeItineraryInText, setIncludeItineraryInText] = useState<boolean>(true);
  const [initialQuotationText, setInitialQuotationText] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [openConfigId, setOpenConfigId] = useState<string | null>(null);
  const hasHydrated = useRef(false);

  // DB Presets
  const [dbPresets, setDbPresets] = useState<any[]>([]);
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const [dbMiscPresets, setDbMiscPresets] = useState<any[]>([]);
  const [dbPackagePresets, setDbPackagePresets] = useState<any[]>([]);
  const [dbAccommodations, setDbAccommodations] = useState<any[]>([]);
  const [livePackages, setLivePackages] = useState<any[]>([]);

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: 'confirm' | 'alert' | 'success' | 'warning';
    onConfirm?: () => void; confirmText?: string; cancelText?: string;
  }>({
    isOpen: false, title: "", message: "", type: 'confirm'
  });

  const openDialog = (config: Partial<typeof dialogConfig>) => {
    setDialogConfig({
      isOpen: true,
      title: config.title || "",
      message: config.message || "",
      type: config.type || 'confirm',
      onConfirm: config.onConfirm,
      confirmText: config.confirmText,
      cancelText: config.cancelText
    });
  };

  // Quote Data
  const [quote, setQuote] = useState<QuoteData>({
    customer_name: "", fb_name: "", contact_number: "", pax_count: 1,
    eta: "", etd: "", vehicle_model: "", pickup_location: "", dropoff_location: "",
    notes: "", default_fuel_price: 60, admin_commission: 0, status: "Draft",
    selected_package: null, selected_package_total: null, selected_package_details: null,
    confirmed_at: null, items: []
  });

  const [payments, setPayments] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);

  const fetchPayments = async () => {
    if (!quoteId) return;
    const { data } = await supabase.from('payments').select('*').eq('quote_id', quoteId).order('created_at', { ascending: false });
    if (data) setPayments(data);
  };

  useEffect(() => { if (quoteId) fetchPayments(); }, [quoteId]);

  // Data Loading
  useEffect(() => {
    const fetchAgencyData = async () => {
      if (!selectedOperatorId) return;
      const [presetsRes, vehiclesRes, miscRes, pkgRes, accomRes] = await Promise.all([
        supabase.from('itinerary_presets').select('*').eq('operator_id', selectedOperatorId).order('title'),
        supabase.from('vehicles').select('*').eq('operator_id', selectedOperatorId).eq('is_active', true).order('pax_capacity'),
        supabase.from('misc_presets').select('*').eq('operator_id', selectedOperatorId).order('name'),
        supabase.from('package_presets').select('*').eq('operator_id', selectedOperatorId).order('display_order'),
        supabase.from('guest_accommodation').select('*').eq('operator_id', selectedOperatorId).order('pax_count')
      ]);
      if (presetsRes.data) setDbPresets(presetsRes.data);
      if (vehiclesRes.data) setDbVehicles(vehiclesRes.data);
      if (miscRes.data) setDbMiscPresets(miscRes.data);
      if (pkgRes.data) setDbPackagePresets(pkgRes.data);
      if (accomRes.data) setDbAccommodations(accomRes.data);
    };
    if (!authLoading && profile) fetchAgencyData();
  }, [selectedOperatorId, authLoading, profile]);

  useEffect(() => {
    if (dbPackagePresets.length > 0 && livePackages.length === 0 && !quoteId) {
      setLivePackages(dbPackagePresets);
    }
  }, [dbPackagePresets, quoteId, livePackages.length]);

  // Auto-select first vehicle and apply defaults for NEW quotes
  useEffect(() => {
    if (!quoteId && isLoaded && dbVehicles.length > 0 && !quote.vehicle_model) {
      const firstVehicle = dbVehicles[0];
      const rate = Number(firstVehicle.default_rate) || Number(firstVehicle.rate) || 0;
      const kmpl = Number(firstVehicle.km_per_l) || 10;
      
      setQuote(prev => ({
        ...prev,
        vehicle_model: firstVehicle.model,
        items: prev.items.map(item => ({ 
          ...item, 
          vehicle_rate: rate,
          km_per_l: kmpl 
        }))
      }));
    }
  }, [dbVehicles, quoteId, isLoaded, quote.vehicle_model]);

  useEffect(() => {
    const loadQuote = async () => {
      if (!selectedOperatorId || isLoaded) return;
      if (!quoteId) {
        hasHydrated.current = true;
        setIsLoaded(true);
        return;
      }
      
      const { data: qData } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
      if (!qData) return;
      const { data: itemsData } = await supabase.from('quote_items').select('*').eq('quote_id', quoteId).order('day_number');
      
      const formattedEta = formatForInput(qData.eta);
      const formattedEtd = formatForInput(qData.etd);
      
      const rawItems = (itemsData || []).map(item => ({
        ...item,
        day_number: Number(item.day_number),
        tags: parseTags(item.tags),
        dynamic_costs: item.dynamic_costs || {},
        vehicle_rate: Number(item.vehicle_rate) || 0,
        km: Number(item.km) || 0,
        km_per_l: Number(item.km_per_l) || 10,
        fuel_price: Number(item.fuel_price) || qData.default_fuel_price || 60,
        guest_accommodation_name: item.guest_accommodation_name || "",
        guest_accommodation_amount: Number(item.guest_accommodation_amount) || 0,
        itinerary_details: item.itinerary_details || "",
        destination: item.destination || "",
        is_manual: true
      }));

      // In-place reconciliation for the initial load
      let finalItems = rawItems;
      if (formattedEta && formattedEtd) {
        const start = new Date(formattedEta);
        const end = new Date(formattedEtd);
        if (end >= start) {
          const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          const days = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const reconciled: QuoteItem[] = [];
          for (let i = 0; i < days; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const existing = rawItems.find(item => Number(item.day_number) === i + 1);
            
            if (existing) {
              reconciled.push({ ...existing, date: dateStr, day_number: i + 1 });
            } else {
              // Try to find the default vehicle rate if dbVehicles is already here
              const currentVehicle = dbVehicles.find(v => v.model === qData.vehicle_model);
              const defaultRate = currentVehicle ? Number(currentVehicle.default_rate) || Number(currentVehicle.rate) || 0 : 0;
              const defaultKmpl = currentVehicle ? Number(currentVehicle.km_per_l) || 10 : 10;

              reconciled.push({
                day_number: i + 1, date: dateStr, destination: "", itinerary_details: "", 
                vehicle_rate: defaultRate,
                km: 0, 
                km_per_l: defaultKmpl, 
                fuel_price: qData.default_fuel_price || 60, dynamic_costs: {}, tags: [],
                guest_accommodation_id: "", guest_accommodation_name: "", guest_accommodation_amount: 0, row_total: 0
              });
            }
          }
          finalItems = reconciled;
        }
      }

      setQuote({
        ...qData,
        eta: formattedEta,
        etd: formattedEtd,
        items: finalItems.map(item => ({
          ...item,
          row_total: calculateRowTotal(item, qData.admin_commission || 0)
        }))
      });

      if (qData.extra_fees_json) setExtraFees(qData.extra_fees_json);
      if (qData.discount_total) setDiscount(qData.discount_total);
      if (qData.package_options_json) setLivePackages(qData.package_options_json);
      if (qData.selected_package) setSelectedPackageName(qData.selected_package);
      if (qData.selected_package_id) setSelectedPackageId(qData.selected_package_id);
      if (qData.quotation_text) setInitialQuotationText(qData.quotation_text);
      
      hasHydrated.current = true;
      setIsLoaded(true);
    };
    if (!authLoading && profile) loadQuote();
  }, [quoteId, selectedOperatorId, authLoading, profile, isLoaded]);

  const handleEtaChangeRequest = (newDate: Date, iso: string) => {
    // If no End Date exists yet, just update the Start Date normally
    if (!quote.etd) {
      setQuote(prev => ({ ...prev, eta: iso }));
      return;
    }

    openDialog({
      title: "Reset Itinerary?",
      message: "Changing the Start Date will clear your End Date and reset the itinerary. Proceed?",
      type: 'warning',
      confirmText: "Reset & Continue",
      onConfirm: () => {
        setQuote(prev => ({ 
          ...prev, 
          eta: iso, 
          etd: "", 
          items: [] as QuoteItem[] 
        }));
      }
    });
  };

  // Date/Timeline Synchronization
  useEffect(() => {
    if (!hasHydrated.current || (quoteId && !isLoaded)) return;
    if (quote.eta && quote.etd) {
      const start = new Date(quote.eta);
      const end = new Date(quote.etd);
      if (end >= start) {
        const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const days = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const newItems: QuoteItem[] = [];
        const currentVehicle = dbVehicles.find(v => v.model === quote.vehicle_model);
        const defaultRate = currentVehicle ? Number(currentVehicle.default_rate) || Number(currentVehicle.rate) || 0 : 0;
        const defaultKmpl = currentVehicle ? Number(currentVehicle.km_per_l) || 10 : 10;
        
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          const existing = quote.items.find(item => Number(item.day_number) === i + 1);
          if (existing) {
            newItems.push({ 
              ...existing, 
              day_number: i + 1,
              date: dateStr
            });
          } else {
            newItems.push({
              day_number: i + 1, date: dateStr, destination: "", itinerary_details: "", vehicle_rate: defaultRate,
              km: 0, km_per_l: defaultKmpl, fuel_price: quote.default_fuel_price, dynamic_costs: {}, tags: [],
              guest_accommodation_id: "", guest_accommodation_name: "", guest_accommodation_amount: 0, row_total: 0
            });
          }
        }
        if (JSON.stringify(quote.items) !== JSON.stringify(newItems)) setQuote(prev => ({ ...prev, items: newItems }));
      }
    }
  }, [quote.eta, quote.etd, quote.items.length, quoteId, isLoaded, quote.default_fuel_price, quote.vehicle_model, dbVehicles]);

  // Calculations Memo
  const totals = useMemo(() => {
    const packagesToCompute = livePackages.length > 0 ? livePackages : [{ name: 'Total Amount', includes_vehicle: true, includes_fuel: true, includes_accommodation: true, includes_misc_ids: dbMiscPresets.map(p => p.id) }];
    const packageTotals = packagesToCompute.map(pkg => {
      let baseSum = 0; let totalSum = 0;
      const commission = quote.admin_commission || 0;
      quote.items.forEach(item => {
        let rowBase = 0;
        if (pkg.includes_vehicle) rowBase += item.vehicle_rate;
        if (pkg.includes_fuel) rowBase += calculateFuelCost(item);
        if (pkg.includes_accommodation) rowBase += (item.guest_accommodation_amount || 0);
        (pkg.includes_misc_ids || []).forEach((mId: string) => { rowBase += (item.dynamic_costs[mId] || 0); });
        baseSum += rowBase;
        totalSum += rowBase * (1 + commission / 100);
      });
      return { name: pkg.name || pkg.title || 'Untitled Package', total: totalSum, commissionAmount: totalSum - baseSum, is_recommended: pkg.is_recommended, id: pkg.id, config: pkg };
    });

    let matrixSum = 0; quote.items.forEach(item => { matrixSum += calculateRowTotal(item, quote.admin_commission); });
    const adjustments = extraFees.reduce((a, b) => a + (b.amount || 0), 0) - (discount || 0);
    const selectedPkg = packageTotals.find(p => p.id === selectedPackageId);
    const selectedPkgPrice = selectedPkg ? selectedPkg.total : matrixSum;
    
    const colTotals = quote.items.reduce((acc, item) => {
      const fuel = calculateFuelCost(item);
      acc.rate += item.vehicle_rate; acc.km += item.km; acc.fuel += fuel;
      acc.accom += (item.guest_accommodation_amount || 0);
      acc.grand += calculateRowTotal(item, quote.admin_commission);
      dbMiscPresets.forEach(p => { acc.misc[p.id] = (acc.misc[p.id] || 0) + (item.dynamic_costs[p.id] || 0); });
      return acc;
    }, { rate: 0, km: 0, fuel: 0, accom: 0, grand: 0, misc: {} as Record<string, number> });

    const rowTotals = quote.items.map(item => calculateRowTotal(item, quote.admin_commission));

    return { 
      packages: packageTotals, 
      grandTotal: selectedPkgPrice + adjustments, 
      selectedPkgPrice, 
      totalExtraFees: extraFees.reduce((a, b) => a + (b.amount || 0), 0), 
      colTotals,
      rowTotals
    };

  }, [quote.items, extraFees, discount, livePackages, dbMiscPresets, selectedPackageId, quote.admin_commission]);

  // Event Handlers
  const handleUpdateItem = (index: number, updates: Partial<QuoteItem>, manual = false) => {
    setQuote(prev => {
      const newItems = [...prev.items];
      if (!newItems[index]) return prev;
      let updated = { ...newItems[index], ...updates };
      if (manual) updated.is_manual = true;
      if (updates.tags) {
        const dCosts = { ...updated.dynamic_costs };
        dbMiscPresets.forEach(p => { dCosts[p.id] = updates.tags!.includes(p.name) ? (p.default_amount || 0) : 0; });
        updated.dynamic_costs = dCosts;
      }
      updated.row_total = calculateRowTotal(updated, prev.admin_commission || 0);
      newItems[index] = updated;
      return { ...prev, items: newItems };
    });
  };

  const handleUpdateCommission = (v: number) => {
    setQuote(prev => ({
      ...prev,
      admin_commission: v,
      items: prev.items.map(item => ({
        ...item,
        row_total: calculateRowTotal(item, v)
      }))
    }));
  };

  const handleUpdateDefaultFuel = (v: number) => {
    setQuote(prev => ({
      ...prev,
      default_fuel_price: v,
      items: prev.items.map(item => {
        const updated = { ...item, fuel_price: v };
        return {
          ...updated,
          row_total: calculateRowTotal(updated, prev.admin_commission || 0)
        };
      })
    }));
  };

  const handleAddDay = () => {
    setQuote(prev => {
      const lastItem = prev.items[prev.items.length - 1];
      const newDate = new Date(lastItem ? lastItem.date : (prev.eta || new Date()));
      if (lastItem) newDate.setDate(newDate.getDate() + 1);
      
      const currentVehicle = dbVehicles.find(v => v.model === prev.vehicle_model);
      const defaultRate = currentVehicle ? Number(currentVehicle.rate) || 0 : 0;

      const newItem: QuoteItem = {
        day_number: prev.items.length + 1,
        date: newDate.toISOString(),
        destination: "",
        vehicle_rate: lastItem?.vehicle_rate || defaultRate,
        km: 0,
        km_per_l: lastItem?.km_per_l || 10,
        fuel_price: prev.default_fuel_price,
        dynamic_costs: {},
        tags: [],
        itinerary_details: "",
        guest_accommodation_id: "",
        guest_accommodation_name: "",
        guest_accommodation_amount: 0,
        row_total: 0 // Will be calculated below
      };
      newItem.row_total = calculateRowTotal(newItem, prev.admin_commission || 0);
      const nextItems = [...prev.items, newItem];
      
      // Update ETD to match the new duration
      const etdDate = new Date(newDate);
      const etdIso = etdDate.toISOString();

      return { 
        ...prev, 
        items: nextItems,
        etd: etdIso.split('T')[0] + (prev.etd && prev.etd.includes('T') ? 'T' + prev.etd.split('T')[1] : 'T12:00')
      };
    });
  };

  const handleRemoveLastDay = () => {
    setQuote(prev => {
      if (prev.items.length <= 1) return prev;
      const nextItems = prev.items.slice(0, -1);
      
      // Update ETD to match the new duration
      const lastItem = nextItems[nextItems.length - 1];
      let nextEtd = prev.etd;
      if (lastItem) {
        const d = new Date(lastItem.date);
        nextEtd = d.toISOString().split('T')[0] + (prev.etd && prev.etd.includes('T') ? 'T' + prev.etd.split('T')[1] : 'T12:00');
      }

      return { 
        ...prev, 
        items: nextItems,
        etd: nextEtd
      };
    });
  };

  const handleApplyPreset = (index: number, pId: string) => {
    const currentItem = quote.items[index];
    const isTransitioningToManual = !pId && (currentItem.applied_preset_id !== "" && currentItem.applied_preset_id !== undefined);

    if (!pId) {
      const updates: any = { applied_preset_id: "", is_manual: true };
      if (isTransitioningToManual) {
        updates.destination = "";
        updates.itinerary_details = "";
        updates.km = 0;
        updates.tags = [];
      }
      handleUpdateItem(index, updates);
      return;
    }
    const p = dbPresets.find(preset => preset.id === pId);
    if (!p) return;
    handleUpdateItem(index, { 
      destination: p.title, 
      itinerary_details: p.details || "", 
      km: p.default_km || 0, 
      applied_preset_id: pId, 
      tags: parseTags(p.tags), 
      is_manual: false 
    });
  };

  const handleUpdatePackageOption = (idx: number, updates: any) => {
    setLivePackages(prev => { const next = [...prev]; next[idx] = { ...next[idx], ...updates }; return next; });
  };

  const handleToggleMiscInclusion = (pkgIndex: number, miscId: string) => {
    setLivePackages(prev => {
      const next = [...prev]; const pkg = { ...next[pkgIndex] };
      const current = pkg.includes_misc_ids || [];
      pkg.includes_misc_ids = current.includes(miscId) ? current.filter((id: string) => id !== miscId) : [...current, miscId];
      next[pkgIndex] = pkg; return next;
    });
  };

  const handleAddCustomPackage = () => {
    const newPkg = { id: `custom-${Math.random().toString(36).substr(2, 9)}`, name: `Custom Option ${livePackages.length + 1}`, includes_vehicle: true, includes_fuel: true, includes_accommodation: true, includes_misc_ids: [], is_recommended: false, is_custom: true };
    setLivePackages([...livePackages, newPkg]);
    setSelectedPackageId(newPkg.id); setSelectedPackageName(newPkg.name); setOpenConfigId(newPkg.id);
  };

  const handleRemovePackage = (idx: number) => {
    if (livePackages.length <= 1) return;
    if (selectedPackageId === livePackages[idx].id) { setSelectedPackageId(null); setSelectedPackageName(""); }
    setLivePackages(prev => prev.filter((_, i) => i !== idx));
  };

  // Package Summary Generation
  const compileQuotationText = (currentQuote: any, currentItems: any[], currentFees: any[], currentDiscount: number, currentTotals: any) => {
    const tourSummary = currentItems.map(i => i.destination).filter(Boolean).slice(0, 3).join(" + ");
    const durationCount = currentItems.length;
    const duration = durationCount > 0 ? `${durationCount}D${durationCount - 1}N` : "N/A";
    let text = `Hi ${currentQuote.customer_name || 'Guest'},\n\nHere’s our estimated cost for ${duration} | ${currentQuote.pax_count} pax | ${tourSummary}\n\n`;
    
    if (includeItineraryInText && currentItems.length > 0) {
      text += `--- ITINERARY ---\n\n`;
      currentItems.forEach((item, idx) => {
        text += `Day ${idx + 1}: ${item.destination || 'TBA'}\n`;
        if (item.itinerary_details) item.itinerary_details.split('\n').filter(Boolean).forEach((d: string) => text += `• ${d.replace(/^•\s*/, '')}\n`);
        text += `\n`;
      });
    }

    text += `--- PACKAGE OPTIONS ---\n\n`;
    currentTotals.packages.forEach((pkg: any, idx: number) => {
      text += `Option ${idx + 1}: ${pkg.name}\n💰 ₱${pkg.total.toLocaleString()} total\n👥 ₱${Math.round(pkg.total / (currentQuote.pax_count || 1)).toLocaleString()}/pax\n\n`;
      
      const incs = [];
      const excs = [];

      // Vehicle
      if (pkg.config.includes_vehicle) incs.push(`Vehicle: ${currentQuote.vehicle_model}`);
      else excs.push(`Vehicle Rental`);

      // Fuel
      if (pkg.config.includes_fuel && currentTotals.colTotals.fuel > 0) incs.push(`Fuel Consumption (Reference Only)`);
      else excs.push(`Fuel Consumption`);

      // Accommodation
      const accomTotal = currentTotals.colTotals.accom > 0;
      if (pkg.config.includes_accommodation && accomTotal) {
        // Collect all unique accommodation names
        const names = currentItems
          .map(i => i.guest_accommodation_name)
          .filter(Boolean);
        const uniqueNames = Array.from(new Set(names));
        const accomLabel = uniqueNames.length > 0 ? `Guest Accommodation (${uniqueNames.join(", ")})` : "Guest Accommodation";
        incs.push(accomLabel);
      } else {
        excs.push(`Guest Accommodation`);
      }

      // Misc
      dbMiscPresets.forEach(m => {
        const totalAmount = currentTotals.colTotals.misc[m.id] || 0;
        const isIncluded = (pkg.config.includes_misc_ids || []).includes(m.id);
        
        if (isIncluded && totalAmount > 0) incs.push(m.name);
        else excs.push(m.name);
      });

      text += `✔ INCLUSIONS:\n`;
      incs.forEach(inc => text += `• ${inc}\n`);
      
      if (excs.length > 0) {
        text += `\n❌ EXCLUSIONS:\n`;
        excs.forEach(exc => text += `• ${exc}\n`);
      }
      text += `\n`;
    });

    if (currentFees.length > 0 || currentDiscount > 0) {
      text += `--- ADJUSTMENTS ---\n\n`;
      currentFees.forEach(f => text += `• ${f.name}: + ₱${f.amount.toLocaleString()}\n`);
      if (currentDiscount > 0) text += `• DISCOUNT: - ₱${currentDiscount.toLocaleString()}\n`;
      text += `\n`;
    }

    if (currentQuote.notes) {
      text += `--- NOTES ---\n\n${currentQuote.notes}\n\n`;
    }

    text += `--- ADDITIONAL NOTES ---\n`;
    text += `1. Fuel is computed based on P120/L and may vary depending on actual consumption and fuel price changes.\n`;
    text += `2. Driver service is up to 10 hours per day. Excess hours will be charged P100/hour.\n`;
    text += `3. For bookings with accommodation, 50% downpayment is required.\n\n`;
    
    return text;
  };

  const handleFinish = () => { 
    setPreviewText(compileQuotationText(quote, quote.items, extraFees, discount, totals)); 
    setIsPreviewingSaved(false);
    setIsPreviewOpen(true); 
  };
  
  const handleViewSaved = () => {
    if (!initialQuotationText) {
      openDialog({ title: "No Saved Quote", message: "There is no saved quotation text for this record yet.", type: "alert" });
      return;
    }
    setPreviewText(initialQuotationText);
    setIsPreviewingSaved(true);
    setIsPreviewOpen(true);
  };

  const finalizeSave = async (customStatus?: string, shouldNavigate = true, overrideText?: string) => {
    setIsSaving(true);
    try {
      // Status Re-evaluation: If the price changed, check if 'Payment Complete' is still valid
      let finalStatus = customStatus || quote.status || 'Draft';
      const isAlreadyPaid = ['Payment Started', 'Payment Complete'].includes(quote.status || '');
      
      if (isAlreadyPaid) {
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        // If price increased, it's no longer 'Complete'
        if (totalPaid < totals.grandTotal) {
          finalStatus = totalPaid > 0 ? 'Payment Started' : 'Confirmed';
        } else {
          finalStatus = 'Payment Complete';
        }
      }

      const payload: any = {
        operator_id: selectedOperatorId, 
        customer_name: quote.customer_name, 
        fb_name: quote.fb_name, 
        contact_number: quote.contact_number,
        pax_count: quote.pax_count, 
        eta: quote.eta ? new Date(quote.eta).toISOString() : null, 
        etd: quote.etd ? new Date(quote.etd).toISOString() : null,
        vehicle_model: quote.vehicle_model, 
        pickup_location: quote.pickup_location, 
        dropoff_location: quote.dropoff_location,
        notes: quote.notes, 
        default_fuel_price: quote.default_fuel_price,
        grand_total: totals.grandTotal, 
        extra_fees_json: extraFees, 
        extra_fees_total: totals.totalExtraFees,
        discount_total: discount, 
        status: finalStatus,
        admin_commission: quote.admin_commission, 
        selected_package: selectedPackageName, 
        selected_package_id: selectedPackageId?.startsWith('custom-') ? null : selectedPackageId,
        package_options_json: livePackages,
        updated_by: profile?.id,
        updated_at: new Date().toISOString()
      };

      // Only update quotation_text if we are explicitly overriding it (from the modal)
      if (overrideText) {
        payload.quotation_text = overrideText;
      }

      // Only set created_by on initial insert
      if (!quote.id) {
        payload.created_by = profile?.id;
      }

      const isCurrentlyConfirmed = ['Confirmed', 'Payment Started', 'Payment Complete'].includes(finalStatus);
      if ((customStatus === 'Confirmed' || isCurrentlyConfirmed) && selectedPackageId) {
        payload.confirmed_at = quote.confirmed_at || new Date().toISOString();
        const selPkg = totals.packages.find(p => p.id === selectedPackageId);
        if (selPkg) {
          payload.selected_package_total = totals.selectedPkgPrice;
          payload.selected_package_details = {
            package_name: selPkg.name, total_amount: totals.grandTotal, pax_count: quote.pax_count, per_pax: Math.round(totals.grandTotal / (quote.pax_count || 1)),
            inclusions: { vehicle: selPkg.config.includes_vehicle, fuel: selPkg.config.includes_fuel, accommodation: selPkg.config.includes_accommodation, misc_details: (selPkg.config.includes_misc_ids || []).map((id: string) => ({ name: dbMiscPresets.find(m => m.id === id)?.name || 'Misc', amount: 0 })) },
            adjustments: { extra_fees: extraFees, discount },
            itinerary_snapshot: quote.items.map(i => ({ day: i.day_number, date: i.date, destination: i.destination, details: i.itinerary_details }))
          };
        }
      }

      let cId = quote.id;
      if (cId) {
        await supabase.from('quotes').update(payload).eq('id', cId);
        await supabase.from('quote_items').delete().eq('quote_id', cId);
      } else {
        const { data } = await supabase.from('quotes').insert([payload]).select().single();
        cId = data.id;
      }
      
      const itemsToInsert = quote.items.map(i => {
        const { id, is_manual, ...rest } = i;
        return {
          ...rest,
          quote_id: cId,
          tags: i.tags.join(', '),
          guest_accommodation_id: i.guest_accommodation_id || null,
          applied_preset_id: i.applied_preset_id || null
        };
      });

      const { error: insertError } = await supabase.from('quote_items').insert(itemsToInsert);
      
      if (insertError) {
        throw new Error(`Failed to save itinerary: ${insertError.message}`);
      }
      if (shouldNavigate) router.push('/dashboard?tab=quotes');
      else {
          if (overrideText) setInitialQuotationText(overrideText); 
          setQuote(prev => ({ 
            ...prev, 
            ...payload, 
            eta: payload.eta ? formatForInput(payload.eta) : prev.eta,
            etd: payload.etd ? formatForInput(payload.etd) : prev.etd,
            id: cId 
          }));
          if (customStatus === 'Confirmed') setIsReconfiguring(false);
          openDialog({ title: "Success", message: "Quotation record updated.", type: "success" });
      }
    } catch (e: any) { openDialog({ title: "System Error", message: e.message, type: "warning" }); } finally { setIsSaving(false); }
  };

  const handleConfirmQuote = async (overrideText?: string) => {
    if (!selectedPackageId) { openDialog({ title: "Selection Required", message: "Please select a package first.", type: "alert" }); return; }
    openDialog({
      title: "Confirm Quotation",
      message: "Are you sure you want to lock and confirm this quotation? This will move it to the Confirmed status and lock itinerary editing.",
      type: "confirm",
      onConfirm: () => finalizeSave('Confirmed', false, overrideText)
    });
  };

  const handleCancelQuote = () => {
    if (!quote.id) {
      router.push('/dashboard?tab=quotes');
      return;
    }

    openDialog({
      title: "Cancel Quotation", 
      message: "Are you sure you want to cancel this quotation? This will archive the record and mark it as Cancelled.", 
      type: "warning",
      confirmText: "Yes, Cancel Quote",
      onConfirm: async () => { 
        const { error } = await supabase.from('quotes').update({ 
          status: 'Cancelled',
          updated_by: profile?.id,
          updated_at: new Date().toISOString()
        }).eq('id', quote.id); 
        if (error) {
          openDialog({ title: "Error", message: error.message, type: "warning" });
        } else {
           router.push('/dashboard?tab=quotes');
        }
      }
    });
  };

  const handleAddPaymentLocal = async (data: any) => {
    if (!quote.id) {
      openDialog({ title: "System Error", message: "Quote ID missing. Please refresh and try again.", type: "warning" });
      return;
    }

    setIsPaymentSaving(true);
    try {
      const { error } = await supabase.from('payments').insert([{ 
        quote_id: quote.id, 
        amount: parseFloat(data.amount), 
        payment_method: data.method, 
        reference_number: data.reference, 
        notes: data.notes 
      }]);

      if (error) {
        throw new Error(`Failed to record payment: ${error.message}`);
      }

      const totalPaid = payments.reduce((s, p) => s + p.amount, 0) + parseFloat(data.amount);
      const totalAgreed = quote.selected_package_details?.total_amount || 0;
      const nextStatus = totalPaid >= totalAgreed ? 'Payment Complete' : 'Payment Started';

      const { error: updateError } = await supabase.from('quotes').update({ status: nextStatus }).eq('id', quote.id);
      
      if (updateError) {
        throw new Error(`Payment recorded but failed to update quote status: ${updateError.message}`);
      }

      setIsPaymentModalOpen(false); 
      await fetchPayments(); 
      setQuote(prev => ({ ...prev, status: nextStatus }));
      openDialog({ title: "Success", message: "Payment successfully recorded.", type: "success" });
    } catch (e: any) {
      openDialog({ title: "Payment Error", message: e.message, type: "warning" });
    } finally {
      setIsPaymentSaving(true); // Keep true for a split second to prevent flicker, then false
      setTimeout(() => setIsPaymentSaving(false), 500);
    }
  };

  const handleVoidPaymentLocal = async (id: string) => {
    openDialog({
      title: "Void Transaction",
      message: "Are you sure you want to permanently void this transaction record? This action will impact the billing progress and cannot be undone.",
      type: "warning",
      confirmText: "Void Transaction",
      onConfirm: async () => {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) {
          openDialog({ title: "Error", message: error.message, type: "warning" });
        } else {
          // Re-fetch and reconcile status
          const { data: remainingPayments } = await supabase.from('payments').select('amount').eq('quote_id', quote.id);
          const totalAfterVoid = (remainingPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
          const totalAgreed = quote.selected_package_details?.total_amount || 0;
          
          let nextStatus: QuoteData['status'] = 'Confirmed';
          if (totalAfterVoid >= totalAgreed && totalAgreed > 0) nextStatus = 'Payment Complete';
          else if (totalAfterVoid > 0) nextStatus = 'Payment Started';

          if (nextStatus !== quote.status) {
            await supabase.from('quotes').update({ status: nextStatus }).eq('id', quote.id);
            setQuote(prev => ({ ...prev, status: nextStatus }));
          }
          
          fetchPayments();
          openDialog({ title: "Transaction Voided", message: "The financial ledger has been updated.", type: "success" });
        }
      }
    });
  };

  const isConfirmedView = ['Confirmed', 'Payment Started', 'Payment Complete'].includes(quote.status || '') && !isReconfiguring;

  if (isConfirmedView) {
    return (
      <>
        <ConfirmedSummary 
          quote={quote} onReconfigure={() => setIsReconfiguring(true)} onBack={() => router.push('/dashboard')}
          payments={payments} isPaymentModalOpen={isPaymentModalOpen} setIsPaymentModalOpen={setIsPaymentModalOpen}
          handleAddPayment={handleAddPaymentLocal} handleVoidPayment={handleVoidPaymentLocal}
          isSaving={isPaymentSaving}
          dbMiscPresets={dbMiscPresets}
        />
        <InfoDialog config={dialogConfig} onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))} />
      </>
    );
  }

  if (!isLoaded) return <QuoteBuilderFallback />;

    const isReadOnly = quote.status === 'Cancelled' || quote.status === 'Lost';

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb] builder-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .builder-container .custom-scrollbar::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        .builder-container .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5) !important;
          border-radius: 10px !important;
        }
        .builder-container .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 10px !important;
          border: 2px solid rgba(241, 245, 249, 0.5) !important;
          background-clip: padding-box !important;
        }
        .builder-container .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #006644 !important;
          border: 2px solid rgba(241, 245, 249, 0.5) !important;
          background-clip: padding-box !important;
        }
      `}} />
      <BuilderHeader 
        isSaving={isSaving} isDeadQuote={isReadOnly} status={quote.status || 'Draft'}
        customerName={quote.customer_name} quoteId={quote.id || null} itemsCount={quote.items.length} 
        selectedPackageId={selectedPackageId} onBack={() => router.push('/dashboard?tab=quotes')}
        onSave={() => finalizeSave(undefined, false)} onCancel={handleCancelQuote}
        onConfirm={handleConfirmQuote} isImpersonating={false}
      />
      <div className="flex flex-col lg:flex-row flex-1 relative overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar h-[calc(100vh-64px)] scroll-smooth px-2 md:px-4 lg:px-6">
          <div className="py-8 md:py-12 space-y-12 max-w-7xl mx-auto">
            <TripDetailsSection 
              quote={quote} 
              setQuote={setQuote} 
              onEtdChange={(date, iso) => {
                setQuote(prev => ({ ...prev, etd: iso }));
              }}
              onEtaChangeRequest={handleEtaChangeRequest}
              dbVehicles={dbVehicles} 
              readOnly={isReadOnly}
            />
            <ItinerarySequence 
              items={quote.items} onUpdateItem={handleUpdateItem} onApplyPreset={handleApplyPreset} 
              dbPresets={dbPresets} dbAccommodations={dbAccommodations} dbMiscPresets={dbMiscPresets}
              onAddDay={handleAddDay} onRemoveLastDay={handleRemoveLastDay}
              readOnly={isReadOnly}
            />
            <OperationalMatrix 
              items={quote.items} onUpdateItem={(idx, upd) => handleUpdateItem(idx, upd, true)} 
              dbMiscPresets={dbMiscPresets} adminCommission={quote.admin_commission} 
              onUpdateCommission={handleUpdateCommission}
              colTotals={totals.colTotals} 
              onUpdateDefaultFuel={handleUpdateDefaultFuel} 
              defaultFuelPrice={quote.default_fuel_price}
              dbAccommodations={dbAccommodations} discount={discount} onUpdateDiscount={setDiscount} grandTotal={totals.grandTotal}
              livePackages={livePackages}
              rowTotals={totals.rowTotals}
              readOnly={isReadOnly}
            />
          </div>
        </div>
        <PackageSidebar 
          packages={totals.packages} selectedPackageId={selectedPackageId} 
          onSelectPackage={(name, id) => { setSelectedPackageName(name); setSelectedPackageId(id); }}
          onAddPackage={handleAddCustomPackage} onRemovePackage={handleRemovePackage} onUpdatePackage={handleUpdatePackageOption} onToggleMisc={handleToggleMiscInclusion}
          openConfigId={openConfigId} setOpenConfigId={setOpenConfigId} dbMiscPresets={dbMiscPresets} extraFees={extraFees} discount={discount}
          onAddCustomFee={(name, amount) => setExtraFees([...extraFees, { id: Math.random().toString(), name, amount }])}
          onRemoveExtraFee={(id) => setExtraFees(extraFees.filter(f => f.id !== id))} onUpdateDiscount={setDiscount}
          notes={quote.notes || ""}
          onUpdateNotes={(v) => setQuote(prev => ({ ...prev, notes: v }))}
          includeItinerary={includeItineraryInText}
          onToggleItinerary={setIncludeItineraryInText}
          onPreview={handleFinish}
          onViewSaved={handleViewSaved}
          grandTotal={totals.grandTotal}
          quoteId={quote.id}
          readOnly={isReadOnly}
        />
      </div>
      <AnimatePresence>
        {isPreviewOpen && (
          <QuotationPreviewModal 
            text={previewText} 
            setText={setPreviewText} 
            onClose={() => setIsPreviewOpen(false)} 
            onConfirm={() => finalizeSave(undefined, false, previewText)} 
            onCancel={handleCancelQuote} 
            isSaving={isSaving} 
            openDialog={openDialog} 
            userRole={profile?.role}
            showPolish={!isPreviewingSaved}
          />
        )}
      </AnimatePresence>
      <InfoDialog config={dialogConfig} onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}
