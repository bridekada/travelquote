"use client";

import React from 'react';
import { 
  BarChart3, 
  FileText, 
  Calendar, 
  Car, 
  BedDouble, 
  Banknote, 
  CreditCard,
  Map, 
  Package,
  Settings,
  ChevronRight,
  ChevronDown,
  Palmtree
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
      case 'payments': return <CreditCard size={18} />;
      case 'calendar': return <Calendar size={18} />;
      case 'vehicles': return <Car size={18} />;
      case 'accommodation': return <BedDouble size={18} />;
      case 'miscellaneous': return <Banknote size={18} />;
      case 'itinerary': return <Map size={18} />;
      case 'packages': return <Package size={18} />;
      default: return <BarChart3 size={18} />;
    }
  };

  const getLabel = (tab: string) => {
    switch (tab) {
      case 'accommodation': return 'Guest Accom';
      case 'miscellaneous': return 'Misc. Fees';
      case 'payments': return 'Payment Tracker';
      default: return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        #premium-sidebar {
          background: #003829 !important;
          background-image: radial-gradient(circle at top right, #004735 0%, #002d20 100%) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
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
          overflow: hidden !important;
        }
        .sidebar-brand {
          height: 100px !important;
          padding: 0 24px !important;
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
          margin-bottom: 24px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        .sidebar-brand-logo-circle {
          width: 48px !important;
          height: 48px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #003829 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          flex-shrink: 0 !important;
        }
        .sidebar-brand-logo-circle svg {
          stroke-width: 1.8 !important;
        }
        .sidebar-brand-text {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
        }
        .sidebar-brand-title {
          font-family: 'Playfair Display', Georgia, 'Times New Roman', serif !important;
          font-size: 21px !important;
          font-weight: 500 !important;
          color: #ffffff !important;
          letter-spacing: 0.08em !important;
          line-height: 1.1 !important;
          margin: 0 !important;
        }
        .sidebar-brand-subtitle {
          font-family: 'Inter', system-ui, sans-serif !important;
          font-size: 7.5px !important;
          font-weight: 700 !important;
          color: rgba(255, 255, 255, 0.65) !important;
          letter-spacing: 0.26em !important;
          text-transform: uppercase !important;
          margin: 0 !important;
          margin-top: 4px !important;
          line-height: 1.2 !important;
        }
        .sidebar-nav {
          flex: 1 !important;
          padding: 0 16px !important;
          overflow-y: auto !important;
          position: relative !important;
          z-index: 10 !important;
        }
        .sidebar-nav::-webkit-scrollbar { display: none !important; }
        
        .sidebar-link {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
          padding: 12px 16px !important;
          border-radius: 12px !important;
          font-size: 13.5px !important;
          font-weight: 500 !important;
          color: rgba(255, 255, 255, 0.75) !important;
          text-transform: none !important;
          letter-spacing: 0.01em !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          margin-bottom: 6px !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          text-align: left !important;
          position: relative !important;
        }
        .sidebar-link:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          color: #ffffff !important;
        }
        .sidebar-link.active {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05) !important;
        }
        .sidebar-link-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 0.7 !important;
          transition: opacity 0.2s ease !important;
        }
        .sidebar-link:hover .sidebar-link-icon,
        .sidebar-link.active .sidebar-link-icon {
          opacity: 1 !important;
        }
        .sidebar-active-pill {
          display: none !important;
        }
        .sidebar-sub-link {
          padding: 10px 16px 10px 48px !important;
          font-size: 12px !important;
          color: rgba(255, 255, 255, 0.6) !important;
          text-transform: none !important;
          letter-spacing: 0.02em !important;
          margin-bottom: 2px !important;
        }
        .sidebar-sub-link::before {
          content: '•' !important;
          position: absolute !important;
          left: 28px !important;
          opacity: 0.3 !important;
          transition: opacity 0.2s ease !important;
        }
        .sidebar-sub-link:hover::before,
        .sidebar-sub-link.active::before {
          opacity: 1 !important;
          color: #ffffff !important;
        }
        .sidebar-sub-link:hover {
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .sidebar-sub-link.active {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .sidebar-divider {
          height: 1px !important;
          background: rgba(255, 255, 255, 0.08) !important;
          margin: 16px 16px !important;
        }
        .sidebar-footer {
          padding: 20px 16px 24px 16px !important;
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
          position: relative !important;
          z-index: 10 !important;
        }
        .user-card {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 12px 14px !important;
          border-radius: 16px !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          text-align: left !important;
        }
        .user-card:hover {
          border-color: rgba(255, 255, 255, 0.15) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .user-avatar {
          width: 38px !important;
          height: 38px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          color: #003829 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 700 !important;
          font-size: 13px !important;
        }
        .user-name-text {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 13.5px !important;
          line-height: 1.2 !important;
          margin: 0 !important;
          margin-bottom: 2px !important;
        }
        .user-role-text {
          color: rgba(255, 255, 255, 0.5) !important;
          font-weight: 600 !important;
          font-size: 8.5px !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
          margin: 0 !important;
        }
        .user-dropdown-arrow {
          color: rgba(255, 255, 255, 0.4) !important;
          margin-left: auto !important;
          transition: color 0.2s !important;
        }
        .user-card:hover .user-dropdown-arrow {
          color: #ffffff !important;
        }
        .sidebar-watermark {
          position: absolute !important;
          bottom: -40px !important;
          left: -40px !important;
          width: 240px !important;
          height: 240px !important;
          color: rgba(255, 255, 255, 0.022) !important;
          pointer-events: none !important;
          z-index: 1 !important;
        }
        .sidebar-copyright-container {
          text-align: center !important;
          margin-top: 16px !important;
          font-family: 'Inter', system-ui, sans-serif !important;
          opacity: 0.35 !important;
        }
        .sidebar-copyright-text {
          font-size: 9px !important;
          font-weight: 500 !important;
          color: #ffffff !important;
          line-height: 1.5 !important;
          margin: 0 !important;
        }
      `}} />
      
      <aside id="premium-sidebar">
        {/* Subtle background watermark */}
        <svg 
          className="sidebar-watermark" 
          viewBox="0 0 100 100" 
          fill="currentColor"
        >
          <path d="M10,90 C30,70 50,55 80,45 C75,55 60,65 40,80 C60,60 75,40 90,10 C80,30 65,50 45,70 C65,50 80,25 95,0 C85,20 70,40 50,60 C65,40 75,20 85,0 C75,15 60,30 40,50 C55,30 65,15 75,0 C65,10 50,20 30,40 C20,50 15,60 10,90 Z" />
        </svg>

        <div className="sidebar-brand">
          <div className="sidebar-brand-logo-circle">
            <Palmtree size={24} />
          </div>
          <div className="sidebar-brand-text">
            <h2 className="sidebar-brand-title">JWRM</h2>
            <p className="sidebar-brand-subtitle">Travel & Tours</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Top Level Items (Primary) */}
          {['analytics', 'quotes', 'payments'].map(tab => {
            if (!validTabs.includes(tab)) return null;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">
                  {getIcon(tab)}
                </span>
                <span>{getLabel(tab)}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="sidebar-divider" />

          {/* Master Setup Group */}
          <div className="mb-2">
            <button 
              onClick={() => setIsMasterExpanded(!isMasterExpanded)}
              className={`sidebar-link group/master ${masterSetupTabs.includes(activeTab) ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">
                <Settings size={18} />
              </span>
              <span>Master Setup</span>
              <ChevronRight 
                size={14} 
                className={`ml-auto transition-transform duration-300 ${isMasterExpanded ? 'rotate-90' : ''} text-slate-400`} 
              />
            </button>

            {isMasterExpanded && (
              <div className="flex flex-col pl-2">
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calendar (Below Master Setup Divider) */}
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
                  <span className="sidebar-link-icon">
                    {getIcon(tab)}
                  </span>
                  <span>{getLabel(tab)}</span>
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
              <p className="user-name-text truncate">{profile?.full_name || 'User'}</p>
              <p className="user-role-text truncate">{profile?.role?.replace('_', ' ') || 'Member'}</p>
            </div>
            <ChevronDown size={16} className="user-dropdown-arrow" />
          </button>
          
          <div className="sidebar-copyright-container">
            <p className="sidebar-copyright-text">© 2026 NorthMind Ecosystem</p>
            <p className="sidebar-copyright-text">All rights reserved.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
