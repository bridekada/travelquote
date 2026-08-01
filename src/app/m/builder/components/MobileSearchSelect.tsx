"use client";

import { useState, useMemo } from "react";
import { Drawer } from "vaul";
import { ChevronDown, Search, Check, Plus, X } from "lucide-react";

const font = "'Inter', system-ui, sans-serif";

interface MobileSearchSelectProps<T> {
  value: string;
  onValueChange: (value: string) => void;
  options: T[];
  getLabel: (o: T) => string;
  getValue: (o: T) => string;
  renderOption?: (o: T) => React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Allow committing a free-typed value not in the list */
  creatable?: boolean;
  /** Allow clearing a custom value back to empty */
  clearable?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  title?: string;
}

export default function MobileSearchSelect<T>({
  value,
  onValueChange,
  options,
  getLabel,
  getValue,
  renderOption,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  creatable = false,
  clearable = false,
  disabled = false,
  icon,
  title,
}: MobileSearchSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Resolve what to show on the trigger
  const displayLabel = useMemo(() => {
    if (!value) return placeholder;
    const match = options.find((o) => getValue(o) === value);
    if (match) return getLabel(match);
    return value; // custom typed value
  }, [value, options, getLabel, getValue, placeholder]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [options, search, getLabel]);

  const showCreate =
    creatable &&
    search.trim() !== "" &&
    !options.some((o) => getLabel(o).toLowerCase() === search.trim().toLowerCase());

  const commit = (v: string) => {
    onValueChange(v);
    setSearch("");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        style={{
          width: "100%",
          minHeight: 44,
          padding: "0 12px",
          borderRadius: 12,
          border: "1.5px solid rgba(0,0,0,0.08)",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontFamily: font,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {icon}
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 14,
            fontWeight: 500,
            color: value ? "#0F172A" : "#94A3B8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
      </button>

      {/* autoFocus=false: on iOS, focusing the search field while the drawer is still
          animating pops the keyboard mid-transition and leaves the fixed-position sheet
          stranded behind it. Open settled instead; the keyboard appears only on tap. */}
      <Drawer.Root autoFocus={false} open={open} onOpenChange={(o) => { if (!o) setSearch(""); setOpen(o); }}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1099 }} />
          <Drawer.Content
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff",
              borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1100, outline: "none",
              maxHeight: "80dvh", display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
            </div>
            <div style={{ padding: "8px 16px 12px", flexShrink: 0 }}>
              {title && (
                <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#0F172A", fontFamily: font }}>{title}</h3>
              )}
              <div style={{ position: "relative" }}>
                <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    width: "100%", height: 42, paddingLeft: 38, paddingRight: 12, borderRadius: 12,
                    fontSize: 14, fontFamily: font, fontWeight: 500, border: "1.5px solid rgba(0,0,0,0.08)",
                    background: "#F8FAFC", color: "#0F172A", outline: "none", WebkitAppearance: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "0 12px 28px" }}>
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => commit("")}
                  style={optionRowStyle(false)}
                >
                  <X size={16} color="#E11D48" />
                  <span style={{ flex: 1, fontFamily: font, fontSize: 14, fontWeight: 600, color: "#E11D48" }}>Clear selection</span>
                </button>
              )}

              {showCreate && (
                <button
                  type="button"
                  onClick={() => commit(search.trim())}
                  style={optionRowStyle(false)}
                >
                  <Plus size={16} color="#00674F" />
                  <span style={{ flex: 1, fontFamily: font, fontSize: 14, fontWeight: 600, color: "#00674F" }}>
                    Use &quot;{search.trim()}&quot;
                  </span>
                </button>
              )}

              {filtered.map((o) => {
                const v = getValue(o);
                const active = v === value;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => commit(v)}
                    style={optionRowStyle(active)}
                  >
                    <span style={{ flex: 1, fontFamily: font, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#003829" : "#334155", textAlign: "left" }}>
                      {renderOption ? renderOption(o) : getLabel(o)}
                    </span>
                    {active && <Check size={16} color="#00674F" strokeWidth={2.5} />}
                  </button>
                );
              })}

              {filtered.length === 0 && !showCreate && (
                <div style={{ textAlign: "center", padding: "24px 0", fontFamily: font, fontSize: 13, fontWeight: 500, color: "#94A3B8" }}>
                  No results found
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

const optionRowStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 12px",
  borderRadius: 12,
  border: "none",
  background: active ? "#F0FDF4" : "transparent",
  cursor: "pointer",
  width: "100%",
  WebkitTapHighlightColor: "transparent",
});
