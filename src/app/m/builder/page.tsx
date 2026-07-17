"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

import { QuoteData, QuoteItem, ExtraFee, QuoteVehicle } from "@/app/builder/components/types";
import { calculateFuelCost, calculateRowTotal, parseTags, formatForInput } from "@/app/builder/components/utils";
import { polishQuotation } from "@/app/actions/ai-actions";

import MobileStepIndicator from "./components/MobileStepIndicator";
import MobileTripForm from "./components/MobileTripForm";
import MobileDayCards from "./components/MobileDayCards";
import MobilePackages from "./components/MobilePackages";
import MobileReview from "./components/MobileReview";

const font = "'Inter', system-ui, sans-serif";

export default function MobileBuilderPage() {
  return (
    <Suspense fallback={<CenterLoader />}>
      <MobileBuilder />
    </Suspense>
  );
}

function CenterLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
      <Loader2 className="animate-spin" size={26} color="#00674F" />
    </div>
  );
}

function MobileBuilder() {
  const router = useRouter();
  const { profile, loading: authLoading, selectedOperatorId } = useAuth();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("id");
  const copyFromId = searchParams.get("copyFrom");

  // ── Wizard step ──
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);

  // ── Core quote state (mirrors desktop) ──
  const [quote, setQuote] = useState<QuoteData>({
    customer_name: "", fb_name: "", contact_number: "", pax_count: 1,
    eta: "", etd: "", vehicle_model: "", pickup_location: "", dropoff_location: "",
    notes: "", default_fuel_price: 60, admin_commission: 0, status: "Draft",
    selected_package: null, selected_package_total: null, selected_package_details: null,
    confirmed_at: null, items: [], fleet: [], quotation_description: "",
  });
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [livePackages, setLivePackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string | null>(null);
  const [includeItinerary, setIncludeItinerary] = useState(true);
  const [initialQuotationText, setInitialQuotationText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const hasHydrated = useRef(false);
  const loadedTarget = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);

  // ── DB presets ──
  const [dbPresets, setDbPresets] = useState<any[]>([]);
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const [dbMiscPresets, setDbMiscPresets] = useState<any[]>([]);
  const [dbPackagePresets, setDbPackagePresets] = useState<any[]>([]);
  const [dbAccommodations, setDbAccommodations] = useState<any[]>([]);

  const getLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getOverrideRate = (vid: string, p: any, fleet: any[] = []) => {
    const fleetVehicle = (fleet || []).find((v) => v.id === vid);
    if (!fleetVehicle) return p.default_amount;
    const dbV = dbVehicles.find((dv) => dv.model === fleetVehicle.model);
    const lookupId = dbV ? dbV.id : vid;
    return p.vehicle_overrides?.[lookupId] !== undefined ? p.vehicle_overrides[lookupId] : p.default_amount;
  };

  // ── Load agency presets ──
  useEffect(() => {
    const fetchAgencyData = async () => {
      if (!selectedOperatorId) return;
      const [presetsRes, vehiclesRes, miscRes, pkgRes, accomRes] = await Promise.all([
        supabase.from("itinerary_presets").select("*").eq("operator_id", selectedOperatorId).order("title"),
        supabase.from("vehicles").select("*").eq("operator_id", selectedOperatorId).eq("is_active", true).order("pax_capacity"),
        supabase.from("misc_presets").select("*").eq("operator_id", selectedOperatorId).order("name"),
        supabase.from("package_presets").select("*").eq("operator_id", selectedOperatorId).order("display_order"),
        supabase.from("guest_accommodation").select("*").eq("operator_id", selectedOperatorId).order("pax_count"),
      ]);
      if (presetsRes.data) setDbPresets(presetsRes.data);
      if (vehiclesRes.data) setDbVehicles(vehiclesRes.data);
      if (miscRes.data) setDbMiscPresets(miscRes.data);
      if (pkgRes.data) setDbPackagePresets(pkgRes.data);
      if (accomRes.data) setDbAccommodations(accomRes.data);
    };
    if (!authLoading && profile) fetchAgencyData();
  }, [selectedOperatorId, authLoading, profile]);

  // Seed package options for new quotes
  useEffect(() => {
    if (dbPackagePresets.length > 0 && livePackages.length === 0 && !quoteId && !copyFromId) {
      setLivePackages(dbPackagePresets);
    }
  }, [dbPackagePresets, quoteId, copyFromId, livePackages.length]);

  // Auto-select first vehicle for NEW quotes
  useEffect(() => {
    if (!quoteId && !copyFromId && isLoaded && dbVehicles.length > 0 && (!quote.fleet || quote.fleet.length === 0)) {
      const first = dbVehicles[0];
      setQuote((prev) => ({
        ...prev,
        vehicle_model: first.model,
        fleet: [{
          id: `v-${Date.now()}`,
          model: first.model,
          daily_rate: Number(first.default_rate) || Number(first.rate) || 0,
          km_per_l: Number(first.km_per_l) || 10,
          fuel_price: prev.default_fuel_price || 60,
        }],
      }));
    }
  }, [dbVehicles, quoteId, copyFromId, isLoaded, quote.fleet]);

  // ── Load existing quote (edit / duplicate) ──
  useEffect(() => {
    if (authLoading || !profile || !selectedOperatorId) return;

    // Only (re)load or reset when the target actually changes. Prevents wiping an
    // in-progress edit when unrelated deps (profile/operator) update.
    const target = quoteId || copyFromId || "__new__";
    if (loadedTarget.current === target) return;
    loadedTarget.current = target;

    // Fresh "New Quote" — reset ALL builder state so nothing leaks from a
    // previously-opened quote (fixes the stale "Reconfigure"/read-only carry-over).
    if (target === "__new__") {
      setQuote({
        customer_name: "", fb_name: "", contact_number: "", pax_count: 1,
        eta: "", etd: "", vehicle_model: "", pickup_location: "", dropoff_location: "",
        notes: "", default_fuel_price: 60, admin_commission: 0, status: "Draft",
        selected_package: null, selected_package_total: null, selected_package_details: null,
        confirmed_at: null, items: [], fleet: [], quotation_description: "",
      });
      setExtraFees([]);
      setDiscount(0);
      setLivePackages([]);
      setSelectedPackageId(null);
      setSelectedPackageName(null);
      setIsReconfiguring(false);
      setInitialQuotationText("");
      setPayments([]);
      setDisbursements([]);
      setStep(1);
      setMaxReached(1);
      hasHydrated.current = true;
      setIsLoaded(true);
      return;
    }

    const load = async () => {
      const targetId = quoteId || copyFromId;
      const { data: qData } = await supabase.from("quotes").select("*").eq("id", targetId).single();
      if (!qData) { hasHydrated.current = true; setIsLoaded(true); return; }
      const { data: itemsData } = await supabase.from("quote_items").select("*").eq("quote_id", targetId).order("day_number");

      const formattedEta = formatForInput(qData.eta);
      const formattedEtd = formatForInput(qData.etd);

      const rawItems: QuoteItem[] = (itemsData || []).map((item: any) => ({
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
        is_manual: true,
      }));

      let finalItems = rawItems;
      if (formattedEta && formattedEtd) {
        const start = new Date(formattedEta);
        const end = new Date(formattedEtd);
        if (end >= start) {
          const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          const days = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
          const reconciled: QuoteItem[] = [];
          for (let i = 0; i < days; i++) {
            const cur = new Date(start);
            cur.setDate(start.getDate() + i);
            const dateStr = getLocalDateStr(cur);
            const existing = rawItems.find((it) => Number(it.day_number) === i + 1);
            if (existing) {
              reconciled.push({ ...existing, date: dateStr, day_number: i + 1 });
            } else {
              const cv = dbVehicles.find((v) => v.model === qData.vehicle_model);
              reconciled.push({
                day_number: i + 1, date: dateStr, destination: "", itinerary_details: "",
                vehicle_rate: cv ? Number(cv.default_rate) || Number(cv.rate) || 0 : 0,
                km: 0, km_per_l: cv ? Number(cv.km_per_l) || 10 : 10,
                fuel_price: qData.default_fuel_price || 60, dynamic_costs: {}, tags: [],
                guest_accommodation_id: "", guest_accommodation_name: "", guest_accommodation_amount: 0, row_total: 0,
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
        eta: formattedEta, etd: formattedEtd,
        fleet: qData.fleet_json || [],
        quotation_description: qData.quotation_description || "",
        items: finalItems.map((it) => ({ ...it, row_total: calculateRowTotal(it, qData.admin_commission || 0, qData.fleet_json || []) })),
      });

      if (qData.extra_fees_json) setExtraFees(qData.extra_fees_json);
      if (qData.discount_total) setDiscount(qData.discount_total);
      if (qData.package_options_json) setLivePackages(qData.package_options_json);
      if (qData.selected_package) setSelectedPackageName(qData.selected_package);
      if (qData.selected_package_id) setSelectedPackageId(qData.selected_package_id);
      else if (qData.package_options_json) {
        const sel = qData.package_options_json.find((p: any) => p.is_selected === true);
        if (sel) setSelectedPackageId(sel.id);
      }
      setInitialQuotationText(copyFromId ? "" : (qData.quotation_text || ""));
      if (searchParams.get("edit") === "true") setIsReconfiguring(true);

      hasHydrated.current = true;
      setIsLoaded(true);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, copyFromId, selectedOperatorId, authLoading, profile]);

  // ── ETA change: auto-shift ETD + all item dates by the same day offset ──
  const handleEtaChange = (iso: string) => {
    if (!iso) { setQuote((prev) => ({ ...prev, eta: iso })); return; }
    if (!quote.etd || !quote.eta) { setQuote((prev) => ({ ...prev, eta: iso })); return; }
    const oldEta = new Date(quote.eta);
    const newEta = new Date(iso);
    const offsetMs = newEta.getTime() - oldEta.getTime();
    const offsetDays = Math.round(offsetMs / 86400000);
    if (offsetDays === 0) { setQuote((prev) => ({ ...prev, eta: iso })); return; }
    const newEtd = new Date(new Date(quote.etd).getTime() + offsetMs);
    const shiftedItems = quote.items.map((item) => {
      const d = new Date(item.date);
      d.setDate(d.getDate() + offsetDays);
      return { ...item, date: getLocalDateStr(d) };
    });
    setQuote((prev) => ({
      ...prev,
      eta: iso,
      etd: formatForInput(getLocalDateStr(newEtd) + "T" + newEtd.toTimeString().slice(0, 5)),
      items: shiftedItems,
    }));
  };

  const handleEtdChange = (iso: string) => setQuote((prev) => ({ ...prev, etd: iso }));

  // ── Day generation from ETA→ETD range ──
  useEffect(() => {
    if (!hasHydrated.current || ((quoteId || copyFromId) && !isLoaded)) return;
    if (quote.eta && quote.etd) {
      const start = new Date(quote.eta);
      const end = new Date(quote.etd);
      if (end >= start) {
        const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const days = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
        const cv = dbVehicles.find((v) => v.model === quote.vehicle_model);
        const defRate = cv ? Number(cv.default_rate) || Number(cv.rate) || 0 : 0;
        const defKmpl = cv ? Number(cv.km_per_l) || 10 : 10;
        const newItems: QuoteItem[] = [];
        for (let i = 0; i < days; i++) {
          const cur = new Date(start);
          cur.setDate(start.getDate() + i);
          const dateStr = getLocalDateStr(cur);
          const existing = quote.items.find((it) => Number(it.day_number) === i + 1);
          if (existing) newItems.push({ ...existing, day_number: i + 1, date: dateStr });
          else newItems.push({
            day_number: i + 1, date: dateStr, destination: "", itinerary_details: "", vehicle_rate: defRate,
            km: 0, km_per_l: defKmpl, fuel_price: quote.default_fuel_price, dynamic_costs: {}, tags: [],
            guest_accommodation_id: "", guest_accommodation_name: "", guest_accommodation_amount: 0, row_total: 0,
          });
        }
        if (JSON.stringify(quote.items) !== JSON.stringify(newItems)) setQuote((prev) => ({ ...prev, items: newItems }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.eta, quote.etd, quote.items.length, quoteId, copyFromId, isLoaded, quote.default_fuel_price, quote.vehicle_model, dbVehicles]);

  // ── Recompute guest-scaled misc fees when pax changes ──
  useEffect(() => {
    if (!isLoaded || dbMiscPresets.length === 0) return;
    setQuote((prev) => {
      let changed = false;
      const updatedItems = prev.items.map((item) => {
        const dCosts = { ...item.dynamic_costs };
        let itemChanged = false;
        dbMiscPresets.forEach((p) => {
          if (item.tags.includes(p.name) && p.multiply_by_guest) {
            const pax = Number(prev.pax_count) || 1;
            let base = 0;
            if (p.multiply_by_vehicle) {
              const ids = item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0 ? item.selected_vehicle_ids : (prev.fleet?.map((v) => v.id) || []);
              ids.forEach((vid) => { base += getOverrideRate(vid, p, prev.fleet || []); });
            } else base = p.default_amount;
            const newCost = base * pax;
            if (dCosts[p.id] !== newCost) { dCosts[p.id] = newCost; itemChanged = true; }
          }
        });
        if (itemChanged) {
          changed = true;
          const u = { ...item, dynamic_costs: dCosts };
          return { ...u, row_total: calculateRowTotal(u, prev.admin_commission || 0, prev.fleet) };
        }
        return item;
      });
      return changed ? { ...prev, items: updatedItems } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.pax_count, dbMiscPresets, dbVehicles, isLoaded]);

  // ── Totals ──
  const totals = useMemo(() => {
    const packagesToCompute = livePackages.length > 0 ? livePackages : [{ name: "Total Amount", includes_vehicle: true, includes_fuel: true, includes_accommodation: true, includes_misc_ids: dbMiscPresets.map((p) => p.id) }];
    const packageTotals = packagesToCompute.map((pkg) => {
      let baseSum = 0, totalSum = 0;
      const commission = quote.admin_commission || 0;
      quote.items.forEach((item) => {
        let rowBase = 0;
        if (pkg.includes_vehicle) {
          const activeFleet = (quote.fleet && quote.fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)
            ? quote.fleet.filter((v) => item.selected_vehicle_ids!.includes(v.id)) : quote.fleet;
          const fleetRate = (activeFleet && activeFleet.length > 0) ? activeFleet.reduce((a, v: any) => a + (v.daily_rate || 0), 0) : (item.vehicle_rate || 0);
          rowBase += fleetRate;
        }
        if (pkg.includes_fuel) rowBase += calculateFuelCost(item, quote.fleet);
        if (pkg.includes_accommodation) rowBase += (item.guest_accommodation_amount || 0);
        (pkg.includes_misc_ids || []).forEach((mId: string) => { rowBase += (item.dynamic_costs[mId] || 0); });
        baseSum += rowBase;
        totalSum += rowBase * (1 + commission / 100);
      });
      return { name: pkg.name || pkg.title || "Untitled Package", total: totalSum, commissionAmount: totalSum - baseSum, is_recommended: pkg.is_recommended, id: pkg.id, config: pkg };
    });

    const rowTotals = quote.items.map((item) => calculateRowTotal(item, quote.admin_commission, quote.fleet));
    const matrixSum = rowTotals.reduce((a, b) => a + b, 0);
    const adjustments = extraFees.reduce((a, b) => a + (b.amount || 0), 0) - (discount || 0);
    const selectedPkg = packageTotals.find((p) => p.id === selectedPackageId);
    const selectedPkgPrice = selectedPkg ? selectedPkg.total : matrixSum;

    const colTotals = quote.items.reduce((acc, item) => {
      const fuel = calculateFuelCost(item, quote.fleet);
      const activeFleet = (quote.fleet && quote.fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)
        ? quote.fleet.filter((v) => item.selected_vehicle_ids!.includes(v.id)) : quote.fleet;
      const curRate = (activeFleet && activeFleet.length > 0) ? activeFleet.reduce((a, v: any) => a + (v.daily_rate || 0), 0) : (item.vehicle_rate || 0);
      acc.rate += curRate; acc.km += item.km; acc.fuel += fuel; acc.accom += (item.guest_accommodation_amount || 0);
      acc.grand += calculateRowTotal(item, quote.admin_commission, quote.fleet);
      dbMiscPresets.forEach((p) => { acc.misc[p.id] = (acc.misc[p.id] || 0) + (item.dynamic_costs[p.id] || 0); });
      return acc;
    }, { rate: 0, km: 0, fuel: 0, accom: 0, grand: 0, misc: {} as Record<string, number> });

    return { packages: packageTotals, grandTotal: selectedPkgPrice + adjustments, selectedPkgPrice, totalExtraFees: extraFees.reduce((a, b) => a + (b.amount || 0), 0), colTotals, rowTotals };
  }, [quote.items, quote.fleet, extraFees, discount, livePackages, dbMiscPresets, selectedPackageId, quote.admin_commission]);

  // ── Handlers ──
  const setField = (key: keyof QuoteData, value: any) => setQuote((prev) => ({ ...prev, [key]: value }));

  const handleUpdateCommission = (v: number) => {
    setQuote((prev) => ({ ...prev, admin_commission: v, items: prev.items.map((item) => ({ ...item, row_total: calculateRowTotal(item, v, prev.fleet) })) }));
  };

  const handleUpdateFleet = (newFleet: QuoteVehicle[]) => {
    setQuote((prev) => {
      const addedVehicles = (newFleet || []).filter((nv) => !(prev.fleet || []).some((pv) => pv.id === nv.id));
      const fleetTotalRate = (newFleet || []).reduce((a, v) => a + (v.daily_rate || 0), 0);
      const updatedItems = prev.items.map((item) => {
        const validSelected = (item.selected_vehicle_ids || []).filter((id) => newFleet.some((nv) => nv.id === id));
        const updated: QuoteItem = { ...item, vehicle_rate: fleetTotalRate, selected_vehicle_ids: item.selected_vehicle_ids ? validSelected : undefined };
        const dCosts = { ...item.dynamic_costs };
        const activeIds = validSelected.length > 0 ? validSelected : newFleet.map((v) => v.id);
        dbMiscPresets.forEach((p) => {
          if (item.tags.includes(p.name)) {
            let cost = 0;
            if (p.multiply_by_vehicle) { activeIds.forEach((vid) => { cost += getOverrideRate(vid, p, newFleet); }); }
            else cost = p.default_amount;
            if (p.multiply_by_guest) cost = cost * (Number(prev.pax_count) || 1);
            if (p.multiply_by_vehicle || p.multiply_by_guest) dCosts[p.id] = cost;
          }
        });
        updated.dynamic_costs = dCosts;
        // When a vehicle is added to an item with a customized selection, auto-include it
        // and recompute vehicle-scaled fees for the new active set (matches desktop).
        if (addedVehicles.length > 0 && item.selected_vehicle_ids) {
          updated.selected_vehicle_ids = [...validSelected, ...addedVehicles.map((v) => v.id)];
          const newActiveIds = updated.selected_vehicle_ids;
          dbMiscPresets.forEach((p) => {
            if (item.tags.includes(p.name)) {
              let cost = 0;
              if (p.multiply_by_vehicle) { newActiveIds.forEach((vid) => { cost += getOverrideRate(vid, p, newFleet); }); }
              else cost = p.default_amount;
              if (p.multiply_by_guest) cost = cost * (Number(prev.pax_count) || 1);
              if (p.multiply_by_vehicle || p.multiply_by_guest) dCosts[p.id] = cost;
            }
          });
          updated.dynamic_costs = dCosts;
        }
        return { ...updated, row_total: calculateRowTotal(updated, prev.admin_commission, newFleet) };
      });
      const vehicleModel = newFleet && newFleet.length > 0 ? newFleet[0].model : prev.vehicle_model;
      return { ...prev, fleet: newFleet, vehicle_model: vehicleModel, items: updatedItems };
    });
  };

  const handleUpdateItem = (index: number, updates: Partial<QuoteItem>, manual = false) => {
    setQuote((prev) => {
      const newItems = [...prev.items];
      if (!newItems[index]) return prev;
      const updated: QuoteItem = { ...newItems[index], ...updates };
      if (manual) updated.is_manual = true;
      if (updates.tags || updates.selected_vehicle_ids !== undefined) {
        const dCosts = { ...updated.dynamic_costs };
        const activeIds = updated.selected_vehicle_ids && updated.selected_vehicle_ids.length > 0
          ? updated.selected_vehicle_ids : (prev.fleet?.map((v) => v.id) || []);
        const oldTags = prev.items[index].tags || [];
        dbMiscPresets.forEach((p) => {
          const isActive = updates.tags ? (updated.tags || []).includes(p.name) : oldTags.includes(p.name);
          const wasActive = oldTags.includes(p.name);
          if (updates.tags) {
            if (isActive && !wasActive) {
              let cost = 0;
              if (p.multiply_by_vehicle) activeIds.forEach((vid) => { cost += getOverrideRate(vid, p, prev.fleet || []); });
              else cost = p.default_amount;
              if (p.multiply_by_guest) cost = cost * (Number(prev.pax_count) || 1);
              dCosts[p.id] = cost;
            } else if (!isActive && wasActive) {
              dCosts[p.id] = 0;
            }
          } else if (updates.selected_vehicle_ids !== undefined && isActive) {
            if (p.multiply_by_vehicle) {
              let cost = 0;
              activeIds.forEach((vid) => { cost += getOverrideRate(vid, p, prev.fleet || []); });
              if (p.multiply_by_guest) cost = cost * (Number(prev.pax_count) || 1);
              dCosts[p.id] = cost;
            }
          }
        });
        updated.dynamic_costs = dCosts;
      }
      updated.row_total = calculateRowTotal(updated, prev.admin_commission || 0, prev.fleet);
      newItems[index] = updated;
      return { ...prev, items: newItems };
    });
  };

  const handleApplyPreset = (index: number, pId: string) => {
    if (pId === "") {
      handleUpdateItem(index, { destination: "", applied_preset_id: "", is_manual: true, itinerary_details: "", km: 0, tags: [] });
      return;
    }
    const p = dbPresets.find((pr) => pr.id === pId);
    if (!p) {
      handleUpdateItem(index, { destination: pId, applied_preset_id: "", is_manual: true, itinerary_details: "", km: 0, tags: [] });
      return;
    }
    handleUpdateItem(index, { destination: p.title, itinerary_details: p.details || "", km: p.default_km || 0, applied_preset_id: pId, tags: parseTags(p.tags), is_manual: false });
  };

  const handleAddDay = () => {
    setQuote((prev) => {
      const lastItem = prev.items[prev.items.length - 1];
      const newDate = new Date(lastItem ? lastItem.date : (prev.eta || new Date()));
      if (lastItem) newDate.setDate(newDate.getDate() + 1);
      const fleetTotalRate = (prev.fleet || []).reduce((a, v) => a + (v.daily_rate || 0), 0);
      const newItem: QuoteItem = {
        day_number: prev.items.length + 1, date: getLocalDateStr(newDate), destination: "",
        vehicle_rate: fleetTotalRate, km: 0, km_per_l: prev.fleet?.[0]?.km_per_l || 10,
        fuel_price: prev.fleet?.[0]?.fuel_price || prev.default_fuel_price || 60,
        dynamic_costs: {}, tags: [], itinerary_details: "",
        guest_accommodation_id: "", guest_accommodation_name: "", guest_accommodation_amount: 0, row_total: 0,
      };
      newItem.row_total = calculateRowTotal(newItem, prev.admin_commission || 0, prev.fleet);
      return {
        ...prev,
        items: [...prev.items, newItem],
        etd: getLocalDateStr(newDate) + (prev.etd && prev.etd.includes("T") ? "T" + prev.etd.split("T")[1] : "T12:00"),
      };
    });
  };

  const handleRemoveLastDay = () => {
    setQuote((prev) => {
      if (prev.items.length <= 1) return prev;
      const nextItems = prev.items.slice(0, -1);
      const lastItem = nextItems[nextItems.length - 1];
      let nextEtd = prev.etd;
      if (lastItem) nextEtd = getLocalDateStr(new Date(lastItem.date)) + (prev.etd && prev.etd.includes("T") ? "T" + prev.etd.split("T")[1] : "T12:00");
      return { ...prev, items: nextItems, etd: nextEtd };
    });
  };

  // ── Package & adjustment handlers ──
  const handleUpdatePackageOption = (idx: number, updates: any) => {
    setLivePackages((prev) => {
      const next = [...prev];
      const target = next[idx];
      const updated = { ...target, ...updates };
      next[idx] = updated;
      if (selectedPackageId === updated.id && updates.name && updates.name !== target.name) setSelectedPackageName(updates.name);
      return next;
    });
  };
  const handleToggleMiscInclusion = (pkgIndex: number, miscId: string) => {
    setLivePackages((prev) => {
      const next = [...prev];
      const pkg = { ...next[pkgIndex] };
      const cur = pkg.includes_misc_ids || [];
      pkg.includes_misc_ids = cur.includes(miscId) ? cur.filter((id: string) => id !== miscId) : [...cur, miscId];
      next[pkgIndex] = pkg;
      return next;
    });
  };
  const handleAddCustomPackage = () => {
    const newPkg = { id: `custom-${Math.random().toString(36).substr(2, 9)}`, name: `Custom Option ${livePackages.length + 1}`, includes_vehicle: true, includes_fuel: true, includes_accommodation: true, includes_misc_ids: [], is_recommended: false, is_custom: true };
    setLivePackages((prev) => [...prev, newPkg]);
    setSelectedPackageId(newPkg.id);
    setSelectedPackageName(newPkg.name);
  };
  const handleRemovePackage = (idx: number) => {
    if (livePackages.length <= 1) return;
    if (selectedPackageId === livePackages[idx].id) { setSelectedPackageId(null); setSelectedPackageName(""); }
    setLivePackages((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleSelectPackage = (name: string, id: string) => { setSelectedPackageName(name); setSelectedPackageId(id); };
  const handleAddFee = (name: string, amount: number) => {
    setExtraFees((prev) => [...prev, { id: `fee-${Math.random().toString(36).substr(2, 9)}`, name, amount }]);
  };
  const handleRemoveFee = (id: string) => setExtraFees((prev) => prev.filter((f) => f.id !== id));

  // ── Ledgers (confirmed quotes) ──
  const fetchPayments = async () => {
    if (!quote.id) return;
    const { data } = await supabase.from("payments").select("*, creator:created_by(full_name), modifier:updated_by(full_name)").eq("quote_id", quote.id).order("created_at", { ascending: false });
    setPayments(data || []);
  };
  const fetchDisbursements = async () => {
    if (!quote.id) return;
    const { data } = await supabase.from("disbursements").select("*, creator:created_by(full_name), modifier:updated_by(full_name)").eq("quote_id", quote.id).order("created_at", { ascending: false });
    setDisbursements(data || []);
  };
  useEffect(() => {
    if (quote.id) { fetchPayments(); fetchDisbursements(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  // ── Quotation text compiler (ported from desktop) ──
  const compileQuotationText = () => {
    const items = quote.items;
    const tourSummary = quote.quotation_description || items.map((i) => i.destination).filter(Boolean).join(" + ");
    const durationCount = items.length;
    const duration = durationCount > 0 ? `${durationCount}D${durationCount - 1}N` : "N/A";
    const fmtDT = (iso?: string) => {
      if (!iso) return "TBA";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "TBA";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " @ " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };
    const fmtTime = (iso: string | undefined, fallback: string) => {
      if (!iso) return fallback;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return fallback;
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    let text = `Hi ${quote.customer_name || "Guest"},\n\nHere’s our estimated cost for ${duration} | ${quote.pax_count} pax | ${tourSummary}\n\n`;
    text += `📅 Travel Schedule: ${fmtDT(quote.eta)} – ${fmtDT(quote.etd)}\n\n`;

    if (includeItinerary && items.length > 0) {
      text += `--- ITINERARY ---\n\n`;
      items.forEach((item, idx) => {
        const d = new Date(item.date);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const isFirst = idx === 0;
        const isLast = idx === items.length - 1;
        const timeNote = isFirst ? ` (Pickup / Start: ${fmtTime(quote.eta, "08:00 AM")})` : isLast ? ` (Drop-off / End: ${fmtTime(quote.etd, "05:00 PM")})` : "";
        text += `Day ${idx + 1} (${dateStr})${timeNote}: ${item.destination || "TBA"}\n`;
        if (item.itinerary_details) item.itinerary_details.split("\n").filter(Boolean).forEach((ln) => (text += `• ${ln.replace(/^•\s*/, "")}\n`));
        text += `\n`;
      });
    }

    text += `--- PACKAGE OPTIONS ---\n\n`;
    const sorted = [...totals.packages].sort((a, b) => {
      if (selectedPackageId) {
        if (a.id === selectedPackageId) return -1;
        if (b.id === selectedPackageId) return 1;
        return b.total - a.total;
      }
      return a.total - b.total;
    });
    sorted.forEach((pkg: any, idx: number) => {
      const isSel = pkg.id === selectedPackageId;
      text += `${isSel ? "⭐ RECOMMENDED" : `Option ${idx + 1}`}: ${pkg.name}${isSel ? " ✅" : ""}\n💰 ₱${pkg.total.toLocaleString()} total\n👥 ₱${Math.round(pkg.total / (quote.pax_count || 1)).toLocaleString()}/pax\n\n`;
      const incs: string[] = [];
      const excs: string[] = [];
      if (pkg.config.includes_vehicle) {
        if (quote.fleet && quote.fleet.length > 0) {
          const parts = quote.fleet.map((v: any) => {
            const activeDays = items.filter((item) => !item.selected_vehicle_ids || item.selected_vehicle_ids.length === 0 || item.selected_vehicle_ids.includes(v.id)).map((item) => item.day_number);
            if (activeDays.length === items.length) return `${v.model} (All Days)`;
            if (activeDays.length === 0) return null;
            return `${v.model} (Day ${activeDays.join(", ")})`;
          }).filter(Boolean);
          if (parts.length > 0) incs.push(`Vehicles: ${parts.join(", ")}`);
        } else incs.push(`Vehicle: ${quote.vehicle_model}`);
      } else excs.push(`Vehicle Rental`);
      if (pkg.config.includes_fuel && totals.colTotals.fuel > 0) incs.push(`Fuel Consumption`);
      else excs.push(`Fuel Consumption`);
      if (pkg.config.includes_accommodation && totals.colTotals.accom > 0) {
        const names = items.map((i) => i.guest_accommodation_name).filter(Boolean);
        const uniq = Array.from(new Set(names));
        incs.push(uniq.length > 0 ? `Guest Accommodation (${uniq.join(", ")})` : "Guest Accommodation");
      } else excs.push(`Guest Accommodation`);
      let driverInc = false, driverExc = false;
      dbMiscPresets.forEach((m) => {
        if (m.hide_in_quote) return;
        const name = m.name.toLowerCase();
        if (name.includes("car wash") || name.includes("parking") || name.includes("overtime") || name === "ot" || name.split(" ").includes("ot")) return;
        const isIncluded = (pkg.config.includes_misc_ids || []).includes(m.id);
        const amt = totals.colTotals.misc[m.id] || 0;
        if (name.includes("driver")) { if (isIncluded && amt > 0) driverInc = true; else driverExc = true; return; }
        if (isIncluded && amt > 0) incs.push(m.name);
        else excs.push(m.name);
      });
      if (driverInc) incs.push("Driver");
      else if (driverExc) excs.push("Driver");
      excs.push("Guest meals", "Entrance fees", "Activity fees", "Any other items not included in the inclusions");
      text += `✔ INCLUSIONS:\n`;
      incs.forEach((inc) => (text += `• ${inc}\n`));
      if (excs.length > 0) { text += `\n❌ EXCLUSIONS:\n`; excs.forEach((exc) => (text += `• ${exc}\n`)); }
      text += `\n`;
    });

    if (extraFees.length > 0 || discount > 0) {
      text += `--- ADJUSTMENTS ---\n\n`;
      extraFees.forEach((f) => (text += `• ${f.name}: + ₱${f.amount.toLocaleString()}\n`));
      if (discount > 0) text += `• DISCOUNT: - ₱${discount.toLocaleString()}\n`;
      text += `\n`;
    }
    const agencyNotes = profile?.operators?.quotation_agency_notes;
    if (agencyNotes) text += `--- ADDITIONAL NOTES ---\n\n${agencyNotes}\n\n`;
    return text;
  };

  // ── Save (ported finalizeSave) ──
  const finalizeSave = async (customStatus?: string, shouldNavigate = true, overrideText?: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const scrub = (val: any, visited = new WeakSet()): any => {
        if (val === null || typeof val !== "object") return val;
        if (visited.has(val)) return undefined;
        if (typeof window !== "undefined" && (val instanceof Node || val instanceof Window)) return undefined;
        if (val.$$typeof || (val.constructor && val.constructor.name === "FiberNode")) return undefined;
        visited.add(val);
        if (Array.isArray(val)) return val.map((v) => scrub(v, visited)).filter((v) => v !== undefined);
        const cleaned: any = {};
        for (const key in val) {
          if (key.startsWith("__react") || key.startsWith("react")) continue;
          try { const r = scrub(val[key], visited); if (r !== undefined) cleaned[key] = r; } catch { continue; }
        }
        return cleaned;
      };

      let finalStatus = customStatus || quote.status || "Draft";
      const isAlreadyPaid = ["Payment Started", "Payment Complete"].includes(quote.status || "");
      if (isAlreadyPaid) {
        const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
        finalStatus = totalPaid < totals.grandTotal ? (totalPaid > 0 ? "Payment Started" : "Confirmed") : "Payment Complete";
      }

      const payload: any = {
        operator_id: selectedOperatorId,
        customer_name: quote.customer_name, fb_name: quote.fb_name, contact_number: quote.contact_number,
        pax_count: quote.pax_count,
        eta: quote.eta ? new Date(quote.eta).toISOString() : null,
        etd: quote.etd ? new Date(quote.etd).toISOString() : null,
        vehicle_model: quote.fleet && quote.fleet.length > 0 ? (quote.fleet.length === 1 ? quote.fleet[0].model : `${quote.fleet[0].model} + ${quote.fleet.length - 1} other${quote.fleet.length > 2 ? "s" : ""}`) : quote.vehicle_model,
        pickup_location: quote.pickup_location, dropoff_location: quote.dropoff_location, notes: quote.notes,
        default_fuel_price: quote.fleet && quote.fleet.length > 0 ? quote.fleet[0].fuel_price : quote.default_fuel_price,
        fleet_json: quote.fleet || [], grand_total: totals.grandTotal,
        extra_fees_json: extraFees, extra_fees_total: totals.totalExtraFees, discount_total: discount,
        status: finalStatus, admin_commission: quote.admin_commission, quotation_description: quote.quotation_description,
        selected_package: selectedPackageName, selected_package_id: selectedPackageId?.startsWith("custom-") ? null : selectedPackageId,
        package_options_json: livePackages.map((pkg) => ({ ...pkg, is_selected: pkg.id === selectedPackageId })),
        updated_by: profile?.id, updated_at: new Date().toISOString(),
      };
      if (overrideText) payload.quotation_text = overrideText;
      if (!quote.id) payload.created_by = profile?.id;

      const isConfirmedFlow = ["Confirmed", "Payment Started", "Payment Complete"].includes(finalStatus);
      if ((customStatus === "Confirmed" || isConfirmedFlow) && selectedPackageId) {
        payload.confirmed_at = quote.confirmed_at || new Date().toISOString();
        const selPkg = totals.packages.find((p) => p.id === selectedPackageId);
        if (selPkg) {
          payload.selected_package_total = totals.selectedPkgPrice;
          payload.selected_package_details = {
            package_name: selPkg.name, total_amount: totals.grandTotal, pax_count: quote.pax_count, per_pax: Math.round(totals.grandTotal / (quote.pax_count || 1)),
            inclusions: { vehicle: selPkg.config.includes_vehicle, fuel: selPkg.config.includes_fuel, accommodation: selPkg.config.includes_accommodation, misc_details: (selPkg.config.includes_misc_ids || []).map((id: string) => ({ name: dbMiscPresets.find((m) => m.id === id)?.name || "Misc", amount: 0 })) },
            adjustments: { extra_fees: extraFees, discount },
            itinerary_snapshot: quote.items.map((i) => {
              const ids = i.selected_vehicle_ids && i.selected_vehicle_ids.length > 0 ? i.selected_vehicle_ids : (quote.fleet || []).map((v) => v.id);
              const vehicles = (quote.fleet || []).filter((v) => ids.includes(v.id)).map((v) => v.model).join(", ");
              return { day: i.day_number, date: i.date, destination: i.destination, details: i.itinerary_details, vehicles, guest_accommodation_name: i.guest_accommodation_name, tags: i.tags };
            }),
          };
        }
      }

      const cleanPayload = scrub(payload);
      let cId = quote.id;
      if (cId) {
        const { error } = await supabase.from("quotes").update(cleanPayload).eq("id", cId);
        if (error) throw new Error(error.message);
        await supabase.from("quote_items").delete().eq("quote_id", cId);
      } else {
        const { data, error } = await supabase.from("quotes").insert([cleanPayload]).select().single();
        if (error) throw new Error(error.message);
        cId = data.id;
      }
      const rawItems = quote.items.map((i) => {
        const { id, is_manual, ...rest } = i as any;
        return { ...rest, quote_id: cId, tags: i.tags.join(", "), guest_accommodation_id: i.guest_accommodation_id || null, applied_preset_id: i.applied_preset_id || null };
      });
      const { error: itemsErr } = await supabase.from("quote_items").insert(scrub(rawItems));
      if (itemsErr) throw new Error(itemsErr.message);

      if (!quoteId && cId && typeof window !== "undefined") window.history.replaceState(null, "", `/m/builder?id=${cId}`);

      // Preserve datetime-local display format for eta/etd (cleanPayload has ISO strings)
      setQuote((prev) => ({ ...prev, ...cleanPayload, eta: prev.eta, etd: prev.etd, status: finalStatus, id: cId }));
      if (overrideText) setInitialQuotationText(overrideText);
      if (customStatus === "Confirmed" || finalStatus === "Confirmed") setIsReconfiguring(false);

      if (shouldNavigate) router.push("/m/dashboard");
      return true;
    } catch (e: any) {
      alert(e.message || "Failed to save. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePolish = async (text: string) => {
    return await polishQuotation(text);
  };

  // Use the saved agreed total (matches the command-center display) so the status
  // threshold and the "Fully Paid" badge are always computed against the same number.
  const totalAgreedFor = () => quote.selected_package_details?.total_amount || quote.grand_total || 0;

  const handleAddPayment = async (data: any, editing: any | null) => {
    if (!quote.id) return;
    if (editing) {
      await supabase.from("payments").update({ amount: parseFloat(data.amount), payment_method: data.method || "Cash", reference_number: data.reference, notes: data.notes, actual_date: data.actual_date, updated_by: profile?.id, updated_at: new Date().toISOString() }).eq("id", editing.id);
    } else {
      await supabase.from("payments").insert([{ quote_id: quote.id, amount: parseFloat(data.amount), payment_method: data.method || "Cash", reference_number: data.reference, notes: data.notes, actual_date: data.actual_date, created_by: profile?.id }]);
    }
    const { data: remaining } = await supabase.from("payments").select("amount").eq("quote_id", quote.id);
    const totalPaid = (remaining || []).reduce((s, p) => s + (p.amount || 0), 0);
    const nextStatus = totalPaid >= totalAgreedFor() ? "Payment Complete" : "Payment Started";
    await supabase.from("quotes").update({ status: nextStatus }).eq("id", quote.id);
    setQuote((prev) => ({ ...prev, status: nextStatus }));
    await fetchPayments();
  };
  const handleVoidPayment = async (id: string) => {
    await supabase.from("payments").delete().eq("id", id);
    const { data: remaining } = await supabase.from("payments").select("amount").eq("quote_id", quote.id);
    const totalAfter = (remaining || []).reduce((s, p) => s + (p.amount || 0), 0);
    let nextStatus = "Confirmed";
    if (totalAfter >= totalAgreedFor() && totalAgreedFor() > 0) nextStatus = "Payment Complete";
    else if (totalAfter > 0) nextStatus = "Payment Started";
    await supabase.from("quotes").update({ status: nextStatus }).eq("id", quote.id);
    setQuote((prev) => ({ ...prev, status: nextStatus }));
    await fetchPayments();
  };
  const handleAddDisbursement = async (data: any, editing: any | null) => {
    if (!quote.id) return;
    if (editing) {
      await supabase.from("disbursements").update({ amount: parseFloat(data.amount), reference_number: data.reference, notes: data.notes, actual_date: data.actual_date, updated_by: profile?.id, updated_at: new Date().toISOString() }).eq("id", editing.id);
    } else {
      await supabase.from("disbursements").insert([{ quote_id: quote.id, amount: parseFloat(data.amount), reference_number: data.reference, notes: data.notes, actual_date: data.actual_date, created_by: profile?.id }]);
    }
    await fetchDisbursements();
  };
  const handleVoidDisbursement = async (id: string) => {
    await supabase.from("disbursements").delete().eq("id", id);
    await fetchDisbursements();
  };

  // ── Step navigation ──
  const goToStep = (s: number) => {
    setStep(s);
    setMaxReached((m) => Math.max(m, s));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => step < 4 && goToStep(step + 1);
  const back = () => (step > 1 ? goToStep(step - 1) : router.push("/m/dashboard"));

  if (authLoading || !isLoaded) return <CenterLoader />;

  // Read-only lock: Cancelled/Lost quotes, or confirmed quotes not being reconfigured
  const isDead = ["Cancelled", "Lost"].includes(quote.status || "");
  const isConfirmedQuote = ["Confirmed", "Payment Started", "Payment Complete"].includes(quote.status || "") && !!quote.id;
  const readOnly = isDead || (isConfirmedQuote && !isReconfiguring);
  // Step 4 renders its own command center for confirmed quotes; only steps 1-3 (and dead-quote review) need the lock banner
  const showLockBanner = readOnly && !(isConfirmedQuote && step === 4);

  return (
    <div style={{ paddingBottom: 96 }}>
      <MobileStepIndicator current={step} maxReached={maxReached} onJump={goToStep} />

      {showLockBanner && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: isDead ? "#FFF1F2" : "#FFFBEB", border: `1px solid ${isDead ? "rgba(225,29,72,0.15)" : "rgba(217,119,6,0.15)"}`, borderRadius: 12, marginBottom: 14 }}>
          <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: isDead ? "#E11D48" : "#D97706", flex: 1 }}>
            {isDead ? `This quote is ${quote.status} — view only.` : "Confirmed quote — view only. Reconfigure to edit."}
          </span>
          {isConfirmedQuote && (
            <button onClick={() => setIsReconfiguring(true)} style={{ padding: "6px 12px", borderRadius: 9, border: "none", background: "#003829", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Reconfigure
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <MobileTripForm
          quote={quote}
          dbVehicles={dbVehicles}
          quoteTitlePresets={profile?.operators?.quote_title_presets || []}
          readOnly={readOnly}
          setField={setField}
          onEtaChange={handleEtaChange}
          onEtdChange={handleEtdChange}
          onUpdateCommission={handleUpdateCommission}
          onUpdateFleet={handleUpdateFleet}
        />
      )}

      {step === 2 && (
        <MobileDayCards
          quote={quote}
          dbPresets={dbPresets}
          dbAccommodations={dbAccommodations}
          dbMiscPresets={dbMiscPresets}
          livePackages={livePackages}
          colTotals={totals.colTotals}
          readOnly={readOnly}
          onUpdateItem={handleUpdateItem}
          onApplyPreset={handleApplyPreset}
          onAddDay={handleAddDay}
          onRemoveLastDay={handleRemoveLastDay}
        />
      )}
      {step === 3 && (
        <MobilePackages
          quote={quote}
          livePackages={livePackages.length > 0 ? livePackages : dbPackagePresets}
          packagesComputed={totals.packages}
          dbMiscPresets={dbMiscPresets}
          selectedPackageId={selectedPackageId}
          extraFees={extraFees}
          grandTotal={totals.grandTotal}
          readOnly={readOnly}
          onSelectPackage={handleSelectPackage}
          onUpdatePackage={handleUpdatePackageOption}
          onToggleMisc={handleToggleMiscInclusion}
          onAddPackage={handleAddCustomPackage}
          onRemovePackage={handleRemovePackage}
          onAddFee={handleAddFee}
          onRemoveFee={handleRemoveFee}
          onUpdateNotes={(v) => setField("notes", v)}
        />
      )}
      {step === 4 && (
        <MobileReview
          quote={quote}
          role={profile?.role}
          totals={totals}
          payments={payments}
          disbursements={disbursements}
          extraFees={extraFees}
          discount={discount}
          selectedPackageId={selectedPackageId}
          includeItinerary={includeItinerary}
          setIncludeItinerary={setIncludeItinerary}
          isSaving={isSaving}
          isReconfiguring={isReconfiguring}
          readOnly={readOnly}
          compileText={compileQuotationText}
          onPolish={handlePolish}
          onSaveDraft={(text) => finalizeSave(quote.status || "Draft", true, text)}
          onConfirm={(text) => finalizeSave("Confirmed", false, text)}
          onReconfigure={() => setIsReconfiguring(true)}
          onAddPayment={handleAddPayment}
          onVoidPayment={handleVoidPayment}
          onAddDisbursement={handleAddDisbursement}
          onVoidDisbursement={handleVoidDisbursement}
        />
      )}

      {/* ── Sticky footer: live total + nav ── */}
      <div
        style={{
          position: "fixed",
          left: 0, right: 0,
          bottom: 0,
          background: "#ffffff",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          padding: "10px 16px",
          paddingBottom: "calc(10px + var(--mobile-safe-bottom, 0px))",
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 150,
        }}
      >
        <button onClick={back} style={navBtnSecondary} aria-label="Back">
          <ArrowLeft size={16} /> {step === 1 ? "Exit" : "Back"}
        </button>
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Grand Total</div>
          <div style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            P{Math.round(totals.grandTotal).toLocaleString()}
          </div>
        </div>
        {step < 4 && (
          <button onClick={next} style={navBtnPrimary} aria-label="Next">
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

const navBtnSecondary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 4, padding: "11px 14px", borderRadius: 12,
  border: "1.5px solid rgba(0,0,0,0.08)", background: "#ffffff", color: "#475569",
  fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  WebkitTapHighlightColor: "transparent",
};

const navBtnPrimary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 4, padding: "11px 18px", borderRadius: 12,
  border: "none", background: "#003829", color: "#ffffff",
  fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  WebkitTapHighlightColor: "transparent",
};
