import type { Metadata } from "next";
import MobileShell from "./components/MobileShell";

// Override the root layout's desktop manifest — installing from any /m page
// must use the mobile manifest (start_url /m, standalone, portrait).
export const metadata: Metadata = {
  manifest: "/manifest-mobile.json",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
