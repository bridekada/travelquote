import os

path = r'd:\AntiGravity_Projects\Personal\travel-quote-v2\src\app\builder\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Simplify handleDateChanges useEffect
# Find the start of the effect
start_marker = "// Handle Date Changes (Automatic Row Generation)"
# We want to replace the whole block from useEffect down to its dependency array

old_date_effect_part = """  // Handle Date Changes (Automatic Row Generation)
  useEffect(() => {
    if (isLoaded) return; // Don't run this if we just loaded an existing quote
    if (quote.eta && quote.etd) {
      const start = new Date(quote.eta);
      const end = new Date(quote.etd);
      
      if (end >= start) {
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const newItems: QuoteItem[] = [];
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          const existing = quote.items.find(item => item.day_number === i + 1);
          
          // Initialize/Backfill dynamic costs from presets
          const dCosts: Record<string, number> = existing?.dynamic_costs ? { ...existing.dynamic_costs } : {};
          dbMiscPresets.forEach(p => {
            if (dCosts[p.id] === undefined) {
              dCosts[p.id] = p.default_amount || 0;
            }
          });

          if (existing) {
            const updated = { ...existing, date: dateStr, dynamic_costs: dCosts };
            updated.row_total = calculateRowTotal(updated);
            newItems.push(updated);
          } else {
            // Get current vehicle rate
            const v = dbVehicles.find(v => v.model === quote.vehicle_model);
            const rate = v?.default_rate || 0;
            
            const newItem: QuoteItem = {
              day_number: i + 1,
              date: dateStr,
              destination: "",
              itinerary_details: "",
              vehicle_rate: rate,
              km: 0,
              km_per_l: v?.km_per_l || 10,
              fuel_price: quote.default_fuel_price,
              carwash_fee: v?.carwash_fee || 0,
              dynamic_costs: dCosts,
              row_total: 0
            };
            newItem.row_total = calculateRowTotal(newItem);
            newItems.push(newItem);
          }
        }
        // Only update if something actually changed to avoid infinite loops
        const currentItemsJson = JSON.stringify(quote.items);
        const newItemsJson = JSON.stringify(newItems);
        if (currentItemsJson !== newItemsJson) {
           setQuote(prev => ({ ...prev, items: newItems }));
        }
      }
    }
  }, [quote.eta, quote.etd, dbMiscPresets, dbVehicles, quote.default_fuel_price, quote.vehicle_model, isLoaded]);"""

new_date_effect_part = """  // Handle Date Changes (Automatic Row Generation)
  useEffect(() => {
    if (isLoaded) return;
    if (quote.eta && quote.etd) {
      const start = new Date(quote.eta);
      const end = new Date(quote.etd);
      
      if (end >= start) {
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const newItems: QuoteItem[] = [];
        
        for (let i = 0; i < days; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          const existing = quote.items.find(item => item.day_number === i + 1);
          if (existing) {
            newItems.push({ ...existing, date: dateStr });
          } else {
            // New rows start empty, reconciliation effect will fill defaults
            newItems.push({
              day_number: i + 1,
              date: dateStr,
              destination: "",
              itinerary_details: "",
              vehicle_rate: 0,
              km: 0,
              km_per_l: 10,
              fuel_price: quote.default_fuel_price,
              carwash_fee: 0,
              dynamic_costs: {},
              row_total: 0
            });
          }
        }

        const itemsChanged = JSON.stringify(quote.items) !== JSON.stringify(newItems);
        if (itemsChanged) {
          setQuote(prev => ({ ...prev, items: newItems }));
        }
      }
    }
  }, [quote.eta, quote.etd, isLoaded]);"""

# 2. Add the Intelligent Reconciliation Effect
# We'll insert it after the vehicle model sync effect
vehicle_sync_marker = "// Update costs when vehicle changes"

new_reconciliation_effect = """  // Intelligent Cost Reconciliation (Backfill Missing Defaults Safely)
  useEffect(() => {
    if (dbMiscPresets.length === 0 || quote.items.length === 0) return;

    const newItems = quote.items.map(item => {
      let changed = false;
      const dCosts = { ...item.dynamic_costs };
      let vRate = item.vehicle_rate;
      let kpl = item.km_per_l;
      let wash = item.carwash_fee;
      
      // 1. Backfill Miscellaneous Presets - ADDITIVE ONLY
      // We only inject if the key is completely missing (undefined)
      dbMiscPresets.forEach(p => {
        if (dCosts[p.id] === undefined) {
          dCosts[p.id] = p.default_amount || 0;
          changed = true;
        }
      });

      // 2. Backfill Vehicle Rate if missing/zero and not manual
      // This helps initialize new rows or sync vehicle selection for new quotes
      const v = dbVehicles.find(veh => veh.model === quote.vehicle_model);
      if (v && vRate === 0 && !item.is_manual) {
        vRate = v.default_rate || 0;
        kpl = v.km_per_l || 10;
        wash = v.carwash_fee || 0;
        changed = true;
      }

      if (changed) {
        const updated = { 
          ...item, 
          vehicle_rate: vRate,
          km_per_l: kpl,
          carwash_fee: wash,
          dynamic_costs: dCosts 
        };
        updated.row_total = calculateRowTotal(updated);
        return updated;
      }
      return item;
    });

    const itemsChanged = JSON.stringify(quote.items) !== JSON.stringify(newItems);
    if (itemsChanged) {
      setQuote(prev => ({ ...prev, items: newItems }));
    }
  }, [dbMiscPresets, dbVehicles, quote.items.length, quote.vehicle_model, isLoaded]);

"""

# Perform replacement
if old_date_effect_part.strip() in content.strip().replace('\\r\\n', '\\n'):
    # Simple replace might fail due to subtle formatting, use fuzzy if needed
    print("Exact match for date effect found. Replacing...")
    content = content.replace(old_date_effect_part, new_date_effect_part)
else:
    print("Exact match failed. Using fuzzy replacement for date effect...")
    # I'll just find the start and the dependency array end
    start_idx = content.find(start_marker)
    if start_idx != -1:
        end_idx = content.find("}, [quote.eta, quote.etd, dbMiscPresets, dbVehicles", start_idx)
        if end_idx != -1:
            end_idx = content.find("]);", end_idx) + 3
            content = content[:start_idx] + new_date_effect_part + content[end_idx:]
            print("Fuzzy replacement successful.")
        else:
            print("Could not find end of effect.")
    else:
        print("Could not find start marker.")

# Insert new reconciliation effect after the vehicle sync effect block
# Locate the end of the vehicle sync effect
sync_start = content.find(vehicle_sync_marker)
if sync_start != -1:
    sync_end = content.find("}, [quote.vehicle_model, dbVehicles, quote.items.length]);", sync_start)
    if sync_end != -1:
        sync_end = content.find("]);", sync_end) + 3
        # Insert after the sync_end
        content = content[:sync_end] + "\n\n" + new_reconciliation_effect + content[sync_end:]
        print("Reconciliation effect injected.")
    else:
        print("Could not find end of vehicle sync effect.")
else:
    print("Could not find vehicle sync marker.")

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print("Finished.")
