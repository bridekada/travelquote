"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Globe, ShieldCheck, Search, X, MoveRight, Loader2, Users, Mail, UserPlus, AlertCircle, Settings, Trash2, LogOut, CheckCircle, LayoutGrid, MessageCircle, Camera, Share2, User2, Plus, Minus, Pencil, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { inviteOperatorUser, deletePersonnel, getAllPersonnel, updateProfile, getOperatorStats, updateOperator, updatePersonnel } from "@/app/actions/user-management";
import { PremiumModalWrapper, premiumFormStyles } from "./components/PremiumModalWrapper";
import { AdminSelect } from "./components/AdminSelect";
import { cn } from "@/lib/utils";
import {
  cardStyle, chipGreen, chipGray, btnPrimary, btnIcon,
  inputStyle, labelStyle, sectionLabel,
  modalOverlay, modalCard, modalTitle,
  pageTitle, pageSubtitle, pageContainer, topBar, topBarInner,
  alertSuccess, alertError, inputFocus, inputBlur,
} from "@/lib/styles";

interface AdminStats {
  totalQuotes: number;
  totalOperators: number;
  totalUsers: number;
}

export function AdminPortal() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [operators, setOperators] = useState<any[]>([]);
  const [operatorConfirmed, setOperatorConfirmed] = useState<Record<string, { count: number; total: number; commission: number }>>({});
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [personnelLoading, setPersonnelLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'operators' | 'personnel'>('operators');
  const [stats, setStats] = useState<AdminStats>({ totalQuotes: 0, totalOperators: 0, totalUsers: 0 });
  const [isInviting, setIsInviting] = useState(false);
  const [isAddingOperator, setIsAddingOperator] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('operator_sales');
  const [isManualLink, setIsManualLink] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [operatorStatus, setOperatorStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [newSocialLinks, setNewSocialLinks] = useState<string[]>(['']);
  const [newQuoteTitlePresets, setNewQuoteTitlePresets] = useState<string[]>(['']);
  const [formLoading, setFormLoading] = useState(false);
  const [editingOperator, setEditingOperator] = useState<any | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isAddTitlesExpanded, setIsAddTitlesExpanded] = useState(false);
  const [isEditTitlesExpanded, setIsEditTitlesExpanded] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setNewFullName(profile.full_name);
  }, [profile]);

  const fetchOperators = async () => {
    if (!profile || profile.role !== 'super_admin') return;
    const { data: enrichedOps, error } = await getOperatorStats();
    if (error || !enrichedOps) { setLoading(false); return; }

    const filteredOps = enrichedOps.filter((o: any) => o.name !== 'System Admin');
    setOperators(filteredOps);
    setStats({
      totalOperators: filteredOps.length,
      totalQuotes: filteredOps.reduce((acc: number, curr: any) => acc + curr._quoteCount, 0),
      totalUsers: filteredOps.reduce((acc: number, curr: any) => acc + curr._profileCount, 0)
    });

    // Fetch confirmed quotes overview per operator
    const confirmedStatuses = ['Confirmed', 'Payment Started', 'Payment Complete'];
    const opIds = filteredOps.map((o: any) => o.id);
    if (opIds.length > 0) {
      const { data: confirmedQuotes } = await supabase
        .from('quotes')
        .select('operator_id, grand_total, selected_package_total, admin_commission, status')
        .in('operator_id', opIds)
        .in('status', confirmedStatuses);

      const lookup: Record<string, { count: number; total: number; commission: number }> = {};
      (confirmedQuotes || []).forEach((q: any) => {
        if (!lookup[q.operator_id]) lookup[q.operator_id] = { count: 0, total: 0, commission: 0 };
        lookup[q.operator_id].count += 1;
        lookup[q.operator_id].total += Math.round(q.grand_total || 0);
        // Calculate amount from percentage: Math.round((total * commission_percent) / (100 + commission_percent))
        const totalForComm = q.selected_package_total || q.grand_total || 0;
        const commAmount = Math.round((totalForComm * (q.admin_commission || 0)) / (100 + (q.admin_commission || 0)));
        lookup[q.operator_id].commission += commAmount;
      });
      setOperatorConfirmed(lookup);
    }
    setLoading(false);
  };

  const fetchPersonnel = async () => {
    setPersonnelLoading(true);
    const { data } = await getAllPersonnel();
    if (data) setPersonnel(data.filter(p => p.id !== profile?.id));
    setPersonnelLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      if (profile?.role !== 'super_admin') {
        router.push("/dashboard");
      } else {
        fetchOperators();
        fetchPersonnel();
      }
    }
  }, [profile, authLoading, router]);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke access for this user?")) return;
    const res = await deletePersonnel(userId);
    if (res.success) {
      setPersonnel(prev => prev.filter(p => p.id !== userId));
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
    } else {
      alert(res.error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setFormLoading(true);
    setPasswordError("");

    try {
      const res = await updateProfile(profile.id, { fullName: newFullName });
      if (res.error) throw new Error(res.error);

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
      }

      setIsSettingsOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      window.location.reload();
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSelectOperator = (id: string) => {
    localStorage.setItem('selected_operator_id', id);
    window.location.href = "/dashboard";
  };

  const handleAddOperatorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setOperatorStatus(null);
    const formData = new FormData(e.currentTarget);

    const { createOperator } = await import('@/app/actions/user-management');
    const res = await createOperator(formData);

    if (res.success) {
      setOperatorStatus({ type: 'success', msg: 'Operator created successfully!' });
      fetchOperators();
      setTimeout(() => {
        setIsAddingOperator(false);
        setNewSocialLinks(['']);
        setNewQuoteTitlePresets(['']);
      }, 2000);
    } else {
      setOperatorStatus({ type: 'error', msg: res.error });
    }
    setFormLoading(false);
  };

  const addSocialField = () => setNewSocialLinks([...newSocialLinks, '']);
  const updateSocialField = (index: number, value: string) => {
    const updated = [...newSocialLinks];
    updated[index] = value;
    setNewSocialLinks(updated);
  };
  const removeSocialField = (index: number) => {
    if (newSocialLinks.length > 1) {
      setNewSocialLinks(newSocialLinks.filter((_, i) => i !== index));
    } else {
      setNewSocialLinks(['']);
    }
  };

  const getSocialIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return <MessageCircle size={12} />;
    if (lower.includes('instagram.com') || lower.includes('ig.me')) return <Camera size={12} />;
    if (lower.includes('twitter.com') || lower.includes('x.com')) return <Share2 size={12} />;
    if (lower.includes('linkedin.com')) return <User2 size={12} />;
    return <Globe size={12} />;
  };

  const addTitlePresetField = () => setNewQuoteTitlePresets([...newQuoteTitlePresets, '']);
  const updateTitlePresetField = (index: number, value: string) => {
    const updated = [...newQuoteTitlePresets];
    updated[index] = value;
    setNewQuoteTitlePresets(updated);
  };
  const removeTitlePresetField = (index: number) => {
    if (newQuoteTitlePresets.length > 1) {
      setNewQuoteTitlePresets(newQuoteTitlePresets.filter((_, i) => i !== index));
    } else {
      setNewQuoteTitlePresets(['']);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setInviteStatus(null);
    const formData = new FormData(e.currentTarget);
    formData.append('manual', isManualLink.toString());

    const result = await inviteOperatorUser(formData);
    if (result.success) {
      if (result.link) {
        setGeneratedLink(result.link);
        fetchPersonnel();
      } else {
        setInviteStatus({ type: 'success', msg: 'Invitation sent! User can now sign in via Magic Link.' });
        fetchPersonnel();
        setTimeout(() => setIsInviting(false), 3000);
      }
    } else {
      setInviteStatus({ type: 'error', msg: result.error || 'Failed to send invitation' });
    }
    setFormLoading(false);
  };

  const handleEditOperatorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOperator) return;
    setFormLoading(true);
    setEditStatus(null);
    const formData = new FormData(e.currentTarget);
    
    const res = await updateOperator(editingOperator.id, formData);
    if (res.success) {
      setEditStatus({ type: 'success', msg: 'Operator updated successfully!' });
      fetchOperators();
      setTimeout(() => setEditingOperator(null), 1500);
    } else {
      setEditStatus({ type: 'error', msg: res.error });
    }
    setFormLoading(false);
  };

  const handleEditPersonnelSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPersonnel) return;
    setFormLoading(true);
    setEditStatus(null);
    const formData = new FormData(e.currentTarget);
    
    const res = await updatePersonnel(editingPersonnel.id, formData);
    if (res.success) {
      setEditStatus({ type: 'success', msg: 'Personnel updated successfully!' });
      fetchPersonnel();
      setTimeout(() => setEditingPersonnel(null), 1500);
    } else {
      setEditStatus({ type: 'error', msg: res.error });
    }
    setFormLoading(false);
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredOperators = operators.filter(op =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPersonnel = personnel.filter(p =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>

      {/* ── Slim Top Bar ─── */}
      <header style={topBar} className="sticky top-0 z-40 w-full flex justify-center">
        <div style={topBarInner} className="flex items-center justify-between">
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-all"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: 'var(--color-brand)', color: 'white' }}>
              <LayoutGrid size={16} />
            </div>
            <span className="text-sm md:text-base font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Command Center</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { supabase.auth.signOut(); router.push("/"); }}
              className="flex items-center justify-center transition-all hover:bg-red-50 hover:text-red-500"
              style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-faint)', cursor: 'pointer', background: 'transparent' }}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
            <div
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center text-white cursor-pointer transition-all active:scale-95"
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-brand)', fontSize: '11px', fontWeight: 700 }}
              title="Account Settings"
              role="button"
            >
              {profile?.full_name?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ─── */}
      <main style={pageContainer}>

        {/* Title */}
        <h1 style={pageTitle}>
          Admin Dashboard
        </h1>
        <p style={pageSubtitle}>
          Manage operators, personnel, and system access.
        </p>

        {/* Search + Action */}
        <div className="flex items-center gap-3" style={{ marginBottom: '28px' }}>
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2" size={18} style={{ left: '16px', color: 'var(--color-text-faint)' }} />
            <input
              type="text"
              placeholder={activeTab === 'operators' ? "Search operators..." : "Search personnel..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '44px', height: '48px', background: 'white' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          {activeTab === 'personnel' ? (
            <button
              onClick={() => { setIsInviting(true); setGeneratedLink(null); }}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ ...btnPrimary, height: '48px', padding: '0 24px', whiteSpace: 'nowrap' }}
            >
              <UserPlus size={16} />
              <span>Invite User</span>
            </button>
          ) : (
            <button
              onClick={() => { setIsAddingOperator(true); setOperatorStatus(null); }}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ ...btnPrimary, height: '48px', padding: '0 24px', whiteSpace: 'nowrap' }}
            >
              <Plus size={16} />
              <span>Add Operator</span>
            </button>
          )}
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2" style={{ marginBottom: '24px' }} role="tablist">
          <button
            onClick={() => { setActiveTab('operators'); setSearchQuery(''); }}
            className="transition-all"
            style={activeTab === 'operators'
              ? { ...btnPrimary, padding: '8px 24px', borderRadius: '9999px', fontSize: '13px' }
              : { padding: '8px 24px', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, background: 'white', border: '1px solid var(--color-border-default)', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }
            }
            role="tab"
            aria-selected={activeTab === 'operators'}
          >
            Operators
          </button>
          <button
            onClick={() => { setActiveTab('personnel'); setSearchQuery(''); }}
            className="transition-all"
            style={activeTab === 'personnel'
              ? { ...btnPrimary, padding: '8px 24px', borderRadius: '9999px', fontSize: '13px' }
              : { padding: '8px 24px', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, background: 'white', border: '1px solid var(--color-border-default)', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }
            }
            role="tab"
            aria-selected={activeTab === 'personnel'}
          >
            Personnel
          </button>
        </div>

        {/* ── OPERATORS LIST ─── */}
        {activeTab === 'operators' && (
          <div className="flex flex-col gap-3">
            {filteredOperators.map((op) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between group relative h-full"
                style={{ ...cardStyle, cursor: 'default' }}
              >
                {/* Left: Icon + Info (The clickable part) */}
                <div 
                  onClick={() => handleSelectOperator(op.id)}
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{op.name}</h3>
                    <div className="flex items-center gap-1.5" style={{ marginTop: '2px' }}>
                      {op.website && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>Website</span>
                      )}
                      {op.website && <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>·</span>}
                        <span style={{ fontSize: '12px', color: 'var(--color-success)' }}>Active</span>
                        <span style={{ color: 'var(--color-border-default)' }}>·</span>
                        <div className="flex items-center gap-2 whitespace-nowrap" style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                          <span className="flex items-center gap-1">
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Confirmed:</span>
                            <span className="font-bold text-primary">₱{Math.round(operatorConfirmed[op.id]?.total || 0).toLocaleString()}</span>
                          </span>
                          <span className="opacity-30">|</span>
                          <span className="flex items-center gap-1">
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Comm:</span>
                            <span className="font-bold text-brand">₱{Math.round(operatorConfirmed[op.id]?.commission || 0).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Chips + Actions */}
                  <div className="flex items-center gap-4 relative z-50">
                    <div className="flex items-center gap-2">
                    <span style={chipGreen}>{op._quoteCount || 0} Quote{(op._quoteCount || 0) !== 1 ? 's' : ''}</span>
                    <span style={chipGray}>{op._profileCount || 0} Staff</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingOperator(op); 
                        setNewSocialLinks(op.social_links && op.social_links.length > 0 ? op.social_links : ['']); 
                        setNewQuoteTitlePresets(op.quote_title_presets && op.quote_title_presets.length > 0 ? op.quote_title_presets : ['']);
                      }}
                      className="flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-slate-50 hover:text-brand pointer-events-auto"
                      style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-faint)', cursor: 'pointer', background: 'white', position: 'relative', zIndex: 60 }}
                    >
                      <Pencil size={14} />
                    </button>
                    <div onClick={() => handleSelectOperator(op.id)} className="cursor-pointer flex items-center h-full px-1">
                      <MoveRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--color-text-faint)' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredOperators.length === 0 && (
              <div className="text-center" style={{ padding: '64px 0', fontSize: '14px', color: 'var(--color-text-faint)' }}>
                No operators match your search.
              </div>
            )}
          </div>
        )}

        {/* ── PERSONNEL LIST ─── */}
        {activeTab === 'personnel' && (
          <div className="flex flex-col gap-3">
            {personnelLoading ? (
              <div className="text-center" style={{ padding: '64px 0' }}>
                <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--color-text-faint)', marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', color: 'var(--color-text-faint)' }}>Loading personnel...</p>
              </div>
            ) : (
              <>
                {filteredPersonnel.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between group relative"
                    style={cardStyle}
                  >
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center text-white uppercase shrink-0" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--color-brand)', fontSize: '12px', fontWeight: 700 }}>
                        {p.full_name?.substring(0, 2)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{p.full_name}</h3>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-faint)', marginTop: '2px' }}>{p.email}</p>
                      </div>
                    </div>

                    {/* Right: Role + Operator + Delete */}
                    <div className="flex items-center gap-2">
                      <span style={p.role === 'super_admin' ? chipGreen : chipGray}>
                        {p.role === 'super_admin' ? 'Global Admin' : (p.role === 'operator_admin' ? 'Manager' : 'Sales')}
                      </span>
                      {p.operators?.name && (
                        <span style={chipGray}>{p.operators.name}</span>
                      )}
                      <div className="flex items-center gap-1.5 transition-all opacity-0 group-hover:opacity-100 lg:ml-4 relative z-50">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPersonnel(p); setEditStatus(null); }}
                          className="flex items-center justify-center transition-all hover:bg-slate-50 hover:text-brand pointer-events-auto"
                          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-faint)', cursor: 'pointer', background: 'white', position: 'relative', zIndex: 60 }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteUser(p.id); }}
                          className="flex items-center justify-center transition-all hover:bg-red-50 hover:text-red-500 pointer-events-auto"
                          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-faint)', cursor: 'pointer', background: 'white', position: 'relative', zIndex: 60 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredPersonnel.length === 0 && (
                  <div className="text-center" style={{ padding: '64px 0', fontSize: '14px', color: 'var(--color-text-faint)' }}>
                    No personnel found. Use &ldquo;Invite User&rdquo; to add team members.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ──────────── MODALS ──────────── */}
      {/* ── INVITE USER MODAL ─── */}
      {/* ── INVITE USER MODAL ─── */}
      <PremiumModalWrapper
        isOpen={isInviting}
        onClose={() => { setIsInviting(false); setGeneratedLink(null); fetchPersonnel(); }}
        title={generatedLink ? 'Invite Link' : 'Invite User'}
        subtitle={generatedLink ? 'The secure invitation URL is ready' : 'Add a new member to your administrative team'}
        icon={<UserPlus size={18} strokeWidth={2.5} />}
      >
        {generatedLink ? (
          <div className="flex flex-col !gap-6">
            <div className="flex flex-col items-center text-center !p-6 !bg-emerald-50/30 !rounded-[20px] !border !border-emerald-100">
              <div className="flex items-center justify-center w-12 h-12 !rounded-full !bg-emerald-500 !text-white !mb-4 !shadow-lg !shadow-emerald-500/20">
                <CheckCircle size={22} strokeWidth={2.5} />
              </div>
              <h4 className="!font-bold !text-slate-900 !mb-1 !text-base">Link Ready</h4>
              <p className="!text-[12px] !text-slate-500 !max-w-[200px] !leading-relaxed">
                The invitation has been successfully generated and is ready to share.
              </p>
            </div>

            <div className="!space-y-2">
              <label className={premiumFormStyles.label}>Access Link</label>
              <div className="flex gap-2">
                <div className="flex-1 truncate !h-11 !px-4 !bg-emerald-50/10 !border !border-emerald-100/50 !rounded-xl !text-[12px] !font-mono !flex !items-center !text-emerald-700">
                  {generatedLink}
                </div>
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    "!px-5 !h-11 !rounded-xl !font-bold !text-[12px] !transition-all !flex !items-center !justify-center !gap-2",
                    copied ? "!bg-emerald-500 !text-white" : "!bg-emerald-900 !text-white"
                  )}
                >
                  {copied ? <CheckCircle size={14} strokeWidth={2.5} /> : <Mail size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() => { setIsInviting(false); setGeneratedLink(null); fetchPersonnel(); }}
              className={premiumFormStyles.secondaryButton}
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="flex flex-col !gap-6">
            <div className="!space-y-4">
              <div className="!space-y-1">
                <label className={premiumFormStyles.label}>Full Name</label>
                <input name="fullName" type="text" className={premiumFormStyles.input} placeholder="e.g. Gabriel Rossetti" required />
              </div>
              <div className="!space-y-1">
                <label className={premiumFormStyles.label}>Email Address</label>
                <input name="email" type="email" className={premiumFormStyles.input} placeholder="personnel@agency.com" required />
              </div>
              <div className="grid grid-cols-2 !gap-4">
                <div className="!space-y-1">
                  <label className={premiumFormStyles.label}>Operator</label>
                  <AdminSelect
                    value={inviteRole === 'super_admin' ? '' : undefined}
                    onValueChange={(val) => {
                      const select = document.querySelector('select[name="operatorId"]') as HTMLSelectElement;
                      if (select) {
                        select.value = val;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    options={operators}
                    getLabel={(op) => op.name}
                    getValue={(op) => op.id}
                    placeholder={inviteRole === 'super_admin' ? 'Global Scope' : 'Select Agency'}
                    disabled={inviteRole === 'super_admin'}
                  />
                  {/* Hidden select for form submission */}
                  <select name="operatorId" className="hidden" required={inviteRole !== 'super_admin'}>
                    <option value="">Select Agency</option>
                    {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </select>
                </div>
                <div className="!space-y-1">
                  <label className={premiumFormStyles.label}>Role</label>
                  <AdminSelect
                    value={inviteRole}
                    onValueChange={(val) => {
                      setInviteRole(val);
                      const select = document.querySelector('select[name="role"]') as HTMLSelectElement;
                      if (select) {
                        select.value = val;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    options={[
                      { id: 'operator_sales', name: 'Sales' },
                      { id: 'operator_admin', name: 'Manager' },
                      { id: 'super_admin', name: 'Global Admin' }
                    ]}
                    getLabel={(r) => r.name}
                    getValue={(r) => r.id}
                    placeholder="Select Role"
                  />
                  <select name="role" className="hidden" value={inviteRole} onChange={() => {}} required>
                    <option value="operator_sales">Sales</option>
                    <option value="operator_admin">Manager</option>
                    <option value="super_admin">Global Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {inviteRole === 'super_admin' && (
              <div className="!p-4 !bg-amber-50/50 !rounded-xl !border !border-amber-100/50">
                <p className="!text-[11px] !text-amber-800 !leading-relaxed">
                  <strong className="!block !mb-1 !text-[10px] !uppercase !tracking-wider !font-black">Security Notice</strong>
                  This user will be granted full administrative control across the entire system.
                </p>
              </div>
            )}

            {inviteStatus && (
              <div className={inviteStatus.type === 'success' ? premiumFormStyles.success : premiumFormStyles.error}>
                {inviteStatus.type === 'success' ? <CheckCircle size={14} strokeWidth={2.5} /> : <AlertCircle size={14} strokeWidth={2.5} />}
                {inviteStatus.msg}
              </div>
            )}

            <button type="submit" disabled={formLoading} className={premiumFormStyles.button}>
              {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Invitation'}
            </button>
          </form>
        )}
      </PremiumModalWrapper>

        {/* ── ADD OPERATOR MODAL ─── */}
      {/* ── ADD OPERATOR MODAL ─── */}
      <PremiumModalWrapper
        isOpen={isAddingOperator}
        onClose={() => setIsAddingOperator(false)}
        title="New Agency"
        subtitle="Initialize a new profile in the cloud"
        icon={<Building2 size={20} strokeWidth={2.5} />}
      >
        <form onSubmit={handleAddOperatorSubmit} className="flex flex-col !gap-6">
          <div className="!space-y-4">
            <div className="!space-y-1">
              <label className={premiumFormStyles.label}>Legal Name</label>
              <input name="name" type="text" className={premiumFormStyles.input} placeholder="e.g. Skyline Travel" required />
            </div>
            <div className="!space-y-1">
              <label className={premiumFormStyles.label}>Official Domain</label>
              <input name="website" type="text" className={premiumFormStyles.input} placeholder="e.g. skyline.com" />
            </div>
          </div>
          
          <div className="!space-y-3">
            <div className="flex items-center justify-between !px-0.5">
              <label className={premiumFormStyles.label}>Social Links</label>
              <button type="button" onClick={addSocialField} className="!flex !items-center !gap-1.5 !text-[10px] !font-bold !text-emerald-600 !uppercase !tracking-wider hover:!opacity-70 !transition-all">
                <Plus size={12} /> Add Field
              </button>
            </div>
            <div className="flex flex-col !gap-2 max-h-[160px] overflow-y-auto custom-scrollbar !pr-1">
              {newSocialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute top-1/2 -translate-y-1/2 left-4 !text-emerald-500/50">
                      {getSocialIcon(link)}
                    </div>
                    <input
                      name="socialLinks"
                      type="text"
                      className={cn(premiumFormStyles.input, "!pl-12 !h-10")}
                      placeholder="e.g. fb.com/agency"
                      value={link}
                      onChange={(e) => updateSocialField(idx, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocialField(idx)}
                    className="!w-10 !h-10 !flex !items-center !justify-center !rounded-xl !border-2 !border-slate-50 !text-slate-300 hover:!text-rose-500 hover:!bg-rose-50 !transition-all shrink-0"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="!space-y-1.5">
            <label className={premiumFormStyles.label}>Quote Disclaimers</label>
            <textarea 
              name="quotation_agency_notes"
              className={premiumFormStyles.textarea}
              placeholder="Terms and conditions for generated quotes..."
            />
          </div>
          
          <div className="!space-y-3">
            <div className="flex items-center justify-between !px-0.5">
              <button 
                type="button" 
                onClick={() => setIsAddTitlesExpanded(!isAddTitlesExpanded)}
                className="!flex !items-center !gap-2 !text-[10px] !font-black !uppercase !tracking-widest !text-slate-400 hover:!text-slate-900 !transition-all"
              >
                <ChevronDown size={14} className={cn("!transition-transform !duration-300", isAddTitlesExpanded && "!rotate-180")} />
                Presets ({newQuoteTitlePresets?.length || 0})
              </button>
              {isAddTitlesExpanded && (
                <button type="button" onClick={addTitlePresetField} className="!flex !items-center !gap-1.5 !text-[10px] !font-bold !text-emerald-600 !uppercase !tracking-wider hover:!opacity-70 !transition-all">
                  <Plus size={12} /> Add New
                </button>
              )}
            </div>
            
            <AnimatePresence>
              {isAddTitlesExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col !gap-2 max-h-[140px] overflow-y-auto custom-scrollbar !pr-1">
                    {newQuoteTitlePresets.map((title, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          name="quoteTitlePresets"
                          type="text"
                          className={cn(premiumFormStyles.input, "!h-10")}
                          placeholder="e.g. Standard Quotation"
                          value={title}
                          onChange={(e) => updateTitlePresetField(idx, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeTitlePresetField(idx)}
                          className="!w-10 !h-10 !flex !items-center !justify-center !rounded-xl !border-2 !border-slate-50 !text-slate-300 hover:!text-rose-500 hover:!bg-rose-50 !transition-all shrink-0"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {operatorStatus && (
            <div className={operatorStatus.type === 'success' ? premiumFormStyles.success : premiumFormStyles.error}>
              {operatorStatus.type === 'success' ? <CheckCircle size={14} strokeWidth={2.5} /> : <AlertCircle size={14} strokeWidth={2.5} />}
              {operatorStatus.msg}
            </div>
          )}

          <button type="submit" disabled={formLoading} className={premiumFormStyles.button}>
            {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Register Agency'}
          </button>
        </form>
      </PremiumModalWrapper>

      <PremiumModalWrapper
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Settings"
        subtitle="Manage your identity and authentication keys"
        icon={<Settings size={18} strokeWidth={2.5} />}
        maxWidth="420px"
      >
        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
          <div className="space-y-1">
            <label className={premiumFormStyles.label}>Personal Name</label>
            <input 
              type="text" 
              className={premiumFormStyles.input} 
              value={newFullName} 
              onChange={(e) => setNewFullName(e.target.value)} 
              placeholder="Your full name"
              required 
            />
          </div>

          <div className="pt-5 !border-t !border-slate-100">
            <p className="!text-[9px] !font-black !uppercase !tracking-[0.2em] !text-slate-400 !mb-4 !px-0.5">Authentication Update</p>
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <label className={premiumFormStyles.label}>New Security Key</label>
                <input 
                  type="password" 
                  className={premiumFormStyles.input} 
                  placeholder="Minimum 6 characters" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <label className={premiumFormStyles.label}>Verify Key</label>
                <input 
                  type="password" 
                  className={premiumFormStyles.input} 
                  placeholder="Confirm new key" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {passwordError && (
            <div className={premiumFormStyles.error}>
              <AlertCircle size={14} strokeWidth={2.5} />
              {passwordError}
            </div>
          )}

          <button type="submit" disabled={formLoading} className={premiumFormStyles.button}>
            {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Update Identity'}
          </button>
        </form>
      </PremiumModalWrapper>

      {/* ── EDIT AGENCY MODAL ─── */}
      <PremiumModalWrapper
        isOpen={!!editingOperator}
        onClose={() => setEditingOperator(null)}
        title="Edit Agency"
        subtitle="Modify profile and quotation configuration"
        icon={<Building2 size={18} strokeWidth={2.5} />}
      >
        {editingOperator && (
          <form onSubmit={handleEditOperatorSubmit} className="flex flex-col gap-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={premiumFormStyles.label}>Agency Identity</label>
                <input 
                  name="name" 
                  type="text" 
                  className={premiumFormStyles.input} 
                  defaultValue={editingOperator.name} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className={premiumFormStyles.label}>Official Domain</label>
                <input 
                  name="website" 
                  type="text" 
                  className={premiumFormStyles.input} 
                  defaultValue={editingOperator.website} 
                />
              </div>
            </div>

            <div className="pt-5 !border-t !border-slate-100">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <label className="!text-[9px] !font-black !uppercase !tracking-[0.2em] !text-slate-400">Social Channels</label>
                <button type="button" onClick={addSocialField} className="!flex !items-center !gap-1.5 !text-[9px] !font-black !text-primary !uppercase !tracking-widest hover:!opacity-70 !transition-all">
                  <Plus size={10} /> Add Channel
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                {newSocialLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute top-1/2 -translate-y-1/2 left-3 !text-slate-400">
                        {getSocialIcon(link)}
                      </div>
                      <input
                        name="socialLinks"
                        type="text"
                        className={cn(premiumFormStyles.input, "!pl-10 !h-9 !text-[11px]")}
                        placeholder="e.g. fb.com/agency"
                        value={link}
                        onChange={(e) => updateSocialField(idx, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSocialField(idx)}
                      className="!w-9 !h-9 !flex !items-center !justify-center !rounded-lg !border !border-slate-200 !text-slate-400 hover:!text-rose-500 hover:!bg-rose-50 !transition-all shrink-0"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                ))}
                {newSocialLinks.length === 0 && (
                  <p className="!text-[10px] !text-slate-400 !italic !text-center !py-2">No active channels</p>
                )}
              </div>
            </div>

            <div className="pt-5 !border-t !border-slate-100">
              <div className="space-y-1.5">
                <label className={premiumFormStyles.label}>Quotation Disclaimers</label>
                <textarea 
                  name="quotation_agency_notes"
                  className="!w-full !min-h-[100px] !rounded-xl !bg-slate-50/50 !border !border-slate-200/60 focus:!bg-white focus:!ring-1 focus:!ring-slate-900/10 focus:!border-slate-900/30 !transition-all !p-3 !text-[12px] !font-medium !text-slate-700 !outline-none !resize-none !placeholder:text-slate-300"
                  defaultValue={editingOperator.quotation_agency_notes}
                  placeholder="Terms and conditions for generated quotes..."
                />
              </div>
            </div>

            <div className="pt-5 !border-t !border-slate-100">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <button 
                  type="button" 
                  onClick={() => setIsEditTitlesExpanded(!isEditTitlesExpanded)}
                  className="!flex !items-center !gap-2 !text-[9px] !font-black !uppercase !tracking-[0.2em] !text-slate-400 hover:!text-slate-600 !transition-all"
                >
                  <ChevronDown size={12} className={cn("!transition-transform !duration-300", isEditTitlesExpanded && "!rotate-180")} />
                  Title Presets ({newQuoteTitlePresets?.length || 0})
                </button>
                {isEditTitlesExpanded && (
                  <button type="button" onClick={addTitlePresetField} className="!flex !items-center !gap-1.5 !text-[9px] !font-black !text-primary !uppercase !tracking-widest hover:!opacity-70 !transition-all">
                    <Plus size={10} /> Add Preset
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {isEditTitlesExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto custom-scrollbar mt-2 pr-1">
                      {newQuoteTitlePresets.map((title, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            name="quoteTitlePresets"
                            type="text"
                            className={cn(premiumFormStyles.input, "!h-9 !text-[11px]")}
                            placeholder="e.g. Standard Quote"
                            value={title}
                            onChange={(e) => updateTitlePresetField(idx, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeTitlePresetField(idx)}
                            className="!w-9 !h-9 !flex !items-center !justify-center !rounded-lg !border !border-slate-200 !text-slate-400 hover:!text-rose-500 hover:!bg-rose-50 !transition-all shrink-0"
                          >
                            <Minus size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {editStatus && (
              <div className={editStatus.type === 'success' ? premiumFormStyles.success : premiumFormStyles.error}>
                {editStatus.type === 'success' ? <CheckCircle size={14} strokeWidth={2.5} /> : <AlertCircle size={14} strokeWidth={2.5} />}
                {editStatus.msg}
              </div>
            )}

            <button type="submit" disabled={formLoading} className={premiumFormStyles.button}>
              {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Save Modifications'}
            </button>
          </form>
        )}
      </PremiumModalWrapper>

      {/* ── EDIT STAFF MEMBER MODAL ─── */}
      <PremiumModalWrapper
        isOpen={!!editingPersonnel}
        onClose={() => setEditingPersonnel(null)}
        title="Edit Staff"
        subtitle="Manage authorization scope"
        icon={<User2 size={20} strokeWidth={2.5} />}
      >
        {editingPersonnel && (
          <form onSubmit={handleEditPersonnelSubmit} className="flex flex-col !gap-6">
            <div className="!space-y-4">
              <div className="!space-y-1">
                <label className={premiumFormStyles.label}>Full Name</label>
                <input 
                  name="fullName" 
                  type="text" 
                  className={premiumFormStyles.input} 
                  defaultValue={editingPersonnel.full_name} 
                  required 
                />
              </div>
              <div className="!space-y-1">
                <label className={premiumFormStyles.label}>Identity Email (Locked)</label>
                <input 
                  name="email" 
                  type="email" 
                  className={cn(premiumFormStyles.input, "!bg-slate-50 !cursor-not-allowed !text-slate-400 !border-slate-100")} 
                  defaultValue={editingPersonnel.email} 
                  readOnly 
                  disabled 
                />
              </div>
              <div className="grid grid-cols-2 !gap-4">
                <div className="!space-y-1">
                  <label className={premiumFormStyles.label}>Assignment</label>
                  <AdminSelect
                    value={editingPersonnel.operator_id || ''}
                    onValueChange={(val) => {
                      const select = document.querySelector('select[name="operatorId"]') as HTMLSelectElement;
                      if (select) {
                        select.value = val;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    options={[{ id: '', name: 'Global Assignment' }, ...operators]}
                    getLabel={(op) => op.name}
                    getValue={(op) => op.id}
                    placeholder="Select Agency"
                  />
                  <select
                    name="operatorId"
                    className="hidden"
                    defaultValue={editingPersonnel.operator_id || ''}
                  >
                    <option value="">Global Assignment</option>
                    {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </select>
                </div>
                <div className="!space-y-1">
                  <label className={premiumFormStyles.label}>Access Role</label>
                  <AdminSelect
                    value={editingPersonnel.role}
                    onValueChange={(val) => {
                      const select = document.querySelector('select[name="role"]') as HTMLSelectElement;
                      if (select) {
                        select.value = val;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    options={[
                      { id: 'operator_sales', name: 'Sales' },
                      { id: 'operator_admin', name: 'Manager' },
                      { id: 'super_admin', name: 'Global Admin' }
                    ]}
                    getLabel={(r) => r.name}
                    getValue={(r) => r.id}
                    placeholder="Select Role"
                  />
                  <select
                    name="role"
                    className="hidden"
                    required
                    defaultValue={editingPersonnel.role}
                  >
                    <option value="operator_sales">Sales</option>
                    <option value="operator_admin">Manager</option>
                    <option value="super_admin">Global Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {editStatus && (
              <div className={editStatus.type === 'success' ? premiumFormStyles.success : premiumFormStyles.error}>
                {editStatus.type === 'success' ? <CheckCircle size={14} strokeWidth={2.5} /> : <AlertCircle size={14} strokeWidth={2.5} />}
                {editStatus.msg}
              </div>
            )}

            <button type="submit" disabled={formLoading} className={premiumFormStyles.button}>
              {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Commit Changes'}
            </button>
          </form>
        )}
      </PremiumModalWrapper>

      </div>
    );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={null}>
      <AdminPortal />
    </Suspense>
  );
}
