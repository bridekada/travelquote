import { QuoteItem, QuoteData } from "./types";

export const calculateFuelCost = (item: QuoteItem) => {
  if (item.fuel_cost_manual !== undefined && item.fuel_cost_manual !== null) return item.fuel_cost_manual;
  if (!item.km || !item.km_per_l || item.km_per_l <= 0) return 0;
  return (item.km / item.km_per_l) * (item.fuel_price || 0);
};

export const calculateRowTotal = (item: QuoteItem, adminCommission: number) => {
  const fuel = calculateFuelCost(item);
  const dynamicTotal = Object.values(item.dynamic_costs || {}).reduce((a: number, b: any) => a + (b || 0), 0);
  const accomAmount = item.guest_accommodation_amount || 0;
  const baseTotal = item.vehicle_rate + fuel + accomAmount + dynamicTotal;
  return baseTotal * (1 + (adminCommission || 0) / 100);
};

export const parseTags = (tagStr: string | null) => {
  if (!tagStr) return [];
  return tagStr.split(',').map(t => t.trim()).filter(Boolean);
};

export const formatForInput = (dateStr: string | null) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    // Use local timezone offset to prevent day-jumps
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  } catch (e) {
    return "";
  }
};

