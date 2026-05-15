'use server';

import { getServiceSupabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function inviteOperatorUser(formData: FormData) {
  const email = formData.get('email') as string;
  const fullName = formData.get('fullName') as string;
  const role = formData.get('role') as string;
  const operatorId = formData.get('operatorId') as string;

  if (!email || !fullName || !role) {
    return { error: 'Missing required fields' };
  }

  // Operator ID is only optional for Super Admins
  if (role !== 'super_admin' && !operatorId) {
    return { error: 'Please select an operator for this role' };
  }

  const isManual = formData.get('manual') === 'true';

  const supabaseAdmin = getServiceSupabase();

  try {
    let inviteData;
    let actionLink;

    if (isManual) {
      // 1a. Generate Invite Link (does not send email)
      const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { 
          data: { full_name: fullName },
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        }
      });
      if (linkError) throw linkError;
      inviteData = { user: data.user };
      actionLink = data.properties.action_link;
    } else {
      // 1b. Invite user via Supabase Auth (Sends email)
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      });
      if (inviteError) throw inviteError;
      inviteData = data;
    }

    if (!inviteData.user) {
      throw new Error('User invitation failed - no user returned');
    }

    // 2. Create Profile entry
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: inviteData.user.id,
        full_name: fullName,
        operator_id: role === 'super_admin' ? null : operatorId,
        role: role
      });

    if (profileError) {
      console.error("Profile Creation Error:", profileError);
      throw profileError;
    }

    revalidatePath('/admin');
    return { success: true, link: actionLink };
  } catch (error: any) {
    return { error: error.message || 'Failed to invite user' };
  }
}

export async function deletePersonnel(userId: string) {
  if (!userId) return { error: 'User ID is required' };

  const supabaseAdmin = getServiceSupabase();

  try {
    // 1. Delete from Auth (this cascades to profiles if schema is set up, but we'll do both to be safe)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) throw authError;

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return { error: error.message || 'Failed to delete user' };
  }
}

export async function updateProfile(userId: string, data: { fullName: string }) {
  const supabaseAdmin = getServiceSupabase();

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: data.fullName })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update profile' };
  }
}

export async function createOperator(formData: FormData) {
  const name = formData.get('name') as string;
  const website = formData.get('website') as string;
  const agencyNotes = formData.get('quotation_agency_notes') as string;
  const socialLinks = formData.getAll('socialLinks') as string[];
  const quoteTitlePresets = formData.getAll('quoteTitlePresets') as string[];

  if (!name) return { error: 'Operator name is required' };

  const supabaseAdmin = getServiceSupabase();

  try {
    const { data, error } = await supabaseAdmin
      .from('operators')
      .insert({ 
        name, 
        website,
        quotation_agency_notes: agencyNotes,
        social_links: socialLinks.filter(link => link.trim() !== ''),
        quote_title_presets: quoteTitlePresets.filter(title => title.trim() !== '')
      })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath('/admin');
    return { success: true, data };
  } catch (error: any) {
    return { error: error.message || 'Failed to create operator' };
  }
}

export async function getAllPersonnel() {
  const supabaseAdmin = getServiceSupabase();

  try {
    // 1. Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        operators(name)
      `);

    if (profileError) throw profileError;

    // 2. Get all auth users to get emails (since we can't join auth and public)
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw authError;

    // 3. Merge email into profile data
    const merged = profiles.map(p => {
      const authUser = users.find(u => u.id === p.id);
      return {
        ...p,
        email: authUser?.email || 'No email found'
      };
    });

    return { data: merged };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch personnel' };
  }
}

export async function getOperatorStats() {
  const supabaseAdmin = getServiceSupabase();

  try {
    const [{ data: operators }, { data: quotes }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from('operators').select('*').order('name'),
      supabaseAdmin.from('quotes').select('operator_id'),
      supabaseAdmin.from('profiles').select('operator_id')
    ]);

    const qMap: Record<string, number> = {};
    (quotes || []).forEach((q: any) => { qMap[q.operator_id] = (qMap[q.operator_id] || 0) + 1; });
    const pMap: Record<string, number> = {};
    (profiles || []).forEach((p: any) => { if (p.operator_id) pMap[p.operator_id] = (pMap[p.operator_id] || 0) + 1; });

    const enriched = (operators || []).map(o => ({
      ...o,
      _quoteCount: qMap[o.id] || 0,
      _profileCount: pMap[o.id] || 0
    }));

    return { data: enriched };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch operator stats' };
  }
}

export async function updateOperator(operatorId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const website = formData.get('website') as string;
  const agencyNotes = formData.get('quotation_agency_notes') as string;
  const socialLinks = formData.getAll('socialLinks') as string[];
  const quoteTitlePresets = formData.getAll('quoteTitlePresets') as string[];

  if (!operatorId || !name) return { error: 'Operator ID and name are required' };

  const supabaseAdmin = getServiceSupabase();

  try {
    const { error } = await supabaseAdmin
      .from('operators')
      .update({ 
        name, 
        website,
        quotation_agency_notes: agencyNotes,
        social_links: socialLinks.filter(link => link.trim() !== ''),
        quote_title_presets: quoteTitlePresets.filter(title => title.trim() !== '')
      })
      .eq('id', operatorId);

    if (error) throw error;
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update operator' };
  }
}

export async function updatePersonnel(userId: string, formData: FormData) {
  const fullName = formData.get('fullName') as string;
  const role = formData.get('role') as string;
  const operatorId = formData.get('operatorId') as string;

  if (!userId || !fullName || !role) {
    return { error: 'Missing required fields' };
  }

  const supabaseAdmin = getServiceSupabase();

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        operator_id: role === 'super_admin' ? null : (operatorId || null)
      })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update personnel' };
  }
}
