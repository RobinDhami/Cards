import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import Mail from "lucide-react/dist/esm/icons/mail.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import { ManageShell } from "../../components/manage/ManageShell";
import { apiFetch, displayError, jsonBody } from "../../lib/api";
import { schoolWorkspaceNav } from "../school/schoolWorkspaceNav";
import "./HospitalitySettings.css";

type Role = "owner" | "manager" | "menu_editor";
type TeamMember = { id: number; name: string; email: string; role: Role; status: "active" | "invited"; isCurrentUser: boolean };
type SettingsPayload = {
  shell: { isSuperAdmin: boolean; role: Role; capabilities: string[]; currentSchool: { id: number; name: string; logo: string | null; organizationType: string }; schools: Array<{ id: number; name: string }>; user: { displayName: string } };
  settings: { notifications: { newFeedbackEmail: boolean; lowRatingFeedbackEmail: boolean; weeklySummaryEmail: boolean }; organizationCode: string };
  team?: TeamMember[];
};

const tabs = ["General", "Team access", "Notifications", "Integrations", "Subscription", "Advanced"] as const;
type Tab = (typeof tabs)[number];
const roles: Array<{ value: Role; label: string; detail: string }> = [
  { value: "owner", label: "Owner", detail: "Full control, including team access and internal settings." },
  { value: "manager", label: "Manager", detail: "Can manage profile, menu, feedback, staff, and analytics." },
  { value: "menu_editor", label: "Menu editor", detail: "Can manage menu categories, items, availability, and offers only." },
];

function organizationId() {
  return Number(window.location.pathname.match(/organizations\/(\d+)/)?.[1] || 0);
}

export function HospitalitySettingsPage() {
  const id = organizationId();
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [tab, setTab] = useState<Tab>("General");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("manager");
  const [organizationCode, setOrganizationCode] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<SettingsPayload>(`/api/organizations/${id}/venue/settings/`);
      setPayload(response);
      setOrganizationCode(response.settings.organizationCode);
    } catch (reason) { setError(displayError(reason)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const owner = Boolean(payload?.shell.isSuperAdmin || payload?.shell.role === "owner");
  const visibleTabs = useMemo(() => tabs.filter((item) => owner || !["Team access", "Advanced"].includes(item)), [owner]);
  useEffect(() => { if (!visibleTabs.includes(tab)) setTab("General"); }, [tab, visibleTabs]);

  async function request(data: Record<string, unknown>, method = "PATCH") {
    setSaving(true); setError(""); setNotice("");
    try {
      await apiFetch(`/api/organizations/${id}/venue/settings/`, { method, headers: { "Content-Type": "application/json" }, body: jsonBody(data) });
      await load();
      setNotice("Saved.");
    } catch (reason) { setError(displayError(reason)); }
    finally { setSaving(false); }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    await request({ action: "invite", email: inviteEmail, role: inviteRole }, "POST");
    setInviteEmail("");
  }

  if (!payload) return <div className="manage-state">{error || "Loading settings…"}</div>;
  const { shell, settings } = payload;
  const school = shell.currentSchool;
  const changeRole = (member: TeamMember, role: Role) => void request({ action: "role", id: member.id, role });
  const removeMember = (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name} from this dashboard?`)) return;
    void request({ action: "remove", id: member.id }, "DELETE");
  };

  return <ManageShell
    brand={school.name} brandDetail={shell.isSuperAdmin ? "Platform administrator · Organization workspace" : "Hospitality organization"}
    logo={school.logo || undefined} className="manage-app--hospitality"
    nav={schoolWorkspaceNav(school.id, shell.isSuperAdmin, "hospitality", shell.capabilities)}
    title="Settings" subtitle="Manage access, notifications, and internal workspace configuration."
    userName={shell.user.displayName} userRole={shell.isSuperAdmin ? "Platform administrator" : roles.find((role) => role.value === shell.role)?.label || "Organization member"}
    accent="#145fe2" showNotifications={false}
    schoolOptions={shell.schools.length > 1 ? shell.schools : undefined} selectedSchool={school.id}
    workspaceSelectorLabel="Organization workspace"
    onSchoolChange={(schoolId) => { window.location.href = `/dashboard/organizations/${schoolId}/settings/`; }}
  >
    <div className="hospitality-settings">
      {error ? <div className="manage-alert school-message" role="alert">{error}</div> : null}
      {notice ? <div className="manage-alert is-success school-message" role="status"><Check size={16} />{notice}</div> : null}
      <div className="hospitality-settings-tabs" role="tablist" aria-label="Settings sections">
        {visibleTabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {tab === "General" ? <section className="manage-card hospitality-settings-card">
        <div className="hospitality-settings-heading"><Settings size={20} /><div><h2>Workspace settings</h2><p>Public customer-facing information has one source of truth.</p></div></div>
        <div className="hospitality-settings-callout"><strong>Business Profile owns public information.</strong><span>Name, address, contacts, social links, opening hours, colours, logo, and cover image are edited there so values are never duplicated.</span><a className="manage-button is-primary" href={`/dashboard/organizations/${school.id}/hospitality/?tab=profile`}>Open Business Profile <ExternalLink size={14} /></a></div>
        <div className="hospitality-role-grid">{roles.map((role) => <article key={role.value} className={shell.role === role.value ? "is-current" : ""}><strong>{role.label}</strong><p>{role.detail}</p>{shell.role === role.value ? <small>Current role</small> : null}</article>)}</div>
      </section> : null}

      {tab === "Team access" && owner ? <section className="hospitality-settings-layout">
        <article className="manage-card hospitality-settings-card"><div className="hospitality-section-title"><div><h2>Dashboard team</h2><p>Dashboard access is separate from public staff profiles.</p></div></div>
          <form className="hospitality-invite" onSubmit={invite}><label>Email address<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required placeholder="person@example.com" /></label><label>Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><button className="manage-button is-primary" disabled={saving}><Plus size={15} />Invite</button></form>
          <p className="hospitality-muted">Invitations become active for existing Tap2Connect accounts. Email delivery is not configured yet; invited people are shown honestly as pending.</p>
          <div className="hospitality-team-table" role="table"><div role="row" className="hospitality-team-head"><span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Actions</span></div>{(payload.team || []).map((member) => <div role="row" key={member.id}><strong>{member.name}{member.isCurrentUser ? <small> You</small> : null}</strong><span>{member.email}</span><select aria-label={`${member.name} role`} value={member.role} onChange={(event) => changeRole(member, event.target.value as Role)} disabled={saving}><option value="owner">Owner</option><option value="manager">Manager</option><option value="menu_editor">Menu editor</option></select><em className={member.status === "active" ? "is-active" : ""}>{member.status === "active" ? "Active" : "Invited"}</em><button type="button" className="manage-button is-danger" onClick={() => removeMember(member)} disabled={saving}><Trash2 size={14} />Remove</button></div>)}</div>
        </article>
        <aside className="manage-card hospitality-settings-card hospitality-role-permissions"><Users size={20} /><h2>Role permissions</h2>{roles.map((role) => <div key={role.value}><strong>{role.label}</strong><p>{role.detail}</p></div>)}</aside>
      </section> : null}

      {tab === "Notifications" ? <section className="manage-card hospitality-settings-card"><div className="hospitality-settings-heading"><Bell size={20} /><div><h2>Email notifications</h2><p>Only supported email preferences are shown. Turning one on does not send an immediate email.</p></div></div><div className="hospitality-preference-list">{[
        ["newFeedbackEmail", "New feedback", "Receive an email when a customer submits feedback."],
        ["lowRatingFeedbackEmail", "Low-rating feedback", "Receive an email for feedback rated 3 stars or below."],
        ["weeklySummaryEmail", "Weekly summary", "Receive a weekly summary when scheduled delivery is available."],
      ].map(([key, label, detail]) => <label key={key}><span><Mail size={18} /><strong>{label}<small>{detail}</small></strong></span><input type="checkbox" checked={settings.notifications[key as keyof typeof settings.notifications]} onChange={(event) => void request({ action: "notifications", [key]: event.target.checked })} disabled={saving} /></label>)}</div></section> : null}

      {tab === "Integrations" ? <section className="manage-card hospitality-settings-card"><h2>Integrations</h2><div className="hospitality-unavailable"><strong>Google Business Profile</strong><p>Unavailable — Google Business OAuth and review import are not configured for this site. Your customer-facing Google review link remains editable in Business Profile.</p></div></section> : null}
      {tab === "Subscription" ? <section className="manage-card hospitality-settings-card"><h2>Subscription</h2><div className="hospitality-unavailable"><strong>Subscription management is unavailable</strong><p>Billing and subscription changes are not implemented in this dashboard. Contact Tap2Connect Nepal for account assistance.</p></div></section> : null}
      {tab === "Advanced" && owner ? <section className="manage-card hospitality-settings-card"><div className="hospitality-settings-heading"><KeyRound size={20} /><div><h2>Advanced</h2><p>Internal identifiers and card-specific configuration only.</p></div></div><form className="hospitality-advanced-form" onSubmit={(event) => { event.preventDefault(); void request({ action: "organization_code", organizationCode }); }}><label>Organization code<input value={organizationCode} onChange={(event) => setOrganizationCode(event.target.value.toUpperCase())} maxLength={12} aria-describedby="organization-code-help" /></label><p id="organization-code-help">Used internally for organization administration. Public profile content remains in Business Profile.</p><button className="manage-button is-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="is-spinning" /> : <Check size={15} />}Save internal settings</button></form></section> : null}
    </div>
  </ManageShell>;
}
