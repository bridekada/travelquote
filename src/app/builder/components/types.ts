export interface ExtraFee {
  id: string;
  name: string;
  amount: number;
}

export interface QuoteVehicle {
  id: string;
  model: string;
  daily_rate: number;
  km_per_l: number;
  fuel_price: number;
}

export interface QuoteItem {
  id?: string;
  day_number: number;
  date: string;
  destination: string;
  itinerary_details: string;
  vehicle_rate: number;
  km: number;
  km_per_l: number;
  fuel_price: number;
  dynamic_costs: Record<string, number>;
  row_total: number;
  is_manual?: boolean;
  applied_preset_id?: string;
  tags: string[];
  guest_accommodation_id?: string;
  guest_accommodation_name?: string;
  guest_accommodation_amount?: number;
  fuel_cost_manual?: number;
}

export interface QuoteData {
  id?: string | null;
  customer_name: string;
  fb_name: string;
  contact_number: string;
  pax_count: number;
  eta: string;
  etd: string;
  vehicle_model: string | null;
  pickup_location: string;
  dropoff_location: string;
  notes: string;
  default_fuel_price: number;
  admin_commission: number;
  status?: string;
  quotation_text?: string | null;
  selected_package?: string | null;
  selected_package_total?: number | null;
  selected_package_details?: any | null;
  confirmed_at?: string | null;
  items: QuoteItem[];
  extra_fees_json?: ExtraFee[];
  discount_total?: number;
  fleet?: QuoteVehicle[];
  fleet_json?: QuoteVehicle[];
  quotation_description?: string;
}
