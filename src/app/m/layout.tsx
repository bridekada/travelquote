"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2, LayoutGrid, FileText, Plus, Calendar, Menu } from "lucide-react";
import { motion } from "framer-motion";
import "./mobile.css";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/m/dashboard",
    icon: <LayoutGrid size={22} />,
    matchPaths: ["/m/dashboard"],
  },
  {
    label: "Quotes",
    href: "/m/dashboard?tab=quotes",
    icon: <FileText size={22} />,
    matchPaths: [],  // placeholder — will be handled differently
  },
  {
    label: "New",
    href: "/m/builder",
    icon: <Plus size={24} strokeWidth={2.5} />,
    matchPaths: ["/m/builder"],
  },
  {
    label: "Calendar",
    href: "/m/calendar",
    icon: <Calendar size={22} />,
    matchPaths: ["/m/calendar"],
  },
  {
    label: "More",
    href: "/m/settings",
    icon: <Menu size={22} />,
    matchPaths: ["/m/settings", "/m/admin", "/m/payments"],
  },
];

function getPageTitle(pathname: string): { title: string; subtitle?: string } {
  if (pathname.startsWith("/m/dashboard")) return { title: "Dashboard" };
  if (pathname.startsWith("/m/builder")) return { title: "Quote Builder" };
  if (pathname.startsWith("/m/calendar")) return { title: "Calendar" };
  if (pathname.startsWith("/m/payments")) return { title: "Payments" };
  if (pathname.startsWith("/m/admin")) return { title: "Admin Portal" };
  if (pathname.startsWith("/m/settings")) return { title: "Settings" };
  return { title: "TravelQuote" };
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  // Don't show shell on login page
  const isLoginPage = pathname === "/m" || pathname === "/m/";

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loader while checking auth
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 className="animate-spin" size={28} color="#00674F" />
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if no session
  if (!profile) {
    router.push("/m");
    return null;
  }

  const { title } = getPageTitle(pathname);
  const isActive = (item: NavItem) => {
    if (item.href === "/m/builder") return pathname.startsWith("/m/builder");
    return item.matchPaths.some((p) => pathname.startsWith(p));
  };

  return (
    <div className="mobile-page">
      {/* ── Mobile Header ── */}
      <header className="mobile-header">
        <div>
          <div className="mobile-header-title">{title}</div>
          {profile.operators?.name && (
            <div className="mobile-header-subtitle">{profile.operators.name}</div>
          )}
        </div>
        <button
          onClick={() => router.push("/m/settings")}
          className="mobile-header-avatar no-select"
          style={{ border: "none", cursor: "pointer" }}
        >
          {profile.full_name?.substring(0, 2).toUpperCase() || "U"}
        </button>
      </header>

      {/* ── Page Content ── */}
      <main className="mobile-page-content mobile-scroll-container">
        {children}
      </main>

      {/* ── FAB (New Quote) ── */}
      <button
        className="mobile-fab no-select"
        onClick={() => router.push("/m/builder")}
        aria-label="New Quote"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* ── Bottom Navigation ── */}
      <nav className="mobile-bottom-nav no-select">
        {NAV_ITEMS.map((item) => {
          // FAB center slot — render empty spacer
          if (item.href === "/m/builder") {
            return <div key="fab-spacer" style={{ width: 54 }} />;
          }

          const active = isActive(item);
          return (
            <button
              key={item.href}
              className={`mobile-nav-item ${active ? "active" : ""}`}
              onClick={() => router.push(item.href)}
            >
              {item.icon}
              <span className="mobile-nav-label">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 24,
                    height: 2.5,
                    borderRadius: 9999,
                    background: "#4ADE80",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
