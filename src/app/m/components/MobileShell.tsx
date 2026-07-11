"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Loader2, LayoutGrid, FileText, Plus, Wallet, Menu } from "lucide-react";
import { motion } from "framer-motion";
import ProfileEditSheet from "./ProfileEditSheet";
import "../mobile.css";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/m/home",
    icon: <LayoutGrid size={22} />,
    matchPaths: ["/m/home"],
  },
  {
    label: "Quotes",
    href: "/m/dashboard",
    icon: <FileText size={22} />,
    matchPaths: ["/m/dashboard"],
  },
  {
    label: "New",
    href: "/m/builder",
    icon: <Plus size={24} strokeWidth={2.5} />,
    matchPaths: ["/m/builder"],
  },
  {
    label: "Payments",
    href: "/m/payments",
    icon: <Wallet size={22} />,
    matchPaths: ["/m/payments"],
  },
  {
    label: "More",
    href: "/m/settings",
    icon: <Menu size={22} />,
    matchPaths: ["/m/settings", "/m/admin", "/m/calendar"],
  },
];

function getPageTitle(pathname: string): { title: string; subtitle?: string } {
  if (pathname.startsWith("/m/home")) return { title: "Home" };
  if (pathname.startsWith("/m/dashboard")) return { title: "Quotes" };
  if (pathname.startsWith("/m/builder")) return { title: "Quote Builder" };
  if (pathname.startsWith("/m/calendar")) return { title: "Calendar" };
  if (pathname.startsWith("/m/payments")) return { title: "Payments" };
  if (pathname.startsWith("/m/admin")) return { title: "Admin Portal" };
  if (pathname.startsWith("/m/settings")) return { title: "Settings" };
  return { title: "TravelQuote" };
}

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Don't show shell on login page
  const isLoginPage = pathname === "/m" || pathname === "/m/";

  // Admin Portal has no agency context yet â€” hide agency-scoped chrome (nav + FAB)
  const isAdminPortal = pathname.startsWith("/m/admin");

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
      {/* â”€â”€ Mobile Header â”€â”€ */}
      <header className="mobile-header">
        <div>
          <div className="mobile-header-title">{title}</div>
          {isAdminPortal ? (
            <div className="mobile-header-subtitle">Select an agency to manage</div>
          ) : (
            profile.operators?.name && (
              <div className="mobile-header-subtitle">{profile.operators.name}</div>
            )
          )}
        </div>
        <button
          onClick={() => (isAdminPortal ? setIsProfileOpen(true) : router.push("/m/settings"))}
          className="mobile-header-avatar no-select"
          style={{ border: "none", cursor: "pointer" }}
        >
          {profile.full_name?.substring(0, 2).toUpperCase() || "U"}
        </button>
      </header>

      {/* â”€â”€ Page Content â”€â”€ */}
      <main className="mobile-page-content mobile-scroll-container">
        {children}
      </main>

      {/* â”€â”€ FAB (New Quote) â€” hidden in Admin Portal (no agency selected) â”€â”€ */}
      {!isAdminPortal && (
        <button
          className="mobile-fab no-select"
          onClick={() => router.push("/m/builder")}
          aria-label="New Quote"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* â”€â”€ Bottom Navigation â€” hidden in Admin Portal (no agency selected) â”€â”€ */}
      {!isAdminPortal && (
      <nav className="mobile-bottom-nav no-select">
        {NAV_ITEMS.map((item) => {
          // FAB center slot â€” render empty spacer
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
      )}

      {/* â”€â”€ Profile sheet (Admin Portal only â€” profile + sign out, nothing agency-scoped) â”€â”€ */}
      {isAdminPortal && (
        <ProfileEditSheet
          open={isProfileOpen}
          profile={profile}
          onClose={() => setIsProfileOpen(false)}
          showSignOut
        />
      )}
    </div>
  );
}
