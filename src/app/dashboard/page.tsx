"use client";

import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import CalendarView from "./components/CalendarView";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogOut, Plus, Search, Clock, CheckCircle, AlertCircle, FileText, Map as MapIcon, Loader2, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, X, CarFront, Trash2, Users, Banknote, Fuel, Minus, Settings, Sparkles, Briefcase, Zap, TrendingUp, BedDouble, Check, Calendar as CalendarIcon, ArrowUpDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
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
  const [dateFilter, setDateFilter] = useState("Created Today");
  const [sortMethod, setSortMethod] = useState<'priority' | 'updated'>('updated');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    type: 'vehicle' | 'itinerary' | 'misc' | 'package' | 'accommodation' | null, 
    id: string, 
    title: string 
  }>({ isOpen: false, type: null, id: "", title: "" });

  useEffect(() => {
    if (profile) setNewFullName(profile.full_name || "");
  }, [profile]);

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

  const handleDelete = (type: 'vehicle' | 'itinerary' | 'misc' | 'package' | 'accommodation', id: string, title?: string) => {
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

      const matchesSearch = q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.vehicle_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        durationStr.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center">
      
      {/* ── Admin Oversight Bar ──────────────────── */}
      {isImpersonating && (
        <div 
          className="bg-primary text-white w-full flex justify-center py-2 text-[10px] font-bold uppercase tracking-widest z-50 sticky top-0 md:relative"
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

      {/* ── Slim Top Bar ─────────────────────────── */}
      <header style={topBar} className="sticky top-0 z-40 w-full flex justify-center safe-top">
        <div style={topBarInner} className="flex items-center justify-between">
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-3">
              {activeTab === 'calendar' && (
                <button 
                  onClick={() => setActiveTab('quotes')}
                  className="mr-1 p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-500 hover:text-primary flex items-center gap-2 group"
                  title="Back to Dashboard"
                >
                  <ArrowLeft size={18} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Back</span>
                </button>
              )}
              <LayoutGrid style={{ color: 'var(--color-brand)' }} className="shrink-0" size={20} />
              <span className="text-sm md:text-base font-bold text-[#0F172A] tracking-tight truncate">TravelQuote <span style={{ color: '#F05E33', fontWeight: 500, fontSize: '0.75em', marginLeft: '2px' }}>by JWRM</span></span>
            </div>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
            <div className="text-xs font-medium text-text-muted hidden sm:block truncate">
              Station: <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>{profile?.operators?.name}</span>
            </div>
            {/* Persistent Calendar Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('calendar');
              }}
              style={{ 
                ...btnAction, 
                height: '34px', 
                padding: '0 12px', 
                backgroundColor: activeTab === 'calendar' ? '#064E3B' : 'var(--color-brand)',
                backgroundImage: activeTab === 'calendar' ? 'none' : undefined
              }}
              className="ml-4 transition-all hover:opacity-90 active:scale-95 flex items-center gap-2 shrink-0"
            >
              <CalendarIcon size={14} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline leading-none mt-0.5">
                Calendar
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button 
              onClick={handleSignOut} 
              style={btnIcon}
              className="hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-90"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
            <div 
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 w-12 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold cursor-pointer hover:ring-4 hover:ring-primary/10 transition-all active:scale-95 shadow-lg shadow-primary/10"
              style={{ background: 'var(--color-brand)' }}
              title="Account Settings"
              role="button"
              aria-label="Account Settings"
            >
              {profile?.full_name?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main style={pageContainer} className="flex flex-col gap-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 style={pageTitle}>
              {activeTab === 'quotes' && "Quotation List"}
              {activeTab === 'calendar' && "Operational Calendar"}
              {activeTab === 'analytics' && "Company Insight"}
              {activeTab === 'vehicles' && "Vehicle Inventory"}
              {activeTab === 'accommodation' && "Guest Accommodation"}
              {activeTab === 'miscellaneous' && "Miscellaneous Fees"}
              {activeTab === 'itinerary' && "Itinerary Presets"}
              {activeTab === 'packages' && "Summary Packages"}
            </h1>
            <p style={pageSubtitle}>
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
          {activeTab === 'quotes' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => router.push('/builder')}
                className="group transition-all hover:opacity-90 active:scale-95"
                style={{ ...btnAction, height: '42px', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline leading-none mt-0.5">Issue Quote</span>
                <span className="sm:hidden leading-none mt-0.5">New</span>
              </button>
            </div>
          )}
          {activeTab === 'vehicles' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingVehicle(true); }}
              className="group transition-all hover:opacity-90 active:scale-95"
              style={{ ...btnAction, height: '42px', whiteSpace: 'nowrap' }}
            >
              <CarFront size={16} strokeWidth={2.5} />
              Add Vehicle
            </button>
          )}
          {activeTab === 'itinerary' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingPreset(true); }}
              className="group transition-all hover:opacity-90 active:scale-95"
              style={{ ...btnAction, height: '42px', whiteSpace: 'nowrap' }}
            >
              <MapIcon size={16} strokeWidth={2.5} />
              Define Preset
            </button>
          )}
          {activeTab === 'miscellaneous' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingMisc(true); }}
              className="group transition-all hover:opacity-90 active:scale-95"
              style={{ ...btnAction, height: '42px', whiteSpace: 'nowrap' }}
            >
              <Banknote size={16} strokeWidth={2.5} />
              Add Misc Fee
            </button>
          )}
          {activeTab === 'packages' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingPackage(true); }}
              className="group transition-all hover:opacity-90 active:scale-95"
              style={{ ...btnAction, height: '42px', whiteSpace: 'nowrap' }}
            >
              <LayoutGrid size={16} strokeWidth={2.5} />
              Add Package
            </button>
          )}
          {activeTab === 'accommodation' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingAccommodation(true); }}
              className="group transition-all hover:opacity-90 active:scale-95"
              style={{ ...btnAction, height: '42px', whiteSpace: 'nowrap' }}
            >
              <BedDouble size={16} strokeWidth={2.5} />
              Add Accommodation
            </button>
          )}
        </div>

        {activeTab !== 'calendar' && (
          <div style={tabRowStyle} className="no-scrollbar" role="tablist">
            {validTabs.filter(t => t !== 'calendar').map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`!px-5 !py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border`}
                style={{
                  background: activeTab === tab ? 'var(--color-brand)' : 'white',
                  borderColor: activeTab === tab ? 'var(--color-border-default)' : 'var(--color-border-default)',
                  color: activeTab === tab ? 'white' : 'var(--color-text-muted)',
                  boxShadow: activeTab === tab ? 'var(--shadow-xs)' : 'none'
                }}
              >
                {tab === 'accommodation' ? 'Guest Accom' : tab === 'miscellaneous' ? 'Misc. Fees' : tab}
              </button>
            ))}
          </div>
        )}

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
                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={(val) => setDateFilter(val || "Created Today")}>
                  <SelectTrigger 
                    className="!w-fit min-w-[140px] !h-9 !rounded-xl !bg-white !border-[#e8eaed] !px-4 text-[10px] font-bold uppercase tracking-widest hover:!border-primary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-emerald-500 opacity-80" />
                      <SelectValue placeholder="Created Today" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-1.5 min-w-[180px]">
                    {['All Time', 'Created Today', 'Last 7 Days', 'This Month', 'This Year'].map(opt => (
                      <SelectItem 
                        key={opt} 
                        value={opt} 
                        className="text-sm py-3 px-4 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl transition-colors font-medium mb-0.5 last:mb-0"
                      >
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Agent Filter */}
                <Select value={agentFilter} onValueChange={(val) => setAgentFilter(val || "All")}>
                  <SelectTrigger 
                    size="sm" 
                    className="!w-fit min-w-[140px] !h-9 !rounded-xl !bg-white !border-[#e8eaed] !px-4 text-[10px] font-bold uppercase tracking-widest hover:!border-primary transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-text-tertiary opacity-60" />
                      <SelectValue placeholder="All Agents" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-1.5 min-w-[200px]">
                    <SelectItem value="All" className="text-sm py-3 px-4 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl font-medium mb-0.5">All Agents</SelectItem>
                    {Array.from(new Set(quotes.map(q => q.creator?.full_name).filter(Boolean))).map(name => (
                      <SelectItem 
                        key={name as string} 
                        value={name as string} 
                        className="text-sm py-3 px-4 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700 rounded-xl font-medium mb-0.5 last:mb-0"
                      >
                        {name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {tabLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-primary" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Loading data...</p>
            </div>
          ) : (
          <>
        {activeTab === 'quotes' && (
          <div className="flex items-center justify-between">
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

            <p className="text-xs md:text-sm text-text-secondary shrink-0">
              Showing <span className="font-bold text-primary">{filteredQuotes.length}</span> record{filteredQuotes.length !== 1 && 's'}
            </p>
            
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 mt-0.5">Order:</span>
              <div className="sort-toggle-container">
                <button
                  type="button"
                  onClick={() => setSortMethod('priority')}
                  className={`sort-toggle-btn ${sortMethod === 'priority' ? 'active' : ''}`}
                >
                  <Zap size={10} strokeWidth={3} className={sortMethod === 'priority' ? 'text-white' : 'text-emerald-500'} />
                  Priority
                </button>
                <button
                  type="button"
                  onClick={() => setSortMethod('updated')}
                  className={`sort-toggle-btn ${sortMethod === 'updated' ? 'active' : ''}`}
                >
                  <Clock size={10} strokeWidth={3} className={sortMethod === 'updated' ? 'text-white' : 'text-emerald-500'} />
                  Recent
                </button>
              </div>
            </div>
          </div>
        )}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              <div className="relative flex items-center bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--color-border-default)] w-fit mb-4 overflow-hidden shadow-sm gap-1">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setAnalyticsDays(days as 7 | 30 | 90)}
                    className={`relative z-10 px-4 py-2 min-w-[64px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                {(() => {
                  const displayStatuses = ['Draft', 'Quotation Sent', 'Follow-up Needed', 'Confirmed', 'Lost', 'Cancelled'];
                  const iconMap: Record<string, any> = {
                    'Draft': <FileText size={16} />,
                    'Quotation Sent': <MapIcon size={16} />,
                    'Follow-up Needed': <Zap size={16} />,
                    'Confirmed': <CheckCircle size={16} />,
                    'Lost': <AlertCircle size={16} />,
                    'Cancelled': <Trash2 size={16} />,
                  };
                  const colorMap: Record<string, string> = {
                    'Draft': 'slate',
                    'Quotation Sent': 'blue',
                    'Follow-up Needed': 'amber',
                    'Confirmed': 'emerald',
                    'Lost': 'gray',
                    'Cancelled': 'rose',
                  };
                  return displayStatuses.map(s => {
                    let m = analytics.statusMetrics[s];
                    if (s === 'Confirmed') {
                      const ps = analytics.statusMetrics['Payment Started'];
                      const pc = analytics.statusMetrics['Payment Complete'];
                      m = {
                        count: m.count + ps.count + pc.count,
                        amount: m.amount + ps.amount + pc.amount,
                        growth: m.growth,
                      };
                    }
                    return (
                      <AnalyticCard
                        key={s}
                        title={s}
                        value={`₱${m.amount.toLocaleString()}`}
                        secondaryValue={`${m.count} Record${m.count !== 1 ? 's' : ''}`}
                        growth={m.growth}
                        icon={iconMap[s]}
                        color={colorMap[s]}
                        compact
                      />
                    );
                  });
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div style={cardStyle} className="!p-5 flex items-center justify-between">
                  <div>
                    <p style={sectionLabel} className="mb-0.5">Total Quotes</p>
                    <h3 style={headingMd} className="text-2xl tracking-tight">₱{analytics.total.amount.toLocaleString()}</h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-0.5">{analytics.total.count} Record{analytics.total.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                  >
                    <FileText size={22} />
                  </div>
                </div>
                <div style={cardStyle} className="!p-5 flex items-center justify-between">
                  <div>
                    <p style={sectionLabel} className="mb-0.5">Total Collection</p>
                    <h3 style={headingMd} className="text-2xl tracking-tight !text-[var(--color-brand)]">₱{Object.values(paymentTotals).reduce((a, b) => a + b, 0).toLocaleString()}</h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-0.5">From {Object.values(paymentTotals).filter(v => v > 0).length} quote{Object.values(paymentTotals).filter(v => v > 0).length !== 1 ? 's' : ''}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
                  >
                    <Banknote size={22} />
                  </div>
                </div>
              </div>

              <AgentPerformanceLeaderboard 
                  issuers={analytics.leaderboard.issuers} 
                  closers={analytics.leaderboard.closers} 
                />

                <div style={cardStyle} className="!p-8">
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
                </div>
              </div>
            )}

          {activeTab === 'calendar' && (
            <CalendarView quotes={quotes} />
          )}

          {activeTab === 'quotes' && (
            quotes.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1 border-b border-[#f1f3f5]">
                  {["All", ...allStatuses].map(status => {
                    const count = statusCounts[status] || 0;
                    const isActive = quoteStatusFilter === status;
                    
                    const shortNames: Record<string, string> = {
                      'Quotation Sent': 'Sent',
                      'Follow-up Needed': 'Follow-up',
                      'Payment Started': 'Paying',
                      'Payment Complete': 'Paid',
                      'Cancelled': 'Cancelled'
                    };
                    const displayName = shortNames[status] || status;

                    return (
                      <button
                        key={status}
                        onClick={() => setQuoteStatusFilter(status)}
                        className={`group relative pb-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                          isActive 
                            ? 'text-primary border-primary' 
                            : 'text-text-tertiary border-transparent hover:text-primary hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {displayName}
                          <span className={`text-[8px] font-black ${isActive ? 'text-primary' : 'text-text-tertiary/50'}`}>
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

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

                    return displayQuotes.map((quote: any) => {
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
                          route={quote.vehicle_model || "Private Trip"} 
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
                          onClick={() => router.push(`/builder?id=${quote.id}`)}
                          onStatusChange={(newStatus: string) => {
                            setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: newStatus } : q));
                          }}
                        />
                      );
                    });
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

        <AnimatePresence>
          {isSettingsOpen && (
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
          )}

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
    </div>
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
    <div style={cardStyle} className={compact ? '!p-4' : '!p-6'}>
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
    </div>
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
      <div className="bg-white border border-[#f0f2f5] rounded-3xl !p-7 shadow-sm">
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
              value={`P${agent.issuedAmount.toLocaleString()}`}
              subValue={`${agent.issuedCount} Quote${agent.issuedCount !== 1 ? 's' : ''}`} 
            />
          )) : <p className="text-xs text-text-tertiary italic text-center py-4">No issuing activity records yet.</p>}
        </div>
      </div>

      <div className="bg-white border border-[#f0f2f5] rounded-3xl !p-7 shadow-sm">
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
              value={`P${agent.confirmedAmount.toLocaleString()}`} 
              subValue={`${agent.confirmedCount} Confirmation${agent.confirmedCount !== 1 ? 's' : ''}`}
              isSuccess 
            />
          )) : <p className="text-xs text-text-tertiary italic text-center py-4">No confirmed revenue records yet.</p>}
        </div>
      </div>
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


function LeaderboardItem({ rank, name, value, subValue, isSuccess }: any) {
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="w-6 text-[10px] font-bold text-text-faint opacity-50 group-hover:opacity-100 transition-opacity">
          #{rank}
        </div>
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold`}
          style={{ 
            background: isSuccess ? 'var(--color-brand-soft)' : 'var(--color-bg-subtle)', 
            color: isSuccess ? 'var(--color-brand)' : 'var(--color-text-primary)' 
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
        <p className="text-sm font-bold" style={{ color: isSuccess ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function QuoteListItem({ customer, route, date, etd, rawEta, rawEtd, status, amount, totalPaid, adminCommission, onClick, isUrgent, agent, createdAt, modifier, updatedAt, currentUserId, quoteId, onStatusChange }: any) {
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
          <div className="flex items-center gap-3">
             <h3 style={labelStyle} className="!mb-0 truncate">{customer}</h3>
             {isUrgent && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest animate-pulse">URGENT: Confirm this quote</span>}
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

      <div className="flex items-center gap-6 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
        <div className="relative">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} hover:shadow-sm`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {displayName}
            <ChevronDown size={8} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-50 bg-white rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-[#eff1f4] w-[140px] py-1 px-0 overflow-hidden h-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-[1px] p-0 m-0">
                  {(() => {
                    const StatusItem = ({ s, activeColor }: { s: string, activeColor: string }) => {
                      const isActive = status === s;
                      return (
                        <button
                          onClick={() => handleStatusSelect(s)}
                          className={`w-full status-hub-btn flex items-center justify-between px-2 m-0 border-0 outline-none transition-all ${
                            isActive ? (statusConfig[s]?.text || 'text-primary') : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 leading-none">
                            <span className={`w-1 h-1 rounded-full shrink-0 ${isActive ? 'bg-current' : (statusConfig[s]?.dot || 'bg-gray-400')}`} />
                            <span className="text-[8px] font-bold leading-none truncate">{s}</span>
                          </div>
                          {isActive && <Check size={7} className="shrink-0" />}
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
                              <StatusItem key={s} s={s} activeColor="text-primary" />
                            ))}
                            <div className="mx-2 my-1 border-t border-[#f1f3f5]" />
                          </>
                        )}

                        {showPayment && (
                          <>
                            {['Confirmed', 'Payment Started', 'Payment Complete'].map(s => (
                              <StatusItem key={s} s={s} activeColor="" />
                            ))}
                            <div className="my-[1px] border-t border-[#f1f3f5]" />
                          </>
                        )}

                        <div className="grid grid-cols-2">
                          {['Lost', 'Cancelled'].map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusSelect(s)}
                              className={`flex items-center justify-center status-hub-btn flex-1 text-[7px] font-bold uppercase tracking-wider border-r last:border-r-0 border-[#f1f3f5] transition-all ${
                                status === s 
                                  ? 'bg-rose-50 text-rose-600' 
                                  : 'text-rose-400 hover:bg-rose-50/50'
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

        <div className="text-right flex flex-col items-end">
          <div className="text-sm font-bold text-primary">{amount}</div>
          {adminCommission > 0 && (
            <div className="text-[8px] font-bold text-text-tertiary/60 uppercase tracking-widest leading-none mt-1">
              Comm: {adminCommission}% (₱{Math.round((totalAmount * adminCommission) / (100 + adminCommission)).toLocaleString()})
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VehicleListItem({ vehicle, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm"
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
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm"
    >
      <div className="flex items-center gap-5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <MapIcon size={18} />
        </div>
        <div className="min-w-0">
          <h3 style={labelStyle} className="!mb-0.5 truncate">{preset.title}</h3>
          <div className="flex items-center gap-2">
            <span style={sectionLabel} className="!text-[10px]">
              {preset.default_km} KM DEFAULT
            </span>
          </div>
          {preset.tags && (
             <div className="flex flex-wrap gap-1 mt-2">
                {parseTags(preset.tags).map(t => (
                  <span key={t} className="px-2 py-0.5 bg-primary/5 text-primary text-[8px] font-black uppercase tracking-wider rounded-md border border-primary/10">{t}</span>
                ))}
             </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
        <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
          <Settings size={16} />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function MiscPresetListItem({ preset, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm"
    >
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <Banknote size={18} />
        </div>
        <div>
          <h3 style={labelStyle} className="!mb-0.5">{preset.name}</h3>
          <div className="flex items-center gap-2">
            <span style={sectionLabel} className="!text-[10px]">OPERATIONAL FEE</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              ₱{preset.default_amount?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 ml-auto sm:ml-0">
        <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
          <Settings size={16} />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function PackageListItem({ packageItem, miscPresets, onEdit, onDelete }: { packageItem: any, miscPresets: any[], onEdit: any, onDelete: any }) {
  const inclusions = [];
  if (packageItem.includes_vehicle) inclusions.push("Vehicle Rate");
  if (packageItem.includes_fuel) inclusions.push("Fuel Cost");
  if (packageItem.includes_accommodation) inclusions.push("Guest Accom");
  
  packageItem.includes_misc_ids?.forEach((id: string) => {
    const m = miscPresets.find(m => m.id === id);
    if (m) inclusions.push(m.name);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm px-4 md:!px-7"
    >
      <div className="flex items-center gap-5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <LayoutGrid size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 style={labelStyle} className="!mb-0 truncate">{packageItem.title}</h3>
            {packageItem.is_recommended && (
              <div className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={8} /> Recommended
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {inclusions.map((inc, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#f0f2f5] text-[9px] font-bold text-text-tertiary rounded-md uppercase tracking-tight">{inc}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
        <button onClick={onEdit} className="p-2 hover:bg-primary/5 rounded-xl text-text-tertiary hover:text-primary transition-colors">
          <Settings size={16} />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-rose-50 rounded-xl text-text-tertiary hover:text-rose-600 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function AddVehicleModal({ onClose, editingItem, operatorId, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={modalOverlay}
      className="z-[100]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        onClick={(e) => e.stopPropagation()}
        style={modalCard} 
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-10">
          <h3 style={modalTitle}>{editingItem ? 'Edit Vehicle' : 'Register Vehicle'}</h3>
          <button onClick={onClose} style={btnIcon} className="!w-10 !h-10 hover:border-primary/50 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={modalFormSpace}>
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <p style={sectionLabel}>Basic Information</p>
              <div className="space-y-1.5">
                <label style={labelStyle}>Model Name</label>
                <input name="model" defaultValue={editingItem?.model} style={inputStyle} placeholder="e.g. Toyota Hiace Grandia" required />
              </div>
              <div className="space-y-1.5">
                <label style={labelStyle}>Category</label>
                <input name="category" defaultValue={editingItem?.category} style={inputStyle} placeholder="e.g. Premium Van" />
              </div>
              <div className="space-y-1.5">
                <label style={labelStyle}>Pax Capacity</label>
                <input name="pax_capacity" type="number" defaultValue={editingItem?.pax_capacity || 10} style={inputStyle} required />
              </div>
            </div>
            
            <div className="space-y-6">
              <p style={sectionLabel}>Performance & Rate</p>
              <div className="space-y-1.5">
                <label style={labelStyle}>Daily Unit Rate (₱)</label>
                <input name="default_rate" type="number" defaultValue={editingItem?.default_rate} style={inputStyle} placeholder="0" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                  <label style={labelStyle}>KM per Litre</label>
                  <input name="km_per_l" type="number" step="0.1" defaultValue={editingItem?.km_per_l || 10} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label style={labelStyle}>Fuel Type</label>
                  <select name="fuel_type" defaultValue={editingItem?.fuel_type || 'Diesel'} style={inputStyle} className="!appearance-none">
                    <option>Diesel</option>
                    <option>Gasoline</option>
                  </select>
                </div>
              </div>
              <div className="p-5 bg-[var(--color-bg-subtle)] rounded-2xl border border-[var(--color-border-default)] mt-4">
                <p className="text-[11px] text-text-tertiary leading-relaxed italic">
                  Note: This base price excludes fuel and driver fees, which are calculated dynamically in the builder.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)] mt-2">
            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', height: '48px' }}>
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Vehicle Configuration'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={modalOverlay}
      className="z-[100]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        onClick={(e) => e.stopPropagation()}
        style={modalCard} 
        className="max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-10">
          <h3 style={modalTitle}>{editingItem ? 'Edit Itinerary Preset' : 'Define Itinerary Preset'}</h3>
          <button onClick={onClose} style={btnIcon} className="!w-10 !h-10 hover:border-primary/50 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={modalFormSpace}>
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          
          <div className="space-y-6">
            <p style={sectionLabel}>Primary Details</p>
            <div className="space-y-1.5">
              <label style={labelStyle}>Trip Title / Pattern Name</label>
              <input name="title" defaultValue={editingItem?.title} style={inputStyle} className="font-bold" placeholder="e.g. CDO City Tour (Whole Day)" required />
            </div>
            <div className="space-y-1.5">
              <label style={labelStyle}>Default Distance (KM)</label>
              <input name="default_km" type="number" step="0.1" defaultValue={editingItem?.default_km} style={inputStyle} placeholder="e.g. 50" />
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)]">
            <div className="flex items-center justify-between mb-4">
              <p style={sectionLabel}>Operational Multipliers (Auto-Fees)</p>
              <span className="text-[10px] text-text-tertiary">Selecting a tag automates that fee in the builder</span>
            </div>
            <TagSelector options={tagOptions} selectedTags={tags} onChange={setTags} />
          </div>

          <div className="space-y-1.5 pt-6 border-t border-[var(--color-border-default)]">
            <label style={labelStyle}>Standard Details (Inclusions)</label>
            <textarea name="details" defaultValue={editingItem?.details} style={inputStyle} className="h-32 !py-4" placeholder="Briefly describe the inclusions..." />
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)] mt-2">
            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', height: '48px' }}>
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Itinerary Configuration'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={modalOverlay}
      className="z-[100]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        onClick={(e) => e.stopPropagation()}
        style={modalCard} 
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-10">
          <h3 style={modalTitle}>{editingItem ? 'Edit Misc Fee' : 'Add Misc Fee'}</h3>
          <button onClick={onClose} style={btnIcon} className="!w-10 !h-10 hover:border-primary/50 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={modalFormSpace}>
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          
          <div className="space-y-6">
            <p style={sectionLabel}>Fee Details</p>
            <div className="space-y-1.5">
              <label style={labelStyle}>Fee Name / Operational Tag</label>
              <input name="name" defaultValue={editingItem?.name} style={inputStyle} className="font-bold" placeholder="e.g. Driver Fee" required />
            </div>
            <div className="space-y-1.5">
              <label style={labelStyle}>Default Amount (₱)</label>
              <input name="default_amount" type="number" defaultValue={editingItem?.default_amount} style={inputStyle} placeholder="e.g. 1000" required />
            </div>
          </div>
          
          <div className="p-5 bg-[var(--color-bg-subtle)] rounded-2xl border border-[var(--color-border-default)]">
            <p className="text-[11px] text-text-tertiary leading-relaxed italic">
              Note: The "Fee Name" acts as a linkable Tag in the itinerary builder.
            </p>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)]">
            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', height: '48px' }}>
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Misc Configuration'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={modalOverlay}
      className="z-[100]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        onClick={(e) => e.stopPropagation()}
        style={modalCard} 
        className="max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-10">
          <h3 style={modalTitle}>{editingItem ? 'Edit Package Design' : 'New Package Design'}</h3>
          <button onClick={onClose} style={btnIcon} className="!w-10 !h-10 hover:border-primary/50 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={modalFormSpace}>
          <div className="space-y-6">
            <p style={sectionLabel}>Identity</p>
            <div className="space-y-1.5">
              <label style={labelStyle}>Package Title</label>
              <input name="title" defaultValue={editingItem?.title} style={inputStyle} className="font-bold" placeholder="e.g. Transport & Driver" required />
            </div>
            
            <label className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-bg-subtle)] rounded-2xl cursor-pointer group w-full border border-transparent hover:border-emerald-200 transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Mark as Recommended</span>
                <span className="text-[10px] text-text-tertiary">Highlights this package in the builder</span>
              </div>
              <input 
                type="checkbox" 
                name="is_recommended" 
                value="true" 
                defaultChecked={editingItem?.is_recommended} 
                className="w-5 h-5 rounded-lg border-[var(--color-border-default)] text-primary focus:ring-primary/20 cursor-pointer" 
              />
            </label>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)] space-y-4">
             <p style={sectionLabel}>Core Inclusions</p>
             <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'includes_vehicle', label: 'Vehicle Rate' },
                  { name: 'includes_fuel', label: 'Fuel Cost' },
                  { name: 'includes_accommodation', label: 'Guest Accom' }
                ].map((item: any) => (
                  <label key={item.name} className="flex items-center justify-center gap-3 px-2 py-4 bg-[var(--color-bg-subtle)] rounded-2xl cursor-pointer hover:bg-white border border-transparent hover:border-[var(--color-border-default)] transition-all group">
                    <input 
                      type="checkbox" 
                      name={item.name} 
                      value="true" 
                      defaultChecked={editingItem ? editingItem[item.name] : true} 
                      className="w-4 h-4 rounded border-[var(--color-border-default)] text-primary focus:ring-primary/20 cursor-pointer" 
                    />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tight opacity-70 group-hover:opacity-100">{item.label}</span>
                  </label>
                ))}
             </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)] space-y-4">
             <p style={sectionLabel}>Miscellaneous Fees</p>
             <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {miscPresets.map((m: any) => (
                  <label key={m.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-subtle)] rounded-2xl cursor-pointer hover:bg-white border border-transparent hover:border-[var(--color-border-default)] transition-all group">
                    <input 
                      type="checkbox" 
                      name="misc_ids" 
                      value={m.id} 
                      defaultChecked={editingItem?.includes_misc_ids?.includes(m.id)} 
                      className="w-4 h-4 rounded border-[var(--color-border-default)] text-primary focus:ring-primary/20 cursor-pointer" 
                    />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tight opacity-70 group-hover:opacity-100 truncate">{m.name}</span>
                  </label>
                ))}
             </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)]">
            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', height: '48px' }}>
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Package Definition'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>

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
    <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-hide">
      {options.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`inline-flex items-center px-2 rounded text-[9px] font-black uppercase tracking-wide transition-all leading-none cursor-pointer hover:scale-110 active:scale-95 ${
              isActive 
                ? "bg-rose-500 text-white shadow-sm hover:bg-rose-600" 
                : "bg-[#f0f2f5] text-text-tertiary/40 hover:text-text-tertiary/70 hover:bg-[#e8eaed]"
            }`}
            style={{ height: '20px', minHeight: '20px', padding: '0 8px' }}
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
  return tagStr.split(',').map(t => t.trim()).filter(Boolean);
}

function UserSettingsModal({ isOpen, onClose, fullName, setFullName, newPassword, setNewPassword, confirmPassword, setConfirmPassword, passwordError, role, onSave, loading }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={modalOverlay}
      className="z-[100]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        onClick={(e) => e.stopPropagation()}
        style={modalCard} 
        className="max-w-md w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-10">
          <h3 style={modalTitle}>Account Settings</h3>
          <button onClick={onClose} style={btnIcon} className="!w-10 !h-10 hover:border-primary/50 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={onSave} style={modalFormSpace}>
          <div className="space-y-6">
            <p style={sectionLabel}>Profile Info</p>
            <div className="space-y-1.5">
              <label style={labelStyle}>Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)] space-y-6">
            <p style={sectionLabel}>Security Update</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label style={labelStyle}>New Password (Optional)</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="Min 6 characters" />
              </div>
              <div className="space-y-1.5">
                <label style={labelStyle}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
          
          {passwordError && (
             <div style={alertError} className="p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle size={16} />
                <p className="text-[11px] font-bold uppercase tracking-tight">{passwordError}</p>
             </div>
          )}

          <div className="pt-6 border-t border-[var(--color-border-default)]">
            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', height: '48px' }}>
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>

  );
}

function PremiumConfirmDialog({ isOpen, onClose, onConfirm, title, type }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, type: string | null }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-white/20 !p-[48px] flex flex-col items-center text-center relative"
          >
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 shadow-lg shadow-rose-200/50 relative">
              <div className="absolute inset-0 bg-rose-200/20 rounded-3xl animate-pulse" />
              <AlertCircle size={32} strokeWidth={2.5} className="relative" />
            </div>
            
            <h3 className="text-[17px] font-black text-primary tracking-tight leading-tight italic">Confirm Deletion</h3>
            <p className="text-[12px] font-bold text-text-tertiary mt-3 leading-relaxed">
              Are you sure you want to delete this {type || 'record'}? This will permanently remove <span className="text-rose-500 font-black">"{title}"</span> from your records.
            </p>
            
            <div className="flex w-full gap-3 mt-10">
              <button 
                onClick={onClose}
                className="flex-1 h-12 bg-[#f8f9fb] text-primary border border-[#e8eaed] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-primary/20 transition-all active:scale-[0.98]"
              >
                No, Keep it
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 h-12 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-rose-500/20 hover:bg-rose-600 active:scale-[0.98] transition-all"
              >
                Yes, Delete it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AccommodationListItem({ item, onEdit, onDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 hover:border-primary/30 transition-all group shadow-sm"
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={modalOverlay}
      className="z-[100]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        onClick={(e) => e.stopPropagation()}
        style={modalCard} 
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-10">
          <h3 style={modalTitle}>{editingItem ? 'Edit Accommodation' : 'Add Accommodation'}</h3>
          <button onClick={onClose} style={btnIcon} className="!w-10 !h-10 hover:border-primary/50 transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={modalFormSpace}>
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          
          <div className="space-y-6">
            <p style={sectionLabel}>Room Configuration</p>
            <div className="space-y-1.5">
              <label style={labelStyle}>Room Name / Type</label>
              <input name="name" defaultValue={editingItem?.name} style={inputStyle} className="font-bold" placeholder="e.g. Standard Room" required />
            </div>
            <div className="space-y-1.5">
              <label style={labelStyle}>Brief Description</label>
              <input name="description" defaultValue={editingItem?.description} style={inputStyle} placeholder="e.g. Twin sharing, AC, breakfast included" />
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)] grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label style={labelStyle}>Pax Threshold</label>
              <input name="pax_count" type="number" min="1" defaultValue={editingItem?.pax_count || 1} style={inputStyle} placeholder="e.g. 4" required />
            </div>
            <div className="space-y-1.5">
              <label style={labelStyle}>Rate (₱) / Night</label>
              <input name="amount" type="number" defaultValue={editingItem?.amount} style={inputStyle} placeholder="e.g. 2500" required />
            </div>
          </div>
          
          <div className="p-5 bg-[var(--color-bg-subtle)] rounded-2xl border border-[var(--color-border-default)]">
            <p className="text-[11px] text-text-tertiary leading-relaxed italic px-1">
              Note: The system auto-matches the closest accommodation (≥ pax count) per day in the builder.
            </p>
          </div>

          <div className="pt-6 border-t border-[var(--color-border-default)]">
            <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', height: '48px' }}>
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Accommodation'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>

  );
}
