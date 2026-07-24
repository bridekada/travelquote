"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const font = "'Inter', system-ui, sans-serif";

export const WIZARD_STEPS = ["Trip", "Itinerary", "Packages", "Review"];

interface MobileStepIndicatorProps {
  current: number; // 1-based
  maxReached: number; // highest step the user has reached (jumpable)
  onJump: (step: number) => void;
}

export default function MobileStepIndicator({ current, maxReached, onJump }: MobileStepIndicatorProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
      {WIZARD_STEPS.map((label, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;
        const jumpable = step <= maxReached;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <button
              type="button"
              onClick={() => jumpable && onJump(step)}
              disabled={!jumpable}
              style={{
                width: "100%",
                height: 4,
                borderRadius: 9999,
                border: "none",
                padding: 0,
                background: isActive || isDone ? "#00674F" : "#E2E8F0",
                cursor: jumpable ? "pointer" : "default",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label={`Step ${step}: ${label}`}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {isDone ? (
                <Check size={11} color="#00674F" strokeWidth={3} />
              ) : (
                <motion.span
                  animate={{ scale: isActive ? 1 : 0.9 }}
                  style={{
                    fontFamily: font,
                    fontSize: 9,
                    fontWeight: 800,
                    color: isActive ? "#00674F" : "#CBD5E1",
                  }}
                >
                  {step}
                </motion.span>
              )}
              <span
                style={{
                  fontFamily: font,
                  fontSize: 10,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#0F172A" : isDone ? "#64748B" : "#CBD5E1",
                }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
