"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutGrid, 
  BarChart3, 
  FileText, 
  Calendar, 
  Car, 
  BedDouble, 
  Banknote, 
  Map, 
  Package,
  Settings,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  validTabs: readonly string[];
  profile: any;
  onSettingsClick: () => void;
  onAgencySettingsClick?: () => void;
  isImpersonating?: boolean;
}

export default function DashboardSidebar({ 
  activeTab, 
  setActiveTab, 
  validTabs, 
  profile, 
  onSettingsClick,
  onAgencySettingsClick,
  isImpersonating 
}: SidebarProps) {
  const masterSetupTabs = ['vehicles', 'accommodation', 'miscellaneous', 'itinerary', 'packages'];
  const [isMasterExpanded, setIsMasterExpanded] = React.useState(masterSetupTabs.includes(activeTab));

  // Sync expansion state when tab changes externally
  React.useEffect(() => {
    if (masterSetupTabs.includes(activeTab)) {
      setIsMasterExpanded(true);
    }
  }, [activeTab]);
  
  const getIcon = (tab: string) => {
    switch (tab) {
      case 'analytics': return <BarChart3 size={18} />;
      case 'quotes': return <FileText size={18} />;
      case 'calendar': return <Calendar size={18} />;
      case 'vehicles': return <Car size={18} />;
      case 'accommodation': return <BedDouble size={18} />;
      case 'miscellaneous': return <Banknote size={18} />;
      case 'itinerary': return <Map size={18} />;
      case 'packages': return <Package size={18} />;
      default: return <LayoutGrid size={18} />;
    }
  };

  const getLabel = (tab: string) => {
    switch (tab) {
      case 'accommodation': return 'Guest Accom';
      case 'miscellaneous': return 'Misc. Fees';
      default: return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #premium-sidebar {
          background: #f6fdf9 !important;
          border-right: 1px solid #eef2f0 !important;
          width: 280px !important;
          height: 100% !important;
          position: sticky !important;
          top: 0 !important;
          left: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          z-index: 50 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .sidebar-brand {
          height: 80px !important;
          padding: 0 28px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          border-bottom: 1px solid #eef2f0 !important;
          margin-bottom: 24px !important;
        }
        .sidebar-brand-icon {
          width: 42px !important;
          height: 42px !important;
          border-radius: 14px !important;
          background: #00674f !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: white !important;
          box-shadow: 0 8px 16px -4px rgba(0, 103, 79, 0.2) !important;
        }
        .sidebar-nav {
          flex: 1 !important;
          padding: 0 16px !important;
          overflow-y: auto !important;
        }
        .sidebar-nav::-webkit-scrollbar { display: none !important; }
        .sidebar-link {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
          padding: 12px 18px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          transition: all 0.2s ease !important;
          margin-bottom: 4px !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          text-align: left !important;
        }
        .sidebar-link:hover {
          background: #effaf3 !important;
          color: #00674f !important;
          transform: translateX(4px) !important;
        }
        .sidebar-link.active {
          background: #00674f !important;
          color: #ffffff !important;
          box-shadow: 0 8px 16px -4px rgba(0, 103, 79, 0.25) !important;
        }
        .sidebar-active-pill {
          width: 4px !important;
          height: 16px !important;
          background: #ffffff !important;
          border-radius: 99px !important;
          position: absolute !important;
          right: 12px !important;
        }
        .sidebar-sub-link {
          padding: 10px 18px 10px 48px !important;
          font-size: 10px !important;
          opacity: 0.8 !important;
          text-transform: none !important;
          letter-spacing: 0.05em !important;
        }
        .sidebar-group-label {
          padding: 12px 18px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          cursor: pointer !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }
        .sidebar-group-label:hover {
          background: #effaf3 !important;
          color: #00674f !important;
        }
        .sidebar-footer {
          padding: 24px !important;
          border-top: 1px solid #eef2f0 !important;
        }
        .user-card {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 12px !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          border: 1px solid #eef2f0 !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          text-align: left !important;
          box-shadow: 0 4px 12px rgba(0, 103, 79, 0.04) !important;
        }
        .user-card:hover {
          border-color: #e2e8f0 !important;
          background: #ffffff !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        }
        .user-avatar {
          width: 36px !important;
          height: 36px !important;
          border-radius: 10px !important;
          background: #00674f !important;
          color: white !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 900 !important;
          font-size: 12px !important;
        }
        .station-card {
          padding: 16px 20px !important;
          margin: 0 24px 32px 24px !important;
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          background: #ffffff !important;
          border: 1px solid #eef2f0 !important;
          border-radius: 20px !important;
          box-shadow: 0 4px 12px rgba(0, 103, 79, 0.04) !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .station-card-icon {
          width: 38px !important;
          height: 38px !important;
          border-radius: 12px !important;
          background: #f0fdf4 !important;
          border: 1px solid #dcfce7 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #00674f !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          flex-shrink: 0 !important;
          box-shadow: 0 2px 4px rgba(0, 103, 79, 0.05) !important;
        }
        .station-card-content {
          flex: 1 !important;
          min-width: 0 !important;
        }
        .station-label {
          text-transform: uppercase !important;
          letter-spacing: 0.15em !important;
          font-size: 8px !important;
          font-weight: 900 !important;
          color: #10b981 !important;
          margin-bottom: 2px !important;
          display: block !important;
        }
        .station-name {
          font-size: 10px !important;
          font-weight: 800 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: block !important;
          letter-spacing: -0.01em !important;
        }
      `}} />
      
      <aside id="premium-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <LayoutGrid size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 leading-none tracking-tight">TravelQuote</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[9px] font-black text-[#F05E33] uppercase tracking-[0.2em]">Premium ERP</p>
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-emerald-50 rounded-md border border-emerald-100/50">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Top Level Items (Primary) */}
          {['analytics', 'quotes'].map(tab => {
            if (!validTabs.includes(tab)) return null;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {getIcon(tab)}
                </span>
                <span>{getLabel(tab)}</span>
                {isActive && <div className="sidebar-active-pill" />}
              </button>
            );
          })}

          {/* Master Setup Group */}
          <div className="mt-6 mb-2 px-4">
            <div className="h-[1px] bg-emerald-100/50 w-full" />
          </div>

          <div className="mb-2">
            <button 
              onClick={() => setIsMasterExpanded(!isMasterExpanded)}
              className={`sidebar-link group/master ${masterSetupTabs.includes(activeTab) ? 'text-[#00674f] font-black' : ''}`}
            >
              <div className="flex items-center gap-[14px]">
                <Settings size={18} className={masterSetupTabs.includes(activeTab) ? 'text-[#00674f]' : 'text-slate-400'} />
                <span>Master Setup</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`ml-auto transition-transform duration-300 ${isMasterExpanded ? 'rotate-90' : ''} text-slate-300`} 
              />
            </button>

            {isMasterExpanded && (
              <div className="flex flex-col">
                {masterSetupTabs.map(tab => {
                  if (!validTabs.includes(tab)) return null;
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`sidebar-link sidebar-sub-link ${isActive ? 'active' : ''}`}
                    >
                      <span className="flex-1">{getLabel(tab)}</span>
                      {isActive && <div className="sidebar-active-pill !right-4 !h-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calendar (Below Master Setup) */}
          <div className="mt-2">
            {['calendar'].map(tab => {
              if (!validTabs.includes(tab)) return null;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {getIcon(tab)}
                  </span>
                  <span>{getLabel(tab)}</span>
                  {isActive && <div className="sidebar-active-pill" />}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={onSettingsClick} className="user-card">
            <div className="user-avatar">
              {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1">{profile?.full_name || 'User'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] truncate">{profile?.role?.replace('_', ' ') || 'Member'}</p>
            </div>
            <Settings size={14} className="text-slate-300" />
          </button>
        </div>
      </aside>
    </>
  );
}
