"use client";

import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import CalendarView from "./components/CalendarView";
import DashboardSidebar from "./components/DashboardSidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogOut, Plus, Search, Clock, CheckCircle, AlertCircle, FileText, Map as MapIcon, Loader2, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, X, CarFront, Trash2, Users, User, Banknote, Fuel, Minus, Settings, Sparkles, Briefcase, Zap, TrendingUp, BedDouble, Check, Calendar as CalendarIcon, ArrowUpDown, Globe, Share2, Info, Mail, Building2, MapPin, Phone, Key, AlertTriangle, ImagePlus, Save, Tag, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { InfoDialog } from "@/app/builder/components/BuilderModals";
import "@/app/builder/components/styles/InfoDialog.css";
import { PremiumModalWrapper, premiumFormStyles } from "../admin/components/PremiumModalWrapper";
import { AdminSelect } from "../admin/components/AdminSelect";
import { 
  getVehicles, 
  getItineraryPresets, 
  getMiscPresets, 
  getPackagePresets, 
  getGuestAccommodation,
  saveVehicle, 
  saveItineraryPreset, 
  saveMiscPreset, 
  savePackagePreset,
  saveGuestAccommodation,
  deleteVehicle,
  deleteItineraryPreset,
  deleteMiscPreset,
  deletePackagePreset,
  deleteGuestAccommodation
} from "@/app/actions/operational-config";
import { updateOperator } from "@/app/actions/user-management";
import {
  cardStyle, chipGreen, chipGray, btnPrimary, btnSecondary, btnAction, btnIcon,
  inputStyle, labelStyle, sectionLabel, headingMd,
  modalOverlay, modalCard, modalTitle, modalFormSpace,
  pageTitle, pageSubtitle, pageContainer, topBar, topBarInner, tabRowStyle,
  alertSuccess, alertError, inputFocus, inputBlur,
} from "@/lib/styles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function DashboardContent() {
  const router = useRouter();
  const { profile, loading: authLoading, selectedOperatorId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [paymentTotals, setPaymentTotals] = useState<Record<string, number>>({});
  const confirmedStatuses = ['Confirmed', 'Payment Started', 'Payment Complete'];
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [sortMethod, setSortMethod] = useState<'priority' | 'updated'>('updated');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [visibleQuotesCount, setVisibleQuotesCount] = useState(20);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgencySettingsOpen, setIsAgencySettingsOpen] = useState(false);
  const [agencyFormLoading, setAgencyFormLoading] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyWebsite, setNewAgencyWebsite] = useState("");
  const [newAgencyNotes, setNewAgencyNotes] = useState("");
  const [newAgencySocials, setNewAgencySocials] = useState<string[]>([]);
  const [newAgencyTitlePresets, setNewAgencyTitlePresets] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const validTabs = ['analytics', 'quotes', 'calendar', 'vehicles', 'accommodation', 'miscellaneous', 'itinerary', 'packages'] as const;
  const tabParam = searchParams.get('tab') as typeof validTabs[number] | null;
  const [activeTab, setActiveTab] = useState<typeof validTabs[number]>(validTabs.includes(tabParam as any) ? tabParam! : 'quotes');
  const [tabLoading, setTabLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(7);
  const [fleet, setFleet] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [miscPresets, setMiscPresets] = useState<any[]>([]);
  const [packagePresets, setPackagePresets] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [isAddingMisc, setIsAddingMisc] = useState(false);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    isOpen: boolean, 
    type: 'vehicle' | 'itinerary' | 'misc' | 'package' | 'accommodation' | 'quote' | null, 
    id: string, 
    title: string 
  }>({ isOpen: false, type: null, id: "", title: "" });

  useEffect(() => {
    if (profile) {
      setNewFullName(profile.full_name || "");
      if (profile.operators) {
        setNewAgencyName(profile.operators.name || "");
        setNewAgencyWebsite(profile.operators.website || "");
        setNewAgencyNotes(profile.operators.quotation_agency_notes || "");
        setNewAgencySocials(profile.operators.social_links || []);
        setNewAgencyTitlePresets(profile.operators.quote_title_presets || []);
      }
    }
  }, [profile]);

  useEffect(() => {
    setVisibleQuotesCount(20);
  }, [searchQuery, quoteStatusFilter, agentFilter, dateFilter, activeTab]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const fetchOperationalData = async () => {
    if (!profile || !selectedOperatorId) {
      setLoading(false);
      return;
    }
    
    try {
      setTabLoading(true);
      if (activeTab === 'quotes' || activeTab === 'analytics') {
        const { data, error } = await supabase
          .from('quotes')
          .select('*, creator:created_by(full_name), modifier:updated_by(full_name)')
          .eq('operator_id', selectedOperatorId)
          .order('eta', { ascending: true, nullsFirst: false });
          
        if (error) {
          console.error('Error fetching quotes:', error);
        } else {
          setQuotes(data || []);

          // Fetch payment totals for all quotes
          const quoteIds = (data || []).map((q: any) => q.id);
          if (quoteIds.length > 0) {
            const { data: payments } = await supabase
              .from('payments')
              .select('quote_id, amount')
              .in('quote_id', quoteIds);
            
            const totals: Record<string, number> = {};
            (payments || []).forEach((p: any) => {
              totals[p.quote_id] = (totals[p.quote_id] || 0) + (p.amount || 0);
            });
            setPaymentTotals(totals);
          }
        }
      } else if (activeTab === 'vehicles') {
        const res = await getVehicles(selectedOperatorId!);
        if (res.error) console.error('Dashboard: Vehicles fetch failed', res.error);
        setFleet(res.data || []);
      } else if (activeTab === 'itinerary') {
        const [presetsRes, miscRes] = await Promise.all([
          getItineraryPresets(selectedOperatorId!),
          getMiscPresets(selectedOperatorId!)
        ]);
        if (presetsRes.error) console.error('Dashboard: Itinerary fetch failed', presetsRes.error);
        if (miscRes.error) console.error('Dashboard: Misc fetch failed (itinerary tab)', miscRes.error);
        setPresets(presetsRes.data || []);
        setMiscPresets(miscRes.data || []);
      } else if (activeTab === 'miscellaneous') {
        const res = await getMiscPresets(selectedOperatorId!);
        if (res.error) console.error('Dashboard: Misc fetch failed', res.error);
        setMiscPresets(res.data || []);
      } else if (activeTab === 'packages') {
        const [pkgsRes, miscsRes] = await Promise.all([
          getPackagePresets(selectedOperatorId!),
          getMiscPresets(selectedOperatorId!)
        ]);
        if (pkgsRes.error) console.error('Dashboard: Packages fetch failed', pkgsRes.error);
        if (miscsRes.error) console.error('Dashboard: Misc fetch failed (packages tab)', miscsRes.error);
        setPackagePresets(pkgsRes.data || []);
        setMiscPresets(miscsRes.data || []);
      } else if (activeTab === 'accommodation') {
        const res = await getGuestAccommodation(selectedOperatorId!);
        if (res.error) console.error('Dashboard: Accommodation fetch failed', res.error);
        setAccommodations(res.data || []);
      }
    } catch (err) {
      console.error('Operational data fetch error:', err);
    } finally {
      setLoading(false);
      setTabLoading(false);
    }
  };

  useEffect(() => {
    // Only decide to redirect if auth is definitely finished loading
    if (!authLoading) {
      if (!profile) {
        // If no profile, we verify if there's even a user session
        // This gives a tiny bit more time for the profile to resolve 
        // if the session just was established (e.g. from a hash login)
        const checkFinal = async () => {
           const { data: { session } } = await supabase.auth.getSession();
           if (!session) {
             router.push("/");
           }
        };
        checkFinal();
      } else {
        fetchOperationalData();
      }
    }
  }, [profile, authLoading, router, selectedOperatorId, activeTab, refreshTrigger]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleUpdateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.operators?.id) return;
    setAgencyFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newAgencyName);
      formData.append('website', newAgencyWebsite);
      formData.append('quotation_agency_notes', newAgencyNotes);
      newAgencySocials.forEach(link => {
        if (link.trim()) formData.append('socialLinks', link.trim());
      });
      newAgencyTitlePresets.forEach(title => {
        if (title.trim()) formData.append('quoteTitlePresets', title.trim());
      });

      const res = await updateOperator(profile.operators.id, formData);
      if (res.error) throw new Error(res.error);

      setIsAgencySettingsOpen(false);
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Failed to update agency settings");
    } finally {
      setAgencyFormLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setPasswordError("");
    try {
      // 1. Update Profile (Name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: newFullName })
        .eq('id', profile?.id);
      if (profileError) throw profileError;

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
    } catch (error: any) {
      setPasswordError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (type: 'vehicle' | 'itinerary' | 'misc' | 'package' | 'accommodation' | 'quote', id: string, title?: string) => {
    setDeleteConfirm({
      isOpen: true,
      type,
      id,
      title: title || (type.charAt(0).toUpperCase() + type.slice(1))
    });
  };

  const executeDelete = async () => {
    const { type, id } = deleteConfirm;
    if (!type || !id) return;

    setLoading(true);
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    
    try {
      let res;
      if (type === 'vehicle') res = await deleteVehicle(id);
      else if (type === 'itinerary') res = await deleteItineraryPreset(id);
      else if (type === 'misc') res = await deleteMiscPreset(id);
      else if (type === 'package') res = await deletePackagePreset(id);
      else if (type === 'accommodation') res = await deleteGuestAccommodation(id);
      else if (type === 'quote') {
        // Cascade delete: payments → quote_items → quote
        const { error: paymentsErr } = await supabase.from('payments').delete().eq('quote_id', id);
        if (paymentsErr) throw new Error(`Failed to delete payments: ${paymentsErr.message}`);

        const { error: itemsErr } = await supabase.from('quote_items').delete().eq('quote_id', id);
        if (itemsErr) throw new Error(`Failed to delete quote items: ${itemsErr.message}`);

        const { error: quoteErr } = await supabase.from('quotes').delete().eq('id', id);
        if (quoteErr) throw new Error(`Failed to delete quote: ${quoteErr.message}`);

        res = { success: true };
      }
      
      if (res?.success) {
        setRefreshTrigger(prev => prev + 1);
      } else if (res?.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const allStatuses = ['Draft', 'Quotation Sent', 'Follow-up Needed', 'Confirmed', 'Payment Started', 'Payment Complete', 'Lost', 'Cancelled'];

  const calculateAnalytics = (days: number) => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const currentQuotes = quotes.filter(q => new Date(q.created_at) >= periodStart);
    const prevQuotes = quotes.filter(q => new Date(q.created_at) >= prevPeriodStart && new Date(q.created_at) < periodStart);

    const getStats = (list: any[]) => ({
      count: list.length,
      amount: list.reduce((sum, q) => sum + (q.grand_total || 0), 0),
    });

    const calcGrowth = (curr: number, p: number) => {
      if (p === 0) return curr > 0 ? 100 : 0;
      return ((curr - p) / p) * 100;
    };

    const currentTotal = getStats(currentQuotes);
    const prevTotal = getStats(prevQuotes);

    const statusMetrics: Record<string, { count: number; amount: number; growth: number }> = {};
    allStatuses.forEach(s => {
      const curr = getStats(currentQuotes.filter(q => q.status === s));
      const prev = getStats(prevQuotes.filter(q => q.status === s));
      statusMetrics[s] = { count: curr.count, amount: curr.amount, growth: calcGrowth(curr.amount, prev.amount) };
    });

    // Prepare trend data for Recharts
    const trendData = Array.from({ length: days }, (_, i) => {
      const date = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayQuotes = currentQuotes.filter(q => {
        const qDate = new Date(q.created_at);
        return qDate.toDateString() === date.toDateString();
      });
      return {
        name: dateStr,
        quotes: dayQuotes.length,
        value: dayQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0)
      };
    });

    // Leaderboard Aggregation
    const leaderboardMap: Record<string, { name: string, issuedCount: number, issuedAmount: number, confirmedCount: number, confirmedAmount: number }> = {};
    
    quotes.filter(q => new Date(q.created_at) >= periodStart).forEach(q => {
      const creatorId = q.created_by;
      const creatorName = q.creator?.full_name || "Unknown Agent";
      
      if (!leaderboardMap[creatorId]) {
        leaderboardMap[creatorId] = { 
          name: creatorName, 
          issuedCount: 0, 
          issuedAmount: 0, 
          confirmedCount: 0, 
          confirmedAmount: 0 
        };
      }
      
      const entry = leaderboardMap[creatorId];
      entry.issuedCount += 1;
      entry.issuedAmount += (q.grand_total || 0);
      
      const isConfirmed = confirmedStatuses.includes(q.status || '');
      if (isConfirmed) {
        entry.confirmedCount += 1;
        entry.confirmedAmount += (q.grand_total || 0);
      }
    });

    const leaderboard = Object.values(leaderboardMap);
    const confirmedList = currentQuotes.filter(q => confirmedStatuses.includes(q.status || ''));
    const confirmedStats = getStats(confirmedList);

    return {
      total: { 
        count: currentTotal.count, 
        amount: currentTotal.amount, 
        growth: calcGrowth(currentTotal.amount, prevTotal.amount) 
      },
      statusMetrics,
      trend: trendData,
      leaderboard: {
        issuers: [...leaderboard].sort((a, b) => b.issuedCount - a.issuedCount),
        closers: [...leaderboard].sort((a, b) => b.confirmedAmount - a.confirmedAmount)
      },
      confirmed: {
        count: confirmedStats.count,
        amount: confirmedStats.amount,
        commission: confirmedList.reduce((sum, q) => {
          const commPercent = q.admin_commission || 0;
          const total = q.selected_package_total || q.grand_total || 0;
          const commAmount = Math.round((total * commPercent) / (100 + commPercent));
          return sum + commAmount;
        }, 0),
        list: confirmedList
      }
    };
  };

  const analytics = calculateAnalytics(analyticsDays);

  const { baseFilteredQuotes, statusCounts } = useMemo(() => {
    const filtered = quotes.filter(q => {
      // Calculate Duration String for searching (e.g., "3D2N")
      let durationStr = "";
      if (q.eta && q.etd) {
        const d1 = new Date(q.eta);
        const d2 = new Date(q.etd);
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const nights = diffDays - 1;
        durationStr = `${diffDays}D${nights > 0 ? `${nights}N` : ""}`;
      }

      const paxStr = q.pax_count ? `${q.pax_count}pax` : "";
      const fleetSearchText = (q.fleet_json || q.fleet || []).map((v: any) => v.model).join(" ").toLowerCase();
      const matchesSearch = q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.vehicle_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fleetSearchText.includes(searchQuery.toLowerCase()) ||
        durationStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paxStr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgent = agentFilter === "All" || q.creator?.full_name === agentFilter;
        
      // Date Filtering Logic
      let matchesDate = true;
      if (dateFilter !== "All Time" && q.created_at) {
        const createdDate = new Date(q.created_at);
        const now = new Date();
        
        if (dateFilter === "Created Today") {
          matchesDate = createdDate.toDateString() === now.toDateString();
        } else if (dateFilter === "Last 7 Days") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchesDate = createdDate >= sevenDaysAgo;
        } else if (dateFilter === "This Month") {
          matchesDate = createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === "This Year") {
          matchesDate = createdDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesAgent && matchesDate;
    });

    const counts: Record<string, number> = { "All": filtered.length };
    allStatuses.forEach(s => {
      counts[s] = filtered.filter(q => q.status === s).length;
    });

    return { baseFilteredQuotes: filtered, statusCounts: counts };
  }, [quotes, searchQuery, agentFilter, dateFilter]);

  const filteredQuotes = useMemo(() => {
    const filtered = quoteStatusFilter === "All" 
      ? baseFilteredQuotes 
      : baseFilteredQuotes.filter(q => q.status === quoteStatusFilter);

    if (sortMethod === 'updated') {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA; // Most recent first
      });
    }

    // Default Priority Sort
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const getStatusPriority = (status: string, eta: string) => {
      if (!eta) return 2;
      const tripDate = new Date(eta);
      tripDate.setHours(0, 0, 0, 0);
      const isPast = tripDate < now;

      if (['Lost', 'Cancelled'].includes(status) || (isPast && !['Draft', 'Quotation Sent', 'Follow-up Needed'].includes(status))) return 2;
      if (['Draft', 'Quotation Sent', 'Follow-up Needed'].includes(status)) return 0;
      if (['Confirmed', 'Payment Started', 'Payment Complete'].includes(status)) return 1;
      return 2;
    };

    return [...filtered].sort((a, b) => {
      const pA = getStatusPriority(a.status, a.eta);
      const pB = getStatusPriority(b.status, b.eta);

      if (pA !== pB) return pA - pB;

      if (!a.eta && !b.eta) return 0;
      if (!a.eta) return 1;
      if (!b.eta) return -1;

      const dateA = new Date(a.eta).getTime();
      const dateB = new Date(b.eta).getTime();

      if (pA === 2) return dateB - dateA;
      return dateA - dateB;
    });
  }, [baseFilteredQuotes, quoteStatusFilter, sortMethod]);

  const filteredFleet = fleet.filter(v => 
    v.model?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPresets = presets.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.details?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMiscPresets = miscPresets.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPackagePresets = packagePresets.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAccommodations = accommodations.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleGroup = (status: string) => {
    setExpandedGroup(prev => prev === status ? null : status);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const isImpersonating = profile?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col h-screen overflow-hidden">
      {/* ── Admin Oversight Bar ──────────────────── */}
      {isImpersonating && (
        <div 
          className="bg-primary text-white w-full flex justify-center py-2 text-[10px] font-bold uppercase tracking-widest z-50 sticky top-0 md:relative shrink-0"
          style={{ background: 'var(--color-brand)' }}
        >
          <div className="w-full px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={12} className="text-white opacity-80" />
              <span>Oversight Mode: <span className="font-black">{profile.operators?.name}</span></span>
            </div>
            <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <ChevronLeft size={10} /> Exit Station
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex w-full overflow-hidden">
        <DashboardSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          validTabs={validTabs} 
          profile={profile} 
          onSettingsClick={() => setIsSettingsOpen(true)}
          onAgencySettingsClick={() => setIsAgencySettingsOpen(true)}
          isImpersonating={isImpersonating}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* ── Top Header ─────────────────────── */}
          <header id="dashboard-top-header" className="sticky top-0 z-30 w-full shrink-0 h-20 px-8 border-b border-slate-200/60 bg-white flex items-center">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100/50 shadow-sm">
                  {activeTab === 'quotes' && <FileText className="text-emerald-600" size={24} />}
                  {activeTab === 'calendar' && <CalendarIcon className="text-emerald-600" size={24} />}
                  {activeTab === 'analytics' && <BarChart3 className="text-emerald-600" size={24} />}
                  {activeTab === 'vehicles' && <CarFront className="text-emerald-600" size={24} />}
                  {activeTab === 'accommodation' && <BedDouble className="text-emerald-600" size={24} />}
                  {activeTab === 'miscellaneous' && <Settings className="text-emerald-600" size={24} />}
                  {activeTab === 'itinerary' && <MapIcon className="text-emerald-600" size={24} />}
                  {activeTab === 'packages' && <LayoutGrid className="text-emerald-600" size={24} />}
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1.5 flex items-center gap-2">
                    {activeTab === 'quotes' && "Quotation List"}
                    {activeTab === 'calendar' && "Deployment Schedule"}
                    {activeTab === 'analytics' && "Business Analytics"}
                    {activeTab === 'vehicles' && "Vehicle Fleet"}
                    {activeTab === 'accommodation' && "Accommodation Inventory"}
                    {activeTab === 'miscellaneous' && "Service Presets"}
                    {activeTab === 'itinerary' && "Trip Configurations"}
                    {activeTab === 'packages' && "Product Packages"}
                  </h1>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none opacity-80">
                    {activeTab === 'quotes' && "Manage and track your issued quotation records and transaction history."}
                    {activeTab === 'calendar' && "This calendar shows all quotes that has been confirmed."}
                    {activeTab === 'analytics' && `Company-wide performance for the last ${analyticsDays} days.`}
                    {activeTab === 'vehicles' && "Manage your transportation fleet and standard service rates."}
                    {activeTab === 'accommodation' && "Manage guest accommodation options with pax-based pricing."}
                    {activeTab === 'miscellaneous' && "Configure operator-level miscellaneous fee presets."}
                    {activeTab === 'itinerary' && "Create and manage reusable trip patterns and route configurations."}
                    {activeTab === 'packages' && "Configure reusable pricing packages."}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Header Actions (Dynamic) ────────────── */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                {activeTab === 'quotes' && (
                  <button onClick={() => router.push('/builder')} className="btn-header-action">
                    <Plus size={16} strokeWidth={2.5} />
                    <span className="mt-0.5">Issue Quote</span>
                  </button>
                )}
                {activeTab === 'vehicles' && (
                  <button onClick={() => { setEditingItem(null); setIsAddingVehicle(true); }} className="btn-header-action">
                    <CarFront size={16} strokeWidth={2.5} />
                    <span className="mt-0.5">Add Vehicle</span>
                  </button>
                )}
                {activeTab === 'itinerary' && (
                  <button onClick={() => { setEditingItem(null); setIsAddingPreset(true); }} className="btn-header-action">
                    <Plus size={16} strokeWidth={2.5} />
                    <span className="mt-0.5">Add Preset</span>
                  </button>
                )}
                {activeTab === 'accommodation' && (
                  <button onClick={() => { setEditingItem(null); setIsAddingAccommodation(true); }} className="btn-header-action">
                    <Plus size={16} strokeWidth={2.5} />
                    <span className="mt-0.5">Add Guest Room</span>
                  </button>
                )}
                {activeTab === 'miscellaneous' && (
                  <button onClick={() => { setEditingItem(null); setIsAddingMisc(true); }} className="btn-header-action">
                    <Plus size={16} strokeWidth={2.5} />
                    <span className="mt-0.5">Add Misc Fee</span>
                  </button>
                )}
                {activeTab === 'packages' && (
                  <button onClick={() => { setEditingItem(null); setIsAddingPackage(true); }} className="btn-header-action">
                    <Plus size={16} strokeWidth={2.5} />
                    <span className="mt-0.5">Add Package</span>
                  </button>
                )}
              </div>

              {/* ── Station Info (Fixed Far Right) ─────── */}
              <div className="flex items-center gap-4 ml-6">
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="station-header-pill group/station">
                  {(profile?.role === 'super_admin' || profile?.role === 'operator_admin') && (
                    <button 
                      onClick={() => setIsAgencySettingsOpen(true)}
                      className="mr-1 p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-emerald-600 transition-all group/btn"
                      title="Agency Settings"
                    >
                      <Settings size={14} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                    </button>
                  )}
                  <div className="flex flex-col justify-center text-right">
                    <span className="station-header-label">Station</span>
                    <span className="station-header-name">{profile?.operators?.name || 'Loading...'}</span>
                  </div>
                  <div className="station-header-icon">
                    {profile?.operators?.name?.substring(0, 1).toUpperCase() || 'A'}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
              #dashboard-top-header {
                padding-left: 32px !important;
                padding-right: 32px !important;
                height: 64px !important;
                background: #ffffff !important;
                border-bottom: 1px solid #f1f5f9 !important;
              }
              #dashboard-main-content {
                padding-left: 64px !important;
                padding-right: 64px !important;
                padding-top: ${activeTab === 'analytics' || activeTab === 'calendar' ? '16px' : '32px'} !important;
                padding-bottom: 32px !important;
                background: #f8f9fb !important;
              }
              .custom-scrollbar::-webkit-scrollbar {
                width: 10px !important;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9 !important;
                border-radius: 10px !important;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1 !important;
                border: 2px solid #f1f5f9 !important;
                border-radius: 10px !important;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8 !important;
              }
              .btn-header-action {
                background: #ffffff !important;
                color: #64748b !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 10px !important;
                height: 38px !important;
                padding: 0 18px !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                transition: all 0.2s ease !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                box-shadow: none !important;
                cursor: pointer !important;
                white-space: nowrap !important;
              }
              .btn-header-action:hover {
                background: #1e293b !important;
                color: #ffffff !important;
                border-color: #1e293b !important;
                box-shadow: 0 8px 16px -4px rgba(30, 41, 59, 0.2) !important;
                transform: translateY(-1px) !important;
              }
              .btn-header-action:active {
                transform: translateY(0px) scale(0.98) !important;
              }
              .btn-header-action svg {
                transition: transform 0.2s ease !important;
              }
              .btn-header-action:hover svg {
                transform: scale(1.1) !important;
              }
              .btn-load-more {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                background: #eff6ff !important;
                color: #2563eb !important;
                border: 1px solid #bfdbfe !important;
                border-radius: 10px !important;
                padding: 8px 18px !important;
                height: auto !important;
                min-height: 32px !important;
                font-size: 9.5px !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                transition: all 0.2s ease !important;
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06) !important;
                cursor: pointer !important;
                line-height: 1 !important;
              }
              .btn-load-more:hover {
                background: #dbeafe !important;
                border-color: #93c5fd !important;
                color: #1d4ed8 !important;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12) !important;
                transform: translateY(-1px) !important;
              }
              .btn-load-more:active {
                transform: translateY(0px) scale(0.98) !important;
              }
              .station-header-pill {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                padding: 6px 6px 6px 16px !important;
                background: transparent !important;
                border: 1px solid transparent !important;
                border-radius: 12px !important;
                margin-right: 8px !important;
                transition: all 0.2s ease !important;
              }
              .station-header-pill:hover {
                background: #ffffff !important;
                border-color: #cbd5e1 !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
              }
              .station-header-icon {
                width: 32px !important;
                height: 32px !important;
                border-radius: 8px !important;
                background: #00674f !important;
                color: white !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 10px !important;
                font-weight: 900 !important;
                flex-shrink: 0 !important;
              }
              .station-header-label {
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                font-size: 7px !important;
                font-weight: 900 !important;
                color: #10b981 !important;
                display: block !important;
                line-height: 1 !important;
                margin-bottom: 2px !important;
              }
              .station-header-name {
                font-size: 10px !important;
                font-weight: 800 !important;
                color: #334155 !important;
                display: block !important;
                line-height: 1 !important;
                letter-spacing: -0.01em !important;
              }
            `}} />
            <main id="dashboard-main-content" className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fb]">
              {/* Fixed Header Section */}
              <div className={`flex flex-col gap-6 shrink-0 px-8 ${activeTab !== 'analytics' && activeTab !== 'calendar' ? 'pt-8 pb-4' : 'pt-0 pb-0'}`}>
                <style dangerouslySetInnerHTML={{ __html: `
                  .sort-toggle-container {
                    display: flex !important;
                    align-items: center !important;
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 9999px !important;
                    padding: 2px !important;
                    gap: 2px !important;
                    height: 28px !important;
                    width: auto !important;
                    min-height: 0 !important;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                    margin: 0 !important;
                  }
                  .sort-toggle-btn {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 5px !important;
                    height: 20px !important;
                    min-height: 0 !important;
                    width: auto !important;
                    padding: 0 10px !important;
                    border-radius: 9999px !important;
                    font-size: 8.5px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    transition: all 0.2s ease !important;
                    border: none !important;
                    cursor: pointer !important;
                    outline: none !important;
                    background: transparent !important;
                    color: #94a3b8 !important;
                    margin: 0 !important;
                    line-height: 1 !important;
                    flex: none !important;
                  }
                  .sort-toggle-btn:hover {
                    color: #64748b !important;
                    background: #f8fafc !important;
                  }
                  .sort-toggle-btn.active {
                    background: #00674f !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 10px rgba(0, 103, 79, 0.2) !important;
                  }
                `}} />
                {activeTab !== 'analytics' && activeTab !== 'calendar' && (
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-text-tertiary" size={20} />
                      <input 
                        type="text" 
                        placeholder={`Filter ${activeTab} records...`} 
                        className="w-full bg-white border border-[#e8eaed] rounded-xl py-3 md:py-4 !pl-12 md:!pl-16 pr-4 text-sm focus:outline-none focus:border-primary transition-colors focus:bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {activeTab === 'quotes' && (
                      <div className="flex items-center gap-3">
                        <Select value={dateFilter} onValueChange={(val) => setDateFilter(val || "All Time")}>
                          <SelectTrigger className="!w-fit min-w-[140px] !h-9 !rounded-xl !bg-white !border-[#e8eaed] !px-4 text-[10px] font-bold uppercase tracking-widest hover:!border-primary transition-all">
                            <div className="flex items-center gap-2">
                              <CalendarIcon size={14} className="text-emerald-500 opacity-80" />
                              <SelectValue placeholder="Created Today" />
                            </div>
                          </SelectTrigger>
                          <SelectContent align="center" sideOffset={4} className="rounded-2xl border-slate-100 shadow-2xl !p-1 min-w-[180px]">
                            {['All Time', 'Created Today', 'Last 7 Days', 'This Month', 'This Year'].map(opt => (
                              <SelectItem key={opt} value={opt} className="!text-[10px] font-bold px-4 !py-1 !h-auto !min-h-0 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl transition-colors mb-0 last:mb-0">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={agentFilter} onValueChange={(val) => setAgentFilter(val || "All")}>
                          <SelectTrigger className="!w-fit min-w-[140px] !h-9 !rounded-xl !bg-white !border-[#e8eaed] !px-4 text-[10px] font-bold uppercase tracking-widest hover:!border-primary transition-all">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-text-tertiary opacity-60" />
                              <SelectValue placeholder="All Agents" />
                            </div>
                          </SelectTrigger>
                          <SelectContent align="center" sideOffset={4} className="rounded-2xl border-slate-100 shadow-2xl !p-1 min-w-[200px]">
                            <SelectItem value="All" className="!text-[10px] font-bold px-4 !py-1 !h-auto !min-h-0 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl mb-0">All Agents</SelectItem>
                            {Array.from(new Set(quotes.map(q => q.creator?.full_name).filter(Boolean))).map(name => (
                              <SelectItem key={name as string} value={name as string} className="!text-[10px] font-bold px-4 !py-1 !h-auto !min-h-0 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl mb-0 last:mb-0">
                                {name as string}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'quotes' && quotes.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs md:text-sm text-text-secondary shrink-0">
                        Showing <span className="font-bold text-primary">{filteredQuotes.length}</span> record{filteredQuotes.length !== 1 && 's'}
                      </p>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 mt-0.5">Order:</span>
                        <div className="sort-toggle-container">
                          <button type="button" onClick={() => setSortMethod('priority')} className={`sort-toggle-btn ${sortMethod === 'priority' ? 'active' : ''}`}>
                            <Zap size={10} strokeWidth={3} className={sortMethod === 'priority' ? 'text-white' : 'text-emerald-500'} />
                            Priority
                          </button>
                          <button type="button" onClick={() => setSortMethod('updated')} className={`sort-toggle-btn ${sortMethod === 'updated' ? 'active' : ''}`}>
                            <Clock size={10} strokeWidth={3} className={sortMethod === 'updated' ? 'text-white' : 'text-emerald-500'} />
                            Recent
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1 border-b border-[#f1f3f5]">
                      {["All", ...allStatuses].map(status => {
                        const count = statusCounts[status] || 0;
                        const isActive = quoteStatusFilter === status;
                        const shortNames: Record<string, string> = {
                          'Quotation Sent': 'Sent', 'Follow-up Needed': 'Follow-up', 'Payment Started': 'Paying', 'Payment Complete': 'Paid', 'Cancelled': 'Cancelled'
                        };
                        const displayName = shortNames[status] || status;
                        return (
                          <button key={status} onClick={() => setQuoteStatusFilter(status)} className={`group relative pb-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${isActive ? 'text-primary border-primary' : 'text-text-tertiary border-transparent hover:text-primary hover:border-primary/30'}`}>
                            <div className="flex items-center gap-1.5">{displayName} <span className={`text-[8px] font-black ${isActive ? 'text-primary' : 'text-text-tertiary/50'}`}>{count}</span></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Content Body */}
              <div className={`flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 flex flex-col ${activeTab === 'analytics' || activeTab === 'calendar' ? 'gap-0 pt-2' : 'gap-6'}`}>
                {activeTab !== 'analytics' && activeTab !== 'calendar' && <div className="h-1 shrink-0" />}

        <div className="flex flex-col gap-2">
          {tabLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-primary" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Loading data...</p>
            </div>
          ) : (
          <>
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-emerald-600" />
                  <span className="text-xs font-black tracking-widest text-slate-400 uppercase">Range</span>
                </div>
                <div className="relative flex items-center bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--color-border-default)] w-fit overflow-hidden shadow-sm gap-1.5">
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setAnalyticsDays(days as 7 | 30 | 90)}
                      className={`relative z-10 px-5 py-2.5 min-w-[72px] rounded-xl text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
                        analyticsDays === days ? "text-white" : "text-text-tertiary hover:text-text-primary"
                      }`}
                    >
                      <span>{days}D</span>
                      {analyticsDays === days && (
                        <motion.div
                          layoutId="activeRange"
                          className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div 
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(37, 99, 235, 0.15), 0 0 20px -5px rgba(37, 99, 235, 0.1)", borderColor: "rgba(37, 99, 235, 0.3)" }}
                  style={cardStyle} 
                  className="!p-5 flex items-center justify-between !bg-blue-50/20 border-blue-500/10 transition-all group cursor-default"
                >
                  <div>
                    <p style={sectionLabel} className="mb-0.5">Confirmed Quotes</p>
                    <h3 style={headingMd} className="text-2xl tracking-tight !text-blue-600">₱{Math.round(analytics.confirmed.amount).toLocaleString('en-US')}</h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-0.5">{analytics.confirmed.count} Record{analytics.confirmed.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                  >
                    <CheckCircle size={22} />
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(37, 99, 235, 0.15), 0 0 20px -5px rgba(37, 99, 235, 0.1)", borderColor: "rgba(37, 99, 235, 0.3)" }}
                  style={cardStyle} 
                  className="!p-5 flex items-center justify-between !bg-blue-50/20 border-blue-500/10 transition-all group cursor-default"
                >
                  <div>
                    <p style={sectionLabel} className="mb-0.5">Total Collection</p>
                    <h3 style={headingMd} className="text-2xl tracking-tight !text-blue-600">₱{Math.round(
                      analytics.confirmed.list.reduce((sum, q) => sum + (paymentTotals[q.id] || 0), 0)
                    ).toLocaleString('en-US')}</h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-0.5">From {
                      analytics.confirmed.list.filter(q => (paymentTotals[q.id] || 0) > 0).length
                    } quote{analytics.confirmed.list.filter(q => (paymentTotals[q.id] || 0) > 0).length !== 1 ? 's' : ''}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                  >
                    <Banknote size={22} />
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(37, 99, 235, 0.15), 0 0 20px -5px rgba(37, 99, 235, 0.1)", borderColor: "rgba(37, 99, 235, 0.3)" }}
                  style={cardStyle} 
                  className="!p-5 flex items-center justify-between !bg-blue-50/20 border-blue-500/10 transition-all group cursor-default"
                >
                  <div>
                    <p style={sectionLabel} className="mb-0.5">Total Commission</p>
                    <h3 style={headingMd} className="text-2xl tracking-tight !text-blue-600">₱{Math.round(analytics.confirmed.commission).toLocaleString('en-US')}</h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-0.5">Earned from confirmed deals</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                  >
                    <TrendingUp size={22} />
                  </div>
                </motion.div>
              </div>

              <AgentPerformanceLeaderboard 
                  issuers={analytics.leaderboard.issuers} 
                  closers={analytics.leaderboard.closers} 
                />

                <motion.div 
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(16, 185, 129, 0.15), 0 0 20px -5px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" }}
                  style={cardStyle} 
                  className="!p-8 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 style={headingMd} className="flex items-center gap-2">
                        <TrendingUp size={20} style={{ color: 'var(--color-brand)' }} />
                        Quotation Trend Velocity
                      </h4>
                      <p style={pageSubtitle} className="!mb-0">Daily record volume for the last {analyticsDays} days.</p>
                    </div>
                  </div>
                  <div className="h-[180px] w-full">
                    <OperationalTrendGraph data={analytics.trend} />
                  </div>
                </motion.div>
              </div>
            )}

          {activeTab === 'calendar' && (
            <CalendarView quotes={quotes} />
          )}

          {activeTab === 'quotes' && (
            quotes.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* List Items rendered here */}

                <div className="flex flex-col gap-3">
                  {(() => {
                    const displayQuotes = filteredQuotes;
                    
                    if (displayQuotes.length === 0) {
                      return (
                        <div className="text-center py-20 bg-white border border-[#e8eaed] rounded-3xl">
                          <Search className="mx-auto mb-4 text-text-tertiary opacity-30" size={40} />
                          <h3 className="text-sm font-bold text-primary mb-1">No matching quotes</h3>
                          <p className="text-[10px] text-text-secondary">Try a different search term or status filter.</p>
                        </div>
                      );
                    }

                    const paginatedQuotes = displayQuotes.slice(0, visibleQuotesCount);

                    return (
                      <>
                        {paginatedQuotes.map((quote: any) => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const twoWeeks = new Date();
                          twoWeeks.setDate(now.getDate() + 14);
                          twoWeeks.setHours(23, 59, 59, 999);
                          
                          const tripDate = new Date(quote.eta);
                          tripDate.setHours(0, 0, 0, 0);
                          
                          const isUrgent = ['Draft', 'Quotation Sent', 'Follow-up Needed'].includes(quote.status || '') && 
                            quote.eta && tripDate >= now && tripDate <= twoWeeks;

                          return (
                            <QuoteListItem 
                              key={quote.id}
                              quoteId={quote.id}
                              customer={quote.customer_name} 
                              route={(() => {
                                const fleet = quote.fleet_json || quote.fleet || [];
                                if (Array.isArray(fleet) && fleet.length > 0) {
                                  const names = fleet.map((v: any) => v.model);
                                  if (names.length > 2) {
                                    return `${names[0]}, ${names[1]}, ...`;
                                  }
                                  return names.join(", ");
                                }
                                return quote.vehicle_model || "Private Trip";
                              })()} 
                              date={quote.eta ? new Date(quote.eta).toLocaleDateString() : "TBD"} 
                              etd={quote.etd ? new Date(quote.etd).toLocaleDateString() : null} 
                              rawEta={quote.eta}
                              rawEtd={quote.etd}
                              status={quote.status} 
                              isUrgent={isUrgent}
                              amount={`₱${Math.round(quote.grand_total || 0).toLocaleString()}`}
                              totalPaid={paymentTotals[quote.id] || 0}
                              adminCommission={quote.admin_commission || 0}
                              agent={quote.creator?.full_name}
                              createdAt={quote.created_at}
                              modifier={quote.modifier?.full_name}
                              updatedAt={quote.updated_at}
                              currentUserId={profile?.id}
                              paxCount={quote.pax_count}
                              onClick={() => router.push(`/builder?id=${quote.id}`)}
                              onStatusChange={(newStatus: string) => {
                                setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: newStatus } : q));
                              }}
                              onDelete={() => handleDelete('quote', quote.id, quote.customer_name || 'Untitled Quote')}
                            />
                          );
                        })}
                        {displayQuotes.length > visibleQuotesCount && (
                          <div className="flex justify-center pt-8 pb-12">
                            <button
                              type="button"
                              onClick={() => setVisibleQuotesCount(prev => prev + 20)}
                              className="btn-load-more"
                            >
                              <Plus size={14} strokeWidth={2.5} className="text-blue-500" />
                              <span>Load More Records ({displayQuotes.length - visibleQuotesCount} remaining)</span>
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <EmptyState 
                title="No quotation records" 
                desc="Create your first quote to get started." 
                onAction={() => router.push('/builder')}
                actionLabel="Launch Builder"
              />
            )
          )}

          {activeTab === 'vehicles' && (
            fleet.length > 0 ? (
              filteredFleet.length > 0 ? (
                filteredFleet.map((v: any) => (
                  <VehicleListItem 
                    key={v.id} 
                    vehicle={v} 
                    onEdit={() => { setEditingItem(v); setIsAddingVehicle(true); }} 
                    onDelete={() => handleDelete('vehicle', v.id, v.model)}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white border border-[#e8eaed] rounded-3xl">
                  <Search className="mx-auto mb-4 text-text-tertiary opacity-30" size={40} />
                  <h3 className="text-sm font-bold text-primary mb-1">No matching vehicles</h3>
                  <p className="text-[10px] text-text-secondary">Try a different search term.</p>
                </div>
              )
            ) : (
              <EmptyState 
                title="Fleet is empty" 
                desc="Register your vehicles to automate costing calculations." 
                onAction={() => { setEditingItem(null); setIsAddingVehicle(true); }}
                actionLabel="Add Vehicle"
                icon={<CarFront size={48} />}
              />
            )
          )}

          {activeTab === 'itinerary' && (
            presets.length > 0 ? (
              filteredPresets.length > 0 ? (
                filteredPresets.map((p: any) => (
                  <PresetListItem 
                    key={p.id} 
                    preset={p} 
                    onEdit={() => { setEditingItem(p); setIsAddingPreset(true); }} 
                    onDelete={() => handleDelete('itinerary', p.id, p.title)}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white border border-[#e8eaed] rounded-3xl">
                  <Search className="mx-auto mb-4 text-text-tertiary opacity-30" size={40} />
                  <h3 className="text-sm font-bold text-primary mb-1">No matching presets</h3>
                  <p className="text-[10px] text-text-secondary">Try a different search term.</p>
                </div>
              )
            ) : (
              <EmptyState 
                title="No presets defined" 
                desc="Create reusable itinerary patterns for faster quoting." 
                onAction={() => { setEditingItem(null); setIsAddingPreset(true); }}
                actionLabel="Define Preset"
                icon={<MapIcon size={48} />}
              />
            )
          )}

          {activeTab === 'miscellaneous' && (
            miscPresets.length > 0 ? (
              filteredMiscPresets.length > 0 ? (
                filteredMiscPresets.map((m: any) => (
                  <MiscPresetListItem 
                    key={m.id} 
                    preset={m} 
                    onEdit={() => { setEditingItem(m); setIsAddingMisc(true); }} 
                    onDelete={() => handleDelete('misc', m.id, m.name)}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white border border-[#e8eaed] rounded-3xl">
                  <Search className="mx-auto mb-4 text-text-tertiary opacity-30" size={40} />
                  <h3 className="text-sm font-bold text-primary mb-1">No matching misc fees</h3>
                  <p className="text-[10px] text-text-secondary">Try a different search term.</p>
                </div>
              )
            ) : (
              <EmptyState 
                title="No misc fees" 
                desc="Configure presets for ferry fares, driver meals, etc." 
                onAction={() => { setEditingItem(null); setIsAddingMisc(true); }}
                actionLabel="Add Misc Fee"
                icon={<Banknote size={48} />}
              />
            )
          )}

          {activeTab === 'packages' && (
            packagePresets.length > 0 ? (
              filteredPackagePresets.length > 0 ? (
                filteredPackagePresets.map((p: any) => (
                  <PackageListItem 
                    key={p.id} 
                    packageItem={p} 
                    miscPresets={miscPresets}
                    onEdit={() => { setEditingItem(p); setIsAddingPackage(true); }} 
                    onDelete={() => handleDelete('package', p.id, p.title)}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white border border-[#e8eaed] rounded-3xl">
                  <Search className="mx-auto mb-4 text-text-tertiary opacity-30" size={40} />
                  <h3 className="text-sm font-bold text-primary mb-1">No matching packages</h3>
                  <p className="text-[10px] text-text-secondary">Try a different search term.</p>
                </div>
              )
            ) : (
              <EmptyState 
                title="No packages" 
                desc="Bundle services into predefined quotation packages." 
                onAction={() => { setEditingItem(null); setIsAddingPackage(true); }}
                actionLabel="Add Package"
                icon={<LayoutGrid size={48} />}
              />
            )
          )}

          {activeTab === 'accommodation' && (
            accommodations.length > 0 ? (
              filteredAccommodations.length > 0 ? (
                filteredAccommodations.map((a: any) => (
                  <AccommodationListItem 
                    key={a.id} 
                    item={a}
                    onEdit={() => { setEditingItem(a); setIsAddingAccommodation(true); }} 
                    onDelete={() => handleDelete('accommodation', a.id, a.name)}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white border border-[#e8eaed] rounded-3xl">
                  <Search className="mx-auto mb-4 text-text-tertiary opacity-30" size={40} />
                  <h3 className="text-sm font-bold text-primary mb-1">No matching accommodations</h3>
                  <p className="text-[10px] text-text-secondary">Try a different search term.</p>
                </div>
              )
            ) : (
              <EmptyState 
                title="No accommodations configured" 
                desc="Add guest accommodation options with pax-based pricing." 
                onAction={() => { setEditingItem(null); setIsAddingAccommodation(true); }}
                actionLabel="Add Accommodation"
                icon={<BedDouble size={48} />}
              />
            )
          )}
          </>
          )}
        </div>
      </div>

        <AnimatePresence>
          <AgencySettingsModal 
            isOpen={isAgencySettingsOpen}
            onClose={() => setIsAgencySettingsOpen(false)}
            onSave={handleUpdateAgency}
            name={newAgencyName}
            setName={setNewAgencyName}
            website={newAgencyWebsite}
            setWebsite={setNewAgencyWebsite}
            notes={newAgencyNotes}
            setNotes={setNewAgencyNotes}
            socials={newAgencySocials}
            setSocials={setNewAgencySocials}
            titlePresets={newAgencyTitlePresets}
            setTitlePresets={setNewAgencyTitlePresets}
            loading={agencyFormLoading}
          />

          <UserSettingsModal
            key="settings-modal"
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            fullName={newFullName}
            setFullName={setNewFullName}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            passwordError={passwordError}
            role={profile?.role || ""}
            onSave={handleUpdateProfile}
            loading={formLoading}
          />

          {isAddingVehicle && (
            <AddVehicleModal 
              key="vehicle-modal"
              onClose={() => setIsAddingVehicle(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              onSuccess={() => { setIsAddingVehicle(false); setActiveTab('vehicles'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingPreset && (
            <AddPresetModal 
              key="preset-modal"
              onClose={() => setIsAddingPreset(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              miscPresets={miscPresets}
              onSuccess={() => { setIsAddingPreset(false); setActiveTab('itinerary'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingMisc && (
            <AddMiscModal 
              key="misc-modal"
              onClose={() => setIsAddingMisc(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              onSuccess={() => { setIsAddingMisc(false); setActiveTab('miscellaneous'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingPackage && (
            <AddPackageModal 
              key="package-modal"
              onClose={() => setIsAddingPackage(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              miscPresets={miscPresets}
              onSuccess={() => { setIsAddingPackage(false); setActiveTab('packages'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingAccommodation && (
            <AddAccommodationModal 
              key="accommodation-modal"
              onClose={() => setIsAddingAccommodation(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              onSuccess={() => { setIsAddingAccommodation(false); setActiveTab('accommodation'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}
        </AnimatePresence>

        <PremiumConfirmDialog 
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
          onConfirm={executeDelete}
          title={deleteConfirm.title}
          type={deleteConfirm.type}
        />
        </main>

        {/* ── Right Feature Container ──────────────── */}
        <aside className="hidden xl:flex flex-col w-80 bg-white border-l border-slate-200/60 items-center justify-center pb-32">
          <div className="p-10 w-full flex flex-col items-center text-center gap-10">
            <div className="w-24 h-24 rounded-[32px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center text-slate-300 border border-slate-50 transition-transform hover:scale-105 duration-500">
              <Sparkles size={40} strokeWidth={1.2} />
            </div>
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-800 tracking-tight">More Feature Coming Soon</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 leading-relaxed max-w-[220px] opacity-80">
                We're building something premium for your workstation.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</div>
);
}

function AgencySettingsModal({ 
  isOpen, onClose, onSave, name, setName, website, setWebsite, notes, setNotes, socials, setSocials, titlePresets, setTitlePresets, loading 
}: any) {
  const [isTitlesExpanded, setIsTitlesExpanded] = useState(false);
  const getSocialIcon = (url: string) => {
    const low = url.toLowerCase();
    if (low.includes('facebook.com') || low.includes('fb.com')) return <Share2 size={14} />;
    if (low.includes('instagram.com') || low.includes('ig.com')) return <Share2 size={14} />;
    return <Globe size={14} />;
  };

  return (
    <PremiumModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Agency"
      subtitle="Modify profile and quotation configuration"
      icon={<Building2 size={18} strokeWidth={2.5} />}
    >
      <form onSubmit={onSave} className="flex flex-col !gap-6">
        <div className="!space-y-4">
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>AGENCY IDENTITY</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className={premiumFormStyles.input}
              placeholder="e.g. Skyline Travel"
              required 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>OFFICIAL DOMAIN</label>
            <input 
              value={website} 
              onChange={(e) => setWebsite(e.target.value)} 
              className={premiumFormStyles.input}
              placeholder="e.g. skyline.com"
            />
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10">
          <div className="flex items-center justify-between !mb-3">
            <label className={premiumFormStyles.label}>SOCIAL CHANNELS</label>
            <button 
              type="button" 
              onClick={() => setSocials([...socials, ""])} 
              className="!text-[10px] !font-black !text-emerald-600 hover:!text-emerald-700 !flex !items-center !gap-1 !uppercase !tracking-widest"
            >
              <Plus size={12} /> Add Channel
            </button>
          </div>
          <div className="flex flex-col !gap-2 !max-h-[140px] !overflow-y-auto custom-scrollbar">
            {(socials.length > 0 ? socials : [""]).map((link: string, idx: number) => (
              <div key={idx} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute top-1/2 -translate-y-1/2 !left-3.5 !text-emerald-500/50">
                    {getSocialIcon(link)}
                  </div>
                  <input 
                    value={link} 
                    onChange={(e) => {
                      const next = [...socials];
                      if (next.length === 0) next.push("");
                      next[idx] = e.target.value;
                      setSocials(next);
                    }} 
                    className={cn(premiumFormStyles.input, "!pl-10 !h-10 !text-[12px]")}
                    placeholder="e.g. fb.com/agency"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    const next = socials.filter((_: any, i: number) => i !== idx);
                    setSocials(next.length > 0 ? next : [""]);
                  }}
                  className="!flex !items-center !justify-center !w-10 !h-10 !rounded-xl !bg-slate-50 !text-slate-400 hover:!bg-rose-50 hover:!text-rose-500 !transition-all !border !border-slate-100"
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10">
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>QUOTATION DISCLAIMERS</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className={cn(premiumFormStyles.input, "!h-24 !py-3 !text-[12px] !leading-relaxed")}
              placeholder="Terms & conditions, payment instructions, etc."
            />
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10">
          <button 
            type="button" 
            onClick={() => setIsTitlesExpanded(!isTitlesExpanded)}
            className="!flex !items-center !gap-2 !w-full"
          >
            <ChevronDown size={14} className={cn("!text-emerald-500/50 !transition-transform", isTitlesExpanded && "!rotate-180")} />
            <label className={cn(premiumFormStyles.label, "!mb-0 !cursor-pointer")}>TITLE PRESETS</label>
            <span className="!text-[10px] !text-slate-400 !font-medium">({titlePresets?.length || 0})</span>
          </button>
          
          <AnimatePresence>
            {isTitlesExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="!pt-4 !space-y-2">
                  <div className="!flex !justify-end">
                    <button 
                      type="button" 
                      onClick={() => setTitlePresets([...(titlePresets || []), ""])} 
                      className="!text-[10px] !font-black !text-emerald-600 hover:!text-emerald-700 !flex !items-center !gap-1 !uppercase !tracking-widest"
                    >
                      <Plus size={12} /> Add Title
                    </button>
                  </div>
                  <div className="!space-y-2 !max-h-[140px] !overflow-y-auto custom-scrollbar">
                    {((titlePresets && titlePresets.length > 0) ? titlePresets : [""]).map((title: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          value={title} 
                          onChange={(e) => {
                            const next = [...(titlePresets || [])];
                            if (next.length === 0) next.push("");
                            next[idx] = e.target.value;
                            setTitlePresets(next);
                          }} 
                          className={cn(premiumFormStyles.input, "!h-10 !text-[12px]")}
                          placeholder="e.g. Standard Quotation"
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            const next = (titlePresets || []).filter((_: any, i: number) => i !== idx);
                            setTitlePresets(next.length > 0 ? next : [""]);
                          }}
                          className="!flex !items-center !justify-center !w-10 !h-10 !rounded-xl !bg-slate-50 !text-slate-400 hover:!bg-rose-50 hover:!text-rose-500 !transition-all !border !border-slate-100"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className={premiumFormStyles.button}
        >
          {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Save Modifications'}
        </button>
      </form>
    </PremiumModalWrapper>
  );
}
function EmptyState({ title, desc, onAction, actionLabel, icon }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-24 bg-white border border-[#e8eaed] rounded-3xl"
    >
      {icon || <FileText className="mx-auto mb-6 text-text-tertiary opacity-30" size={48} />}
      <h3 className="text-xl font-bold text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary mb-8">{desc}</p>
      <button onClick={onAction} className="px-8 py-3 bg-[#f0f2f5] text-primary border border-[#e8eaed] rounded-full text-[11px] font-bold uppercase tracking-widest hover:border-primary transition-all">
        {actionLabel}
      </button>
    </motion.div>
  );
}

function AnalyticCard({ title, value, secondaryValue, growth, icon, color, compact }: any) {
  const colors: any = {
    emerald: { bg: 'var(--color-brand-soft)', text: 'var(--color-brand)' },
    blue: { bg: '#EFF6FF', text: '#2563EB' },
    amber: { bg: '#FFFBEB', text: '#D97706' },
    rose: { bg: '#FEF2F2', text: 'var(--color-danger)' },
    primary: { bg: 'var(--color-brand-soft)', text: 'var(--color-brand)' },
    slate: { bg: 'var(--color-bg-subtle)', text: 'var(--color-text-muted)' },
    indigo: { bg: '#F5F3FF', text: '#4F46E5' },
    violet: { bg: '#F5F3FF', text: '#7C3AED' },
    gray: { bg: 'var(--color-bg-subtle)', text: 'var(--color-text-muted)' },
  };

  const theme = colors[color] || colors.slate;

  return (
    <motion.div 
      whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(16, 185, 129, 0.15), 0 0 20px -5px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" }}
      style={cardStyle} 
      className={cn(
        compact ? '!p-4' : '!p-6', 
        "!bg-emerald-50/20 border-emerald-500/10 transition-all group cursor-default"
      )}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <div 
          className={`${compact ? 'w-7 h-7 rounded-xl' : 'w-10 h-10 rounded-2xl'} flex items-center justify-center`}
          style={{ background: theme.bg, color: theme.text }}
        >
          {icon}
        </div>
        <div 
          className={`px-2 py-0.5 rounded-full font-bold ${compact ? 'text-[8px]' : 'text-[10px]'}`}
          style={{ 
            background: growth >= 0 ? 'var(--color-brand-soft)' : '#FEF2F2', 
            color: growth >= 0 ? 'var(--color-brand)' : 'var(--color-danger)' 
          }}
        >
          {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
        </div>
      </div>
      <p style={sectionLabel} className={compact ? 'text-[8px] mb-0.5' : 'text-[10px] mb-1'}>{title}</p>
      <h3 style={headingMd} className={compact ? 'text-lg' : 'text-2xl'}>{value}</h3>
      {secondaryValue && <p className={`font-medium text-text-muted ${compact ? 'text-[10px] mt-0.5' : 'text-xs mt-1'}`}>{secondaryValue}</p>}
    </motion.div>
  );
}

function OperationalTrendGraph({ data }: { data: any[] }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          style={modalCard}
          className="backdrop-blur-md !p-5"
        >
          <p style={sectionLabel} className="mb-3">{payload[0].payload.name}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-12">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Quotes</span>
              <span className="text-[12px] font-extrabold text-primary">{payload[0].value}</span>
            </div>
            <div className="flex items-center justify-between gap-12 border-t border-[var(--color-border-default)] pt-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Amount</span>
              <span className="text-[12px] font-extrabold text-primary">P{payload[0].payload.value?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-default)" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 500, fill: 'var(--color-text-faint)' }}
          dy={10}
          minTickGap={30}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 500, fill: 'var(--color-text-faint)' }}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{ stroke: 'var(--color-brand)', strokeWidth: 2, strokeDasharray: '5 5' }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Area 
          type="monotone" 
          dataKey="quotes" 
          stroke="var(--color-brand)" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorValue)" 
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AgentPerformanceLeaderboard({ issuers, closers }: { issuers: any[], closers: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <motion.div 
        whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(234, 179, 8, 0.15), 0 0 20px -5px rgba(234, 179, 8, 0.1)", borderColor: "rgba(234, 179, 8, 0.3)" }}
        className="bg-white border border-amber-500/10 !bg-amber-50/10 rounded-3xl !p-7 shadow-sm transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-bold text-primary flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              Top Issuers
            </h4>
            <p className="text-xs text-text-secondary">Agents with highest number of quotations created</p>
          </div>
        </div>
        <div className="space-y-4">
          {issuers.length > 0 ? issuers.slice(0, 3).map((agent, i) => (
            <LeaderboardItem 
              key={agent.name} 
              rank={i + 1} 
              name={agent.name} 
              value={`P${Math.round(agent.issuedAmount).toLocaleString()}`}
              subValue={`${agent.issuedCount} Quote${agent.issuedCount !== 1 ? 's' : ''}`} 
              colorClass="text-amber-600"
            />
          )) : <p className="text-xs text-text-tertiary italic text-center py-4">No issuing activity records yet.</p>}
        </div>
      </motion.div>

      <motion.div 
        whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(16, 185, 129, 0.15), 0 0 20px -5px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" }}
        className="bg-white border border-emerald-500/10 !bg-emerald-50/10 rounded-3xl !p-7 shadow-sm transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-bold text-primary flex items-center gap-2">
              <Briefcase size={18} className="text-emerald-500" />
              Top Closers
            </h4>
            <p className="text-xs text-text-secondary">Agents with highest number of confirmed quotations</p>
          </div>
        </div>
        <div className="space-y-4">
          {closers.length > 0 ? closers.filter(a => a.confirmedCount > 0).slice(0, 3).map((agent, i) => (
            <LeaderboardItem 
              key={agent.name} 
              rank={i + 1} 
              name={agent.name} 
              value={`P${Math.round(agent.confirmedAmount).toLocaleString()}`} 
              subValue={`${agent.confirmedCount} Confirmation${agent.confirmedCount !== 1 ? 's' : ''}`}
              colorClass="text-emerald-600"
            />
          )) : <p className="text-xs text-text-tertiary italic text-center py-4">No confirmed revenue records yet.</p>}
        </div>
      </motion.div>
    </div>
  );
}

function DashboardFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}


function LeaderboardItem({ rank, name, value, subValue, colorClass }: any) {
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  
  return (
    <div className="flex items-center justify-between group hover:bg-black/5 !-mx-2 !px-2 !py-2 rounded-xl transition-all">
      <div className="flex items-center gap-4">
        <div className="w-6 text-[10px] font-bold text-text-faint opacity-50 group-hover:opacity-100 transition-opacity">
          #{rank}
        </div>
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold`}
          style={{ 
            background: colorClass === 'text-blue-600' ? '#EFF6FF' : colorClass === 'text-amber-600' ? '#FEF3C7' : 'var(--color-brand-soft)', 
            color: colorClass === 'text-blue-600' ? '#2563EB' : colorClass === 'text-amber-600' ? '#D97706' : 'var(--color-brand)' 
          }}
        >
          {initials}
        </div>
        <div>
          <p style={labelStyle} className="!mb-0">{name}</p>
          <p style={sectionLabel} className="!text-[9px]">{subValue}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-bold", colorClass)}>{value}</p>
      </div>
    </div>
  );
}

function QuoteListItem({ customer, route, date, etd, rawEta, rawEtd, status, amount, totalPaid, adminCommission, onClick, isUrgent, agent, createdAt, modifier, updatedAt, currentUserId, quoteId, paxCount, onStatusChange, onDelete }: any) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const statusConfig: any = {
    'Draft': { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200/50', dot: 'bg-slate-400' },
    'Pending': { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200/50', dot: 'bg-slate-400' },
    'Quotation Sent': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200/50', dot: 'bg-blue-500' },
    'Follow-up Needed': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200/50', dot: 'bg-amber-500' },
    'Quoted': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200/50', dot: 'bg-blue-500' },
    'Confirmed': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200/50', dot: 'bg-emerald-500' },
    'Payment Started': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200/50', dot: 'bg-indigo-500' },
    'Payment Complete': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200/50', dot: 'bg-violet-500' },
    'Lost': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200/50', dot: 'bg-gray-400' },
    'Cancelled': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200/50', dot: 'bg-rose-500' },
  };

  const confirmedStatuses = ['Confirmed', 'Payment Started', 'Payment Complete'];
  const deadStatuses = ['Cancelled', 'Lost'];
  const isConfirmedFlow = confirmedStatuses.includes(status);
  const isDeadFlow = deadStatuses.includes(status);
  const dropdownOptions = isConfirmedFlow 
    ? ['Cancelled'] 
    : isDeadFlow
    ? ['Lost', 'Cancelled']
    : ['Draft', 'Quotation Sent', 'Follow-up Needed', 'Lost', 'Cancelled'];

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === status) { setIsDropdownOpen(false); return; }
    const { error } = await supabase.from('quotes').update({ 
      status: newStatus,
      updated_by: currentUserId,
      updated_at: new Date().toISOString()
    }).eq('id', quoteId);
    if (error) {
      console.error('Status update failed:', error);
      alert(`Status update failed: ${error.message}`);
    } else {
      onStatusChange?.(newStatus);
    }
    setIsDropdownOpen(false);
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen]);

  const cfg = statusConfig[status] || { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', dot: 'bg-gray-400' };

  // Calculate initials
  const initials = customer ? customer.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'QT';
  
  // Amount parsing
  const totalAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const displayName = status;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px -10px rgba(16, 185, 129, 0.15), 0 0 15px -3px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.4)" }}
      onClick={onClick}
      style={cardStyle}
      className={`relative group cursor-pointer transition-all hover:border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 !p-5 shadow-sm ${isDropdownOpen ? 'z-50' : 'z-0'}`}
    >
      {isUrgent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
      )}
      
      <div className="flex items-center gap-5 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-primary font-black text-[10px] group-hover:bg-primary group-hover:text-white transition-all shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
             <h3 style={labelStyle} className="!mb-0 truncate">{customer}</h3>
             {isUrgent && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest animate-pulse">URGENT: Confirm this quote</span>}
             {/* Status badge inline with name */}
             <div className="relative" onClick={(e) => e.stopPropagation()}>
               <button
                 onMouseDown={(e) => e.stopPropagation()}
                 onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsDropdownOpen(!isDropdownOpen); }}
                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} hover:shadow-sm`}
               >
                 <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                 {displayName}
                 <ChevronDown size={12} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
               </button>
               <AnimatePresence>
                 {isDropdownOpen && (
                   <motion.div
                     ref={dropdownRef}
                     initial={{ opacity: 0, y: -8, scale: 0.98 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.12)] border border-slate-200/80 w-[175px] py-1.5 px-0 overflow-hidden h-auto"
                     onClick={(e) => e.stopPropagation()}
                   >
                     <div className="flex flex-col gap-0.5 p-0 m-0">
                       {(() => {
                         const StatusItem = ({ s }: { s: string }) => {
                           const isActive = status === s;
                           return (
                             <button
                               onClick={() => handleStatusSelect(s)}
                               className={`w-full status-hub-btn flex items-center justify-between px-3 py-1.5 m-0 border-0 outline-none transition-all ${
                                 isActive ? (statusConfig[s]?.text || 'text-primary font-bold') : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                               }`}
                             >
                               <div className="flex items-center gap-2 leading-none min-w-0">
                                 <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-current' : (statusConfig[s]?.dot || 'bg-slate-300')}`} />
                                 <span className="text-[11px] leading-none truncate">{s}</span>
                               </div>
                               {isActive && <Check size={10} className="shrink-0 ml-2" />}
                             </button>
                           );
                         };
                         const showPlanning = !isConfirmedFlow && !isDeadFlow;
                         const showPayment = !isDeadFlow;
                         return (
                           <>
                             {showPlanning && (
                               <>
                                 {['Draft', 'Quotation Sent', 'Follow-up Needed'].map(s => (
                                   <StatusItem key={s} s={s} />
                                 ))}
                                 <div className="mx-3 my-1.5 border-t border-slate-100" />
                               </>
                             )}
                             {showPayment && (
                               <>
                                 {['Confirmed', 'Payment Started', 'Payment Complete'].map(s => (
                                   <StatusItem key={s} s={s} />
                                 ))}
                                 <div className="my-1.5 border-t border-slate-100" />
                               </>
                             )}
                             <div className="grid grid-cols-2 mt-1 border-t border-slate-100 bg-slate-50/50">
                               {['Lost', 'Cancelled'].map(s => (
                                 <button
                                   key={s}
                                   onClick={() => handleStatusSelect(s)}
                                   className={`flex items-center justify-center status-hub-btn flex-1 text-[9px] font-bold uppercase tracking-wider py-2 border-r last:border-r-0 border-slate-100 transition-all ${
                                     status === s ? 'bg-rose-50 text-rose-600' : 'text-rose-500 hover:bg-rose-50/50'
                                   }`}
                                 >
                                   {s}
                                 </button>
                               ))}
                             </div>
                           </>
                         );
                       })()}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
            <span style={sectionLabel} className="!text-[9px] truncate">{route}</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} /> {date} {etd && ` - ${etd}`}
              {rawEta && rawEtd && (() => {
                const d1 = new Date(rawEta);
                const d2 = new Date(rawEtd);
                d1.setHours(0,0,0,0);
                d2.setHours(0,0,0,0);
                const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const nights = diffDays - 1;
                return (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[7px] font-black tracking-tighter border border-emerald-100/50">
                    {diffDays}D{nights > 0 ? `${nights}N` : ""}
                  </span>
                );
              })()}
              {paxCount && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[7px] font-black tracking-tighter border border-blue-100/50">
                  {paxCount}PAX
                </span>
              )}
            </span>
            {isConfirmedFlow && (
              <>
                <span className="text-text-tertiary">·</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Paid: {Math.round(paymentProgress)}% (₱{totalPaid.toLocaleString()})</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1 opacity-60">
            {agent && (
              <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest whitespace-nowrap">
                Created: {agent} {createdAt ? new Date(createdAt).toLocaleDateString() : ''}
              </span>
            )}
            {agent && modifier && <span className="text-text-tertiary opacity-40">|</span>}
            {modifier && (
              <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest whitespace-nowrap">
                Updated: {modifier} {updatedAt ? new Date(updatedAt).toLocaleDateString() : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right flex flex-col items-end">
          <div className="text-sm font-bold text-primary">{amount}</div>
          {adminCommission > 0 && (
            <div className="text-[8px] font-bold text-text-tertiary/60 uppercase tracking-widest leading-none mt-1">
              Comm: {adminCommission}% (₱{Math.round((totalAmount * adminCommission) / (100 + adminCommission)).toLocaleString()})
            </div>
          )}
        </div>

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-xl text-text-tertiary/30 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 shrink-0"
            title="Delete Quote"
            aria-label="Delete Quote"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function VehicleListItem({ vehicle, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px -10px rgba(16, 185, 129, 0.15), 0 0 15px -3px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.4)" }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm px-4 md:!px-7 !py-5"
    >
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <CarFront size={18} />
        </div>
        <div>
          <h3 style={labelStyle} className="!mb-0.5">{vehicle.model}</h3>
          <div className="flex items-center gap-2">
            <span style={sectionLabel} className="!text-[10px]">{vehicle.category}</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <Users size={10} /> {vehicle.pax_capacity || 1} PAX
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
        <div className="text-right">
          <div style={sectionLabel} className="!text-[9px] mb-0.5">Daily Rate</div>
          <div className="text-sm font-bold text-primary">₱{vehicle.default_rate?.toLocaleString()} <span className="text-text-tertiary font-medium text-[10px]">/ Day</span></div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
            <Settings size={16} />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PresetListItem({ preset, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px -10px rgba(16, 185, 129, 0.15), 0 0 15px -3px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.4)" }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm px-4 md:!px-7 !py-5"
    >
      <div className="flex items-center gap-5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <MapIcon size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 style={labelStyle} className="!mb-0 truncate">{preset.title}</h3>
          </div>
          {preset.tags && (
            <div className="mt-2 space-y-1">
              <div className="flex flex-wrap gap-1">
                {parseTags(preset.tags).slice(0, Math.ceil(parseTags(preset.tags).length / 2)).map(t => (
                  <span key={t} className="px-2 py-0.5 bg-rose-50 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-full border border-rose-100/50 leading-none">
                    {t}
                  </span>
                ))}
              </div>
              {parseTags(preset.tags).length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {parseTags(preset.tags).slice(Math.ceil(parseTags(preset.tags).length / 2)).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-rose-50 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-full border border-rose-100/50 leading-none">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
        <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100/50 leading-none">
          {preset.default_km} KM DEFAULT
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
            <Settings size={16} />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MiscPresetListItem({ preset, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px -10px rgba(16, 185, 129, 0.15), 0 0 15px -3px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.4)" }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm px-4 md:!px-7 !py-5"
    >
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <Banknote size={18} />
        </div>
        <div>
          <h3 style={labelStyle} className="!mb-0.5 truncate">{preset.name}</h3>
          {preset.multiply_by_vehicle && (
            <div className="flex items-center gap-1 mt-1">
              <div className="bg-blue-50 text-blue-600 border border-blue-100/50 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 leading-none">
                <CarFront size={8} /> Scale by Vehicle
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-8 shrink-0 ml-auto sm:ml-0 justify-end">
        <div className="text-right">
          <div style={sectionLabel} className="!text-[9px] mb-0.5">Rate</div>
          <div className="text-sm font-bold text-emerald-600">₱{preset.default_amount?.toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
            <Settings size={16} />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PackageListItem({ packageItem, miscPresets, onEdit, onDelete }: { packageItem: any, miscPresets: any[], onEdit: any, onDelete: any }) {
  const baseInclusions: any[] = [];
  if (packageItem.includes_vehicle) baseInclusions.push({ label: "VEHICLE", icon: <CarFront size={8} />, color: "bg-emerald-50 text-emerald-600 border-emerald-100/50" });
  if (packageItem.includes_fuel) baseInclusions.push({ label: "FUEL", icon: <Fuel size={8} />, color: "bg-amber-50 text-amber-600 border-amber-100/50" });
  if (packageItem.includes_accommodation) baseInclusions.push({ label: "GUEST ACCOMMODATION", icon: <BedDouble size={8} />, color: "bg-blue-50 text-blue-600 border-blue-100/50" });
  
  const miscInclusions: string[] = [];
  packageItem.includes_misc_ids?.forEach((id: string) => {
    const m = miscPresets.find(m => m.id === id);
    if (m) miscInclusions.push(m.name);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px -10px rgba(16, 185, 129, 0.15), 0 0 15px -3px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.4)" }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm px-4 md:!px-7 !py-5"
    >
      <div className="flex items-center gap-5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <LayoutGrid size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 style={labelStyle} className="!mb-0 truncate">{packageItem.title}</h3>
            <div className="flex items-center gap-1">
              {baseInclusions.map((inc, i) => (
                <div key={i} className={cn("px-1.5 py-0.5 rounded-md text-[7px] font-black tracking-tighter border flex items-center gap-1 leading-none", inc.color)}>
                  {inc.icon} {inc.label}
                </div>
              ))}
            </div>
          </div>
          {miscInclusions.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex flex-wrap gap-1">
                {miscInclusions.slice(0, Math.ceil(miscInclusions.length / 2)).map((inc, i) => (
                  <span key={i} className="px-2 py-0.5 bg-rose-50 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-full border border-rose-100/50 leading-none">
                    {inc}
                  </span>
                ))}
              </div>
              {miscInclusions.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {miscInclusions.slice(Math.ceil(miscInclusions.length / 2)).map((inc, i) => (
                    <span key={i} className="px-2 py-0.5 bg-rose-50 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-full border border-rose-100/50 leading-none">
                      {inc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
        {packageItem.is_recommended && (
          <div className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
            <Sparkles size={8} /> Recommended
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
            <Settings size={16} />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AddVehicleModal({ onClose, editingItem, operatorId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [fuelType, setFuelType] = useState(editingItem?.fuel_type || 'Diesel');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('fuel_type', fuelType);
    const model = formData.get('model') as string;
    const default_rate = formData.get('default_rate') as string;
    if (!model || !default_rate) { alert("Model and Default Rate are required."); return; }
    setLoading(true);
    try {
      const res = await saveVehicle(formData, operatorId);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save vehicle.");
    } catch (err: any) { alert("An error occurred: " + err.message); } 
    finally { setLoading(false); }
  };

  return (
    <PremiumModalWrapper
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Edit Vehicle' : 'Add Vehicle'}
      subtitle="Manage fleet details and operational efficiency"
      icon={<CarFront size={18} strokeWidth={2.5} />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col !gap-6">
        {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 !gap-x-6 !gap-y-4">
          <div className="!space-y-1 md:col-span-2">
            <label className={premiumFormStyles.label}>MODEL NAME</label>
            <input 
              name="model" 
              defaultValue={editingItem?.model} 
              className={premiumFormStyles.input} 
              placeholder="e.g. Toyota Hiace Grandia" 
              required 
            />
          </div>
          <div className="!space-y-1 md:col-span-2">
            <label className={premiumFormStyles.label}>CATEGORY</label>
            <input 
              name="category" 
              defaultValue={editingItem?.category} 
              className={premiumFormStyles.input} 
              placeholder="e.g. Premium Van" 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>PAX CAPACITY</label>
            <input 
              name="pax_capacity" 
              type="number" 
              defaultValue={editingItem?.pax_capacity || 10} 
              className={premiumFormStyles.input} 
              required 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>DAILY UNIT RATE (₱)</label>
            <input 
              name="default_rate" 
              type="number" 
              defaultValue={editingItem?.default_rate} 
              className={premiumFormStyles.input} 
              placeholder="0" 
              required 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>KM PER LITRE</label>
            <input 
              name="km_per_l" 
              type="number" 
              step="0.1" 
              defaultValue={editingItem?.km_per_l || 10} 
              className={premiumFormStyles.input} 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>FUEL TYPE</label>
            <AdminSelect 
              value={fuelType}
              onValueChange={setFuelType}
              options={[{v: 'Diesel', l: 'Diesel'}, {v: 'Gasoline', l: 'Gasoline'}]}
              getLabel={o => o.l}
              getValue={o => o.v}
              placeholder="Select fuel type"
            />
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10 !flex !gap-3">
          <button type="button" onClick={onClose} className={premiumFormStyles.secondaryButton + " !flex-1"}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={premiumFormStyles.button + " !flex-1"}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : (editingItem ? 'Update Vehicle' : 'Create Vehicle')}
          </button>
        </div>
      </form>
    </PremiumModalWrapper>
  );
}


function AddPresetModal({ onClose, editingItem, operatorId, miscPresets, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(parseTags(editingItem?.tags));
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('tags', tags.join(', '));
    if (!formData.get('title')) { alert("Title is required."); return; }
    setLoading(true);
    try {
      const res = await saveItineraryPreset(formData, operatorId);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save preset.");
    } catch (err: any) { alert("An error occurred: " + err.message); } 
    finally { setLoading(false); }
  };

  const tagOptions = miscPresets.map((p: any) => p.name);

  return (
    <PremiumModalWrapper
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Edit Preset' : 'Add Preset'}
      subtitle="Design reusable journey templates and experience outlines"
      icon={<MapIcon size={18} strokeWidth={2.5} />}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="flex flex-col !gap-6">
        {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
        
        <div className="!space-y-5">
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>TRIP TITLE / PATTERN NAME</label>
            <input 
              name="title" 
              defaultValue={editingItem?.title} 
              className={premiumFormStyles.input} 
              placeholder="e.g. CDO City Tour (Whole Day)" 
              required 
            />
          </div>
          
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>DEFAULT DISTANCE (KM)</label>
            <input 
              name="default_km" 
              type="number" 
              step="0.1" 
              defaultValue={editingItem?.default_km} 
              className={premiumFormStyles.input} 
              placeholder="e.g. 50" 
            />
          </div>

          <div className="!space-y-2">
            <label className={premiumFormStyles.label}>AUTOMATED MISC FEES (TAGS)</label>
            <TagSelector options={tagOptions} selectedTags={tags} onChange={setTags} />
            <p className="!text-[10px] !text-emerald-600 !italic !font-medium !leading-relaxed !bg-emerald-50/50 !p-2.5 !rounded-xl !border !border-emerald-100/50">
              Note: Selecting a tag will auto-add that fee to quotes using this preset.
            </p>
          </div>

          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>STANDARD DETAILS (INCLUSIONS)</label>
            <textarea 
              name="details" 
              defaultValue={editingItem?.details} 
              className={cn(premiumFormStyles.textarea, "!h-32")} 
              placeholder="Describe what's included in this itinerary pattern..." 
            />
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10 !flex !gap-3">
          <button type="button" onClick={onClose} className={premiumFormStyles.secondaryButton + " !flex-1"}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={premiumFormStyles.button + " !flex-1"}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Save Modifications'}
          </button>
        </div>
      </form>
    </PremiumModalWrapper>
  );
}



function AddMiscModal({ onClose, editingItem, operatorId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await saveMiscPreset(formData, operatorId);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save misc fee.");
    } catch (err: any) { alert("An error occurred: " + err.message); } 
    finally { setLoading(false); }
  };

  return (
    <PremiumModalWrapper
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Edit Misc Fee' : 'Add Misc Fee'}
      subtitle="Configure standardized additional costs and overheads"
      icon={<Tag size={18} strokeWidth={2.5} />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col !gap-6">
        {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
        
        <div className="!space-y-4">
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>FEE NAME</label>
            <input 
              name="name" 
              defaultValue={editingItem?.name} 
              className={premiumFormStyles.input} 
              placeholder="e.g. Ferry Fare" 
              required 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>DEFAULT AMOUNT (₱)</label>
            <input 
              name="default_amount" 
              type="number" 
              defaultValue={editingItem?.default_amount} 
              className={premiumFormStyles.input} 
              placeholder="0" 
              required 
            />
          </div>
          
          <div className="!bg-emerald-50/30 !p-4 !rounded-2xl !border !border-emerald-100/50">
            <label className="!flex !items-center !gap-3 !cursor-pointer !select-none group">
              <div className="relative !flex !items-center !justify-center">
                <input 
                  type="checkbox" 
                  name="multiply_by_vehicle" 
                  value="true" 
                  defaultChecked={editingItem?.multiply_by_vehicle} 
                  className="!peer !appearance-none !w-5 !h-5 !border-2 !border-emerald-200 !rounded-md checked:!bg-emerald-600 checked:!border-emerald-600 !transition-all"
                />
                <Check className="absolute !text-white !opacity-0 peer-checked:!opacity-100 !transition-opacity" size={14} strokeWidth={4} />
              </div>
              <div className="!flex !flex-col">
                <span className="!text-[12px] !font-bold !text-slate-800 group-hover:!text-emerald-700 !transition-colors">Scale by Vehicle Count</span>
                <span className="!text-[10px] !text-slate-500 !font-medium">Multiply this fee by the number of vehicles assigned</span>
              </div>
            </label>
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10 !flex !gap-3">
          <button type="button" onClick={onClose} className={premiumFormStyles.secondaryButton + " !flex-1"}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={premiumFormStyles.button + " !flex-1"}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Save Modifications'}
          </button>
        </div>
      </form>
    </PremiumModalWrapper>
  );
}



function AddPackageModal({ onClose, editingItem, operatorId, miscPresets, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const checkedMiscIds = Array.from(e.currentTarget.querySelectorAll('input[name="misc_ids"]:checked'))
      .map((el: any) => el.value);
    formData.append('includes_misc_ids', JSON.stringify(checkedMiscIds));
    formData.append('operator_id', operatorId);
    if (editingItem) formData.append('id', editingItem.id);

    setLoading(true);
    try {
      const res = await savePackagePreset(formData);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save package.");
    } catch (err: any) { alert("An error occurred: " + err.message); } 
    finally { setLoading(false); }
  };

  const PremiumCheckbox = ({ name, label, defaultChecked, value }: any) => (
    <label className="!flex !items-center !gap-2.5 !cursor-pointer !select-none group !p-2 !rounded-lg hover:!bg-emerald-50/50 !transition-all">
      <div className="relative !flex !items-center !justify-center">
        <input 
          type="checkbox" 
          name={name} 
          value={value || "true"}
          defaultChecked={defaultChecked} 
          className="!peer !appearance-none !w-4 !h-4 !border-2 !border-emerald-200 !rounded-md checked:!bg-emerald-600 checked:!border-emerald-600 !transition-all"
        />
        <Check className="absolute !text-white !opacity-0 peer-checked:!opacity-100 !transition-opacity" size={10} strokeWidth={5} />
      </div>
      <span className="!text-[11px] !font-bold !text-slate-700 group-hover:!text-emerald-800 !transition-colors !uppercase !tracking-wider">{label}</span>
    </label>
  );

  return (
    <PremiumModalWrapper
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Edit Package' : 'Add Package'}
      subtitle="Create bundled service offerings and recommended bundles"
      icon={<Briefcase size={18} strokeWidth={2.5} />}
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} className="flex flex-col !gap-6">
        {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
        
        <div className="!space-y-6">
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>PACKAGE TITLE</label>
            <input 
              name="title" 
              defaultValue={editingItem?.title} 
              className={premiumFormStyles.input} 
              placeholder="e.g. Full Adventure Pack" 
              required 
            />
            <div className="!pt-1">
              <PremiumCheckbox 
                name="is_recommended" 
                label="Mark as Recommended Package" 
                defaultChecked={editingItem?.is_recommended} 
              />
            </div>
          </div>
          
          <div className="!space-y-3">
            <label className={premiumFormStyles.label}>BASE INCLUSIONS</label>
            <div className="!grid !grid-cols-3 !gap-1 !bg-emerald-50/30 !p-4 !rounded-2xl !border !border-emerald-100/50">
              <PremiumCheckbox 
                name="includes_vehicle" 
                label="Vehicle Rate" 
                defaultChecked={editingItem ? editingItem.includes_vehicle : true} 
              />
              <PremiumCheckbox 
                name="includes_fuel" 
                label="Fuel Cost" 
                defaultChecked={editingItem ? editingItem.includes_fuel : true} 
              />
              <PremiumCheckbox 
                name="includes_accommodation" 
                label="Guest Accommodation" 
                defaultChecked={editingItem ? editingItem.includes_accommodation : true} 
              />
            </div>
          </div>

          <div className="!space-y-3">
            <label className={premiumFormStyles.label}>MISC FEE INCLUSIONS</label>
            <div className="!grid !grid-cols-3 !gap-2 !bg-slate-50/50 !p-4 !rounded-2xl !border !border-slate-100 !max-h-[160px] !overflow-y-auto custom-scrollbar">
              {miscPresets.length === 0 ? (
                <p className="!col-span-3 !text-[10px] !text-slate-400 !italic !text-center !py-4">No misc fees defined yet.</p>
              ) : (
                miscPresets.map((m: any) => (
                  <PremiumCheckbox 
                    key={m.id}
                    name="misc_ids" 
                    value={m.id}
                    label={m.name} 
                    defaultChecked={editingItem?.includes_misc_ids?.includes(m.id)} 
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10 !flex !gap-3">
          <button type="button" onClick={onClose} className={premiumFormStyles.secondaryButton + " !flex-1"}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={premiumFormStyles.button + " !flex-1"}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Save Modifications'}
          </button>
        </div>
      </form>
    </PremiumModalWrapper>
  );
}



function TagSelector({ options, selectedTags, onChange }: { options: string[], selectedTags: string[], onChange: (tags: string[]) => void }) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  if (options.length === 0) {
    return (
      <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl mt-2">
        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-relaxed italic">
          No Miscellaneous Fees Found. Add them first in the "Misc Fees" tab to use them as tags.
        </p>
      </div>
    );
  }

  return (
    <div className="!flex !flex-wrap !gap-1.5 !mt-1">
      {options.map((tag: string) => {
        const isActive = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={cn(
              "!inline-flex !items-center !px-2 !rounded !text-[9px] !font-black !uppercase !tracking-widest !transition-all !leading-none !cursor-pointer !border",
              isActive 
                ? "!bg-rose-500 !text-white !border-rose-400 !shadow-[0_2px_8px_rgba(244,63,94,0.3)]" 
                : "!bg-[#f0f2f5] !text-slate-900/60 !border-slate-200 hover:!bg-white hover:!text-rose-600 hover:!border-rose-200 hover:!shadow-[0_0_10px_rgba(244,63,94,0.25)]"
            )}
            style={{ height: '20px' }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

function parseTags(tagStr: string | null) {
  if (!tagStr) return [];
  return tagStr.split(',').map((t: string) => t.trim()).filter(Boolean);
}

function UserSettingsModal({ isOpen, onClose, fullName, setFullName, newPassword, setNewPassword, confirmPassword, setConfirmPassword, passwordError, role, onSave, loading }: any) {
  return (
    <PremiumModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      subtitle="Manage your personal profile and security"
      icon={<User size={18} strokeWidth={2.5} />}
      maxWidth="440px"
    >
      <form onSubmit={onSave} className="flex flex-col !gap-6">
        <div className="!space-y-1">
          <label className={premiumFormStyles.label}>FULL NAME</label>
          <input 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            className={premiumFormStyles.input} 
            placeholder="Your full name"
            required 
          />
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10">
          <h3 className="!text-[10px] !font-black !text-slate-400 !uppercase !tracking-[0.2em] !mb-4">Update Password</h3>
          <div className="!space-y-4">
            <div className="!space-y-1">
              <label className={premiumFormStyles.label}>NEW PASSWORD</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className={premiumFormStyles.input} 
                placeholder="Minimum 6 characters"
              />
              <p className="!text-[9px] !text-slate-400 !italic !mt-1.5">Leave blank to keep your current password</p>
            </div>
            <div className="!space-y-1">
              <label className={premiumFormStyles.label}>CONFIRM PASSWORD</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className={premiumFormStyles.input} 
                placeholder="Repeat new password"
              />
            </div>
          </div>
        </div>
        
        {passwordError && (
          <div className="!p-3 !bg-rose-50 !border !border-rose-100 !rounded-xl !text-[11px] !font-bold !text-rose-600 !flex !items-center !gap-2">
            <X size={14} strokeWidth={3} />
            {passwordError}
          </div>
        )}

        <div className="!pt-4 !border-t !border-emerald-500/10 !flex !gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className={cn(premiumFormStyles.secondaryButton, "!flex-1")}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className={cn(premiumFormStyles.button, "!flex-1")}
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Save Modifications'}
          </button>
        </div>
      </form>
    </PremiumModalWrapper>
  );
}

function PremiumConfirmDialog({ isOpen, onClose, onConfirm, title, type }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, type: string | null }) {
  return (
    <InfoDialog 
      config={{
        isOpen,
        title: `Delete ${type || 'record'}?`,
        message: `Are you sure you want to remove "${title}"? This cannot be undone.`,
        type: 'warning',
        onConfirm,
        confirmText: "Yes, Delete It",
        cancelText: "No, Cancel"
      }}
      onClose={onClose}
    />
  );
}

function AccommodationListItem({ item, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px -10px rgba(16, 185, 129, 0.15), 0 0 15px -3px rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.4)" }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm px-4 md:!px-7 !py-5"
    >
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <BedDouble size={18} />
        </div>
        <div>
          <h3 style={labelStyle} className="!mb-0.5">{item.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <Users size={10} /> {item.pax_count} PAX
            </span>
            {item.description && (
              <>
                <span className="text-text-tertiary">·</span>
                <span style={sectionLabel} className="!text-[10px] truncate max-w-[200px] normal-case tracking-normal">{item.description}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
        <div className="text-right">
          <div style={sectionLabel} className="!text-[9px] mb-0.5">Rate</div>
          <div className="text-sm font-bold text-primary">₱{item.amount?.toLocaleString()} <span className="text-text-tertiary font-medium text-[10px]">/ Night</span></div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
            <Settings size={16} />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AddAccommodationModal({ onClose, editingItem, operatorId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await saveGuestAccommodation(formData, operatorId);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save accommodation.");
    } catch (err: any) { alert("An error occurred: " + err.message); } 
    finally { setLoading(false); }
  };

  return (
    <PremiumModalWrapper
      isOpen={true}
      onClose={onClose}
      title={editingItem ? 'Edit Accommodation' : 'Add Accommodation'}
      subtitle="Define guest stays and per-night occupancy rates"
      icon={<BedDouble size={18} strokeWidth={2.5} />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col !gap-6">
        {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
        
        <div className="!space-y-4">
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>ROOM NAME / TYPE</label>
            <input 
              name="name" 
              defaultValue={editingItem?.name} 
              className={premiumFormStyles.input} 
              placeholder="e.g. Standard Room" 
              required 
            />
          </div>
          <div className="!space-y-1">
            <label className={premiumFormStyles.label}>BRIEF DESCRIPTION</label>
            <input 
              name="description" 
              defaultValue={editingItem?.description} 
              className={premiumFormStyles.input} 
              placeholder="e.g. Twin sharing, AC, breakfast included" 
            />
          </div>
          <div className="grid grid-cols-2 !gap-6">
            <div className="!space-y-1">
              <label className={premiumFormStyles.label}>PAX THRESHOLD</label>
              <input 
                name="pax_count" 
                type="number" 
                min="1" 
                defaultValue={editingItem?.pax_count || 1} 
                className={premiumFormStyles.input} 
                placeholder="e.g. 4" 
                required 
              />
            </div>
            <div className="!space-y-1">
              <label className={premiumFormStyles.label}>RATE (₱) / NIGHT</label>
              <input 
                name="amount" 
                type="number" 
                defaultValue={editingItem?.amount} 
                className={premiumFormStyles.input} 
                placeholder="e.g. 2500" 
                required 
              />
            </div>
          </div>
          <p className="!text-[10px] !text-emerald-600 !italic !font-medium !leading-relaxed !bg-emerald-50/50 !p-3 !rounded-xl !border !border-emerald-100/50">
            Note: The system will auto-match the closest accommodation preset that covers the total pax count for each trip day.
          </p>
        </div>

        <div className="!pt-4 !border-t !border-emerald-500/10 !flex !gap-3">
          <button type="button" onClick={onClose} className={premiumFormStyles.secondaryButton + " !flex-1"}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={premiumFormStyles.button + " !flex-1"}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Save Modifications'}
          </button>
        </div>
      </form>
    </PremiumModalWrapper>
  );
}
