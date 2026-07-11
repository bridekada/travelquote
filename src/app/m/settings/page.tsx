"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Drawer } from "vaul";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2, ChevronDown, ChevronRight, Pencil, Trash2, Plus, X, Minus,
  Building2, CarFront, Map as MapIcon, Coins, Package, BedDouble,
  Calendar as CalendarIcon, ShieldCheck, LogOut,
} from "lucide-react";
import { updateOperator } from "@/app/actions/user-management";
import ProfileEditSheet from "../components/ProfileEditSheet";
import {
  getVehicles, saveVehicle, deleteVehicle,
  getItineraryPresets, saveItineraryPreset, deleteItineraryPreset,
  getMiscPresets, saveMiscPreset, deleteMiscPreset,
  getPackagePresets, savePackagePreset, deletePackagePreset,
  getGuestAccommodation, saveGuestAccommodation, deleteGuestAccommodation,
} from "@/app/actions/operational-config";
import ConfirmSheet from "../components/ConfirmSheet";

const font = "'Inter', system-ui, sans-serif";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  operator_admin: "Operator Admin",
  operator_sales: "Sales Agent",
};

type SectionKey = "vehicles" | "itineraries" | "misc" | "packages" | "accommodation";

export default function MobileSettingsPage() {
  const router = useRouter();
  const { user, profile, selectedOperatorId } = useAuth();

  // Master setup data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [miscFees, setMiscFees] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);

  // Sheets
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAgency, setIsEditingAgency] = useState(false);
  const [editorState, setEditorState] = useState<{ section: SectionKey; item: any | null } | null>(null);

  // Generic confirmation sheet (item deletes + sign out)
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const canEditAgency = profile?.role === "operator_admin" || profile?.role === "super_admin";

  const loadSection = useCallback(
    async (section: SectionKey) => {
      if (!selectedOperatorId) return;
      setSectionLoading((prev) => ({ ...prev, [section]: true }));
      try {
        if (section === "vehicles") {
          const res = await getVehicles(selectedOperatorId);
          setVehicles(res.data || []);
        } else if (section === "itineraries") {
          const res = await getItineraryPresets(selectedOperatorId);
          setItineraries(res.data || []);
        } else if (section === "misc") {
          // Vehicles are needed for rate overrides in the misc fee form
          const [miscRes, vehRes] = await Promise.all([
            getMiscPresets(selectedOperatorId),
            getVehicles(selectedOperatorId),
          ]);
          setMiscFees(miscRes.data || []);
          setVehicles(vehRes.data || []);
        } else if (section === "packages") {
          const [pkgRes, miscRes] = await Promise.all([
            getPackagePresets(selectedOperatorId),
            getMiscPresets(selectedOperatorId),
          ]);
          setPackages(pkgRes.data || []);
          setMiscFees(miscRes.data || []);
        } else if (section === "accommodation") {
          const res = await getGuestAccommodation(selectedOperatorId);
          setAccommodations(res.data || []);
        }
      } catch (err) {
        console.error(`Failed to load ${section}:`, err);
      } finally {
        setSectionLoading((prev) => ({ ...prev, [section]: false }));
      }
    },
    [selectedOperatorId]
  );

  const toggleSection = (section: SectionKey) => {
    const next = expandedSection === section ? null : section;
    setExpandedSection(next);
    if (next) loadSection(next);
  };

  const handleDelete = (section: SectionKey, id: string, name: string) => {
    setConfirmState({
      title: `Delete "${name}"?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      action: async () => {
        let res;
        if (section === "vehicles") res = await deleteVehicle(id);
        else if (section === "itineraries") res = await deleteItineraryPreset(id);
        else if (section === "misc") res = await deleteMiscPreset(id);
        else if (section === "packages") res = await deletePackagePreset(id);
        else res = await deleteGuestAccommodation(id);

        if (res?.error) {
          alert(res.error);
        } else {
          loadSection(section);
        }
      },
    });
  };

  const handleSignOut = () => {
    setConfirmState({
      title: "Sign out of TravelQuote?",
      message: "You will need to log in again to access your quotes.",
      confirmLabel: "Sign Out",
      action: async () => {
        await supabase.auth.signOut();
        window.location.href = "/m";
      },
    });
  };

  const executeConfirm = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (!profile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
        <Loader2 className="animate-spin" size={24} color="#00674F" />
      </div>
    );
  }

  const sections: { key: SectionKey; label: string; icon: React.ReactNode; count: number; items: any[] }[] = [
    { key: "vehicles", label: "Vehicles", icon: <CarFront size={16} />, count: vehicles.length, items: vehicles },
    { key: "itineraries", label: "Itineraries", icon: <MapIcon size={16} />, count: itineraries.length, items: itineraries },
    { key: "misc", label: "Misc Fees", icon: <Coins size={16} />, count: miscFees.length, items: miscFees },
    { key: "packages", label: "Packages", icon: <Package size={16} />, count: packages.length, items: packages },
    { key: "accommodation", label: "Accommodation", icon: <BedDouble size={16} />, count: accommodations.length, items: accommodations },
  ];

  return (
    <div>
      {/* ── Profile Card ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 16, background: "#003829", color: "#4ADE80",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font, fontSize: 16, fontWeight: 800, flexShrink: 0,
            }}
          >
            {(profile.full_name || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
              {profile.full_name}
            </div>
            <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: "#00674F", marginTop: 1 }}>
              {ROLE_LABELS[profile.role] || profile.role}
            </div>
            {user?.email && (
              <div style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setIsEditingProfile(true)} style={{ ...outlineBtnStyle, marginTop: 14 }}>
          <Pencil size={13} /> Edit Profile
        </button>
      </div>

      {/* ── Agency Settings ── */}
      {canEditAgency && profile.operators && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Building2 size={16} color="#00674F" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
                  {profile.operators.name}
                </div>
                <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 500, color: "#94A3B8" }}>
                  Agency settings
                </div>
              </div>
            </div>
            <button onClick={() => setIsEditingAgency(true)} style={iconBtnStyle} aria-label="Edit agency">
              <Pencil size={14} color="#64748B" />
            </button>
          </div>
        </div>
      )}

      {/* ── Quick Links (Calendar lives here now — Payments took its nav slot) ── */}
      <div style={{ ...cardStyle, padding: "6px 6px" }}>
        <LinkRow icon={<CalendarIcon size={16} color="#00674F" />} label="Calendar" onClick={() => router.push("/m/calendar")} />
        {profile.role === "super_admin" && (
          <LinkRow icon={<ShieldCheck size={16} color="#00674F" />} label="Admin Portal" onClick={() => router.push("/m/admin")} />
        )}
      </div>

      {/* ── Master Setup ── */}
      <div style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 8px 4px" }}>
        Master Setup
      </div>
      <div style={{ ...cardStyle, padding: "4px 6px" }}>
        {sections.map((section, idx) => {
          const isOpen = expandedSection === section.key;
          const isLoading = sectionLoading[section.key];
          return (
            <div key={section.key} style={{ borderTop: idx > 0 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
              <button
                onClick={() => toggleSection(section.key)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 10px", background: "none", border: "none", cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ color: "#00674F", display: "flex" }}>{section.icon}</span>
                <span style={{ flex: 1, textAlign: "left", fontFamily: font, fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
                  {section.label}
                </span>
                {isOpen && section.count > 0 && (
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: "#94A3B8" }}>
                    {section.count}
                  </span>
                )}
                {isOpen ? <ChevronDown size={16} color="#94A3B8" /> : <ChevronRight size={16} color="#CBD5E1" />}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 10px 14px" }}>
                      {isLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                          <Loader2 className="animate-spin" size={18} color="#00674F" />
                        </div>
                      ) : (
                        <>
                          {section.items.length === 0 ? (
                            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 500, color: "#94A3B8", textAlign: "center", padding: "12px 0", margin: 0 }}>
                              Nothing here yet
                            </p>
                          ) : (
                            section.items.map((item) => (
                              <SetupItemRow
                                key={item.id}
                                section={section.key}
                                item={item}
                                onEdit={() => setEditorState({ section: section.key, item })}
                                onDelete={() =>
                                  handleDelete(section.key, item.id, item.model || item.title || item.name || "item")
                                }
                              />
                            ))
                          )}
                          <button
                            onClick={() => setEditorState({ section: section.key, item: null })}
                            style={{ ...outlineBtnStyle, marginTop: 8 }}
                          >
                            <Plus size={13} strokeWidth={2.5} /> Add {section.label.replace(/s$/, "")}
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={handleSignOut}
        style={{
          width: "100%", padding: "14px", borderRadius: 14, marginTop: 20, marginBottom: 12,
          border: "1.5px solid rgba(225,29,72,0.2)", background: "#FFF1F2", color: "#E11D48",
          fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <LogOut size={15} /> Sign Out
      </button>

      {/* ── Sheets ── */}
      <ProfileEditSheet open={isEditingProfile} profile={profile} onClose={() => setIsEditingProfile(false)} />
      {canEditAgency && profile.operators && (
        <AgencyEditSheet
          open={isEditingAgency}
          operator={profile.operators}
          onClose={() => setIsEditingAgency(false)}
        />
      )}
      <SetupEditorSheet
        state={editorState}
        operatorId={selectedOperatorId || ""}
        vehicles={vehicles}
        miscFees={miscFees}
        onClose={() => setEditorState(null)}
        onSaved={(section) => { setEditorState(null); loadSection(section); }}
      />
      <ConfirmSheet
        open={!!confirmState}
        title={confirmState?.title || ""}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        destructive
        loading={confirmLoading}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

/* ────────────────────────── Item Row ────────────────────────── */

function SetupItemRow({ section, item, onEdit, onDelete }: {
  section: SectionKey;
  item: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  let title = "";
  let subtitle = "";
  if (section === "vehicles") {
    title = item.model;
    subtitle = `${item.category || "—"} · ${item.pax_capacity} pax · P${(item.default_rate || 0).toLocaleString()}/day`;
  } else if (section === "itineraries") {
    title = item.title;
    subtitle = `${item.default_km || 0} km${item.tags ? ` · ${item.tags}` : ""}`;
  } else if (section === "misc") {
    title = item.name;
    const flags = [
      item.multiply_by_vehicle && "per vehicle",
      item.multiply_by_guest && "per guest",
      item.hide_in_quote && "hidden",
    ].filter(Boolean).join(", ");
    subtitle = `P${(item.default_amount || 0).toLocaleString()}${flags ? ` · ${flags}` : ""}`;
  } else if (section === "packages") {
    title = item.title;
    const inc = [
      item.includes_vehicle && "vehicle",
      item.includes_fuel && "fuel",
      item.includes_accommodation && "hotel",
    ].filter(Boolean).join(" + ");
    subtitle = `${inc || "custom"}${item.is_recommended ? " · ★ recommended" : ""}`;
  } else {
    title = item.name;
    subtitle = `${item.pax_count} pax · P${(item.amount || 0).toLocaleString()}`;
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", background: "#F8FAFC", borderRadius: 12, marginBottom: 6,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 500, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {subtitle}
        </div>
      </div>
      <button onClick={onEdit} style={iconBtnStyle} aria-label="Edit">
        <Pencil size={13} color="#64748B" />
      </button>
      <button onClick={onDelete} style={{ ...iconBtnStyle, background: "#FFF1F2" }} aria-label="Delete">
        <Trash2 size={13} color="#E11D48" />
      </button>
    </div>
  );
}

/* ────────────────────────── Agency Sheet ────────────────────────── */

function AgencyEditSheet({ open, operator, onClose }: { open: boolean; operator: any; onClose: () => void }) {
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);
  const [titlePresets, setTitlePresets] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSocialLinks(operator?.social_links?.length ? [...operator.social_links] : [""]);
      setTitlePresets(operator?.quote_title_presets?.length ? [...operator.quote_title_presets] : [""]);
      setStatus(null);
    }
  }, [open, operator]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    const res = await updateOperator(operator.id, formData);
    if (res.success) {
      window.location.reload();
    } else {
      setStatus(res.error || "Failed to save");
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Agency Settings">
      <form onSubmit={handleSubmit}>
        <Field label="Agency Name">
          <input name="name" defaultValue={operator.name || ""} required style={inputStyle} />
        </Field>
        <Field label="Website">
          <input name="website" defaultValue={operator.website || ""} style={inputStyle} placeholder="https://..." />
        </Field>
        <Field label="Agency Notes (shown on quotations)">
          <textarea name="quotation_agency_notes" defaultValue={operator.quotation_agency_notes || ""} rows={3} style={{ ...inputStyle, height: "auto", paddingTop: 10, resize: "vertical" }} />
        </Field>
        <ListField label="Social Links" items={socialLinks} setItems={setSocialLinks} name="socialLinks" placeholder="https://facebook.com/..." />
        <ListField label="Quote Title Presets" items={titlePresets} setItems={setTitlePresets} name="quoteTitlePresets" placeholder="e.g. El Nido Tour Package" />
        {status && <ErrorNote message={status} />}
        <SubmitButton saving={saving} label="Save Changes" />
      </form>
    </Sheet>
  );
}

/* ────────────────────────── Master Setup Editor Sheet ────────────────────────── */

function SetupEditorSheet({ state, operatorId, vehicles, miscFees, onClose, onSaved }: {
  state: { section: SectionKey; item: any | null } | null;
  operatorId: string;
  vehicles: any[];
  miscFees: any[];
  onClose: () => void;
  onSaved: (section: SectionKey) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedMiscIds, setSelectedMiscIds] = useState<string[]>([]);

  const section = state?.section;
  const item = state?.item;

  useEffect(() => {
    if (state) {
      setStatus(null);
      setSaving(false);
      if (state.section === "packages") {
        setSelectedMiscIds(state.item?.includes_misc_ids || []);
      }
    }
  }, [state]);

  const TITLES: Record<SectionKey, string> = {
    vehicles: "Vehicle",
    itineraries: "Itinerary Preset",
    misc: "Misc Fee",
    packages: "Package",
    accommodation: "Accommodation",
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!section) return;
    setSaving(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    if (item?.id) formData.set("id", item.id);

    let res;
    if (section === "vehicles") res = await saveVehicle(formData, operatorId);
    else if (section === "itineraries") res = await saveItineraryPreset(formData, operatorId);
    else if (section === "misc") res = await saveMiscPreset(formData, operatorId);
    else if (section === "packages") {
      formData.set("operator_id", operatorId);
      formData.set("includes_misc_ids", JSON.stringify(selectedMiscIds));
      res = await savePackagePreset(formData);
    } else {
      res = await saveGuestAccommodation(formData, operatorId);
    }

    setSaving(false);
    if (res?.error) {
      setStatus(res.error);
    } else {
      onSaved(section);
    }
  };

  return (
    <Sheet
      open={!!state}
      onClose={onClose}
      title={state ? `${item ? "Edit" : "Add"} ${TITLES[state.section]}` : ""}
    >
      {state && (
        <form onSubmit={handleSubmit} key={`${section}-${item?.id || "new"}`}>
          {section === "vehicles" && (
            <>
              <Field label="Model">
                <input name="model" defaultValue={item?.model || ""} required style={inputStyle} placeholder="e.g. Toyota Hiace GL Grandia" />
              </Field>
              <Field label="Category">
                <input name="category" defaultValue={item?.category || ""} style={inputStyle} placeholder="e.g. Van, SUV, Bus" />
              </Field>
              <TwoCol>
                <Field label="Pax Capacity">
                  <input name="pax_capacity" type="number" inputMode="numeric" defaultValue={item?.pax_capacity ?? ""} required style={inputStyle} />
                </Field>
                <Field label="Daily Rate (P)">
                  <input name="default_rate" type="number" inputMode="decimal" step="any" defaultValue={item?.default_rate ?? ""} required style={inputStyle} />
                </Field>
              </TwoCol>
              <TwoCol>
                <Field label="Km per Liter">
                  <input name="km_per_l" type="number" inputMode="decimal" step="any" defaultValue={item?.km_per_l ?? 10} style={inputStyle} />
                </Field>
                <Field label="Fuel Type">
                  <select name="fuel_type" defaultValue={item?.fuel_type || "Gasoline"} style={inputStyle}>
                    <option value="Gasoline">Gasoline</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </Field>
              </TwoCol>
            </>
          )}

          {section === "itineraries" && (
            <>
              <Field label="Title">
                <input name="title" defaultValue={item?.title || ""} required style={inputStyle} placeholder="e.g. Underground River Tour" />
              </Field>
              <Field label="Details">
                <textarea name="details" defaultValue={item?.details || ""} rows={4} style={{ ...inputStyle, height: "auto", paddingTop: 10, resize: "vertical" }} placeholder="Day description shown on the quote..." />
              </Field>
              <TwoCol>
                <Field label="Default Km">
                  <input name="default_km" type="number" inputMode="decimal" step="any" defaultValue={item?.default_km ?? ""} style={inputStyle} />
                </Field>
                <Field label="Tags">
                  <input name="tags" defaultValue={item?.tags || ""} style={inputStyle} placeholder="e.g. tour, transfer" />
                </Field>
              </TwoCol>
            </>
          )}

          {section === "misc" && (
            <>
              <Field label="Fee Name">
                <input name="name" defaultValue={item?.name || ""} required style={inputStyle} placeholder="e.g. Driver's Meals" />
              </Field>
              <Field label="Default Amount (P)">
                <input name="default_amount" type="number" inputMode="decimal" step="any" defaultValue={item?.default_amount ?? ""} required style={inputStyle} />
              </Field>
              <CheckRow name="multiply_by_vehicle" label="Multiply by vehicle count" defaultChecked={!!item?.multiply_by_vehicle} />
              <CheckRow name="multiply_by_guest" label="Multiply by guest count" defaultChecked={!!item?.multiply_by_guest} />
              <CheckRow name="hide_in_quote" label="Hide from customer quote" defaultChecked={!!item?.hide_in_quote} />

              {vehicles.length > 0 && (
                <div style={{ marginTop: 14, marginBottom: 14 }}>
                  <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Per-Vehicle Rate Overrides (optional)
                  </div>
                  {vehicles.map((v) => (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ flex: 1, fontFamily: font, fontSize: 12, fontWeight: 600, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.model}
                      </span>
                      <input
                        name={`vehicle_override_${v.id}`}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        defaultValue={item?.vehicle_overrides?.[v.id] ?? ""}
                        placeholder="—"
                        style={{ ...inputStyle, width: 110, flexShrink: 0 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === "packages" && (
            <>
              <Field label="Package Title">
                <input name="title" defaultValue={item?.title || ""} required style={inputStyle} placeholder="e.g. All-In Package" />
              </Field>
              <Field label="Description">
                <textarea name="description" defaultValue={item?.description || ""} rows={3} style={{ ...inputStyle, height: "auto", paddingTop: 10, resize: "vertical" }} />
              </Field>
              <CheckRow name="includes_vehicle" label="Includes vehicle" defaultChecked={!!item?.includes_vehicle} value="true" />
              <CheckRow name="includes_fuel" label="Includes fuel" defaultChecked={!!item?.includes_fuel} value="true" />
              <CheckRow name="includes_accommodation" label="Includes accommodation" defaultChecked={!!item?.includes_accommodation} value="true" />
              <CheckRow name="is_recommended" label="Mark as recommended ★" defaultChecked={!!item?.is_recommended} value="true" />

              {miscFees.length > 0 && (
                <div style={{ marginTop: 14, marginBottom: 14 }}>
                  <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Included Misc Fees
                  </div>
                  {miscFees.map((m) => (
                    <label
                      key={m.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        background: "#F8FAFC", borderRadius: 10, marginBottom: 6, cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMiscIds.includes(m.id)}
                        onChange={(e) =>
                          setSelectedMiscIds((prev) =>
                            e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                          )
                        }
                        style={{ width: 17, height: 17, accentColor: "#00674F" }}
                      />
                      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: "#334155" }}>{m.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {section === "accommodation" && (
            <>
              <Field label="Name">
                <input name="name" defaultValue={item?.name || ""} required style={inputStyle} placeholder="e.g. Standard Room (2 pax)" />
              </Field>
              <Field label="Description">
                <textarea name="description" defaultValue={item?.description || ""} rows={2} style={{ ...inputStyle, height: "auto", paddingTop: 10, resize: "vertical" }} />
              </Field>
              <TwoCol>
                <Field label="Pax Count">
                  <input name="pax_count" type="number" inputMode="numeric" defaultValue={item?.pax_count ?? ""} required style={inputStyle} />
                </Field>
                <Field label="Amount (P)">
                  <input name="amount" type="number" inputMode="decimal" step="any" defaultValue={item?.amount ?? ""} required style={inputStyle} />
                </Field>
              </TwoCol>
            </>
          )}

          {status && <ErrorNote message={status} />}
          <SubmitButton saving={saving} label={item ? "Save Changes" : "Add"} />
        </form>
      )}
    </Sheet>
  );
}

/* ────────────────────────── Shared UI ────────────────────────── */

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
        <Drawer.Content
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff",
            borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1000, outline: "none",
            maxHeight: "88dvh", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 9999, background: "#E2E8F0" }} />
          </div>
          <div style={{ padding: "10px 20px 32px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: font }}>{title}</h3>
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: "50%", border: "none", background: "#F1F5F9",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
                aria-label="Close"
              >
                <X size={14} color="#64748B" />
              </button>
            </div>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function LinkRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 10px",
        background: "none", border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent",
      }}
    >
      {icon}
      <span style={{ flex: 1, textAlign: "left", fontFamily: font, fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
        {label}
      </span>
      <ChevronRight size={16} color="#CBD5E1" />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={{ display: "block", fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 10 }}>{children}</div>;
}

function CheckRow({ name, label, defaultChecked, value = "true" }: { name: string; label: string; defaultChecked: boolean; value?: string }) {
  return (
    <label
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: "#F8FAFC", borderRadius: 12, marginBottom: 8, cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        style={{ width: 17, height: 17, accentColor: "#00674F" }}
      />
      <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: "#334155" }}>{label}</span>
    </label>
  );
}

function ListField({ label, items, setItems, name, placeholder }: {
  label: string;
  items: string[];
  setItems: (items: string[]) => void;
  name: string;
  placeholder: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </label>
        <button type="button" onClick={() => setItems([...items, ""])} style={{ ...iconBtnStyle, width: 26, height: 26 }} aria-label={`Add ${label}`}>
          <Plus size={13} color="#00674F" />
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            name={name}
            value={item}
            onChange={(e) => {
              const updated = [...items];
              updated[i] = e.target.value;
              setItems(updated);
            }}
            placeholder={placeholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setItems(items.length > 1 ? items.filter((_, idx) => idx !== i) : [""])}
            style={{ ...iconBtnStyle, flexShrink: 0, height: 44, width: 36 }}
            aria-label="Remove"
          >
            <Minus size={13} color="#E11D48" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "10px 12px", background: "#FFF1F2", border: "1px solid rgba(225,29,72,0.15)",
        borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: 600, color: "#E11D48", marginBottom: 12,
      }}
    >
      {message}
    </div>
  );
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      style={{
        width: "100%", padding: "13px", borderRadius: 12, border: "none",
        background: "#003829", color: "#ffffff", fontFamily: font, fontSize: 13, fontWeight: 700,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: saving ? 0.7 : 1, WebkitTapHighlightColor: "transparent",
      }}
    >
      {saving ? <Loader2 className="animate-spin" size={15} /> : label}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: 16,
  padding: "16px",
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: font,
  fontWeight: 500,
  border: "1.5px solid rgba(0,0,0,0.08)",
  background: "#ffffff",
  color: "#0F172A",
  outline: "none",
  WebkitAppearance: "none",
};

const iconBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "none",
  background: "#F1F5F9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  WebkitTapHighlightColor: "transparent",
};

const outlineBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px",
  borderRadius: 12,
  border: "1.5px solid rgba(0,103,79,0.2)",
  background: "#F0FDF4",
  color: "#00674F",
  fontFamily: font,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  WebkitTapHighlightColor: "transparent",
};
