"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Globe, ShieldCheck, Search, X, MoveRight, Loader2, Users, Mail, UserPlus, AlertCircle, Settings, Trash2, LogOut, CheckCircle, LayoutGrid, MessageCircle, Camera, Share2, User2, Plus, Minus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { inviteOperatorUser, deletePersonnel, getAllPersonnel, updateProfile, getOperatorStats } from "@/app/actions/user-management";
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
  const [operatorConfirmed, setOperatorConfirmed] = useState<Record<string, { count: number; total: number }>>({});
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
  const [formLoading, setFormLoading] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
        .select('operator_id, grand_total, status')
        .in('operator_id', opIds)
        .in('status', confirmedStatuses);

      const lookup: Record<string, { count: number; total: number }> = {};
      (confirmedQuotes || []).forEach((q: any) => {
        if (!lookup[q.operator_id]) lookup[q.operator_id] = { count: 0, total: 0 };
        lookup[q.operator_id].count += 1;
        lookup[q.operator_id].total += (q.grand_total || 0);
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
    supabase.from('profiles').update({ operator_id: id }).eq('id', profile?.id).then(() => {
      window.location.href = "/dashboard";
    });
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
                className="flex items-center justify-between cursor-pointer group"
                style={cardStyle}
                onClick={() => handleSelectOperator(op.id)}
              >
                {/* Left: Icon + Info */}
                <div className="flex items-center gap-4">
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
                    </div>
                  </div>
                </div>

                {/* Right: Chips + Arrow */}
                <div className="flex items-center gap-2">
                  <span style={chipGreen}>{op._quoteCount || 0} Quote{(op._quoteCount || 0) !== 1 ? 's' : ''}</span>
                  <span style={chipGray}>{op._profileCount || 0} Staff</span>
                  <MoveRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--color-text-faint)', marginLeft: '4px' }} />
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
                    className="flex items-center justify-between group"
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
                      <button
                        onClick={() => handleDeleteUser(p.id)}
                        className="flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-faint)', cursor: 'pointer', background: 'transparent', marginLeft: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
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
      <AnimatePresence>
          {isInviting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '24px' }}>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsInviting(false)}
                className="absolute inset-0"
                style={modalOverlay}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="relative w-full max-h-[90vh] overflow-y-auto"
                style={{ ...modalCard, maxWidth: '480px', padding: '36px' }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{generatedLink ? 'Invite Link Generated' : 'Invite New User'}</h3>
                  <button onClick={() => { setIsInviting(false); setGeneratedLink(null); fetchPersonnel(); }} className="flex items-center justify-center hover:opacity-70" style={{ color: 'var(--color-text-faint)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                    <X size={20} />
                  </button>
                </div>

                {generatedLink ? (
                  <div className="flex flex-col" style={{ gap: '20px' }}>
                    <div className="flex flex-col items-center text-center" style={{ padding: '24px', background: 'var(--color-brand-soft)', borderRadius: '16px' }}>
                      <div className="flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-success)', color: 'white', marginBottom: '16px' }}>
                        <CheckCircle size={24} />
                      </div>
                      <h4 style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px', fontSize: '15px' }}>User Profile Created</h4>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: '220px' }}>
                        Share the link below with the user to grant access.
                      </p>
                    </div>

                    <div>
                      <label style={{ ...labelStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Private Access URL</label>
                      <div className="flex gap-2">
                        <div className="flex-1 truncate" style={{ ...inputStyle, height: '42px', padding: '0 14px', background: 'var(--color-bg-subtle)', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                          {generatedLink}
                        </div>
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 transition-all"
                          style={{ ...btnPrimary, padding: '0 20px', height: '42px', background: copied ? 'var(--color-success)' : 'var(--color-brand)' }}
                        >
                          {copied ? <CheckCircle size={14} /> : <Mail size={14} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => { setIsInviting(false); setGeneratedLink(null); fetchPersonnel(); }}
                      style={{ width: '100%', height: '44px', border: '1px solid var(--color-border-default)', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleInviteSubmit} className="flex flex-col" style={{ gap: '20px' }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input name="fullName" type="text" style={inputStyle} placeholder="e.g. Gabriel Rossetti" required
                        onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input name="email" type="email" style={inputStyle} placeholder="personnel@agency.com" required
                        onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={labelStyle}>Operator</label>
                        <select
                          name="operatorId"
                          style={{ ...inputStyle, opacity: inviteRole === 'super_admin' ? 0.5 : 1 }}
                          required={inviteRole !== 'super_admin'}
                          disabled={inviteRole === 'super_admin'}
                        >
                          <option value="">{inviteRole === 'super_admin' ? 'All Operators' : 'Select...'}</option>
                          {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Role</label>
                        <select
                          name="role"
                          style={inputStyle}
                          required
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                        >
                          <option value="operator_sales">Sales</option>
                          <option value="operator_admin">Manager</option>
                          <option value="super_admin">Global Admin</option>
                        </select>
                      </div>
                    </div>

                    {inviteRole === 'super_admin' && (
                      <div style={{ padding: '14px 16px', background: 'var(--color-brand-soft)', borderRadius: '12px', border: '1px solid var(--color-brand-border)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--color-brand)', lineHeight: 1.5 }}>
                          <strong style={{ display: 'block', marginBottom: '2px' }}>Global Admin Notice</strong>
                          This user will have full administrative access to all operators.
                        </p>
                      </div>
                    )}

                    {inviteStatus && (
                      <div className="flex items-center gap-2" style={{ padding: '14px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: inviteStatus.type === 'success' ? '#ECFDF5' : '#FEF2F2', color: inviteStatus.type === 'success' ? '#059669' : 'var(--color-danger)' }}>
                        {inviteStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {inviteStatus.msg}
                      </div>
                    )}

                    <button type="submit" disabled={formLoading} className="flex items-center justify-center hover:opacity-90 transition-opacity"
                      style={{ ...btnPrimary, width: '100%', height: '48px', opacity: formLoading ? 0.7 : 1 }}
                    >
                      {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Invite Link'}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── ADD OPERATOR MODAL ─── */}
        <AnimatePresence>
          {isAddingOperator && (
            <motion.div
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingOperator(false)}
              style={modalOverlay}
              className="z-[100]"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
                style={{ ...modalCard, maxWidth: '480px', padding: '36px' }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '28px' }}>
                  <h3 style={{ ...modalTitle, fontSize: '20px' }}>Register New Operator</h3>
                  <button onClick={() => setIsAddingOperator(false)} className="hover:opacity-70" style={{ color: 'var(--color-text-faint)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddOperatorSubmit} className="flex flex-col" style={{ gap: '20px' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Agency Name</label>
                      <input name="name" type="text" style={inputStyle} placeholder="e.g. Skyline Travel" required
                        onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Official Website</label>
                      <input name="website" type="text" style={inputStyle} placeholder="e.g. skyline.com"
                        onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border-light)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)' }}>Social Channels</label>
                      <button type="button" onClick={addSocialField} className="flex items-center gap-1 hover:opacity-80" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-brand)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                        <Plus size={12} /> Add Channel
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: '140px' }}>
                      {newSocialLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '14px', color: 'var(--color-text-faint)' }}>
                              {getSocialIcon(link)}
                            </div>
                            <input
                              name="socialLinks"
                              type="text"
                              style={{ ...inputStyle, paddingLeft: '38px', height: '40px', fontSize: '13px' }}
                              placeholder="fb.com/page or ig.com/user"
                              value={link}
                              onChange={(e) => updateSocialField(idx, e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSocialField(idx)}
                            className="flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                            style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--color-border-default)', color: 'var(--color-text-faint)', cursor: 'pointer', background: 'transparent' }}
                          >
                            <Minus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {operatorStatus && (
                    <div className="flex items-center gap-2" style={{ padding: '14px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: operatorStatus.type === 'success' ? '#ECFDF5' : '#FEF2F2', color: operatorStatus.type === 'success' ? '#059669' : 'var(--color-danger)' }}>
                      {operatorStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {operatorStatus.msg}
                    </div>
                  )}

                  <button type="submit" disabled={formLoading} className="flex items-center justify-center hover:opacity-90 transition-opacity"
                    style={{ ...btnPrimary, width: '100%', height: '48px', opacity: formLoading ? 0.7 : 1 }}
                  >
                    {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Register Agency'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              style={modalOverlay}
              className="z-[100]"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
                style={{ ...modalCard, maxWidth: '400px', padding: '36px' }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '28px' }}>
                  <h3 style={{ ...modalTitle, fontSize: '20px' }}>Account Settings</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="hover:opacity-70" style={{ color: 'var(--color-text-faint)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="flex flex-col" style={{ gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input type="text" style={inputStyle} value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required
                      onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border-light)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)', marginBottom: '16px' }}>Security Key Setup</p>
                    <div className="flex flex-col" style={{ gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>New Security Key</label>
                        <input type="password" style={inputStyle} placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Confirm Security Key</label>
                        <input type="password" style={inputStyle} placeholder="Re-enter to confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={(e) => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px var(--color-brand-soft)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--color-border-default)'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                    </div>
                  </div>

                  {passwordError && (
                    <div className="flex items-center gap-2" style={{ padding: '14px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: '#FEF2F2', color: 'var(--color-danger)' }}>
                      <AlertCircle size={14} />
                      {passwordError}
                    </div>
                  )}

                  <button type="submit" disabled={formLoading} className="flex items-center justify-center hover:opacity-90 transition-opacity"
                    style={{ ...btnPrimary, width: '100%', height: '48px', opacity: formLoading ? 0.7 : 1 }}
                  >
                    {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Update Account'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
