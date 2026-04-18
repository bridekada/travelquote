"use client";

import { AlertTriangle, Calculator } from "lucide-react";
import { QuoteData, QuoteItem } from "./types";
import { calculateFuelCost } from "./utils";

interface OperationalMatrixProps {
  items: QuoteItem[];
  dbAccommodations: any[];
  dbMiscPresets: any[];
  livePackages: any[];
  colTotals: any;
  onUpdateItem: (index: number, updates: Partial<QuoteItem>) => void;
  adminCommission: number;
  onUpdateCommission: (val: number) => void;
  onUpdateDefaultFuel: (val: number) => void;
  defaultFuelPrice: number;
  discount: number;
  onUpdateDiscount: (val: number) => void;
  grandTotal: number;
  readOnly?: boolean;
}

export default function OperationalMatrix({
  items,
  dbAccommodations,
  dbMiscPresets,
  livePackages,
  colTotals,
  onUpdateItem,
  adminCommission,
  onUpdateCommission,
  onUpdateDefaultFuel,
  defaultFuelPrice,
  discount,
  onUpdateDiscount,
  grandTotal,
  readOnly = false
}: OperationalMatrixProps) {
  const accomColWidth = dbAccommodations.length > 0 ? 120 : 0;
  const dynamicColsWidth = dbMiscPresets.length * 100;
  const matrixWidth = Math.max(1200, 700 + accomColWidth + dynamicColsWidth);

  // High-Density Styles (Emerald surgical theme)
  const cellStyle = "px-3 py-1.5 border-none text-[11px]";
  const headerStyle = "px-3 py-3 border-b border-[#f0f2f5] text-[9px] font-black uppercase tracking-[0.15em] text-text-tertiary whitespace-nowrap";
  const inputStyle = "w-full bg-transparent border-none text-[11px] font-bold text-primary focus:ring-0 p-0 placeholder:opacity-20";

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] text-primary flex items-center justify-center">
          <Calculator size={18} />
        </div>
        <h2 className="text-lg font-bold text-primary">Operational Matrix (Spreadsheet)</h2>
      </div>

      <div className="bg-white rounded-[24px] border border-[#e8eaed] shadow-sm shadow-primary/[0.02] overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth: `${matrixWidth}px` }}>
          <thead>
            <tr className="bg-[#f8f9fb]">
              <th className={headerStyle + " !pl-8 w-16"}>Day</th>
              <th className={headerStyle + " w-[180px]"}>Destination</th>
              <th className={headerStyle + " w-[100px]"}>Unit Rate</th>
              <th className={headerStyle + " w-[80px]"}>Est. KM</th>
              <th className={headerStyle + " w-[70px]"}>KM/L</th>
              <th className={headerStyle + " w-[90px]"}>Fuel</th>
              
              {dbAccommodations.length > 0 && (
                <th className={headerStyle + " w-[110px] text-primary"}>Guest Accom</th>
              )}

              {dbMiscPresets.map(p => {
                const isIncludedInAnyPkg = livePackages.some(lp => (lp.includes_misc_ids || []).includes(p.id));
                const totalCost = colTotals.misc[p.id] || 0;
                const showWarning = isIncludedInAnyPkg && totalCost === 0;

                return (
                  <th key={p.id} className={headerStyle + " w-[90px] text-indigo-500"}>
                    <div className="flex items-center gap-1.5">
                      {p.name}
                      {showWarning && (
                        <div className="w-3 h-3 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 animate-pulse" title="Included in package but cost is zero.">
                          <AlertTriangle size={8} />
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className={headerStyle + " !pr-8 text-right w-[120px]"}>Row Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f2f5]">
            {items.map((item, index) => (
              <tr key={index} className="group hover:bg-emerald-50/30 transition-colors h-[32px]">
                <td className={cellStyle + " !pl-8 font-black text-primary/40"}>D{item.day_number}</td>
                <td className={cellStyle}>
                  <input 
                    type="text" 
                    className={inputStyle + " disabled:opacity-50"} 
                    value={item.destination} 
                    onChange={(e) => onUpdateItem(index, { destination: e.target.value })} 
                    disabled={readOnly}
                  />
                </td>
                <td className={cellStyle}>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-300">₱</span>
                    <input 
                      type="number" 
                      className={inputStyle + " font-black disabled:opacity-50"} 
                      value={item.vehicle_rate || 0} 
                      onChange={(e) => onUpdateItem(index, { vehicle_rate: parseFloat(e.target.value) || 0 })} 
                      disabled={readOnly}
                    />
                  </div>
                </td>
                <td className={cellStyle}>
                  <input 
                    type="number" 
                    className={inputStyle + " disabled:opacity-50"} 
                    value={item.km || 0} 
                    onChange={(e) => onUpdateItem(index, { km: parseFloat(e.target.value) || 0 })} 
                    disabled={readOnly}
                  />
                </td>
                <td className={cellStyle}>
                  <input 
                    type="number" 
                    className={inputStyle + " !text-text-tertiary/50 disabled:opacity-30"} 
                    placeholder="10" 
                    value={item.km_per_l} 
                    onChange={(e) => onUpdateItem(index, { km_per_l: parseFloat(e.target.value) || 10 })} 
                    disabled={readOnly}
                  />
                </td>
                <td className={cellStyle}>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-300">₱</span>
                    <input 
                      type="number" 
                      className={inputStyle + " font-black disabled:opacity-50"} 
                      value={Math.round(item.fuel_cost_manual ?? calculateFuelCost(item))} 
                      onChange={(e) => onUpdateItem(index, { fuel_cost_manual: parseFloat(e.target.value) || 0 })} 
                      disabled={readOnly}
                    />
                  </div>
                </td>
                
                {dbAccommodations.length > 0 && (
                  <td className={cellStyle}>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-gray-300">₱</span>
                      <input 
                        type="number" 
                        className={inputStyle + " disabled:opacity-50"} 
                        placeholder="0" 
                        value={item.guest_accommodation_amount || 0} 
                        onChange={(e) => onUpdateItem(index, { guest_accommodation_amount: parseFloat(e.target.value) || 0 })} 
                        disabled={readOnly}
                      />
                    </div>
                  </td>
                )}

                  {dbMiscPresets.map(p => {
                    const val = item.dynamic_costs?.[p.id] || 0;
                    const isTagDriven = (item.tags || []).includes(p.name);
                    return (
                      <td key={p.id} className={cellStyle}>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold ${isTagDriven && val > 0 ? 'text-indigo-400' : 'text-gray-200'}`}>₱</span>
                          <input 
                            type="number" 
                            className={`${inputStyle} ${isTagDriven && val > 0 ? 'text-indigo-600' : 'text-text-tertiary/30'} disabled:opacity-50`}
                            placeholder="0" 
                            value={val} 
                            onChange={(e) => {
                              const newCosts = { ...(item.dynamic_costs || {}), [p.id]: parseFloat(e.target.value) || 0 };
                              onUpdateItem(index, { dynamic_costs: newCosts });
                            }} 
                            disabled={readOnly}
                          />
                        </div>
                      </td>
                    );
                  })}

                <td className={cellStyle + " !pr-8 text-right"}>
                  <div className="text-[11px] font-black text-primary whitespace-nowrap">
                    ₱{Math.round(item.row_total).toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#f8f9fb] border-t-2 border-primary/10">
              <td className="!pl-8 pr-3 py-4 font-black text-primary/60 text-[9px] uppercase tracking-widest">Totals</td>
              <td className="px-3 py-4 text-[10px] font-black italic text-primary/20 tracking-tighter">Operational Sum</td>
              <td className="px-3 py-4 text-[11px] font-black text-primary">₱{Math.round(colTotals.rate).toLocaleString()}</td>
              <td className="px-3 py-4 text-[11px] font-black text-primary">{colTotals.km.toLocaleString()} KM</td>
              <td className="px-3 py-4 text-center">
                <span className="text-[12px] font-black text-primary/20">
                  ---
                </span>
              </td>
              <td className="px-3 py-4 text-[11px] font-black text-primary">₱{Math.round(colTotals.fuel).toLocaleString()}</td>
              
              {dbAccommodations.length > 0 && (
                <td className="px-3 py-4 text-[11px] font-black text-primary">₱{Math.round(colTotals.accom).toLocaleString()}</td>
              )}

              {dbMiscPresets.map(p => (
                <td key={p.id} className="px-3 py-4 text-[11px] font-black text-indigo-600">
                  ₱{Math.round(colTotals.misc[p.id] || 0).toLocaleString()}
                </td>
              ))}

              <td className="pl-3 !pr-8 py-4 text-right">
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/60">Markup ({adminCommission}%)</span>
                      <input 
                        type="range" min="0" max="50" step="1" 
                        className="w-12 h-1 accent-amber-500 bg-amber-100 rounded-full cursor-pointer disabled:opacity-30 disabled:grayscale" 
                        value={adminCommission || 0} onChange={(e) => onUpdateCommission(parseFloat(e.target.value))} 
                        disabled={readOnly}
                      />
                   </div>
                   <div className="text-[12px] font-black text-primary whitespace-nowrap bg-white px-3 py-1 rounded-lg shadow-sm border border-[#f0f2f5]">
                     ₱{Math.round(colTotals.grand).toLocaleString()}
                   </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
