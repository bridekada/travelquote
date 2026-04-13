"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Globe, ShieldCheck, Search, X, MoveRight, Loader2, Users, Mail, UserPlus, AlertCircle, Settings, Trash2, LogOut, CheckCircle, LayoutGrid, MessageCircle, Camera, Share2, User2, Plus, Minus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { inviteOperatorUser, deletePersonnel, getAllPersonnel, updateProfile, getOperatorStats } from "@/app/actions/user-management";

interface AdminStats {
  totalQuotes: number;
  totalOperators: number;
  totalUsers: number;
}

export default function AdminPortal() {
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
  const [isManualLink, setIsManualLink] = useState(false);
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
      // 1. Update Profile (Name)
      const res = await updateProfile(profile.id, { fullName: newFullName });
      if (res.error) throw new Error(res.error);

      // 2. Update Password if provided
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
    // Update localStorage FIRST so useAuth picks up the correct operator
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
    // Social links are already in the form as multiple 'socialLinks' inputs
    
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center">

      {/* ── Slim Top Bar ─────────────────────────── */}
      <header className="bg-white border-b border-[#e8eaed] sticky top-0 z-40 w-full flex justify-center safe-top">
        <div className="max-w-4xl w-full px-4 md:px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 md:gap-3 cursor-pointer group hover:opacity-80 transition-all min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
              <LayoutGrid size={18} />
            </div>
            <span className="text-sm md:text-base font-bold text-primary tracking-tight truncate">Command Center</span>
            <span className="text-xs text-text-tertiary hidden sm:inline">·</span>
            <div className="items-center gap-1.5 hidden sm:flex">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-text-tertiary">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button
              onClick={() => { supabase.auth.signOut(); router.push("/"); }}
              className="h-9 w-9 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-secondary hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all cursor-pointer active:scale-90"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
            <div 
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 w-12 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all active:scale-95 shadow-lg shadow-primary/10"
              title="Account Settings"
              role="button"
              aria-label="Account Settings"
            >
              {profile?.full_name?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────── */}
      <main className="max-w-4xl w-full px-4 md:px-6 py-8 md:py-14">

        {/* Title */}
        <h1 className="text-2xl font-bold text-primary mb-1 tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-text-secondary mb-10">Manage operators, personnel, and system access.</p>

        {/* Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6 md:mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-text-tertiary" size={20} />
            <input
              type="text"
              placeholder={activeTab === 'operators' ? "Search operators..." : "Search personnel..."}
              className="w-full bg-white border border-[#e8eaed] rounded-xl py-3 md:py-4 !pl-12 md:!pl-16 pr-4 text-sm focus:outline-none focus:border-primary transition-colors focus:bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'personnel' ? (
            <button
              onClick={() => { setIsInviting(true); setGeneratedLink(null); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <UserPlus size={20} />
              Invite User
            </button>
          ) : (
            <button
              onClick={() => { setIsAddingOperator(true); setOperatorStatus(null); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Building2 size={20} />
              Add Operator
            </button>
          )}
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8" role="tablist">
          <button
            onClick={() => { setActiveTab('operators'); setSearchQuery(''); }}
            className={`px-6 md:!px-10 !py-3 rounded-full text-sm font-medium transition-all ${activeTab === 'operators' ? 'bg-primary text-white shadow-lg shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-secondary hover:border-primary hover:text-primary'}`}
            role="tab"
            aria-selected={activeTab === 'operators'}
          >
            Operators
          </button>
          <button
            onClick={() => { setActiveTab('personnel'); setSearchQuery(''); }}
            className={`px-6 md:!px-10 !py-3 rounded-full text-sm font-medium transition-all ${activeTab === 'personnel' ? 'bg-primary text-white shadow-lg shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-secondary hover:border-primary hover:text-primary'}`}
            role="tab"
            aria-selected={activeTab === 'personnel'}
          >
            Personnel
          </button>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-text-secondary">
            {activeTab === 'operators' ? (
              <>Showing <span className="font-bold text-primary">{filteredOperators.length}</span> operator{filteredOperators.length !== 1 && 's'}</>
            ) : (
              <>Showing <span className="font-bold text-primary">{filteredPersonnel.length}</span> team member{filteredPersonnel.length !== 1 && 's'}</>
            )}
          </p>
          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            <span><span className="font-bold text-primary">{stats.totalQuotes}</span> quotes</span>
            <span><span className="font-bold text-primary">{stats.totalUsers}</span> staff</span>
          </div>
        </div>

        {/* ── OPERATORS LIST ──────────────────────── */}
        {activeTab === 'operators' && (
          <div className="flex flex-col gap-2">
            {filteredOperators.map((op) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#e8eaed] rounded-xl px-4 md:px-6 py-3 flex items-center justify-between hover:border-primary/40 transition-colors group cursor-pointer shadow-sm shadow-primary/[0.02]"
                onClick={() => handleSelectOperator(op.id)}
              >
                {/* Left: Icon + Info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary leading-tight">{op.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {op.website && (
                        <a 
                          href={op.website.startsWith('http') ? op.website : `https://${op.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 px-2 bg-[#f0f2f5] rounded-full text-[8px] font-bold text-primary hover:border-primary border border-transparent transition-all flex items-center gap-1"
                        >
                          <Globe size={9} />
                          Website
                        </a>
                      )}
                      
                      {op.social_links && Array.isArray(op.social_links) && (
                        <div className="flex items-center gap-1">
                          {op.social_links.map((link: string, i: number) => (
                            <a
                              key={i}
                              href={link.startsWith('http') ? link : `https://${link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 bg-white border border-[#e8eaed] rounded-full flex items-center justify-center text-text-tertiary hover:text-primary transition-colors"
                              title={link}
                            >
                              {getSocialIcon(link)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Stats + Arrow */}
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-primary">{op._quoteCount || 0} quotes</div>
                    <div className="text-[10px] text-text-tertiary">{op._profileCount || 0} personnel</div>
                  </div>
                  {(operatorConfirmed[op.id]?.count || 0) > 0 && (
                    <div className="text-right hidden sm:block border-l border-[#f0f2f5] pl-4">
                      <div className="text-xs font-bold text-emerald-600">{operatorConfirmed[op.id].count} confirmed</div>
                      <div className="text-[10px] font-bold text-emerald-500/70">₱{operatorConfirmed[op.id].total.toLocaleString()}</div>
                    </div>
                  )}
                  <MoveRight size={16} className="text-text-tertiary group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}

            {filteredOperators.length === 0 && (
              <div className="text-center py-16 text-sm text-text-tertiary">
                No operators match your search.
              </div>
            )}
          </div>
        )}

        {/* ── PERSONNEL LIST ──────────────────────── */}
        {activeTab === 'personnel' && (
          <div className="flex flex-col gap-2">
            {personnelLoading ? (
              <div className="text-center py-16">
                <Loader2 className="animate-spin text-text-tertiary mx-auto mb-3" size={24} />
                <p className="text-sm text-text-tertiary">Loading personnel...</p>
              </div>
            ) : (
              <>
                {filteredPersonnel.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#e8eaed] rounded-xl px-4 md:px-6 py-3 flex items-center justify-between group shadow-sm shadow-primary/[0.02]"
                  >
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                        {p.full_name?.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-primary leading-tight">{p.full_name}</h3>
                        <p className="text-[10px] text-text-tertiary mt-0.5">{p.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full capitalize ${p.role === 'super_admin' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-accent/10 text-accent'}`}>
                          {p.role === 'super_admin' ? 'Global Admin' : (p.role === 'operator_admin' ? 'Manager' : 'Sales')}
                        </span>
                        {p.operators?.name ? (
                          <span className="text-[9px] font-medium bg-[#f0f2f5] text-text-secondary px-2 py-0.5 rounded-full">{p.operators.name}</span>
                        ) : p.role === 'super_admin' && (
                          <span className="text-[9px] font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Platform</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Delete */}
                    <button
                      onClick={() => handleDeleteUser(p.id)}
                      className="h-8 w-8 rounded-lg border border-[#e8eaed] flex items-center justify-center text-text-tertiary hover:border-error hover:text-error hover:bg-error/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}

                {filteredPersonnel.length === 0 && (
                  <div className="text-center py-16 text-sm text-text-tertiary">
                    No personnel found. Use &ldquo;Invite User&rdquo; to add team members.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ── MODALS ───────────────────────────────── */}
      <AnimatePresence>
        {isInviting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsInviting(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:!p-12 shadow-2xl border border-[#e8eaed] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-primary">{generatedLink ? 'Invite Link Generated' : 'Invite New User'}</h3>
                <button onClick={() => { setIsInviting(false); setGeneratedLink(null); fetchPersonnel(); }} className="text-text-tertiary hover:text-primary">
                  <X size={20} />
                </button>
              </div>

              {generatedLink ? (
                <div className="space-y-6 py-4">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                      <CheckCircle size={24} />
                    </div>
                    <h4 className="text-emerald-900 font-bold mb-1">User Profile Created</h4>
                    <p className="text-emerald-700/70 text-[11px] leading-relaxed max-w-[200px]">
                      The profile is ready. Share the link below with the user to grant access.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Private Access URL</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-[#f0f2f5] rounded-xl px-4 py-3 text-xs font-mono text-text-secondary truncate border border-[#e8eaed]">
                        {generatedLink}
                      </div>
                      <button 
                        onClick={copyToClipboard}
                        className={`px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:opacity-90'}`}
                      >
                        {copied ? <CheckCircle size={14} /> : <Mail size={14} />}
                        {copied ? 'Copied' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setIsInviting(false); setGeneratedLink(null); fetchPersonnel(); }}
                    className="w-full h-12 border border-[#e8eaed] text-text-secondary rounded-xl text-sm font-semibold hover:bg-[#f0f2f5] transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Full Name</label>
                    <input name="fullName" type="text" className="input" placeholder="e.g. Gabriel Rossetti" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Email Address</label>
                    <input name="email" type="email" className="input" placeholder="personnel@agency.com" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">Operator</label>
                      <select 
                        name="operatorId" 
                        className={`input ${inviteRole === 'super_admin' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                        required={inviteRole !== 'super_admin'}
                        disabled={inviteRole === 'super_admin'}
                      >
                        <option value="">{inviteRole === 'super_admin' ? 'All Operators' : 'Select...'}</option>
                        {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-secondary">Role</label>
                      <select 
                        name="role" 
                        className="input" 
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

                  <div className="flex items-center justify-between p-4 bg-[#f0f2f5] rounded-xl border border-[#e8eaed]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Manual Link Mode</span>
                      <span className="text-[10px] text-text-tertiary">Bypass email and copy link manually</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsManualLink(!isManualLink)}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${isManualLink ? 'bg-emerald-500' : 'bg-[#d1d5db]'}`}
                    >
                      <motion.div 
                        animate={{ x: isManualLink ? 20 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {inviteRole === 'super_admin' && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-[11px] text-primary/80 leading-relaxed">
                        <strong className="text-primary uppercase tracking-wider block mb-1">Global Admin Notice</strong>
                        This user will have full administrative access to all operators, platform-wide. No operator restriction will be applied.
                      </p>
                    </div>
                  )}

                  {inviteStatus && (
                    <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${inviteStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {inviteStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {inviteStatus.msg}
                    </div>
                  )}

                  <button type="submit" disabled={formLoading} className="w-full h-12 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center">
                    {formLoading ? <Loader2 className="animate-spin" size={18} /> : (isManualLink ? 'Generate Invite Link' : 'Send Invitation')}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* ── ADD OPERATOR MODAL ───────────────────── */}
        {isAddingOperator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddingOperator(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:!p-12 shadow-2xl border border-[#e8eaed] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-primary">Register New Operator</h3>
                <button onClick={() => setIsAddingOperator(false)} className="text-text-tertiary hover:text-primary">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddOperatorSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Agency Name</label>
                    <input name="name" type="text" className="input pr-4" placeholder="e.g. Skyline Travel" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary ml-1">Official Website</label>
                    <input name="website" type="text" className="input pr-4" placeholder="skyline-travel.com (Optional)" />
                  </div>
                </div>
                
                <div className="space-y-3 pt-2 border-t border-[#f0f2f5]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Social Channels</label>
                    <button type="button" onClick={addSocialField} className="text-[10px] font-bold text-accent px-3 py-1 bg-accent/5 rounded-full hover:bg-accent/10 transition-colors flex items-center gap-1">
                      <Plus size={10} /> Add Channel
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {newSocialLinks.map((link, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex-1 relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
                            {getSocialIcon(link)}
                          </div>
                          <input 
                            name="socialLinks"
                            type="text" 
                            className="input !pl-11 !py-3 text-xs" 
                            placeholder="fb.com/page or ig.com/user"
                            value={link}
                            onChange={(e) => updateSocialField(idx, e.target.value)}
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeSocialField(idx)}
                          className="w-10 h-10 rounded-xl border border-[#e8eaed] flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {operatorStatus && (
                  <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${operatorStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {operatorStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {operatorStatus.msg}
                  </div>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={formLoading} className="w-full h-14 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center">
                    {formLoading ? <Loader2 className="animate-spin" size={20} /> : 'Register Agency'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 md:!p-12 shadow-2xl border border-[#e8eaed] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-primary">Account Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-text-tertiary hover:text-primary">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Full Name</label>
                  <input type="text" className="input pr-4" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required />
                </div>
                
                <div className="pt-2 border-t border-[#f0f2f5]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary ml-1 mb-4">Security Key Setup</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary ml-1">New Security Key</label>
                      <input 
                        type="password" 
                        className="input" 
                        placeholder="Min. 6 characters"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary ml-1">Confirm Security Key</label>
                      <input 
                        type="password" 
                        className="input" 
                        placeholder="Re-enter to confirm"
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {passwordError && (
                  <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={14} />
                    {passwordError}
                  </div>
                )}

                <button type="submit" disabled={formLoading} className="w-full h-12 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center">
                  {formLoading ? <Loader2 className="animate-spin" size={18} /> : 'Update Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
