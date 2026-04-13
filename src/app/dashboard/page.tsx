"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Plus, Search, Clock, CheckCircle, AlertCircle, FileText, Map as MapIcon, Loader2, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, X, CarFront, Trash2, Users, Banknote, Fuel, Minus, Settings, Sparkles, Briefcase, Zap, TrendingUp, BedDouble } from "lucide-react";
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

function DashboardContent() {
  const router = useRouter();
  const { profile, loading: authLoading, selectedOperatorId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [paymentTotals, setPaymentTotals] = useState<Record<string, number>>({});
  const confirmedStatuses = ['Confirmed', 'Payment Started', 'Payment Complete'];
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const searchParams = useSearchParams();
  const validTabs = ['quotes', 'analytics', 'vehicles', 'itinerary', 'miscellaneous', 'packages', 'accommodation'] as const;
  const tabParam = searchParams.get('tab') as typeof validTabs[number] | null;
  const [activeTab, setActiveTab] = useState<typeof validTabs[number]>(validTabs.includes(tabParam as any) ? tabParam! : 'analytics');
  const [tabLoading, setTabLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30>(7);
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
          .select('*, profiles:created_by(full_name)')
          .eq('operator_id', selectedOperatorId)
          .order('eta', { ascending: true, nullsFirst: false });
          
        if (error) {
          console.error('Error fetching quotes:', error);
        } else {
          const now = new Date();
          const sorted = (data || []).sort((a: any, b: any) => {
            if (!a.eta && !b.eta) return 0;
            if (!a.eta) return 1;
            if (!b.eta) return -1;
            const dateA = new Date(a.eta);
            const dateB = new Date(b.eta);
            const isPastA = dateA < now;
            const isPastB = dateB < now;
            if (isPastA !== isPastB) return isPastA ? 1 : -1;
            if (isPastA && isPastB) return dateB.getTime() - dateA.getTime();
            return dateA.getTime() - dateB.getTime();
          });
          setQuotes(sorted);

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
        const { data } = await getVehicles(selectedOperatorId!);
        setFleet(data || []);
      } else if (activeTab === 'itinerary') {
        const [presetData, miscData] = await Promise.all([
          getItineraryPresets(selectedOperatorId!),
          getMiscPresets(selectedOperatorId!)
        ]);
        setPresets(presetData.data || []);
        setMiscPresets(miscData.data || []);
      } else if (activeTab === 'miscellaneous') {
        const { data } = await getMiscPresets(selectedOperatorId!);
        setMiscPresets(data || []);
      } else if (activeTab === 'packages') {
        const [pkgs, miscs] = await Promise.all([
          getPackagePresets(selectedOperatorId!),
          getMiscPresets(selectedOperatorId!)
        ]);
        setPackagePresets(pkgs.data || []);
        setMiscPresets(miscs.data || []);
      } else if (activeTab === 'accommodation') {
        const { data } = await getGuestAccommodation(selectedOperatorId!);
        setAccommodations(data || []);
      }
    } catch (err) {
      console.error('Operational data fetch error:', err);
    } finally {
      setLoading(false);
      setTabLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!profile) router.push("/");
      else fetchOperationalData();
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
      const creatorName = q.profiles?.full_name || "Unknown Agent";
      
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

  const statusCounts: Record<string, number> = {};
  allStatuses.forEach(s => { statusCounts[s] = quotes.filter(q => q.status === s).length; });

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.vehicle_model?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
        <div className="bg-primary text-white w-full flex justify-center py-2 text-[10px] font-bold uppercase tracking-widest z-50">
          <div className="max-w-4xl w-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={12} className="text-accent" />
              <span>Oversight: <span className="text-accent">{profile.operators?.name}</span></span>
            </div>
            <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 hover:text-accent transition-colors">
              <ChevronLeft size={10} /> Exit Station
            </button>
          </div>
        </div>
      )}

      {/* ── Slim Top Bar ─────────────────────────── */}
      <header className="bg-white border-b border-[#e8eaed] sticky top-0 z-40 w-full flex justify-center safe-top">
        <div className="max-w-4xl w-full px-4 md:px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 md:gap-3 cursor-pointer group hover:opacity-80 transition-all min-w-0"
          >
            <LayoutGrid className="text-primary group-hover:scale-110 transition-transform shrink-0" size={18} />
            <span className="text-sm md:text-base font-bold text-primary tracking-tight truncate">TravelQuote</span>
            <span className="text-xs text-text-tertiary hidden sm:inline">·</span>
            <div className="text-xs font-medium text-text-secondary hidden sm:block truncate">
              Station: <span className="text-primary font-bold">{profile?.operators?.name}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button 
              onClick={handleSignOut} 
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

      <main className="max-w-4xl w-full px-4 md:px-6 py-8 md:py-14 flex flex-col gap-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary mb-1 tracking-tight">
              {activeTab === 'quotes' && "Operational Station"}
              {activeTab === 'analytics' && "Agency Insights"}
              {activeTab === 'vehicles' && "Fleet Inventory"}
              {activeTab === 'itinerary' && "Service Presets"}
              {activeTab === 'miscellaneous' && "Miscellaneous Fees"}
              {activeTab === 'packages' && "Summary Packages"}
          {activeTab === 'accommodation' && "Guest Accommodation"}
            </h1>
            <p className="text-xs md:text-sm text-text-secondary">
              {activeTab === 'quotes' && "Active mission control and trip management."}
              {activeTab === 'analytics' && `Company-wide performance for the last ${analyticsDays} days.`}
              {activeTab === 'vehicles' && "Manage your vehicles and service rates."}
              {activeTab === 'itinerary' && "Define standard trip and itinerary patterns."}
              {activeTab === 'miscellaneous' && "Configure operator-level miscellaneous fee presets."}
              {activeTab === 'packages' && "Configure reusable pricing packages."}
              {activeTab === 'accommodation' && "Manage guest accommodation options with pax-based pricing."}
            </p>
          </div>
          {activeTab === 'quotes' && (
            <button 
              onClick={() => router.push('/builder')}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Issue Quote</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
          {activeTab === 'vehicles' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingVehicle(true); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0"
            >
              <CarFront size={20} />
              Add Vehicle
            </button>
          )}
          {activeTab === 'itinerary' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingPreset(true); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0"
            >
              <MapIcon size={20} />
              Define Preset
            </button>
          )}
          {activeTab === 'miscellaneous' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingMisc(true); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0"
            >
              <Banknote size={20} />
              Add Misc Fee
            </button>
          )}
          {activeTab === 'packages' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingPackage(true); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0"
            >
              <LayoutGrid size={20} />
              Add Package
            </button>
          )}
          {activeTab === 'accommodation' && (
            <button 
              onClick={() => { setEditingItem(null); setIsAddingAccommodation(true); }}
              className="h-12 md:!h-14 px-6 md:!px-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0"
            >
              <BedDouble size={20} />
              Add Accommodation
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-snap-x pb-2" role="tablist">
          <button onClick={() => setActiveTab('analytics')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'analytics' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Analytics</button>
          <button onClick={() => setActiveTab('quotes')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'quotes' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Quotes</button>
          <button onClick={() => setActiveTab('vehicles')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'vehicles' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Vehicles</button>
          <button onClick={() => setActiveTab('accommodation')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'accommodation' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Guest Accom</button>
          <button onClick={() => setActiveTab('itinerary')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'itinerary' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Itinerary</button>
          <button onClick={() => setActiveTab('miscellaneous')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'miscellaneous' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Misc. Fees</button>
          <button onClick={() => setActiveTab('packages')} className={`!px-3 !py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeTab === 'packages' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-white border border-[#e8eaed] text-text-tertiary hover:border-primary hover:text-primary'}`}>Packages</button>
        </div>

        {activeTab !== 'analytics' && (
          <div className="flex items-center gap-4">
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
        {activeTab !== 'analytics' && activeTab === 'quotes' && (
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm text-text-secondary shrink-0">
              Showing <span className="font-bold text-primary">{filteredQuotes.length}</span> record{filteredQuotes.length !== 1 && 's'}
            </p>
          </div>
        )}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-4 pt-10">
              <div className="flex items-center gap-2 p-1.5 bg-[#f0f2f5] rounded-2xl w-fit">
                <button onClick={() => setAnalyticsDays(7)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analyticsDays === 7 ? 'bg-white text-primary shadow-sm' : 'text-text-tertiary hover:text-primary'}`}>Last 7 Days</button>
                <button onClick={() => setAnalyticsDays(30)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${analyticsDays === 30 ? 'bg-white text-primary shadow-sm' : 'text-text-tertiary hover:text-primary'}`}>Last 30 Days</button>
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
                <div className="bg-white border border-[#e8eaed] rounded-2xl !p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-text-tertiary mb-0.5">Total Quotes</p>
                    <h3 className="text-2xl font-black text-primary tracking-tight">₱{analytics.total.amount.toLocaleString()}</h3>
                    <p className="text-[10px] font-semibold text-text-secondary mt-0.5">{analytics.total.count} Record{analytics.total.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText size={22} />
                  </div>
                </div>
                <div className="bg-white border border-[#e8eaed] rounded-2xl !p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-text-tertiary mb-0.5">Total Collection</p>
                    <h3 className="text-2xl font-black text-emerald-600 tracking-tight">₱{Object.values(paymentTotals).reduce((a, b) => a + b, 0).toLocaleString()}</h3>
                    <p className="text-[10px] font-semibold text-text-secondary mt-0.5">From {Object.values(paymentTotals).filter(v => v > 0).length} quote{Object.values(paymentTotals).filter(v => v > 0).length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Banknote size={22} />
                  </div>
                </div>
              </div>

              <AgentPerformanceLeaderboard 
                  issuers={analytics.leaderboard.issuers} 
                  closers={analytics.leaderboard.closers} 
                />

                <div className="bg-white border border-[#f0f2f5] rounded-3xl !p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                        <TrendingUp size={20} className="text-secondary" />
                        Quotation Trend Velocity
                      </h4>
                      <p className="text-xs text-text-secondary">Daily record volume for the last {analyticsDays} days.</p>
                    </div>
                  </div>
                  <div className="h-[180px] w-full">
                    <OperationalTrendGraph data={analytics.trend} />
                  </div>
                </div>
              </div>
            )}

          {activeTab === 'quotes' && (
            quotes.length > 0 ? (
              <div className="space-y-4">
                {allStatuses.map(status => {
                  const groupQuotes = filteredQuotes.filter(q => q.status === status);
                  const isEmpty = groupQuotes.length === 0;
                  
                  const isExpanded = expandedGroup === status;
                  const groupTotal = groupQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);
                  const groupPaid = groupQuotes.reduce((sum, q) => sum + (paymentTotals[q.id] || 0), 0);
                  
                  const dotColors: Record<string, string> = {
                    'Draft': 'bg-slate-400',
                    'Quotation Sent': 'bg-blue-500',
                    'Follow-up Needed': 'bg-amber-500',
                    'Confirmed': 'bg-emerald-500',
                    'Payment Started': 'bg-indigo-500',
                    'Payment Complete': 'bg-violet-500',
                    'Lost': 'bg-gray-400',
                    'Cancelled': 'bg-rose-500',
                  };
                  const bgColors: Record<string, string> = {
                    'Draft': 'bg-slate-50',
                    'Quotation Sent': 'bg-blue-50',
                    'Follow-up Needed': 'bg-amber-50',
                    'Confirmed': 'bg-emerald-50',
                    'Payment Started': 'bg-indigo-50',
                    'Payment Complete': 'bg-violet-50',
                    'Lost': 'bg-gray-50',
                    'Cancelled': 'bg-rose-50',
                  };

                  return (
                    <div key={status} className={`rounded-2xl border border-[#e8eaed] bg-white relative ${isEmpty ? 'opacity-50' : ''}`} style={{ zIndex: allStatuses.length - allStatuses.indexOf(status) }}>
                      <button 
                        onClick={() => !isEmpty && toggleGroup(status)}
                        className={`w-full flex items-center justify-between px-7 py-3 transition-colors ${isEmpty ? 'cursor-default' : 'hover:bg-[#fafbfc]'} ${isExpanded && !isEmpty ? 'border-b border-[#f0f2f5]' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
                          <span className="text-xs font-black uppercase tracking-widest text-primary">{status}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${bgColors[status]} text-text-tertiary`}>{groupQuotes.length}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {groupPaid > 0 && (
                            <span className="text-[10px] font-bold text-emerald-500">Paid: ₱{groupPaid.toLocaleString()}</span>
                          )}
                          <span className="text-xs font-bold text-text-tertiary font-mono">₱{groupTotal.toLocaleString()}</span>
                          <ChevronDown size={14} className={`text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="flex flex-col divide-y divide-[#f0f2f5]">
                              {groupQuotes.map((quote: any) => {
                                const now = new Date();
                                const twoWeeks = new Date();
                                twoWeeks.setDate(now.getDate() + 14);
                                const isUrgent = !confirmedStatuses.includes(quote.status || '') && quote.status !== 'Cancelled' && quote.status !== 'Lost' && quote.eta && new Date(quote.eta) > now && new Date(quote.eta) <= twoWeeks;

                                return (
                                  <QuoteListItem 
                                    key={quote.id}
                                    quoteId={quote.id}
                                    customer={quote.customer_name} 
                                    route={quote.vehicle_model || "Private Trip"} 
                                    date={quote.eta ? new Date(quote.eta).toLocaleDateString() : "TBD"} 
                                    status={quote.status} 
                                    isUrgent={isUrgent}
                                    amount={`P${quote.grand_total?.toLocaleString()}`}
                                    totalPaid={paymentTotals[quote.id] || 0}
                                    agent={quote.profiles?.full_name}
                                    onClick={() => router.push(`/builder?id=${quote.id}`)}
                                    onStatusChange={(newStatus: string) => {
                                      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: newStatus } : q));
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
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
              fleet.map((v: any) => (
                <VehicleListItem 
                  key={v.id} 
                  vehicle={v} 
                  onEdit={() => { setEditingItem(v); setIsAddingVehicle(true); }} 
                  onDelete={() => handleDelete('vehicle', v.id, v.model)}
                />
              ))
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
              presets.map((p: any) => (
                <PresetListItem 
                  key={p.id} 
                  preset={p} 
                  onEdit={() => { setEditingItem(p); setIsAddingPreset(true); }} 
                  onDelete={() => handleDelete('itinerary', p.id, p.title)}
                />
              ))
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
              miscPresets.map((m: any) => (
                <MiscPresetListItem 
                  key={m.id} 
                  preset={m} 
                  onEdit={() => { setEditingItem(m); setIsAddingMisc(true); }} 
                  onDelete={() => handleDelete('misc', m.id, m.name)}
                />
              ))
            ) : (
              <EmptyState 
                title="No misc fees defined" 
                desc="Define standard fees like carwash, tolls, or permits." 
                onAction={() => { setEditingItem(null); setIsAddingMisc(true); }}
                actionLabel="Add Misc Fee"
                icon={<Banknote size={48} />}
              />
            )
          )}

          {activeTab === 'packages' && (
            packagePresets.length > 0 ? (
              packagePresets.map((p: any) => (
                <PackageListItem 
                  key={p.id} 
                  packageItem={p} 
                  miscPresets={miscPresets}
                  onEdit={() => { setEditingItem(p); setIsAddingPackage(true); }} 
                  onDelete={() => handleDelete('package', p.id, p.title)}
                />
              ))
            ) : (
              <EmptyState 
                title="No packages defined" 
                desc="Create pricing packages for faster quoting." 
                onAction={() => { setEditingItem(null); setIsAddingPackage(true); }}
                actionLabel="Add Package"
                icon={<LayoutGrid size={48} />}
              />
            )
          )}

          {activeTab === 'accommodation' && (
            accommodations.length > 0 ? (
              accommodations.map((a: any) => (
                <AccommodationListItem 
                  key={a.id} 
                  item={a}
                  onEdit={() => { setEditingItem(a); setIsAddingAccommodation(true); }} 
                  onDelete={() => handleDelete('accommodation', a.id, a.name)}
                />
              ))
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
              onClose={() => setIsAddingVehicle(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              onSuccess={() => { setIsAddingVehicle(false); setActiveTab('vehicles'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingPreset && (
            <AddPresetModal 
              onClose={() => setIsAddingPreset(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              miscPresets={miscPresets}
              onSuccess={() => { setIsAddingPreset(false); setActiveTab('itinerary'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingMisc && (
            <AddMiscModal 
              onClose={() => setIsAddingMisc(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              onSuccess={() => { setIsAddingMisc(false); setActiveTab('miscellaneous'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingPackage && (
            <AddPackageModal 
              onClose={() => setIsAddingPackage(false)} 
              editingItem={editingItem}
              operatorId={selectedOperatorId!}
              miscPresets={miscPresets}
              onSuccess={() => { setIsAddingPackage(false); setActiveTab('packages'); setLoading(true); setRefreshTrigger(p => p + 1); }}
            />
          )}

          {isAddingAccommodation && (
            <AddAccommodationModal 
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
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    primary: 'bg-primary/5 text-primary',
    slate: 'bg-slate-100 text-slate-500',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    gray: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className={`bg-white border border-[#e8eaed] shadow-sm shadow-primary/[0.02] ${compact ? 'rounded-2xl !p-4' : 'rounded-3xl !p-6'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <div className={`${compact ? 'w-7 h-7 rounded-xl' : 'w-10 h-10 rounded-2xl'} ${colors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div className={`px-2 py-0.5 rounded-full font-black tracking-tighter ${compact ? 'text-[8px]' : 'text-[10px]'} ${growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
        </div>
      </div>
      <p className={`font-black uppercase tracking-[0.15em] text-text-tertiary ${compact ? 'text-[8px] mb-0.5' : 'text-[10px] mb-1'}`}>{title}</p>
      <h3 className={`font-black text-primary tracking-tight leading-tight ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</h3>
      {secondaryValue && <p className={`font-semibold text-text-secondary ${compact ? 'text-[10px] mt-0.5' : 'text-xs mt-1'}`}>{secondaryValue}</p>}
    </div>
  );
}

function OperationalTrendGraph({ data }: { data: any[] }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="bg-white/95 rounded-xl shadow-2xl shadow-primary/10 border border-[#e8eaed] backdrop-blur-md"
          style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '20px', paddingBottom: '20px' }}
        >
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-text-tertiary mb-3">{payload[0].payload.name}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-16">
              <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Total Quotes</span>
              <span className="text-[10px] font-extrabold text-primary">{payload[0].value}</span>
            </div>
            <div className="flex items-center justify-between gap-16 border-t border-[#f0f2f5] pt-3">
              <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Total Amount</span>
              <span className="text-[10px] font-extrabold text-primary">P{payload[0].payload.value?.toLocaleString()}</span>
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
            <stop offset="5%" stopColor="#1A5F7A" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#1A5F7A" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
          dy={10}
          minTickGap={30}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{ stroke: '#1A5F7A', strokeWidth: 2, strokeDasharray: '5 5' }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Area 
          type="monotone" 
          dataKey="quotes" 
          stroke="#1A5F7A" 
          strokeWidth={4} 
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
        <div className="w-6 text-[10px] font-black text-text-tertiary opacity-30 group-hover:opacity-100 transition-opacity">
          #{rank}
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/5 text-primary'}`}>
          {initials}
        </div>
        <div>
          <p className="text-sm font-bold text-primary tracking-tight">{name}</p>
          <p className="text-[10px] text-text-tertiary font-bold tracking-widest uppercase">{subValue}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-black ${isSuccess ? 'text-emerald-600' : 'text-primary'}`}>{value}</p>
      </div>
    </div>
  );
}

function QuoteListItem({ customer, route, date, status, amount, totalPaid, onClick, isUrgent, agent, quoteId, onStatusChange }: any) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const statusConfig: any = {
    'Draft': { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200/50', dot: 'bg-slate-400' },
    'Pending': { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200/50', dot: 'bg-slate-400' },
    'Quotation Sent': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200/50', dot: 'bg-blue-500' },
    'Follow-up Needed': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200/50', dot: 'bg-amber-500' },
    'Quoted': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200/50', dot: 'bg-blue-500' },
    'Confirmed': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200/50', dot: 'bg-emerald-500' },
    'Lost': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200/50', dot: 'bg-gray-400' },
    'Payment Started': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200/50', dot: 'bg-indigo-500' },
    'Payment Complete': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200/50', dot: 'bg-violet-500' },
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
    const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', quoteId);
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`px-7 py-2.5 flex items-center justify-between hover:bg-[#fafbfc] transition-all group cursor-pointer relative ${isDropdownOpen ? 'z-50' : ''}`}
    >
      {isUrgent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r" />
      )}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <FileText size={14} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-primary leading-tight truncate">{customer}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{route}</span>
            <span className="text-text-tertiary text-[8px]">·</span>
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{date}</span>
            {agent && (
              <>
                <span className="text-text-tertiary text-[8px]">·</span>
                <span className="text-[9px] font-bold text-primary/60 uppercase tracking-wider">{agent}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.nativeEvent.stopImmediatePropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} hover:shadow-sm cursor-pointer`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {status}
            <ChevronLeft size={8} className={`rotate-180 transition-transform ${isDropdownOpen ? '-rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-[100] bg-white rounded-xl shadow-lg border border-[#e8eaed] min-w-[150px]"
                  style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{ margin: 0, padding: '2px 8px', fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', lineHeight: 1, height: '16px', display: 'flex', alignItems: 'center' }}>Update Status</p>
                  {dropdownOptions.map(s => {
                    const sCfg = statusConfig[s];
                    const isActive = s === status;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusSelect(s)}
                        style={{ margin: 0, padding: '0 8px', height: '26px', minHeight: '26px', maxHeight: '26px', lineHeight: 1, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', width: '100%' }}
                        className={`transition-all ${
                          isActive 
                            ? `${sCfg.bg} ${sCfg.text}` 
                            : 'text-text-secondary hover:bg-[#f8f9fb] bg-transparent'
                        }`}
                      >
                        <span className={`shrink-0 ${sCfg.dot}`} style={{ width: '6px', height: '6px', borderRadius: '50%' }} />
                        {s}
                        {isActive && <CheckCircle size={10} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-right min-w-[80px]">
          <div className="text-sm font-bold text-primary">{amount}</div>
          {totalPaid > 0 && (
            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mt-0.5">Paid: ₱{totalPaid.toLocaleString()}</p>
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
      className="bg-white border border-[#e8eaed] rounded-3xl px-4 md:!px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 hover:border-primary/40 transition-all group shadow-sm shadow-primary/[0.02]"
    >
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
          <CarFront size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-primary leading-tight">{vehicle.model}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">{vehicle.category}</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <Users size={10} /> {vehicle.pax_capacity || 1} PAX
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="text-right">
          <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">Rate</div>
          <div className="text-sm font-bold text-primary">P{vehicle.default_rate?.toLocaleString()} <span className="text-text-tertiary font-medium">/ Day</span></div>
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
      className="bg-white border border-[#e8eaed] rounded-3xl px-4 md:!px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 hover:border-primary/40 transition-all group shadow-sm shadow-primary/[0.02]"
    >
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
          <MapIcon size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-primary leading-tight">{preset.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
              {preset.default_km} KM DEFAULT
            </span>
          </div>
          {preset.tags && (
             <div className="flex flex-wrap gap-1 mt-1.5">
                {parseTags(preset.tags).map(t => (
                  <span key={t} className="px-2 py-0.5 bg-primary/5 text-primary text-[8px] font-black uppercase tracking-wider rounded-md border border-primary/10">{t}</span>
                ))}
             </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
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
      className="bg-white border border-[#e8eaed] rounded-3xl px-4 md:!px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 hover:border-primary/40 transition-all group shadow-sm shadow-primary/[0.02]"
    >
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
          <Banknote size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-primary leading-tight">{preset.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">Default</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              P{preset.default_amount?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
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
  if (packageItem.includes_wash) inclusions.push("Wash Fee");
  if (packageItem.includes_accommodation) inclusions.push("Guest Accom");
  
  packageItem.includes_misc_ids?.forEach((id: string) => {
    const m = miscPresets.find(m => m.id === id);
    if (m) inclusions.push(m.name);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#e8eaed] rounded-3xl px-4 md:!px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 hover:border-primary/40 transition-all group shadow-sm shadow-primary/[0.02]"
    >
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
          <LayoutGrid size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-primary leading-tight">{packageItem.title}</h3>
            {packageItem.is_recommended && (
              <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={8} /> Recommended
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {inclusions.map((inc, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#f0f2f5] text-[9px] font-bold text-text-secondary rounded-full uppercase tracking-tight">{inc}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
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
    
    // Basic Client-side Validation
    const model = formData.get('model') as string;
    const default_rate = formData.get('default_rate') as string;
    if (!model || !default_rate) {
      alert("Model and Default Rate are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveVehicle(formData, operatorId);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save vehicle.");
    } catch (err: any) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-primary">{editingItem ? 'Edit Vehicle' : 'Register Vehicle'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f0f2f5] rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Basic Info</p>
              <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Model Name</label><input name="model" defaultValue={editingItem?.model} className="input" style={{ height: '40px' }} placeholder="e.g. Toyota Hiace Grandia" required /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Category</label><input name="category" defaultValue={editingItem?.category} className="input" style={{ height: '40px' }} placeholder="e.g. Premium Van" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Pax Capacity</label><input name="pax_capacity" type="number" defaultValue={editingItem?.pax_capacity || 10} className="input" style={{ height: '40px' }} required /></div>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Rate Configuration</p>
              <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Daily Unit Rate</label><input name="default_rate" type="number" defaultValue={editingItem?.default_rate} className="input" style={{ height: '40px' }} placeholder="0" required /></div>
              <p className="text-[10px] text-text-tertiary leading-relaxed mt-4 italic">This is the base price for the vehicle per day, independent of fuel or driver fees.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#f0f2f5]">
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">KM per Litre</label><input name="km_per_l" type="number" step="0.1" defaultValue={editingItem?.km_per_l || 10} className="input" style={{ height: '40px' }} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Fuel Type</label><select name="fuel_type" defaultValue={editingItem?.fuel_type || 'Diesel'} className="input" style={{ height: '40px' }}><option>Diesel</option><option>Gasoline</option></select></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Carwash Fee</label><input name="carwash_fee" type="number" defaultValue={editingItem?.carwash_fee} className="input" style={{ height: '40px' }} /></div>
          </div>
          <div className="pt-3 border-t border-[#f0f2f5]">
            <button type="submit" disabled={loading} className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">{loading ? <Loader2 className="animate-spin" /> : 'Save Vehicle Configuration'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


function AddPresetModal({ onClose, editingItem, operatorId, miscPresets, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(parseTags(editingItem?.tags));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('tags', tags.join(', '));
    
    if (!formData.get('title')) {
      alert("Title is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveItineraryPreset(formData, operatorId);
      if (res.success) onSuccess();
      else alert(res.error || "Failed to save preset.");
    } catch (err: any) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tagOptions = miscPresets.map((p: any) => p.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-primary">{editingItem ? 'Edit Preset' : 'Define Preset'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f0f2f5] rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Title / Pattern Name</label><input name="title" defaultValue={editingItem?.title} className="input" style={{ height: '40px' }} placeholder="e.g. CDO City Tour (Whole Day)" required /></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Default KM (Optional)</label><input name="default_km" type="number" step="0.1" defaultValue={editingItem?.default_km} className="input" style={{ height: '40px' }} placeholder="e.g. 50" /></div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary ml-1">Operational Tags (Fees)</label>
            <TagSelector options={tagOptions} selectedTags={tags} onChange={setTags} />
            <p className="text-[9px] text-text-tertiary italic">Tags are derived from your Miscellaneous Fees. Selecting a tag will automate that fee in the builder.</p>
          </div>

          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Standard Details (Optional)</label><textarea name="details" defaultValue={editingItem?.details} className="input h-32 pt-4" placeholder="Briefly describe the inclusions..." /></div>
          <div className="pt-3 border-t border-[#f0f2f5]">
            <button type="submit" disabled={loading} className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">{loading ? <Loader2 className="animate-spin" /> : 'Save Preset Definition'}</button>
          </div>
        </form>
      </motion.div>
    </div>
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
    } catch (err: any) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-primary">{editingItem ? 'Edit Misc Fee' : 'Add Misc Fee'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f0f2f5] rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Fee Name</label><input name="name" defaultValue={editingItem?.name} className="input font-bold" style={{ height: '40px' }} placeholder="e.g. Driver Fee" required /></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Default Amount (₱)</label><input name="default_amount" type="number" defaultValue={editingItem?.default_amount} className="input" style={{ height: '40px' }} placeholder="e.g. 1000" required /></div>
          
          <p className="text-[10px] text-text-tertiary leading-relaxed italic">The "Fee Name" also serves as its Operational Tag in the builder.</p>
          <div className="pt-3 border-t border-[#f0f2f5]">
            <button type="submit" disabled={loading} className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">{loading ? <Loader2 className="animate-spin" /> : 'Save Misc Configuration'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


function AddPackageModal({ onClose, editingItem, operatorId, miscPresets, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get all checked misc IDs
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
    } catch (err: any) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-primary">{editingItem ? 'Edit Package' : 'Design Package'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f0f2f5] rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Package Title</label><input name="title" defaultValue={editingItem?.title} className="input font-bold" style={{ height: '40px' }} placeholder="e.g. Transport & Driver" required /></div>
          
          <div className="pt-4 border-t border-[#f0f2f5]">
            <label className="flex items-center justify-between gap-3 px-1 cursor-pointer group w-full">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-tight">Mark as Recommended</span>
                <span className="text-[9px] text-text-tertiary">Features a badge in the Quote Builder.</span>
              </div>
              <input 
                type="checkbox" 
                name="is_recommended" 
                value="true" 
                defaultChecked={editingItem?.is_recommended} 
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0" 
              />
            </label>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[#f0f2f5]">
             <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Core Inclusions</p>
             <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'includes_vehicle', label: 'Vehicle Rate' },
                  { name: 'includes_fuel', label: 'Fuel Cost' },
                  { name: 'includes_wash', label: 'Wash Fee' },
                  { name: 'includes_accommodation', label: 'Guest Accom' }
                ].map((item: any) => (
                  <label key={item.name} className="flex items-center gap-2 px-3 py-2.5 bg-[#f8f9fb] rounded-xl cursor-pointer hover:bg-[#f0f2f5] transition-all">
                    <input 
                      type="checkbox" 
                      name={item.name} 
                      value="true" 
                      defaultChecked={editingItem ? editingItem[item.name] : true} 
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                    />
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wide">{item.label}</span>
                  </label>
                ))}
             </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[#f0f2f5]">
             <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Miscellaneous Inclusions</p>
             <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {miscPresets.map((m: any) => (
                  <label key={m.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#f8f9fb] rounded-xl cursor-pointer hover:bg-[#f0f2f5] transition-all">
                    <input 
                      type="checkbox" 
                      name="misc_ids" 
                      value={m.id} 
                      defaultChecked={editingItem?.includes_misc_ids?.includes(m.id)} 
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                    />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{m.name}</span>
                  </label>
                ))}
             </div>
          </div>

          <div className="pt-4 border-t border-[#f0f2f5]">
            <button type="submit" disabled={loading} className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">
              {loading ? <Loader2 className="animate-spin" /> : 'Save Package Definition'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
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
    <div className="flex gap-1 mt-1 overflow-x-auto scrollbar-hide">
      {options.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`inline-flex items-center px-1.5 rounded text-[5.5px] font-black uppercase tracking-wide transition-all leading-none cursor-pointer hover:scale-110 active:scale-95 ${
              isActive 
                ? "bg-rose-500 text-white shadow-sm hover:bg-rose-600" 
                : "bg-[#f0f2f5] text-text-tertiary/40 hover:text-text-tertiary/70 hover:bg-[#e8eaed]"
            }`}
            style={{ height: '14px', minHeight: '14px', padding: '0 6px' }}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-primary">Account Settings</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f0f2f5] rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" style={{ height: '40px' }} required /></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">New Password (Optional)</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" style={{ height: '40px' }} placeholder="Min 6 characters" /></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" style={{ height: '40px' }} /></div>
          {passwordError && <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{passwordError}</p>}
          <div className="pt-3 border-t border-[#f0f2f5]">
            <button type="submit" disabled={loading} className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">{loading ? <Loader2 className="animate-spin" /> : 'Update Profile'}</button>
          </div>
        </form>
      </motion.div>
    </div>
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
      className="bg-white border border-[#e8eaed] rounded-3xl px-4 md:!px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 hover:border-primary/40 transition-all group shadow-sm shadow-primary/[0.02]"
    >
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#f0f2f5] flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
          <BedDouble size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-primary leading-tight">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <Users size={10} /> {item.pax_count} PAX
            </span>
            {item.description && (
              <>
                <span className="text-text-tertiary">·</span>
                <span className="text-[10px] font-medium text-text-tertiary truncate max-w-[200px]">{item.description}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="text-right">
          <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">Rate</div>
          <div className="text-sm font-bold text-primary">₱{item.amount?.toLocaleString()} <span className="text-text-tertiary font-medium">/ Night</span></div>
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
    } catch (err: any) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-3xl p-6 md:!p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-primary">{editingItem ? 'Edit Accommodation' : 'Add Accommodation'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f0f2f5] rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingItem && <input type="hidden" name="id" value={editingItem.id} />}
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Name</label><input name="name" defaultValue={editingItem?.name} className="input font-bold" style={{ height: '40px' }} placeholder="e.g. Standard Room" required /></div>
          <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Description</label><input name="description" defaultValue={editingItem?.description} className="input" style={{ height: '40px' }} placeholder="e.g. Twin sharing, AC, breakfast included" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Pax Count</label><input name="pax_count" type="number" min="1" defaultValue={editingItem?.pax_count || 1} className="input" style={{ height: '40px' }} placeholder="e.g. 4" required /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-secondary ml-1">Amount (₱)</label><input name="amount" type="number" defaultValue={editingItem?.amount} className="input" style={{ height: '40px' }} placeholder="e.g. 2500" required /></div>
          </div>
          
          <p className="text-[10px] text-text-tertiary leading-relaxed italic">Set the pax threshold for auto-matching. When building a quote, the closest accommodation (≥ pax count) is auto-selected per day.</p>
          <div className="pt-3 border-t border-[#f0f2f5]">
            <button type="submit" disabled={loading} className="w-full h-10 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-sm">{loading ? <Loader2 className="animate-spin" /> : 'Save Accommodation'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
