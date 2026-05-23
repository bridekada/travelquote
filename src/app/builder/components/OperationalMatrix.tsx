"use client";

import { AlertTriangle, Calculator } from "lucide-react";
import { QuoteData, QuoteItem, QuoteVehicle } from "./types";
import { calculateFuelCost } from "./utils";

interface OperationalMatrixProps {
  items: QuoteItem[];
  dbAccommodations: any[];
  dbMiscPresets: any[];
  livePackages: any[];
  rowTotals: number[];
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
  fleet?: QuoteVehicle[];
}

export default function OperationalMatrix({
  items,
  dbAccommodations,
  dbMiscPresets,
  livePackages,
  rowTotals,
  colTotals,
  onUpdateItem,
  adminCommission,
  onUpdateCommission,
  onUpdateDefaultFuel,
  defaultFuelPrice,
  discount,
  onUpdateDiscount,
  grandTotal,
  readOnly = false,
  fleet
}: OperationalMatrixProps) {
  const colWidth = 125;
  const totalCols = 7 + dbMiscPresets.length;
  const matrixWidth = Math.max(1200, totalCols * colWidth);

  // High-Density Styles (Emerald surgical theme)
  const cellStyle = "px-3 py-1.5 border-none text-[11px] align-middle";
  const headerStyle = "px-3 py-3 border-b border-[#f0f2f5] text-[10px] font-black uppercase tracking-[0.15em] text-text-tertiary align-middle";
  const inputStyle = "w-full bg-transparent border-none text-[11px] font-bold text-primary focus:ring-0 p-0 placeholder:opacity-20 focus:bg-emerald-50/50 rounded transition-all";

  // Calculate fleet aggregate rate
  const fleetTotalRate = (fleet || []).reduce((acc, v) => acc + (v.daily_rate || 0), 0);

  return (
    <div className="w-full !px-2 md:!px-4 lg:!px-6 pb-20 !mt-4 md:!mt-6">
      <div className="bg-white rounded-[24px] border border-slate-300 shadow-sm shadow-primary/[0.02] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 hover:border-slate-400/20 hover:bg-yellow-50/25">
        {/* In-Card Header */}
        <div className="bg-slate-50/50 border-b border-slate-100 !pt-2 !pb-2 md:!pt-3 md:!pb-3 !pl-2 md:!pl-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm ml-2">
            <Calculator size={14} />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-slate-800 tracking-tight leading-none uppercase">Operational Matrix</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spreadsheet View & Cost Breakdown</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed" style={{ minWidth: `${matrixWidth}px` }}>
          <thead>
            <tr className="bg-[#f8f9fb]">
              <th className={headerStyle + " !pl-8"} style={{ width: `${colWidth}px` }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title="Day">Day</span>
                  <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                </div>
              </th>
              <th className={headerStyle} style={{ width: `${colWidth}px` }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title="Destination">Destination</span>
                  <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                </div>
              </th>
              <th className={headerStyle} style={{ width: `${colWidth}px` }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title="Fleet Rate">Fleet Rate</span>
                  <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                </div>
              </th>
              <th className={headerStyle} style={{ width: `${colWidth}px` }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title="Est. KM">Est. KM</span>
                  <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                </div>
              </th>
              <th className={headerStyle} style={{ width: `${colWidth}px` }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title="Fuel">Fuel</span>
                  <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                </div>
              </th>
              
              <th className={headerStyle + " text-primary"} style={{ width: `${colWidth}px` }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title="Guest Accom">Guest Accom</span>
                  <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                </div>
              </th>

              {dbMiscPresets.map(p => {
                const isIncludedInAnyPkg = livePackages.some(lp => (lp.includes_misc_ids || []).includes(p.id));
                const totalCost = colTotals.misc[p.id] || 0;
                const showWarning = isIncludedInAnyPkg && totalCost === 0;

                return (
                  <th key={p.id} className={headerStyle + " text-indigo-500"} style={{ width: `${colWidth}px` }}>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight min-w-0 flex-1" title={p.name}>
                          {p.name}
                        </span>
                        {showWarning && (
                          <div className="w-3 h-3 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 animate-pulse shrink-0" title="Included in package but cost is zero.">
                            <AlertTriangle size={8} />
                          </div>
                        )}
                      </div>
                      <span className="text-slate-300 select-none ml-2 shrink-0">|</span>
                    </div>
                  </th>
                );
              })}
              <th className={headerStyle + " !pr-8 text-right bg-rose-50/30 border-l border-rose-100/50"} style={{ width: `${colWidth}px` }}>
                <span className="line-clamp-2 whitespace-normal text-ellipsis overflow-hidden font-black leading-tight inline-block" title="Row Total">Row Total</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f2f5]">
            {items.map((item, index) => {
              const activeFleet = (fleet && fleet.length > 0 && item.selected_vehicle_ids && item.selected_vehicle_ids.length > 0)
                ? fleet.filter(v => item.selected_vehicle_ids!.includes(v.id))
                : fleet;
              
              const dailyFleetRate = (activeFleet && activeFleet.length > 0)
                ? activeFleet.reduce((acc, v) => acc + (v.daily_rate || 0), 0)
                : (item.vehicle_rate || 0);

              return (
                <tr key={index} className="group hover:bg-emerald-50/30 transition-colors h-[32px]">
                  <td className={cellStyle + " !pl-8 font-black text-primary/40"}>D{item.day_number}</td>
                  <td className={cellStyle}>
                    <div className="flex items-center justify-between">
                      <input 
                        type="text" 
                        className={inputStyle + " disabled:opacity-50"} 
                        value={item.destination} 
                        onChange={(e) => onUpdateItem(index, { destination: e.target.value })} 
                        disabled={readOnly}
                      />
                      <span className="text-slate-300 ml-2 select-none">|</span>
                    </div>
                  </td>
                  <td className={cellStyle}>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-gray-300">₱</span>
                      <input 
                        type="text" 
                        className={inputStyle + " font-black !cursor-default select-none pointer-events-none"} 
                        value={dailyFleetRate.toLocaleString()} 
                        readOnly
                      />
                      <span className="text-slate-300 ml-2 select-none">|</span>
                    </div>
                  </td>
                <td className={cellStyle}>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      className={inputStyle + " disabled:opacity-50"} 
                      placeholder="0"
                      value={item.km === 0 ? "" : item.km} 
                      onChange={(e) => onUpdateItem(index, { km: parseFloat(e.target.value) || 0 })} 
                      disabled={readOnly}
                    />
                    <span className="text-slate-300 ml-2 select-none">|</span>
                  </div>
                </td>
                <td className={cellStyle}>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-300">₱</span>
                    <input 
                      type="number" 
                      className={inputStyle + " font-black !cursor-default select-none pointer-events-none"} 
                      placeholder="0"
                      value={(item.fuel_cost_manual ?? calculateFuelCost(item, fleet)) === 0 ? "" : Math.round(item.fuel_cost_manual ?? calculateFuelCost(item, fleet))} 
                      readOnly
                    />
                    <span className="text-slate-300 ml-2 select-none">|</span>
                  </div>
                </td>
                
                  <td className={cellStyle}>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-gray-300">₱</span>
                      <input 
                        type="number" 
                        className={inputStyle + " font-black !cursor-default select-none pointer-events-none"} 
                        placeholder="0" 
                        value={item.guest_accommodation_amount === 0 ? "" : item.guest_accommodation_amount} 
                        readOnly
                      />
                      <span className="text-slate-300 ml-2 select-none">|</span>
                    </div>
                  </td>

                  {dbMiscPresets.map(p => {
                    const val = item.dynamic_costs?.[p.id] || 0;
                    const isTagDriven = (item.tags || []).includes(p.name);
                    return (
                      <td key={p.id} className={cellStyle}>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold ${isTagDriven && val > 0 ? 'text-indigo-400' : 'text-gray-200'}`}>₱</span>
                          <input 
                            type="number" 
                            className={`${inputStyle} ${isTagDriven && val > 0 ? 'text-indigo-600' : 'text-primary'} disabled:opacity-50`}
                            placeholder="0" 
                            value={val === 0 ? "" : val} 
                            onChange={(e) => {
                              const newCosts = { ...(item.dynamic_costs || {}), [p.id]: parseFloat(e.target.value) || 0 };
                              onUpdateItem(index, { dynamic_costs: newCosts });
                            }} 
                            disabled={readOnly}
                          />
                          <span className="text-slate-300 ml-2 select-none">|</span>
                        </div>
                      </td>
                    );
                  })}

                  <td className={cellStyle + " !pr-8 text-right bg-rose-50/20 border-l border-rose-100/50"}>
                    <div className="text-[11px] font-black text-primary whitespace-nowrap">
                      ₱{Math.round(rowTotals[index] || 0).toLocaleString()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-rose-50/50 border-t-2 border-rose-100/50">
              <td className="!pl-8 pr-3 py-4 font-black text-primary/60 text-[9px] uppercase tracking-widest">Totals</td>
              <td className="px-3 py-4 text-[10px] font-black italic text-primary/20 tracking-tighter">Operational Sum</td>
              <td className="px-3 py-4 text-[11px] font-black text-primary">
                <div className="flex items-center justify-between">
                  ₱{Math.round(colTotals.rate).toLocaleString()}
                  <span className="text-gray-200 opacity-30 select-none ml-2">|</span>
                </div>
              </td>
              <td className="px-3 py-4 text-[11px] font-black text-primary">
                <div className="flex items-center justify-between">
                  {colTotals.km.toLocaleString()} KM
                  <span className="text-gray-200 opacity-30 select-none ml-2">|</span>
                </div>
              </td>
              <td className="px-3 py-4 text-[11px] font-black text-primary">
                <div className="flex items-center justify-between">
                  ₱{Math.round(colTotals.fuel).toLocaleString()}
                  <span className="text-gray-200 opacity-30 select-none ml-2">|</span>
                </div>
              </td>
              
                <td className="px-3 py-4 text-[11px] font-black text-primary">
                  <div className="flex items-center justify-between">
                    ₱{Math.round(colTotals.accom).toLocaleString()}
                    <span className="text-gray-200 opacity-30 select-none ml-2">|</span>
                  </div>
                </td>

              {dbMiscPresets.map(p => (
                <td key={p.id} className="px-3 py-4 text-[11px] font-black text-indigo-600">
                  <div className="flex items-center justify-between">
                    ₱{Math.round(colTotals.misc[p.id] || 0).toLocaleString()}
                    <span className="text-gray-200 opacity-30 select-none ml-2">|</span>
                  </div>
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
    </div>
  </div>
  );
}
