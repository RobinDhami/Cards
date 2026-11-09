import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import Mail from "lucide-react/dist/esm/icons/mail.js";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.js";
import Ellipsis from "lucide-react/dist/esm/icons/ellipsis.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { ManageShell } from "../../components/manage/ManageShell";
import { DashboardHeaderTools } from "../../components/manage/DashboardHeaderTools";
import { HospitalityActivityNotifications } from "./HospitalityActivityNotifications";
import { apiFetch, displayError, jsonBody } from "../../lib/api";
import { currentOrganizationId, organizationWorkspaceHref } from "../../lib/organizationRoute";
import { schoolWorkspaceNav } from "../school/schoolWorkspaceNav";
import "./HospitalityWorkspace.css";
import "./HospitalitySettings.css";
import "./HospitalityDashboardSystem.css";

type Role = "owner" | "manager" | "waiter" | "kitchen" | "reception";
type TeamMember = { id: number; name: string; email: string; role: Role; status: "active" | "invited"; isCurrentUser: boolean };
type SettingsPayload = {
  shell: { isSuperAdmin: boolean; role: Role; capabilities: string[]; currentSchool: { id: number; name: string; logo: string | null; organizationType: string; publicIdentifier: string }; schools: Array<{ id: number; name: string }>; user: { displayName: string } };
  settings: { notifications: { newFeedbackEmail: boolean; lowRatingFeedbackEmail: boolean; weeklySummaryEmail: boolean }; organizationCode: string };
  team?: TeamMember[];
};

const tabs = ["General", "Staff & Access", "Notifications", "Integrations", "Advanced"] as const;
type Tab = (typeof tabs)[number];
const roles: Array<{ value: Role; label: string; detail: string }> = [
  { value: "owner", label: "Owner", detail: "Full control, including team access and internal settings." },
  { value: "manager", label: "Manager", detail: "Can manage menu, orders, and reports." },
  { value: "waiter", label: "Waiter", detail: "Can verify, edit, and progress table orders." },
  { value: "kitchen", label: "Kitchen", detail: "Can only start preparing and mark orders ready." },
  { value: "reception", label: "Reception", detail: "Can scan loyalty members and add or redeem their loyalty balance." },
];

function organizationId() {
  return currentOrganizationId();
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
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [memberMenuId, setMemberMenuId] = useState<number | null>(null);
  const [organizationCode, setOrganizationCode] = useState("");
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
    onSchoolChange={(schoolId) => { window.location.href = organizationWorkspaceHref(schoolId, "settings"); }}
    actions={<><HospitalityActivityNotifications organizationId={school.id} /><DashboardHeaderTools nav={navigation} organizationId={school.id} enableSupport canRaiseSupport={!shell.isSuperAdmin} /><button type="button" className="manage-icon-button hospitality-theme-toggle" onClick={toggleTheme} aria-label={darkTheme ? "Use light theme" : "Use dark theme"} title={darkTheme ? "Use light theme" : "Use dark theme"}>{darkTheme ? <Sun size={16} /> : <Moon size={16} />}</button><a className="manage-button is-primary hospitality-preview-action" href={`/venue/${school.publicIdentifier}/?preview=dashboard`} target="_blank" rel="noreferrer"><Eye size={14} />Preview profile</a></>}
  >
    <div className="hospitality-settings">
      {error ? <div className="manage-alert school-message" role="alert">{error}</div> : null}
      {notice ? <div className="manage-alert is-success school-message" role="status"><Check size={16} />{notice}</div> : null}
      <div className="hospitality-settings-tabs" role="tablist" aria-label="Settings sections">
        {visibleTabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {tab === "General" ? <section className="manage-card hospitality-settings-card">
        <div className="hospitality-settings-heading"><Settings size={20} /><div><h2>Workspace settings</h2></div></div>
        <div className="hospitality-settings-callout"><strong>Profile</strong><a className="manage-button is-primary" href={organizationWorkspaceHref(school.id, "profile")}>Open Profile <ExternalLink size={14} /></a></div>
        <div className="hospitality-role-grid">{roles.map((role) => <article key={role.value} className={shell.role === role.value ? "is-current" : ""}><strong>{role.label}</strong><p>{role.detail}</p>{shell.role === role.value ? <small>Current role</small> : null}</article>)}</div>
      </section> : null}

      {tab === "Staff & Access" && owner ? <section className="manage-card hospitality-settings-card hospitality-team-access">
        <div className="hospitality-section-title"><div><h2>Team access</h2><p>Invite people and manage access to your workspace.</p></div></div>
        <form className="hospitality-invite" onSubmit={invite}>
          <label>Email address<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required placeholder="person@example.com" /></label>
          <label>Role<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
          <button type="button" className="hospitality-role-link" aria-expanded={permissionsOpen} onClick={() => setPermissionsOpen((current) => !current)}><CircleHelp size={16} />View role permissions</button>
          <button className="manage-button is-primary hospitality-invite-button" disabled={saving}>{saving ? <LoaderCircle size={16} className="is-spinning" /> : <Plus size={17} />}Invite</button>
        </form>
        {permissionsOpen ? <div className="hospitality-role-permissions" role="region" aria-label="Role permissions">{roles.map((role) => <div key={role.value}><strong>{role.label}</strong><p>{role.detail}</p></div>)}</div> : null}
        <div className="hospitality-team-table" role="table" aria-label="Workspace team">
          <div role="row" className="hospitality-team-head"><span>Member</span><span>Role</span><span>Status</span><span>Action</span></div>
          {(payload.team || []).map((member) => <div role="row" className="hospitality-team-row" key={member.id}>
            <div className="hospitality-team-member"><span><strong>{member.name}</strong>{member.isCurrentUser ? <small>You</small> : null}</span><span className="hospitality-team-email">{member.email}</span></div>
            {member.isCurrentUser ? <span className="hospitality-role-badge">{roles.find((role) => role.value === member.role)?.label}</span> : <select aria-label={`${member.name} role`} value={member.role} onChange={(event) => changeRole(member, event.target.value as Role)} disabled={saving}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>}
            <em className={member.status === "active" ? "is-active" : ""}><i aria-hidden="true" />{member.status === "active" ? "Active" : "Invited"}</em>
            <div className="hospitality-member-actions"><button type="button" className="hospitality-member-menu-button" aria-label={`Actions for ${member.name}`} aria-expanded={memberMenuId === member.id} onClick={() => setMemberMenuId((current) => current === member.id ? null : member.id)}><Ellipsis size={19} /></button>{memberMenuId === member.id ? <div className="hospitality-member-menu">{member.isCurrentUser ? <span>Current account</span> : <button type="button" onClick={() => { setMemberMenuId(null); removeMember(member); }} disabled={saving}>Remove access</button>}</div> : null}</div>
          </div>)}
        </div>
      </section> : null}

      {tab === "Notifications" ? <section className="manage-card hospitality-settings-card"><div className="hospitality-settings-heading"><Bell size={20} /><div><h2>Email notifications</h2></div></div><div className="hospitality-preference-list">{[
        ["newFeedbackEmail", "New feedback"],
        ["lowRatingFeedbackEmail", "Low-rating feedback"],
        ["weeklySummaryEmail", "Weekly summary"],
      ].map(([key, label]) => <label key={key}><span><Mail size={18} /><strong>{label}</strong></span><input type="checkbox" checked={settings.notifications[key as keyof typeof settings.notifications]} onChange={(event) => void request({ action: "notifications", [key]: event.target.checked })} disabled={saving} /></label>)}</div></section> : null}

      {tab === "Integrations" ? <section className="manage-card hospitality-settings-card"><h2>Integrations</h2><div className="hospitality-unavailable"><strong>Google Business Profile</strong></div></section> : null}
      {tab === "Advanced" && owner ? <section className="manage-card hospitality-settings-card"><div className="hospitality-settings-heading"><KeyRound size={20} /><div><h2>Advanced</h2></div></div><form className="hospitality-advanced-form" onSubmit={(event) => { event.preventDefault(); void request({ action: "organization_code", organizationCode }); }}><label>Organization code<input value={organizationCode} onChange={(event) => setOrganizationCode(event.target.value.toUpperCase())} maxLength={12} /></label><button className="manage-button is-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="is-spinning" /> : <Check size={15} />}Save internal settings</button></form></section> : null}
    </div>
  </ManageShell>;
}
