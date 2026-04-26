import { QuoteItem, QuoteVehicle } from "./types";

export const calculateFuelCost = (item: QuoteItem, fleet?: QuoteVehicle[]) => {
  if (item.fuel_cost_manual !== undefined && item.fuel_cost_manual !== null) return item.fuel_cost_manual;
  if (!item.km || item.km <= 0) return 0;

  // Multi-vehicle logic: Sum fuel cost for each vehicle in fleet
  if (fleet && fleet.length > 0) {
    return fleet.reduce((acc, v) => {
      const kmpl = v.km_per_l || 10;
      const price = v.fuel_price || 60;
      return acc + (item.km / kmpl) * price;
    }, 0);
  }

  // Legacy fallback for single vehicle
  if (!item.km_per_l || item.km_per_l <= 0) return 0;
  return (item.km / item.km_per_l) * (item.fuel_price || 0);
};

export const calculateRowTotal = (item: QuoteItem, adminCommission: number, fleet?: QuoteVehicle[]) => {
  const fuel = calculateFuelCost(item, fleet);
  const dynamicTotal = Object.values(item.dynamic_costs || {}).reduce((a: number, b: any) => a + (b || 0), 0);
  const accomAmount = item.guest_accommodation_amount || 0;
  
  // Use fleet total rate if available, otherwise use item level rate
  const rate = (fleet && fleet.length > 0) 
    ? fleet.reduce((acc, v) => acc + (v.daily_rate || 0), 0)
    : (item.vehicle_rate || 0);

  const baseTotal = rate + fuel + accomAmount + dynamicTotal;
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
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  } catch (e) {
    return "";
  }
};
