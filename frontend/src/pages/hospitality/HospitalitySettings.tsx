import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import Mail from "lucide-react/dist/esm/icons/mail.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import { ManageShell } from "../../components/manage/ManageShell";
import { DashboardHeaderTools } from "../../components/manage/DashboardHeaderTools";
import { HospitalityActivityNotifications } from "./HospitalityActivityNotifications";
import { apiFetch, displayError, jsonBody } from "../../lib/api";
import { schoolWorkspaceNav } from "../school/schoolWorkspaceNav";
import "./HospitalityWorkspace.css";
import "./HospitalitySettings.css";
import "./HospitalityDashboardSystem.css";

type Role = "owner" | "manager" | "menu_editor";
type TeamMember = { id: number; name: string; email: string; role: Role; status: "active" | "invited"; isCurrentUser: boolean };
type ServiceModule = { key: string; label: string; enabled: boolean; available: boolean };
type ServicePlan = { name: string; startsOn: string; endsOn: string; internalNotes?: string; technicalOwner: { id: number; name: string; email: string } | null; modules: ServiceModule[] };
type SupportStaff = { id: number; name: string; email: string };
type SettingsPayload = {
  shell: { isSuperAdmin: boolean; role: Role; capabilities: string[]; currentSchool: { id: number; name: string; logo: string | null; organizationType: string; publicIdentifier: string }; schools: Array<{ id: number; name: string }>; user: { displayName: string } };
  settings: { notifications: { newFeedbackEmail: boolean; lowRatingFeedbackEmail: boolean; weeklySummaryEmail: boolean }; organizationCode: string };
  team?: TeamMember[];
  subscription: ServicePlan;
  supportStaff?: SupportStaff[];
};

const tabs = ["General", "Staff & Access", "Notifications", "Integrations", "Subscription", "Advanced"] as const;
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
  const [subscription, setSubscription] = useState<ServicePlan | null>(null);
  const [darkTheme, setDarkTheme] = useState(() => window.localStorage.getItem("tap2connect:hospitality-theme") !== "light");
  const toggleTheme = () => setDarkTheme((current) => {
    const next = !current;
    window.localStorage.setItem("tap2connect:hospitality-theme", next ? "dark" : "light");
    return next;
  });

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<SettingsPayload>(`/api/organizations/${id}/venue/settings/`);
      setPayload(response);
      setOrganizationCode(response.settings.organizationCode);
      setSubscription(response.subscription);
    } catch (reason) { setError(displayError(reason)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const owner = Boolean(payload?.shell.isSuperAdmin || payload?.shell.role === "owner");
  const visibleTabs = useMemo(() => tabs.filter((item) => owner || !["Staff & Access", "Advanced"].includes(item)), [owner]);
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

  async function saveSubscription(event: FormEvent) {
    event.preventDefault();
    if (!subscription) return;
    await request({
      action: "subscription",
      name: subscription.name,
      startsOn: subscription.startsOn,
      endsOn: subscription.endsOn,
      internalNotes: subscription.internalNotes || "",
      technicalOwnerId: subscription.technicalOwner?.id || null,
      modules: subscription.modules.filter((module) => module.enabled).map((module) => module.key),
    });
  }

  if (!payload) return <div className="manage-state">{error || "Loading settings…"}</div>;
  const { shell, settings } = payload;
  const school = shell.currentSchool;
  const navigation = schoolWorkspaceNav(school.id, shell.isSuperAdmin, "hospitality", shell.capabilities);
  const changeRole = (member: TeamMember, role: Role) => void request({ action: "role", id: member.id, role });
  const removeMember = (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name} from this dashboard?`)) return;
    void request({ action: "remove", id: member.id }, "DELETE");
  };

  return <ManageShell
    brand={school.name} brandDetail={shell.isSuperAdmin ? "Platform administrator · Organization workspace" : "Hospitality organization"}
    logo={school.logo || undefined} className={`manage-app--hospitality ${darkTheme ? "manage-app--hospitality-theme-dark" : "manage-app--hospitality-theme-light"}`}
    nav={navigation}
    title="Settings"
    userName={shell.user.displayName} userRole={shell.isSuperAdmin ? "Platform administrator" : roles.find((role) => role.value === shell.role)?.label || "Organization member"}
    accent="#145fe2" showNotifications={false}
    schoolOptions={shell.schools.length > 1 ? shell.schools : undefined} selectedSchool={school.id}
    workspaceSelectorLabel="Organization workspace"
    onSchoolChange={(schoolId) => { window.location.href = `/dashboard/organizations/${schoolId}/settings/`; }}
    actions={<><HospitalityActivityNotifications organizationId={school.id} /><DashboardHeaderTools nav={navigation} organizationId={school.id} enableSupport canRaiseSupport={!shell.isSuperAdmin} /><button type="button" className="manage-icon-button hospitality-theme-toggle" onClick={toggleTheme} aria-label={darkTheme ? "Use light theme" : "Use dark theme"} title={darkTheme ? "Use light theme" : "Use dark theme"}>{darkTheme ? <Sun size={16} /> : <Moon size={16} />}</button><a className="manage-button is-primary" href={`/venue/${school.publicIdentifier}/?preview=dashboard`} target="_blank" rel="noreferrer"><Eye size={14} />Preview profile</a></>}
  >
    <div className="hospitality-settings">
      {error ? <div className="manage-alert school-message" role="alert">{error}</div> : null}
      {notice ? <div className="manage-alert is-success school-message" role="status"><Check size={16} />{notice}</div> : null}
      <div className="hospitality-settings-tabs" role="tablist" aria-label="Settings sections">
        {visibleTabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {tab === "General" ? <section className="manage-card hospitality-settings-card">
        <div className="hospitality-settings-heading"><Settings size={20} /><div><h2>Workspace settings</h2></div></div>
        <div className="hospitality-settings-callout"><strong>Profile</strong><a className="manage-button is-primary" href={`/dashboard/organizations/${school.id}/hospitality/?tab=profile`}>Open Profile <ExternalLink size={14} /></a></div>
        <div className="hospitality-role-grid">{roles.map((role) => <article key={role.value} className={shell.role === role.value ? "is-current" : ""}><strong>{role.label}</strong><p>{role.detail}</p>{shell.role === role.value ? <small>Current role</small> : null}</article>)}</div>
      </section> : null}

      {tab === "Staff & Access" && owner ? <section className="hospitality-settings-layout">
        <article className="manage-card hospitality-settings-card"><div className="hospitality-section-title"><div><h2>Dashboard team</h2></div></div>
          <form className="hospitality-invite" onSubmit={invite}><label>Email address<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required placeholder="person@example.com" /></label><label>Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><button className="manage-button is-primary" disabled={saving}><Plus size={15} />Invite</button></form>
          <div className="hospitality-team-table" role="table"><div role="row" className="hospitality-team-head"><span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Actions</span></div>{(payload.team || []).map((member) => <div role="row" key={member.id}><strong>{member.name}{member.isCurrentUser ? <small> You</small> : null}</strong><span>{member.email}</span><select aria-label={`${member.name} role`} value={member.role} onChange={(event) => changeRole(member, event.target.value as Role)} disabled={saving}><option value="owner">Owner</option><option value="manager">Manager</option><option value="menu_editor">Menu editor</option></select><em className={member.status === "active" ? "is-active" : ""}>{member.status === "active" ? "Active" : "Invited"}</em><button type="button" className="manage-button is-danger" onClick={() => removeMember(member)} disabled={saving}><Trash2 size={14} />Remove</button></div>)}</div>
        </article>
        <aside className="manage-card hospitality-settings-card hospitality-role-permissions"><Users size={20} /><h2>Role permissions</h2>{roles.map((role) => <div key={role.value}><strong>{role.label}</strong><p>{role.detail}</p></div>)}</aside>
      </section> : null}

      {tab === "Notifications" ? <section className="manage-card hospitality-settings-card"><div className="hospitality-settings-heading"><Bell size={20} /><div><h2>Email notifications</h2></div></div><div className="hospitality-preference-list">{[
        ["newFeedbackEmail", "New feedback"],
        ["lowRatingFeedbackEmail", "Low-rating feedback"],
        ["weeklySummaryEmail", "Weekly summary"],
      ].map(([key, label]) => <label key={key}><span><Mail size={18} /><strong>{label}</strong></span><input type="checkbox" checked={settings.notifications[key as keyof typeof settings.notifications]} onChange={(event) => void request({ action: "notifications", [key]: event.target.checked })} disabled={saving} /></label>)}</div></section> : null}

      {tab === "Integrations" ? <section className="manage-card hospitality-settings-card"><h2>Integrations</h2><div className="hospitality-unavailable"><strong>Google Business Profile</strong></div></section> : null}
      {tab === "Subscription" && subscription ? <section className="manage-card hospitality-settings-card hospitality-plan-card"><div className="hospitality-section-title"><div><h2>{shell.isSuperAdmin ? "Service plan & modules" : "Your service plan"}</h2><p>{shell.isSuperAdmin ? "Control the modules included in this organization’s deal and assign its technical owner." : "These modules are included in your agreement. Contact your technical owner to request a change."}</p></div></div>
        {shell.isSuperAdmin ? <form className="hospitality-plan-form" onSubmit={saveSubscription}>
          <div className="hospitality-plan-fields"><label>Plan name<input value={subscription.name} onChange={(event) => setSubscription({ ...subscription, name: event.target.value })} placeholder="e.g. Loyalty package" /></label><label>Starts on<input type="date" value={subscription.startsOn} onChange={(event) => setSubscription({ ...subscription, startsOn: event.target.value })} /></label><label>Ends on<input type="date" value={subscription.endsOn} onChange={(event) => setSubscription({ ...subscription, endsOn: event.target.value })} /></label><label>Technical owner<select value={subscription.technicalOwner?.id || ""} onChange={(event) => { const person = (payload.supportStaff || []).find((item) => item.id === Number(event.target.value)) || null; setSubscription({ ...subscription, technicalOwner: person }); }}><option value="">Not assigned</option>{(payload.supportStaff || []).map((person) => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ""}</option>)}</select></label></div>
          <label className="hospitality-plan-notes">Internal deal notes<textarea value={subscription.internalNotes || ""} onChange={(event) => setSubscription({ ...subscription, internalNotes: event.target.value })} placeholder="Internal only: scope, support terms, renewal notes…" /></label>
          <div className="hospitality-module-grid">{subscription.modules.map((module) => <label key={module.key} className={module.enabled ? "is-enabled" : ""}><input type="checkbox" checked={module.enabled} disabled={module.key === "overview" || module.key === "profile"} onChange={(event) => setSubscription({ ...subscription, modules: subscription.modules.map((item) => item.key === module.key ? { ...item, enabled: event.target.checked } : item) })} /><span><strong>{module.label}</strong>{module.key === "ordering" ? <small>Ordering workspace will appear here when it is released.</small> : null}</span></label>)}</div>
          <button className="manage-button is-primary" disabled={saving}><Check size={15} />{saving ? "Saving…" : "Save service plan"}</button>
        </form> : <><div className="hospitality-plan-summary"><div><small>Plan</small><strong>{subscription.name || "Custom plan"}</strong></div><div><small>Technical owner</small><strong>{subscription.technicalOwner?.name || "Contact Tap2Connect support"}</strong>{subscription.technicalOwner?.email ? <span>{subscription.technicalOwner.email}</span> : null}</div><div><small>Included modules</small><p>{subscription.modules.filter((module) => module.enabled).map((module) => module.label).join(" · ") || "Core workspace"}</p></div></div><a className="manage-button" href={`/dashboard/organizations/${school.id}/support/`}>Request a module</a></>}
      </section> : null}
      {tab === "Advanced" && owner ? <section className="manage-card hospitality-settings-card"><div className="hospitality-settings-heading"><KeyRound size={20} /><div><h2>Advanced</h2></div></div><form className="hospitality-advanced-form" onSubmit={(event) => { event.preventDefault(); void request({ action: "organization_code", organizationCode }); }}><label>Organization code<input value={organizationCode} onChange={(event) => setOrganizationCode(event.target.value.toUpperCase())} maxLength={12} /></label><button className="manage-button is-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="is-spinning" /> : <Check size={15} />}Save internal settings</button></form></section> : null}
    </div>
  </ManageShell>;
}
