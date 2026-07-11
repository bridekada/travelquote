"use client";

import { useState, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import { motion } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";

// Post-damping pixel distance required to trigger a refresh
const THRESHOLD = 64;
// Damping factor applied to raw finger travel (rubber-band feel)
const DAMPING = 0.45;
const MAX_PULL = 110;
// Height the content holds at while the refresh promise is in flight
const HOLD = 56;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const trigger = async () => {
    refreshingRef.current = true;
    setRefreshing(true);
    setPull(HOLD);
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPull(0);
    }
  };

  const bind = useDrag(
    ({ first, down, last, movement: [, my], memo }) => {
      if (refreshingRef.current) return memo;

      // Only engage if the drag STARTED with the page scrolled to the top
      if (first) {
        memo = (window.scrollY || document.documentElement.scrollTop) <= 0;
      }
      if (!memo) return memo;

      const damped = Math.min(Math.max(my, 0) * DAMPING, MAX_PULL);

      if (down) {
        setIsPulling(true);
        setPull(damped);
      } else if (last) {
        setIsPulling(false);
        if (damped >= THRESHOLD) {
          trigger();
        } else {
          setPull(0);
        }
      }
      return memo;
    },
    { axis: "y", pointer: { touch: true }, eventOptions: { passive: true } }
  );

  const armed = pull >= THRESHOLD;
  const indicatorVisible = pull > 6 || refreshing;

  return (
    <div {...bind()} style={{ position: "relative", touchAction: "pan-y" }}>
      {/* Indicator */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        <motion.div
          animate={{
            y: indicatorVisible ? pull - 46 : -46,
            opacity: indicatorVisible ? 1 : 0,
            rotate: refreshing ? 0 : armed ? 180 : 0,
          }}
          transition={isPulling ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {refreshing ? (
            <Loader2 className="animate-spin" size={17} color="#00674F" />
          ) : (
            <ArrowDown size={17} color={armed ? "#00674F" : "#94A3B8"} strokeWidth={2.5} />
          )}
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        animate={{ y: pull }}
        transition={isPulling ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
