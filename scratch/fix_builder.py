import sys

path = r'd:\AntiGravity_Projects\Personal\travel-quote-v2\src\app\builder\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The target block we want to replace
target = """          const existing = quote.items.find(item => item.day_number === i + 1);
          if (existing) {
            newItems.push({ ...existing, date: dateStr });
          } else {
            // Get current vehicle rate
            const v = dbVehicles.find(v => v.model === quote.vehicle_model);
            const rate = v?.default_rate || 0;
            
            // Initialize dynamic costs from presets
            const dCosts: Record<string, number> = {};
            dbMiscPresets.forEach(p => {
              dCosts[p.id] = p.default_amount || 0;
            });
            
            newItems.push({
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
            });
          }"""

replacement = """          const existing = quote.items.find(item => item.day_number === i + 1);
          
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
          }"""

# Try to find and replace
if target in content:
    new_content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Content replaced.")
else:
    # Try a more flexible search if exact match fails
    print("ERROR: Target not found exactly. Trying line-by-line match...")
    lines = content.splitlines()
    target_lines = target.splitlines()
    found = False
    for i in range(len(lines) - len(target_lines) + 1):
        match = True
        for j in range(len(target_lines)):
            if lines[i+j].strip() != target_lines[j].strip():
                match = False
                break
        if match:
            print(f"Match found at line {i+1}")
            # Construct new content
            new_lines = lines[:i] + replacement.splitlines() + lines[i+len(target_lines):]
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write("\\n".join(new_lines) + "\\n")
            found = True
            print("SUCCESS: Content replaced via fuzzy match.")
            break
    if not found:
        print("CRITICAL ERROR: Could not find target block even with fuzzy match.")
        sys.exit(1)
