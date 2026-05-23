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
  const copyFromId = searchParams.get('copyFrom');
  
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

  // Helper to resolve vehicle overrides by matching quote fleet dynamic IDs with database vehicle models
  const getOverrideRate = (vid: string, p: any, fleet: any[]) => {
    const fleetVehicle = (fleet || []).find(v => v.id === vid);
    if (!fleetVehicle) return p.default_amount;
    const dbV = dbVehicles.find(dv => dv.model === fleetVehicle.model);
    const lookupId = dbV ? dbV.id : vid;
    return p.vehicle_overrides?.[lookupId] !== undefined ? p.vehicle_overrides[lookupId] : p.default_amount;
  };

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
    confirmed_at: null, items: [], fleet: [], quotation_description: ""
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
    if (dbPackagePresets.length > 0 && livePackages.length === 0 && !quoteId && !copyFromId) {
      setLivePackages(dbPackagePresets);
    }
  }, [dbPackagePresets, quoteId, copyFromId, livePackages.length]);

  // Auto-select first vehicle and apply defaults for NEW quotes
  useEffect(() => {
    if (!quoteId && !copyFromId && isLoaded && dbVehicles.length > 0 && (!quote.fleet || quote.fleet.length === 0)) {
      const firstVehicle = dbVehicles[0];
      const rate = Number(firstVehicle.default_rate) || Number(firstVehicle.rate) || 0;
      const kmpl = Number(firstVehicle.km_per_l) || 10;
      
      setQuote(prev => ({
        ...prev,
        vehicle_model: firstVehicle.model,
        fleet: [{
          id: `v-${Date.now()}`,
          model: firstVehicle.model,
          daily_rate: rate,
          km_per_l: kmpl,
          fuel_price: prev.default_fuel_price || 60
        }]
      }));
    }
  }, [dbVehicles, quoteId, copyFromId, isLoaded, quote.fleet]);

  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleRefreshData = async () => {
    if (!selectedOperatorId) return;
    if (!quoteId && !copyFromId) {
      hasHydrated.current = true;
      setIsLoaded(true);
      return;
    }
    
    const targetId = quoteId || copyFromId;
    const { data: qData } = await supabase.from('quotes').select('*').eq('id', targetId).single();
    if (!qData) return;
    const { data: itemsData } = await supabase.from('quote_items').select('*').eq('quote_id', targetId).order('day_number');
    
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
          const dateStr = getLocalDateStr(currentDate);
          const existing = rawItems.find(item => Number(item.day_number) === i + 1);
          
          if (existing) {
            reconciled.push({ ...existing, date: dateStr, day_number: i + 1 });
          } else {
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
      id: copyFromId ? undefined : qData.id,
      customer_name: copyFromId ? "" : qData.customer_name,
      contact_number: copyFromId ? "" : qData.contact_number,
      fb_name: copyFromId ? "" : qData.fb_name,
      status: copyFromId ? "Draft" : qData.status,
      confirmed_at: copyFromId ? null : qData.confirmed_at,
      selected_package_total: copyFromId ? null : qData.selected_package_total,
      selected_package_details: copyFromId ? null : qData.selected_package_details,
      quotation_text: copyFromId ? "" : qData.quotation_text,
      eta: formattedEta,
      etd: formattedEtd,
      fleet: qData.fleet_json || [],
      quotation_description: qData.quotation_description || "",
      items: finalItems.map(item => ({
        ...item,
        row_total: calculateRowTotal(item, qData.admin_commission || 0, qData.fleet_json || [])
      }))
    });

    if (qData.extra_fees_json) setExtraFees(qData.extra_fees_json);
    if (qData.discount_total) setDiscount(qData.discount_total);
    if (qData.package_options_json) setLivePackages(qData.package_options_json);
    if (qData.selected_package) setSelectedPackageName(qData.selected_package);
    
    if (qData.selected_package_id) {
      setSelectedPackageId(qData.selected_package_id);
    } else if (qData.package_options_json) {
      const selectedInJson = qData.package_options_json.find((p: any) => p.is_selected === true);
      if (selectedInJson) {
        setSelectedPackageId(selectedInJson.id);
      }
    }
    setInitialQuotationText(copyFromId ? "" : (qData.quotation_text || ""));
    
    // Also refresh payments
    fetchPayments();

    hasHydrated.current = true;
    setIsLoaded(true);
  };

  useEffect(() => {
    if (!authLoading && profile) handleRefreshData();
  }, [quoteId, copyFromId, selectedOperatorId, authLoading, profile]);

  const handleEtaChangeRequest = (newDate: Date, iso: string) => {
    // If no End Date exists yet, just update the Start Date normally
    if (!quote.etd) {
      setQuote(prev => ({ ...prev, eta: iso }));
      return;
    }

    // If no valid old ETA to calculate offset from, just set the new ETA
    if (!quote.eta) {
      setQuote(prev => ({ ...prev, eta: iso }));
      return;
    }

    // Auto-shift: Calculate offset and slide ETD + all item dates together
    const oldEta = new Date(quote.eta);
    const newEta = new Date(iso);
    const offsetMs = newEta.getTime() - oldEta.getTime();
    const offsetDays = Math.round(offsetMs / (1000 * 60 * 60 * 24));

    // Shift ETD by the same offset
    const oldEtd = new Date(quote.etd);
    const newEtd = new Date(oldEtd.getTime() + offsetMs);

    // Shift every itinerary item's date by the same day offset
    const shiftedItems = quote.items.map(item => {
      const itemDate = new Date(item.date);
      itemDate.setDate(itemDate.getDate() + offsetDays);
      return { ...item, date: getLocalDateStr(itemDate) };
    });

    // Atomic update: ETA, ETD, and items all shift together
    setQuote(prev => ({
      ...prev,
      eta: iso,
      etd: formatForInput(getLocalDateStr(newEtd) + 'T' + (newEtd.toTimeString().slice(0, 5))),
      items: shiftedItems
    }));
  };

  // Date/Timeline Synchronization
  useEffect(() => {
    if (!hasHydrated.current || ((quoteId || copyFromId) && !isLoaded)) return;
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
          const dateStr = getLocalDateStr(currentDate);
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
  }, [quote.eta, quote.etd, quote.items.length, quoteId, copyFromId, isLoaded, quote.default_fuel_price, quote.vehicle_model, dbVehicles]);

  // Calculations Memo
  const totals = useMemo(() => {
    const packagesToCompute = livePackages.length > 0 ? livePackages : [{ name: 'Total Amount', includes_vehicle: true, includes_fuel: true, includes_accommodation: true, includes_misc_ids: dbMiscPresets.map(p => p.id) }];
    const packageTotals = packagesToCompute.map(pkg => {
      let baseSum = 0; let totalSum = 0;
      const commission = quote.admin_commission || 0;
      quote.items.forEach(item => {
        let rowBase = 0;
        if (pkg.includes_vehicle) {
          const activeFleet = (quote.fleet && quote.fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)
            ? quote.fleet.filter(v => item.selected_vehicle_ids!.includes(v.id))
            : quote.fleet;
            
          const fleetRate = (activeFleet && activeFleet.length > 0)
            ? activeFleet.reduce((acc, v: any) => acc + (v.daily_rate || 0), 0)
            : (item.vehicle_rate || 0);
          rowBase += fleetRate;
        }
        if (pkg.includes_fuel) rowBase += calculateFuelCost(item, quote.fleet);
        if (pkg.includes_accommodation) rowBase += (item.guest_accommodation_amount || 0);
        (pkg.includes_misc_ids || []).forEach((mId: string) => { rowBase += (item.dynamic_costs[mId] || 0); });
        baseSum += rowBase;
        totalSum += rowBase * (1 + commission / 100);
      });
      return { name: pkg.name || pkg.title || 'Untitled Package', total: totalSum, commissionAmount: totalSum - baseSum, is_recommended: pkg.is_recommended, id: pkg.id, config: pkg };
    });

    const rowTotals = quote.items.map(item => calculateRowTotal(item, quote.admin_commission, quote.fleet));
    const matrixSum = rowTotals.reduce((a, b) => a + b, 0);
    const adjustments = extraFees.reduce((a, b) => a + (b.amount || 0), 0) - (discount || 0);
    const selectedPkg = packageTotals.find(p => p.id === selectedPackageId);
    const selectedPkgPrice = selectedPkg ? selectedPkg.total : matrixSum;
    
    const colTotals = quote.items.reduce((acc, item) => {
      const fuel = calculateFuelCost(item, quote.fleet);
      const activeFleet = (quote.fleet && quote.fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)
        ? quote.fleet.filter(v => item.selected_vehicle_ids!.includes(v.id))
        : quote.fleet;

      const currentRate = (activeFleet && activeFleet.length > 0)
        ? activeFleet.reduce((acc, v: any) => acc + (v.daily_rate || 0), 0)
        : (item.vehicle_rate || 0);
        
      acc.rate += currentRate; 
      acc.km += item.km; 
      acc.fuel += fuel;
      acc.accom += (item.guest_accommodation_amount || 0);
      acc.grand += calculateRowTotal(item, quote.admin_commission, quote.fleet);
      dbMiscPresets.forEach(p => { acc.misc[p.id] = (acc.misc[p.id] || 0) + (item.dynamic_costs[p.id] || 0); });
      return acc;
    }, { rate: 0, km: 0, fuel: 0, accom: 0, grand: 0, misc: {} as Record<string, number> });

    return { 
      packages: packageTotals, 
      grandTotal: selectedPkgPrice + adjustments, 
      selectedPkgPrice, 
      totalExtraFees: extraFees.reduce((a, b) => a + (b.amount || 0), 0), 
      colTotals,
      rowTotals
    };

  }, [quote.items, quote.fleet, extraFees, discount, livePackages, dbMiscPresets, selectedPackageId, quote.admin_commission]);

  // Event Handlers
  const handleUpdateItem = (index: number, updates: Partial<QuoteItem>, manual = false) => {
    setQuote(prev => {
      const newItems = [...prev.items];
      if (!newItems[index]) return prev;
      let updated = { ...newItems[index], ...updates };
      if (manual) updated.is_manual = true;
      if (updates.tags || updates.selected_vehicle_ids !== undefined) {
        const dCosts = { ...updated.dynamic_costs };
        const activeIds = updated.selected_vehicle_ids && updated.selected_vehicle_ids.length > 0
          ? updated.selected_vehicle_ids
          : (prev.fleet?.map(v => v.id) || []);
        const vehicleCount = activeIds.length || 1;
        const oldTags = prev.items[index].tags || [];

        dbMiscPresets.forEach(p => {
          const isCurrentlyActive = updated.tags ? updated.tags.includes(p.name) : oldTags.includes(p.name);
          const wasPreviouslyActive = oldTags.includes(p.name);
          
          if (updates.tags) {
            if (isCurrentlyActive && !wasPreviouslyActive) {
              // This is a NEWLY added tag: Apply default or override
              if (p.multiply_by_vehicle) {
                let cost = 0;
                activeIds.forEach(vid => {
                  const rate = getOverrideRate(vid, p, prev.fleet);
                  cost += rate;
                });
                dCosts[p.id] = cost;
              } else {
                dCosts[p.id] = p.default_amount;
              }
            } else if (!isCurrentlyActive && wasPreviouslyActive) {
              // Tag was EXPLICITLY REMOVED: Set to 0
              dCosts[p.id] = 0;
            }
            // If it's an existing manual entry with no tag, OR an existing tag, we leave it alone!
          } else if (updates.selected_vehicle_ids !== undefined && isCurrentlyActive && p.multiply_by_vehicle) {
            // Vehicle changed: Only update fees that are explicitly marked to scale
            let cost = 0;
            activeIds.forEach(vid => {
              const rate = getOverrideRate(vid, p, prev.fleet);
              cost += rate;
            });
            dCosts[p.id] = cost;
          }
        });
        updated.dynamic_costs = dCosts;
      }
      updated.row_total = calculateRowTotal(updated, prev.admin_commission || 0, prev.fleet);
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
        row_total: calculateRowTotal(item, v, prev.fleet)
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
          row_total: calculateRowTotal(updated, prev.admin_commission || 0, prev.fleet)
        };
      })
    }));
  };

  const handleAddDay = () => {
    setQuote(prev => {
      const lastItem = prev.items[prev.items.length - 1];
      const newDate = new Date(lastItem ? lastItem.date : (prev.eta || new Date()));
      if (lastItem) newDate.setDate(newDate.getDate() + 1);
      
      const fleetTotalRate = (prev.fleet || []).reduce((acc, v) => acc + (v.daily_rate || 0), 0);
      const fleetFuelPrice = prev.fleet?.[0]?.fuel_price || prev.default_fuel_price || 60;
      const fleetKmpl = prev.fleet?.[0]?.km_per_l || 10;

      const newItem: QuoteItem = {
        day_number: prev.items.length + 1,
        date: getLocalDateStr(newDate),
        destination: "",
        vehicle_rate: fleetTotalRate,
        km: 0,
        km_per_l: fleetKmpl,
        fuel_price: fleetFuelPrice,
        dynamic_costs: {},
        tags: [],
        itinerary_details: "",
        guest_accommodation_id: "",
        guest_accommodation_name: "",
        guest_accommodation_amount: 0,
        row_total: 0 // Will be calculated below
      };
      newItem.row_total = calculateRowTotal(newItem, prev.admin_commission || 0, prev.fleet);
      const nextItems = [...prev.items, newItem];
      
      // Update ETD to match the new duration
      const etdDate = new Date(newDate);

      return { 
        ...prev, 
        items: nextItems,
        etd: getLocalDateStr(etdDate) + (prev.etd && prev.etd.includes('T') ? 'T' + prev.etd.split('T')[1] : 'T12:00')
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
        nextEtd = getLocalDateStr(d) + (prev.etd && prev.etd.includes('T') ? 'T' + prev.etd.split('T')[1] : 'T12:00');
      }

      return { 
        ...prev, 
        items: nextItems,
        etd: nextEtd
      };
    });
  };

  const handleApplyPreset = (index: number, pId: string) => {

    if (pId === "") {
      handleUpdateItem(index, { 
        destination: "", 
        applied_preset_id: "", 
        is_manual: true,
        itinerary_details: "",
        km: 0,
        tags: []
      });
      return;
    }

    const p = dbPresets.find(preset => preset.id === pId);
    if (!p) {
      // Handle custom text input
      handleUpdateItem(index, { 
        destination: pId, 
        applied_preset_id: "", 
        is_manual: true,
        itinerary_details: "", // Clear details on manual change
        km: 0,
        tags: []
      });
      return;
    }

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
    setLivePackages(prev => {
      const next = [...prev];
      const target = next[idx];
      const updated = { ...target, ...updates };
      next[idx] = updated;

      // If this is the currently selected package and its name changed, update the selection state
      if (selectedPackageId === updated.id && updates.name && updates.name !== target.name) {
        setSelectedPackageName(updates.name);
      }

      return next;
    });
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
  const compileQuotationText = (currentQuote: any, currentItems: any[], currentFees: any[], currentDiscount: number, currentTotals: any, currentSelectedId: string | null) => {
    const tourSummary = currentQuote.quotation_description || currentItems.map(i => i.destination).filter(Boolean).join(" + ");
    const durationCount = currentItems.length;
    const duration = durationCount > 0 ? `${durationCount}D${durationCount - 1}N` : "N/A";

    const formatDateTime = (iso: string | undefined) => {
      if (!iso) return 'TBA';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'TBA';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' @ ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatTimeOnly = (iso: string | undefined, fallback: string) => {
      if (!iso) return fallback;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return fallback;
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const etaStr = formatDateTime(currentQuote.eta);
    const etdStr = formatDateTime(currentQuote.etd);

    let text = `Hi ${currentQuote.customer_name || 'Guest'},\n\nHere’s our estimated cost for ${duration} | ${currentQuote.pax_count} pax | ${tourSummary}\n\n`;
    text += `📅 Travel Schedule: ${etaStr} – ${etdStr}\n\n`;
    
    if (includeItineraryInText && currentItems.length > 0) {
      text += `--- ITINERARY ---\n\n`;
      currentItems.forEach((item, idx) => {
        const d = new Date(item.date);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isFirst = idx === 0;
        const isLast = idx === currentItems.length - 1;
        const timeNote = isFirst ? ` (Pickup / Start: ${formatTimeOnly(currentQuote.eta, '08:00 AM')})` : isLast ? ` (Drop-off / End: ${formatTimeOnly(currentQuote.etd, '05:00 PM')})` : '';
        text += `Day ${idx + 1} (${dateStr})${timeNote}: ${item.destination || 'TBA'}\n`;
        if (item.itinerary_details) item.itinerary_details.split('\n').filter(Boolean).forEach((d: string) => text += `• ${d.replace(/^•\s*/, '')}\n`);
        text += `\n`;
      });
    }

    text += `--- PACKAGE OPTIONS ---\n\n`;
    const sortedPackages = [...currentTotals.packages].sort((a, b) => {
      if (currentSelectedId) {
        if (a.id === currentSelectedId) return -1;
        if (b.id === currentSelectedId) return 1;
        return b.total - a.total; // Highest to Lowest for non-selected
      }
      return a.total - b.total; // Lowest to Highest if nothing selected
    });

    sortedPackages.forEach((pkg: any, idx: number) => {
      const isSelected = pkg.id === currentSelectedId;
      text += `${isSelected ? '⭐ RECOMMENDED' : `Option ${idx + 1}`}: ${pkg.name}${isSelected ? ' ✅' : ''}\n💰 ₱${pkg.total.toLocaleString()} total\n👥 ₱${Math.round(pkg.total / (currentQuote.pax_count || 1)).toLocaleString()}/pax\n\n`;
      
      const incs = [];
      const excs = [];

      // Vehicle
      if (pkg.config.includes_vehicle) {
        if (currentQuote.fleet && currentQuote.fleet.length > 0) {
          const vehicleParts = currentQuote.fleet.map((v: any) => {
            const activeDays = currentItems
              .filter(item => !item.selected_vehicle_ids || item.selected_vehicle_ids.length === 0 || item.selected_vehicle_ids.includes(v.id))
              .map(item => item.day_number);
            
            if (activeDays.length === currentItems.length) return `${v.model} (All Days)`;
            if (activeDays.length === 0) return null;
            return `${v.model} (Day ${activeDays.join(", ")})`;
          }).filter(Boolean);
          
          if (vehicleParts.length > 0) {
            incs.push(`Vehicles: ${vehicleParts.join(", ")}`);
          }
        } else {
          incs.push(`Vehicle: ${currentQuote.vehicle_model}`);
        }
      } else {
        excs.push(`Vehicle Rental`);
      }

      // Fuel
      if (pkg.config.includes_fuel && currentTotals.colTotals.fuel > 0) incs.push(`Fuel Consumption`);
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
      // Driver consolidation
      let driverIncluded = false;
      let driverExcluded = false;

      dbMiscPresets.forEach(m => {
        if (m.hide_in_quote) return;
        const name = m.name.toLowerCase();
        if (name.includes('car wash') || name.includes('parking') || name.includes('overtime') || name === 'ot' || name.split(' ').includes('ot')) return;

        const isIncluded = (pkg.config.includes_misc_ids || []).includes(m.id);
        const totalAmount = currentTotals.colTotals.misc[m.id] || 0;
        
        if (name.includes('driver')) {
          if (isIncluded && totalAmount > 0) driverIncluded = true;
          else driverExcluded = true;
          return;
        }

        if (isIncluded && totalAmount > 0) incs.push(m.name);
        else excs.push(m.name);
      });

      if (driverIncluded) incs.push("Driver");
      else if (driverExcluded) excs.push("Driver");

      // Default Exclusions
      excs.push("Guest meals");
      excs.push("Entrance fees");
      excs.push("Activity fees");
      excs.push("Any other items not included in the inclusions");

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

    const agencyNotes = profile?.operators?.quotation_agency_notes;
    if (agencyNotes) {
      text += `--- ADDITIONAL NOTES ---\n\n${agencyNotes}\n\n`;
    }
    
    return text;
  };

  const handleFinish = () => { 
    setPreviewText(compileQuotationText(quote, quote.items, extraFees, discount, totals, selectedPackageId)); 
    setIsPreviewingSaved(false);
    setIsPreviewOpen(true); 
  };
  
  const handleViewSaved = () => {
    if (!initialQuotationText) {
      openDialog({ 
        title: "No Saved Quote", 
        message: "There is no saved quotation text for this record yet.", 
        type: "alert",
        confirmText: "CLOSE"
      });
      return;
    }
    setPreviewText(initialQuotationText);
    setIsPreviewingSaved(true);
    setIsPreviewOpen(true);
  };

  const handleUpdateFleet = (newFleet: any[]) => {
    setQuote(prev => {
      const addedVehicles = (newFleet || []).filter(nv => !(prev.fleet || []).some(pv => pv.id === nv.id));
      const fleetTotalRate = (newFleet || []).reduce((acc, v) => acc + (v.daily_rate || 0), 0);
      
      const updatedItems = prev.items.map(item => {
        // Clean up any selected vehicle IDs that were just removed from the fleet
        const validSelectedIds = (item.selected_vehicle_ids || []).filter(id => 
          newFleet.some(nv => nv.id === id)
        );

        const updated = { 
          ...item, 
          vehicle_rate: fleetTotalRate,
          selected_vehicle_ids: item.selected_vehicle_ids ? validSelectedIds : undefined
        };

        // Recalculate scaling costs for this item
        const dCosts = { ...item.dynamic_costs };
        const activeIds = validSelectedIds.length > 0 
          ? validSelectedIds 
          : newFleet.map(v => v.id);

        dbMiscPresets.forEach(p => {
          if (item.tags.includes(p.name) && p.multiply_by_vehicle) {
            let cost = 0;
            activeIds.forEach(vid => {
              const rate = getOverrideRate(vid, p, newFleet);
              cost += rate;
            });
            dCosts[p.id] = cost;
          }
        });
        updated.dynamic_costs = dCosts;

        // If a new vehicle was added and the user has previously customized the selection,
        // automatically "check" the new vehicle for them.
        if (addedVehicles.length > 0 && item.selected_vehicle_ids) {
          updated.selected_vehicle_ids = [
            ...validSelectedIds, 
            ...addedVehicles.map(v => v.id)
          ];
          
          // Re-update dCosts for added vehicles
          const newActiveIds = updated.selected_vehicle_ids;
          dbMiscPresets.forEach(p => {
            if (item.tags.includes(p.name) && p.multiply_by_vehicle) {
              let cost = 0;
              newActiveIds.forEach(vid => {
                const rate = getOverrideRate(vid, p, newFleet);
                cost += rate;
              });
              dCosts[p.id] = cost;
            }
          });
        }

        return {
          ...updated,
          row_total: calculateRowTotal(updated, prev.admin_commission, newFleet)
        };
      });

      return { ...prev, fleet: newFleet, items: updatedItems };
    });
  };

  const finalizeSave = async (customStatus?: string, shouldNavigate = true, overrideText?: string) => {
    setIsSaving(true);
    try {
      // Manual De-Tangler: Recursive scrubber that breaks circular loops and removes browser/React objects
      const scrub = (val: any, visited = new WeakSet()): any => {
        if (val === null || typeof val !== 'object') return val;
        
        // Break circular references immediately
        if (visited.has(val)) return undefined;
        
        // Remove DOM nodes and React internal objects
        if (typeof window !== 'undefined' && (val instanceof Node || val instanceof Window)) return undefined;
        if (val.$$typeof || (val.constructor && val.constructor.name === 'FiberNode')) return undefined;

        visited.add(val);

        if (Array.isArray(val)) {
          return val.map(v => scrub(v, visited)).filter(v => v !== undefined);
        }

        const cleaned: any = {};
        for (const key in val) {
          if (key.startsWith('__react') || key.startsWith('react')) continue;
          try {
            const result = scrub(val[key], visited);
            if (result !== undefined) cleaned[key] = result;
          } catch (e) {
            // Skip any property that can't be accessed or scrubbed
            continue;
          }
        }
        return cleaned;
      };

      // Status Re-evaluation
      let finalStatus = customStatus || quote.status || 'Draft';
      const isAlreadyPaid = ['Payment Started', 'Payment Complete'].includes(quote.status || '');
      
      if (isAlreadyPaid) {
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
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
        vehicle_model: quote.fleet && quote.fleet.length > 0 
          ? (quote.fleet.length === 1 
              ? quote.fleet[0].model 
              : `${quote.fleet[0].model} + ${quote.fleet.length - 1} other${quote.fleet.length > 2 ? 's' : ''}`)
          : quote.vehicle_model,
        pickup_location: quote.pickup_location, 
        dropoff_location: quote.dropoff_location,
        notes: quote.notes, 
        default_fuel_price: quote.fleet && quote.fleet.length > 0 ? quote.fleet[0].fuel_price : quote.default_fuel_price,
        fleet_json: quote.fleet || [],
        grand_total: totals.grandTotal, 
        extra_fees_json: extraFees, 
        extra_fees_total: totals.totalExtraFees,
        discount_total: discount, 
        status: finalStatus,
        admin_commission: quote.admin_commission, 
        quotation_description: quote.quotation_description,
        selected_package: selectedPackageName, 
        selected_package_id: selectedPackageId?.startsWith('custom-') ? null : selectedPackageId,
        package_options_json: livePackages.map(pkg => ({
          ...pkg,
          is_selected: pkg.id === selectedPackageId
        })),
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
            itinerary_snapshot: quote.items.map(i => {
              const activeIds = i.selected_vehicle_ids && i.selected_vehicle_ids.length > 0 
                ? i.selected_vehicle_ids 
                : (quote.fleet || []).map(v => v.id);
              const vehicles = (quote.fleet || []).filter(v => activeIds.includes(v.id)).map(v => v.model).join(', ');

              return { 
                day: i.day_number, 
                date: i.date, 
                destination: i.destination, 
                details: i.itinerary_details,
                vehicles: vehicles,
                guest_accommodation_name: i.guest_accommodation_name,
                tags: i.tags
              };
            })
          };
        }
      }

      const cleanPayload = scrub(payload);

      let cId = quote.id;
      if (cId) {
        const { error: updateError } = await supabase.from('quotes').update(cleanPayload).eq('id', cId);
        if (updateError) throw new Error(`Failed to update quote: ${updateError.message}`);
        
        await supabase.from('quote_items').delete().eq('quote_id', cId);
      } else {
        const { data, error: insertError } = await supabase.from('quotes').insert([cleanPayload]).select().single();
        if (insertError) throw new Error(`Failed to create quote: ${insertError.message}`);
        cId = data.id;
      }
      
      const rawItemsToInsert = quote.items.map(i => {
        const { id, is_manual, ...rest } = i;
        return {
          ...rest,
          quote_id: cId,
          tags: i.tags.join(', '),
          guest_accommodation_id: i.guest_accommodation_id || null,
          applied_preset_id: i.applied_preset_id || null
        };
      });

      const cleanItems = scrub(rawItemsToInsert);
      const { error: itemsError } = await supabase.from('quote_items').insert(cleanItems);
      if (itemsError) throw new Error(`Failed to save itinerary: ${itemsError.message}`);

      // If it was a new quote (no quoteId in URL), update URL and state with new ID without reloading
      if (!quoteId && cId) {
        window.history.replaceState(null, '', `/builder?id=${cId}`);
      }

      if (shouldNavigate) {
        router.push('/dashboard?tab=quotes');
      } else {
        if (overrideText) setInitialQuotationText(overrideText); 
        
        // Update local state and flip the view
        setQuote(prev => ({ 
          ...prev, 
          ...cleanPayload, 
          status: finalStatus,
          id: cId 
        }));

        if (customStatus === 'Confirmed' || finalStatus === 'Confirmed') {
          setIsReconfiguring(false);
        } else if (!overrideText) {
          // Only show success dialog if we're NOT saving from the preview modal
          openDialog({ title: "Success", message: "Quotation record updated.", type: "success" });
        }
      }
    } catch (e: any) { 
      openDialog({ title: "System Error", message: e.message, type: "warning" }); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleConfirmQuote = async (overrideText?: string) => {
    // Safety check: ensure we're not receiving a React event object
    const validOverrideText = typeof overrideText === 'string' ? overrideText : undefined;
    if (!selectedPackageId) { openDialog({ title: "Selection Required", message: "Please select a package first.", type: "alert" }); return; }
    openDialog({
      title: "Confirm Quotation",
      message: "Are you sure you want to lock and confirm this quotation? This will move it to the Confirmed status and lock itinerary editing.",
      type: "confirm",
      onConfirm: () => finalizeSave('Confirmed', false, validOverrideText)
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

  const handleDuplicate = () => {
    if (!quoteId) return;
    openDialog({
      title: "Duplicate Quotation?",
      message: "This will clone the current quote into a new draft. Any unsaved changes on this record will be lost. Continue?",
      type: 'warning',
      confirmText: "YES, DUPLICATE",
      cancelText: "NO, GO BACK",
      onConfirm: () => {
        router.push(`/builder?copyFrom=${quoteId}`);
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
          onRefresh={handleRefreshData}
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
        onConfirm={() => handleConfirmQuote()} onDuplicate={handleDuplicate} isImpersonating={false}
      />
      <div className="flex flex-col lg:flex-row flex-1 relative overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar h-[calc(100vh-64px)] scroll-smooth px-2 md:px-4 lg:px-6">
          <div className="py-8 md:py-12 space-y-12 max-w-7xl mx-auto">
            <TripDetailsSection 
            quote={quote}
            setQuote={setQuote}
            onEtaChangeRequest={handleEtaChangeRequest}
            onEtdChange={(date, iso) => setQuote(prev => ({ ...prev, etd: iso }))}
            dbVehicles={dbVehicles}
            onUpdateFleet={handleUpdateFleet}
            readOnly={isReadOnly}
            quote_title_presets={profile?.operators?.quote_title_presets || []}
          />
            <ItinerarySequence 
              items={quote.items} onUpdateItem={handleUpdateItem} onApplyPreset={handleApplyPreset} 
              dbPresets={dbPresets} dbAccommodations={dbAccommodations} dbMiscPresets={dbMiscPresets}
              onAddDay={handleAddDay} onRemoveLastDay={handleRemoveLastDay}
              readOnly={isReadOnly}
              fleet={quote.fleet}
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
              fleet={quote.fleet}
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
            onConfirm={(t) => finalizeSave(undefined, false, t)} 
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
