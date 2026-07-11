"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Drawer } from "vaul";
import {
  Building2, Users, Loader2, Plus, Pencil, Trash2,
  UserPlus, Copy, Check, ExternalLink, X, Minus,
} from "lucide-react";
import {
  inviteOperatorUser, deletePersonnel, getAllPersonnel,
  getOperatorStats, updateOperator, updatePersonnel, createOperator,
} from "@/app/actions/user-management";
import ConfirmSheet from "../components/ConfirmSheet";

const font = "'Inter', system-ui, sans-serif";
const CONFIRMED_STATUSES = ["Confirmed", "Payment Started", "Payment Complete"];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  operator_admin: "Operator Admin",
  operator_sales: "Sales Agent",
};

type ConfirmedStats = Record<string, { count: number; total: number; commission: number }>;

export default function MobileAdminPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"operators" | "personnel">("operators");
  const [operators, setOperators] = useState<any[]>([]);
  const [operatorConfirmed, setOperatorConfirmed] = useState<ConfirmedStats>({});
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheets
  const [editingOperator, setEditingOperator] = useState<any | null>(null);
  const [isAddingOperator, setIsAddingOperator] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<any | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [opsRes, personnelRes] = await Promise.all([getOperatorStats(), getAllPersonnel()]);

      const filteredOps = (opsRes.data || []).filter((o: any) => o.name !== "System Admin");
      setOperators(filteredOps);
      setPersonnel((personnelRes.data || []).filter((p: any) => p.id !== profile?.id));

      const opIds = filteredOps.map((o: any) => o.id);
      if (opIds.length > 0) {
        const { data: confirmedQuotes } = await supabase
          .from("quotes")
          .select("operator_id, grand_total, selected_package_total, admin_commission, status")
          .in("operator_id", opIds)
          .in("status", CONFIRMED_STATUSES);

        const lookup: ConfirmedStats = {};
        (confirmedQuotes || []).forEach((q: any) => {
          if (!lookup[q.operator_id]) lookup[q.operator_id] = { count: 0, total: 0, commission: 0 };
          lookup[q.operator_id].count += 1;
          lookup[q.operator_id].total += Math.round(q.grand_total || 0);
          const totalForComm = q.selected_package_total || q.grand_total || 0;
          lookup[q.operator_id].commission += Math.round(
            (totalForComm * (q.admin_commission || 0)) / (100 + (q.admin_commission || 0))
          );
        });
        setOperatorConfirmed(lookup);
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.role !== "super_admin") {
      router.push("/m/home");
      return;
    }
    fetchData();
  }, [profile, authLoading, router, fetchData]);

  const handleViewDashboard = (operatorId: string) => {
    localStorage.setItem("selected_operator_id", operatorId);
    window.location.href = "/m/home";
  };

  const executeDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    const res = await deletePersonnel(deleteUserTarget.id);
    setDeletingUser(false);
    if (res.success) {
      setPersonnel((prev) => prev.filter((p) => p.id !== deleteUserTarget.id));
      setDeleteUserTarget(null);
    } else {
      alert(res.error);
    }
  };

  if (authLoading || profile?.role !== "super_admin") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
        <Loader2 className="animate-spin" size={24} color="#00674F" />
      </div>
    );
  }

  return (
    <div>
      {/* Tab Toggle */}
      <div
        style={{
          display: "flex",
          background: "#F1F5F9",
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
        }}
      >
        {([
          { key: "operators", label: "Operators", icon: <Building2 size={14} /> },
          { key: "personnel", label: "Personnel", icon: <Users size={14} /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 0",
              borderRadius: 11,
              border: "none",
              background: activeTab === tab.key ? "#ffffff" : "transparent",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              color: activeTab === tab.key ? "#003829" : "#64748B",
              fontFamily: font,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Action button */}
      <button
        onClick={() => (activeTab === "operators" ? setIsAddingOperator(true) : setIsInviting(true))}
        style={{
          width: "100%",
          padding: "13px",
          borderRadius: 14,
          border: "none",
          background: "#003829",
          color: "#ffffff",
          fontFamily: font,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 16,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {activeTab === "operators" ? (
          <><Plus size={16} strokeWidth={2.5} /> Add Operator</>
        ) : (
          <><UserPlus size={16} strokeWidth={2.5} /> Invite User</>
        )}
      </button>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 className="animate-spin" size={24} color="#00674F" />
        </div>
      ) : activeTab === "operators" ? (
        /* ── Operators Tab ── */
        operators.length === 0 ? (
          <EmptyState label="No operators yet" />
        ) : (
          operators.map((op) => {
            const confirmed = operatorConfirmed[op.id];
            return (
              <div
                key={op.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 16,
                  padding: "15px 16px",
                  marginBottom: 10,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                      {op.name}
                    </div>
                    {op.website && (
                      <div style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: "#94A3B8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {op.website}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setEditingOperator(op)} style={iconBtnStyle} aria-label="Edit operator">
                    <Pencil size={14} color="#64748B" />
                  </button>
                </div>

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  <StatCell label="Quotes" value={`${op._quoteCount}`} />
                  <StatCell label="Users" value={`${op._profileCount}`} />
                  <StatCell label="Confirmed Revenue" value={`P${(confirmed?.total || 0).toLocaleString()}`} color="#059669" />
                  <StatCell label="Commission" value={`P${(confirmed?.commission || 0).toLocaleString()}`} color="#6366F1" />
                </div>

                <button
                  onClick={() => handleViewDashboard(op.id)}
                  style={{
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
                  }}
                >
                  <ExternalLink size={13} /> View Dashboard
                </button>
              </div>
            );
          })
        )
      ) : (
        /* ── Personnel Tab ── */
        personnel.length === 0 ? (
          <EmptyState label="No personnel yet" />
        ) : (
          personnel.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 16,
                padding: "13px 16px",
                marginBottom: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  background: "#F0FDF4",
                  color: "#00674F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: font,
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {(p.full_name || "U").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.full_name}
                </div>
                <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 500, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.email}
                </div>
                <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: "#64748B", marginTop: 2 }}>
                  {ROLE_LABELS[p.role] || p.role}
                  {p.operators?.name ? ` · ${p.operators.name}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setEditingPersonnel(p)} style={iconBtnStyle} aria-label="Edit user">
                  <Pencil size={14} color="#64748B" />
                </button>
                <button onClick={() => setDeleteUserTarget({ id: p.id, name: p.full_name })} style={{ ...iconBtnStyle, background: "#FFF1F2" }} aria-label="Delete user">
                  <Trash2 size={14} color="#E11D48" />
                </button>
              </div>
            </div>
          ))
        )
      )}

      {/* ── Sheets ── */}
      <OperatorFormSheet
        open={isAddingOperator || !!editingOperator}
        operator={editingOperator}
        onClose={() => { setIsAddingOperator(false); setEditingOperator(null); }}
        onSaved={() => { setIsAddingOperator(false); setEditingOperator(null); fetchData(); }}
      />
      <InviteUserSheet
        open={isInviting}
        operators={operators}
        onClose={() => setIsInviting(false)}
        onInvited={fetchData}
      />
      <PersonnelEditSheet
        person={editingPersonnel}
        operators={operators}
        onClose={() => setEditingPersonnel(null)}
        onSaved={() => { setEditingPersonnel(null); fetchData(); }}
      />
      <ConfirmSheet
        open={!!deleteUserTarget}
        title={`Revoke access for "${deleteUserTarget?.name}"?`}
        message="Their account will be deleted and they will no longer be able to sign in."
        confirmLabel="Revoke Access"
        destructive
        loading={deletingUser}
        onConfirm={executeDeleteUser}
        onCancel={() => setDeleteUserTarget(null)}
      />
    </div>
  );
}

/* ────────────────────────── Sheets ────────────────────────── */

function OperatorFormSheet({ open, operator, onClose, onSaved }: {
  open: boolean;
  operator: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    const res = operator
      ? await updateOperator(operator.id, formData)
      : await createOperator(formData);
    setSaving(false);
    if (res.success) {
      onSaved();
    } else {
      setStatus(res.error || "Failed to save");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={operator ? "Edit Operator" : "Add Operator"}>
      <form onSubmit={handleSubmit}>
        <Field label="Agency Name">
          <input name="name" defaultValue={operator?.name || ""} required style={inputStyle} placeholder="e.g. Island Hoppers Travel" />
        </Field>
        <Field label="Website">
          <input name="website" defaultValue={operator?.website || ""} style={inputStyle} placeholder="https://..." />
        </Field>
        <Field label="Agency Notes (shown on quotations)">
          <textarea name="quotation_agency_notes" defaultValue={operator?.quotation_agency_notes || ""} rows={3} style={{ ...inputStyle, height: "auto", paddingTop: 10, resize: "vertical" }} placeholder="Terms, contact info..." />
        </Field>

        <ListField label="Social Links" items={socialLinks} setItems={setSocialLinks} name="socialLinks" placeholder="https://facebook.com/..." />
        <ListField label="Quote Title Presets" items={titlePresets} setItems={setTitlePresets} name="quoteTitlePresets" placeholder="e.g. El Nido Tour Package" />

        {status && <ErrorNote message={status} />}
        <SubmitButton saving={saving} label={operator ? "Save Changes" : "Create Operator"} />
      </form>
    </Sheet>
  );
}

function InviteUserSheet({ open, operators, onClose, onInvited }: {
  open: boolean;
  operators: any[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const [role, setRole] = useState("operator_sales");
  const [isManual, setIsManual] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(null);
      setGeneratedLink(null);
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    formData.set("manual", isManual ? "true" : "false");
    const res = await inviteOperatorUser(formData);
    setSaving(false);
    if (res.success) {
      onInvited();
      if (res.link) {
        setGeneratedLink(res.link);
      } else {
        onClose();
      }
    } else {
      setStatus(res.error || "Failed to invite user");
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(generatedLink);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Invite User">
      {generatedLink ? (
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "#0F172A", margin: "0 0 8px" }}>
            Invite link generated
          </p>
          <p style={{ fontFamily: font, fontSize: 11.5, fontWeight: 500, color: "#64748B", margin: "0 0 12px" }}>
            Share this link with the user — it lets them set their password and sign in.
          </p>
          <div
            style={{
              padding: "10px 12px",
              background: "#F8FAFC",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              fontFamily: font,
              fontSize: 10.5,
              color: "#475569",
              wordBreak: "break-all",
              marginBottom: 12,
              maxHeight: 90,
              overflowY: "auto",
            }}
          >
            {generatedLink}
          </div>
          <button type="button" onClick={copyLink} style={primaryBtnStyle}>
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Field label="Full Name">
            <input name="fullName" required style={inputStyle} placeholder="Juan dela Cruz" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required style={inputStyle} placeholder="user@agency.com" />
          </Field>
          <Field label="Role">
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="operator_sales">Sales Agent</option>
              <option value="operator_admin">Operator Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </Field>
          {role !== "super_admin" && (
            <Field label="Operator">
              <select name="operatorId" required style={inputStyle} defaultValue="">
                <option value="" disabled>Select operator...</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Manual link toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              background: "#F8FAFC",
              borderRadius: 12,
              marginBottom: 14,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <input
              type="checkbox"
              checked={isManual}
              onChange={(e) => setIsManual(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#00674F" }}
            />
            <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Generate invite link manually (no email sent)
            </span>
          </label>

          {status && <ErrorNote message={status} />}
          <SubmitButton saving={saving} label={isManual ? "Generate Invite Link" : "Send Invite Email"} />
        </form>
      )}
    </Sheet>
  );
}

function PersonnelEditSheet({ person, operators, onClose, onSaved }: {
  person: any | null;
  operators: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState("operator_sales");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (person) {
      setRole(person.role);
      setStatus(null);
    }
  }, [person]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!person) return;
    setSaving(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    const res = await updatePersonnel(person.id, formData);
    setSaving(false);
    if (res.success) {
      onSaved();
    } else {
      setStatus(res.error || "Failed to update");
    }
  };

  return (
    <Sheet open={!!person} onClose={onClose} title="Edit User">
      {person && (
        <form onSubmit={handleSubmit}>
          <Field label="Full Name">
            <input name="fullName" defaultValue={person.full_name || ""} required style={inputStyle} />
          </Field>
          <Field label="Role">
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="operator_sales">Sales Agent</option>
              <option value="operator_admin">Operator Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </Field>
          {role !== "super_admin" && (
            <Field label="Operator">
              <select name="operatorId" defaultValue={person.operator_id || ""} required style={inputStyle}>
                <option value="" disabled>Select operator...</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </Field>
          )}
          {status && <ErrorNote message={status} />}
          <SubmitButton saving={saving} label="Save Changes" />
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
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            zIndex: 1000,
            outline: "none",
            maxHeight: "88dvh",
            display: "flex",
            flexDirection: "column",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontFamily: font, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
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
        <button
          type="button"
          onClick={() => setItems([...items, ""])}
          style={{ ...iconBtnStyle, width: 26, height: 26 }}
          aria-label={`Add ${label}`}
        >
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

function StatCell({ label, value, color = "#0F172A" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontFamily: font, fontSize: 8.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", fontFamily: font }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: 0 }}>{label}</p>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "#FFF1F2",
        border: "1px solid rgba(225,29,72,0.15)",
        borderRadius: 10,
        fontFamily: font,
        fontSize: 12,
        fontWeight: 600,
        color: "#E11D48",
        marginBottom: 12,
      }}
    >
      {message}
    </div>
  );
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}>
      {saving ? <Loader2 className="animate-spin" size={15} /> : label}
    </button>
  );
}

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
  WebkitTapHighlightColor: "transparent",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: 12,
  border: "none",
  background: "#003829",
  color: "#ffffff",
  fontFamily: font,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  WebkitTapHighlightColor: "transparent",
};
