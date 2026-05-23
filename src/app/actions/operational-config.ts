"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you Have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// ── VEHICLES ───────────────────────────────────────────────────

export async function getVehicles(operatorId: string) {
  const supabase = await getSupabase();
  return await supabase
    .from('vehicles')
    .select('*')
    .eq('operator_id', operatorId)
    .order('model');
}

export async function saveVehicle(formData: FormData, operatorId: string) {
  const supabase = await getSupabase();
  const id = formData.get('id') as string;
  const data: any = {
    model: formData.get('model') as string,
    category: formData.get('category') as string,
    pax_capacity: parseInt(formData.get('pax_capacity') as string) || 1,
    default_rate: parseFloat(formData.get('default_rate') as string) || 0,
    km_per_l: parseFloat(formData.get('km_per_l') as string) || 10,
    fuel_type: formData.get('fuel_type') as string || 'Gasoline',
    is_active: true
  };

  try {
    if (id) {
      const { error } = await supabase.from('vehicles').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('vehicles').insert({ ...data, operator_id: operatorId });
      if (error) throw error;
    }
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Save Vehicle Error:', error);
    return { error: error.message };
  }
}

export async function deleteVehicle(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

// ── PRESETS ───────────────────────────────────────────────────

export async function getItineraryPresets(operatorId: string) {
  const supabase = await getSupabase();
  return await supabase
    .from('itinerary_presets')
    .select('*')
    .eq('operator_id', operatorId)
    .order('title');
}

export async function saveItineraryPreset(formData: FormData, operatorId: string) {
  const supabase = await getSupabase();
  const id = formData.get('id') as string;
  const data: any = {
    title: formData.get('title') as string,
    details: formData.get('details') as string,
    default_km: parseFloat(formData.get('default_km') as string) || 0,
    tags: formData.get('tags') as string || ""
  };

  try {
    if (id) {
      const { error } = await supabase.from('itinerary_presets').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('itinerary_presets').insert({ ...data, operator_id: operatorId });
      if (error) throw error;
    }
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Save Preset Error:', error);
    return { error: error.message };
  }
}

export async function deleteItineraryPreset(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('itinerary_presets').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}
// ── MISC PRESETS ───────────────────────────────────────────────────

export async function getMiscPresets(operatorId: string) {
  const supabase = await getSupabase();
  return await supabase
    .from('misc_presets')
    .select('*')
    .eq('operator_id', operatorId)
    .order('name');
}

export async function saveMiscPreset(formData: FormData, operatorId: string) {
  const supabase = await getSupabase();
  const id = formData.get('id') as string;
  const name = (formData.get('name') as string).trim();
  const data: any = {
    name,
    default_amount: parseFloat(formData.get('default_amount') as string) || 0,
    multiply_by_vehicle: formData.get('multiply_by_vehicle') === 'true',
    hide_in_quote: formData.get('hide_in_quote') === 'true',
    multiply_by_guest: formData.get('multiply_by_guest') === 'true',
  };

  try {
    // Check for duplicate name within the same operator
    const { data: existing } = await supabase
      .from('misc_presets')
      .select('id')
      .eq('operator_id', operatorId)
      .ilike('name', name);

    const isDuplicate = existing?.some(row => row.id !== id);
    if (isDuplicate) {
      return { error: `A fee named "${name}" already exists. Each fee name must be unique.` };
    }

    if (id) {
      const { error } = await supabase.from('misc_presets').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('misc_presets').insert({ ...data, operator_id: operatorId });
      if (error) throw error;
    }
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Save Misc Preset Error:', error);
    return { error: error.message };
  }
}

export async function deleteMiscPreset(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('misc_presets').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getPackagePresets(operatorId: string) {
  const supabase = await getSupabase();
  return await supabase
    .from('package_presets')
    .select('*')
    .eq('operator_id', operatorId)
    .order('display_order');
}

export async function savePackagePreset(formData: FormData) {
  const supabase = await getSupabase();
  const id = formData.get('id') as string;
  const operator_id = formData.get('operator_id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const includes_vehicle = formData.get('includes_vehicle') === 'true';
  const includes_fuel = formData.get('includes_fuel') === 'true';
  const includes_accommodation = formData.get('includes_accommodation') === 'true';
  const is_recommended = formData.get('is_recommended') === 'true';
  const includes_misc_ids = JSON.parse(formData.get('includes_misc_ids') as string || '[]');

  const payload = {
    operator_id,
    title,
    description,
    includes_vehicle,
    includes_fuel,
    includes_accommodation,
    includes_misc_ids,
    is_recommended
  };

  try {
    if (is_recommended) {
      // Clear other recommendations for this operator
      await supabase.from('package_presets').update({ is_recommended: false }).eq('operator_id', operator_id);
    }

    if (id) {
      const { error } = await supabase.from('package_presets').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('package_presets').insert(payload);
      if (error) throw error;
    }
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Save Package Preset Error:', error);
    return { error: error.message };
  }
}

export async function deletePackagePreset(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('package_presets').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

// ── GUEST ACCOMMODATION ───────────────────────────────────────────

export async function getGuestAccommodation(operatorId: string) {
  const supabase = await getSupabase();
  return await supabase
    .from('guest_accommodation')
    .select('*')
    .eq('operator_id', operatorId)
    .order('pax_count');
}

export async function saveGuestAccommodation(formData: FormData, operatorId: string) {
  const supabase = await getSupabase();
  const id = formData.get('id') as string;
  const data: any = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    pax_count: parseInt(formData.get('pax_count') as string) || 1,
    amount: parseFloat(formData.get('amount') as string) || 0,
  };

  try {
    if (id) {
      const { error } = await supabase.from('guest_accommodation').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('guest_accommodation').insert({ ...data, operator_id: operatorId });
      if (error) throw error;
    }
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Save Guest Accommodation Error:', error);
    return { error: error.message };
  }
}

export async function deleteGuestAccommodation(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('guest_accommodation').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}
