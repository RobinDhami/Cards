import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { create } from "zustand";
import QRCode from "qrcode";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import ImageIcon from "lucide-react/dist/esm/icons/image.js";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal.js";
import Pencil from "lucide-react/dist/esm/icons/pencil.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Save from "lucide-react/dist/esm/icons/save.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import Share2 from "lucide-react/dist/esm/icons/share-2.js";
import Leaf from "lucide-react/dist/esm/icons/leaf.js";
import MapPin from "lucide-react/dist/esm/icons/map-pin.js";
import Phone from "lucide-react/dist/esm/icons/phone.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Gift from "lucide-react/dist/esm/icons/gift.js";
import Star from "lucide-react/dist/esm/icons/star.js";
import Tag from "lucide-react/dist/esm/icons/tag.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Utensils from "lucide-react/dist/esm/icons/utensils.js";
import UserPlus from "lucide-react/dist/esm/icons/user-plus.js";
import X from "lucide-react/dist/esm/icons/x.js";
import { FaApple, FaFacebookF, FaGlobe, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import { HiOutlineEnvelope } from "react-icons/hi2";
import {
  Field,
  FileInput,
  FormSection,
  SelectInput,
  TextInput,
  TextArea,
} from "../../components/manage/FormControls";
import { ManageShell } from "../../components/manage/ManageShell";
import { apiFetch, displayError, jsonBody, queryString } from "../../lib/api";
import { schoolWorkspaceNav } from "../school/schoolWorkspaceNav";
import { HospitalityOverview } from "./HospitalityOverview";
import type { HospitalityOverviewData } from "./HospitalityOverview";
import { HospitalityBusinessProfile } from "./HospitalityBusinessProfile";
import { HospitalityMenuManagement } from "./HospitalityMenuManagement";
import { HospitalityFeedback } from "./HospitalityFeedback";
import { HospitalityStaffCards } from "./HospitalityStaffCards";
import { HospitalityAnalytics } from "./HospitalityAnalytics";
import { HospitalityRewardsProgram } from "./HospitalityRewardsProgram";
import { HospitalityRewardsMembers } from "./HospitalityRewardsMembers";
import googleGLogo from "./google-g.svg";
import "./HospitalityWorkspace.css";
import "./HospitalityDashboardSystem.css";
import "./PublicCafeProfile.css";

export type Venue = {
  organization: { id: number; name: string; slogan?: string };
  venue: {
    publicIdentifier: string;
    type: string;
    description: string;
    logo: string;
    coverImage: string;
    primaryColor: string;
    secondaryColor: string;
    phone: string;
    whatsapp: string;
    email: string;
    website: string;
    address: string;
    mapUrl: string;
    googleReviewUrl: string;
    reservationUrl: string;
    openingHours: string;
    openingSchedule: Record<string, { closed: boolean; intervals: Array<{ start: string; end: string }> }>;
    whatsappSameAsPhone: boolean;
  };
  categories: Category[];
  links: Link[];
  rating: { average: number; count: number };
  feedbackEnabled: boolean;
  loyalty?: { enabled: boolean; programName: string; stampGoal: number };
  sourceConflicts?: string[];
};
type Category = {
  id?: number;
  name: string;
  slug: string;
  display_order?: number;
  is_active?: boolean;
  items?: Item[];
};
type Item = {
  id?: number;
  category_id?: number;
  name: string;
  description: string;
  price: string;
  original_price?: string;
  originalPrice?: string;
  offer_label?: string;
  dietary_info?: string;
  is_vegetarian?: boolean;
  is_available?: boolean;
  isAvailable?: boolean;
  is_published?: boolean;
  is_today_special?: boolean;
  is_offer?: boolean;
  isTodaySpecial?: boolean;
  isOffer?: boolean;
  offerLabel?: string;
  image?: string;
  display_order?: number;
  priceVariants?: Array<{ label: string; price: string }>;
};

type CafeFeedbackDraft = {
  rating: number;
  comment: string;
  shareContact: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company_website: string;
  source: string;
};

type LoyaltyMembership = {
  memberId: string;
  stampCount: number;
  stampGoal: number;
  rewardsRedeemed: number;
  isActive: boolean;
};

const newCafeFeedbackDraft = (source: string): CafeFeedbackDraft => ({
  rating: 0, comment: "", shareContact: false, contactName: "", contactEmail: "", contactPhone: "", company_website: "", source,
});

type PublicCafeUIState = {
  activeTab: "home" | "menu";
  feedback: CafeFeedbackDraft;
  selectedCategory: string | null;
  menuSearch: string;
  shareMessage: string;
  sendingFeedback: boolean;
  feedbackMessage: string;
  selectedMenuItem: Item | null;
  loyaltySheet: "closed" | "join" | "card";
  loyaltyPhone: string;
  joiningLoyalty: boolean;
  loyaltyMessage: string;
  loyaltyMembership: LoyaltyMembership | null;
  reset: (source: string, activeTab: "home" | "menu") => void;
  setActiveTab: (activeTab: "home" | "menu") => void;
  setFeedback: (feedback: CafeFeedbackDraft) => void;
  setSelectedCategory: (selectedCategory: string | null) => void;
  setMenuSearch: (menuSearch: string) => void;
  setShareMessage: (shareMessage: string) => void;
  setSendingFeedback: (sendingFeedback: boolean) => void;
  setFeedbackMessage: (feedbackMessage: string) => void;
  setSelectedMenuItem: (selectedMenuItem: Item | null) => void;
  setLoyaltySheet: (loyaltySheet: "closed" | "join" | "card") => void;
  setLoyaltyPhone: (loyaltyPhone: string) => void;
  setJoiningLoyalty: (joiningLoyalty: boolean) => void;
  setLoyaltyMessage: (loyaltyMessage: string) => void;
  setLoyaltyMembership: (loyaltyMembership: LoyaltyMembership | null) => void;
};

const usePublicCafeUIStore = create<PublicCafeUIState>((set) => ({
  activeTab: "home",
  feedback: newCafeFeedbackDraft("public_profile"),
  selectedCategory: null,
  menuSearch: "",
  shareMessage: "",
  sendingFeedback: false,
  feedbackMessage: "",
  selectedMenuItem: null,
  loyaltySheet: "closed",
  loyaltyPhone: "",
  joiningLoyalty: false,
  loyaltyMessage: "",
  loyaltyMembership: null,
  reset: (source, activeTab) => set({ activeTab, feedback: newCafeFeedbackDraft(source), selectedCategory: null, menuSearch: "", shareMessage: "", sendingFeedback: false, feedbackMessage: "", selectedMenuItem: null, loyaltySheet: "closed", loyaltyPhone: "", joiningLoyalty: false, loyaltyMessage: "", loyaltyMembership: null }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setFeedback: (feedback) => set({ feedback }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setMenuSearch: (menuSearch) => set({ menuSearch }),
  setShareMessage: (shareMessage) => set({ shareMessage }),
  setSendingFeedback: (sendingFeedback) => set({ sendingFeedback }),
  setFeedbackMessage: (feedbackMessage) => set({ feedbackMessage }),
  setSelectedMenuItem: (selectedMenuItem) => set({ selectedMenuItem }),
  setLoyaltySheet: (loyaltySheet) => set({ loyaltySheet }),
  setLoyaltyPhone: (loyaltyPhone) => set({ loyaltyPhone }),
  setJoiningLoyalty: (joiningLoyalty) => set({ joiningLoyalty }),
  setLoyaltyMessage: (loyaltyMessage) => set({ loyaltyMessage }),
  setLoyaltyMembership: (loyaltyMembership) => set({ loyaltyMembership }),
}));
type Link = { id: number; link_type: string; label: string; value: string; display_order?: number; is_active?: boolean; legacy?: boolean };
type OrganizationContact = { address: string; phone: string; email: string; website: string; mapUrl: string };
type Feedback = {
  id: number;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
};
type DraftItem = {
  category_id: string;
  name: string;
  description: string;
  price: string;
  original_price: string;
  offer_label: string;
  is_offer: boolean;
  is_today_special: boolean;
  is_available: boolean;
  image: File | null;
};

const itemIsOffer = (item: Item) => Boolean(item.is_offer || item.isOffer);
const itemIsTodaySpecial = (item: Item) => Boolean(item.is_today_special || item.isTodaySpecial);
const itemOfferLabel = (item: Item) => item.offer_label || item.offerLabel || "Offer";
const itemOriginalPrice = (item: Item) => item.original_price || item.originalPrice || "";
const itemHasReducedPrice = (item: Item) => {
  const original = Number(itemOriginalPrice(item));
  const current = Number(item.price);
  return itemIsOffer(item) && Number.isFinite(original) && Number.isFinite(current) && original > current;
};
type LegacyAnalytics = {
  totals: Record<string, number>;
  feedback: { count: number; average: number; ratingBreakdown: Record<string, number> };
  daily: Array<{ date: string; count: number }>;
  socialClicks: Array<{ target: string; count: number }>;
  menuItems: Array<{ target: string; count: number }>;
};
type HospitalityShell = {
  isSuperAdmin: boolean;
  role: string;
  capabilities: string[];
  currentSchool: {
    id: number;
    name: string;
    logo: string;
    organizationType: string;
    themePrimary: string;
  } | null;
  schools: Array<{ id: number; name: string }>;
  user: { displayName: string };
};
type HospitalityAdminSection = "overview" | "profile" | "menu" | "feedback" | "staff" | "loyalty" | "members" | "analytics";

function organizationId() {
  return Number(
    window.location.pathname.match(/organizations\/(\d+)/)?.[1] || 0,
  );
}

function hospitalityAdminSection(): HospitalityAdminSection {
  const section = new URLSearchParams(window.location.search).get("tab");
  return section === "profile" || section === "menu" || section === "feedback" || section === "staff" || section === "loyalty" || section === "members" || section === "analytics"
    ? section
    : "overview";
}

const hospitalitySectionDetails: Record<
  HospitalityAdminSection,
  { title: string; subtitle?: string }
> = {
  overview: { title: "Overview" },
  profile: { title: "Business Profile" },
  menu: { title: "Menu" },
  feedback: { title: "Feedback" },
  staff: { title: "Staff & Cards" },
  loyalty: { title: "Rewards program" },
  members: { title: "Loyalty members" },
  analytics: { title: "Analytics" },
};

function VenueShell({
  shell,
  publicIdentifier,
  section,
  children,
}: {
  shell: HospitalityShell;
  publicIdentifier: string;
  section: HospitalityAdminSection;
  children: ReactNode;
}) {
  const school = shell.currentSchool;
  const details = hospitalitySectionDetails[section];
  const [darkTheme, setDarkTheme] = useState(() => window.localStorage.getItem("tap2connect:hospitality-theme") !== "light");
  const toggleTheme = () => setDarkTheme((current) => {
    const next = !current;
    window.localStorage.setItem("tap2connect:hospitality-theme", next ? "dark" : "light");
    return next;
  });
  return (
    <ManageShell
      brand={school?.name || "Hospitality"}
      logo={school?.logo}
      className={`manage-app--hospitality ${darkTheme ? "manage-app--hospitality-theme-dark" : "manage-app--hospitality-theme-light"}`}
      nav={schoolWorkspaceNav(school?.id, shell.isSuperAdmin, "hospitality", shell.capabilities)}
      title={details.title}
      subtitle={details.subtitle}
      userName={shell.user.displayName}
      userRole=""
      accent="#2563eb"
      showNotifications
      schoolOptions={shell.schools.length > 1 ? shell.schools : undefined}
      selectedSchool={school?.id ?? null}
      workspaceSelectorLabel="Organization workspace"
      onSchoolChange={(schoolId) => {
        window.location.href = `/dashboard/organizations/${schoolId}/hospitality/?tab=overview`;
      }}
      actions={
        <>
          <button type="button" className="manage-icon-button hospitality-theme-toggle" onClick={toggleTheme} aria-label={darkTheme ? "Use light theme" : "Use dark theme"} title={darkTheme ? "Use light theme" : "Use dark theme"}>
            {darkTheme ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            className="manage-button is-primary"
            href={`/venue/${publicIdentifier}/?preview=dashboard`}
            target="_blank"
            rel="noreferrer"
          >
            <Eye size={14} />
            Preview profile
          </a>
        </>
      }
    >
      {children}
    </ManageShell>
  );
}

const emptyItem: DraftItem = {
  category_id: "",
  name: "",
  description: "",
  price: "",
  original_price: "",
  offer_label: "",
  is_offer: false,
  is_today_special: false,
  is_available: true,
  image: null,
};
const analyticsColors = [
  "#0f766e",
  "#2563eb",
  "#e59f18",
  "#db5c5c",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#be185d",
];

export function HospitalityAnalyticsVisuals({ analytics }: { analytics: LegacyAnalytics }) {
  const socialTotal = analytics.socialClicks.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );
  let cursor = 0;
  const socialGradient = analytics.socialClicks.length
    ? `conic-gradient(${analytics.socialClicks
        .map((entry, index) => {
          const start = cursor;
          cursor += socialTotal ? (entry.count / socialTotal) * 100 : 0;
          return `${analyticsColors[index % analyticsColors.length]} ${start}% ${cursor}%`;
        })
        .join(",")})`
    : "#e7eef1";
  const trendMax = Math.max(1, ...analytics.daily.map((entry) => entry.count));
  const points = analytics.daily
    .map(
      (entry, index) =>
        `${analytics.daily.length === 1 ? 50 : (index / (analytics.daily.length - 1)) * 100},${92 - (entry.count / trendMax) * 78}`,
    )
    .join(" ");
  return (
    <section className="hospitality-visual-grid">
      <article className="manage-card hospitality-donut-card">
        <header>
          <h2>Social click share</h2>
          <p>
            Dynamic distribution across every active social and contact channel.
          </p>
        </header>
        <div className="hospitality-donut-layout">
          <div
            className="hospitality-donut"
            style={{ background: socialGradient }}
          >
            <span>
              <strong>{socialTotal}</strong>
              <small>total clicks</small>
            </span>
          </div>
          <div className="hospitality-chart-legend">
            {analytics.socialClicks.length ? (
              analytics.socialClicks.map((entry, index) => (
                <div key={entry.target}>
                  <i
                    style={{
                      background:
                        analyticsColors[index % analyticsColors.length],
                    }}
                  />
                  <span>{entry.target || "Other"}</span>
                  <strong>
                    {socialTotal
                      ? Math.round((entry.count / socialTotal) * 100)
                      : 0}
                    %
                  </strong>
                </div>
              ))
            ) : (
              <p>No social clicks yet.</p>
            )}
          </div>
        </div>
      </article>
      <article className="manage-card hospitality-trend-card">
        <header>
          <h2>Engagement trend</h2>
          <p>All tracked profile actions over the latest active days.</p>
        </header>
        {analytics.daily.length ? (
          <>
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label="Engagement trend line"
            >
              <defs>
                <linearGradient
                  id="hospitalityTrendFill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#0f766e" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,100 ${points} 100,100`}
                fill="url(#hospitalityTrendFill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#0f766e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="hospitality-trend-labels">
              <span>{analytics.daily[0]?.date}</span>
              <strong>
                {analytics.daily.reduce((sum, entry) => sum + entry.count, 0)}{" "}
                actions
              </strong>
              <span>{analytics.daily.at(-1)?.date}</span>
            </div>
          </>
        ) : (
          <div className="hospitality-chart-empty">
            Activity will appear as customers interact with the profile.
          </div>
        )}
      </article>
    </section>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: LegacyAnalytics }) {
  const metrics = [
    ["Profile views", analytics.totals.profile_view],
    ["Menu opens", analytics.totals.menu_open],
    ["Menu item clicks", analytics.totals.menu_item_click],
    ["Rating clicks", analytics.totals.rating_click],
    ["Feedback received", analytics.feedback.count],
    ["Social clicks", analytics.totals.social_click],
  ] as const;
  const largestDaily = Math.max(
    1,
    ...analytics.daily.map((entry) => entry.count),
  );
  return (
    <section className="hospitality-analytics">
      <div className="hospitality-analytics-grid">
        {metrics.map(([label, value]) => (
          <article className="manage-card" key={label}>
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
          </article>
        ))}
      </div>
      <div className="hospitality-analytics-columns">
        <section className="manage-card">
          <header>
            <div>
              <h2>Engagement activity</h2>
              <p>Tracked public-profile actions over the last 14 days.</p>
            </div>
          </header>
          <div className="hospitality-daily-chart">
            {analytics.daily.length ? (
              analytics.daily.map((entry) => (
                <div key={entry.date}>
                  <span>
                    {new Date(`${entry.date}T00:00:00`).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                  <i>
                    <b
                      style={{
                        width: `${(entry.count / largestDaily) * 100}%`,
                      }}
                    />
                  </i>
                  <strong>{entry.count}</strong>
                </div>
              ))
            ) : (
              <p>No tracked activity yet.</p>
            )}
          </div>
        </section>
        <section className="manage-card hospitality-rating-breakdown">
          <header>
            <div>
              <h2>Customer ratings</h2>
              <p>
                {Number(analytics.feedback.average).toFixed(1)} average from{" "}
                {analytics.feedback.count} feedback submissions.
              </p>
            </div>
          </header>
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating}>
              <span>{rating} stars</span>
              <i>
                <b
                  style={{
                    width: `${analytics.feedback.count ? ((analytics.feedback.ratingBreakdown[String(rating)] || 0) / analytics.feedback.count) * 100 : 0}%`,
                  }}
                />
              </i>
              <strong>
                {analytics.feedback.ratingBreakdown[String(rating)] || 0}
              </strong>
            </div>
          ))}
        </section>
      </div>
      <div className="hospitality-analytics-columns">
        <section className="manage-card">
          <header>
            <div>
              <h2>Social media clicks</h2>
              <p>Every public social and contact link.</p>
            </div>
          </header>
          <div className="hospitality-ranking">
            {analytics.socialClicks.length ? (
              analytics.socialClicks.map((entry) => (
                <div key={entry.target}>
                  <span>{entry.target || "Other"}</span>
                  <strong>{entry.count}</strong>
                </div>
              ))
            ) : (
              <p>No social clicks yet.</p>
            )}
          </div>
        </section>
        <section className="manage-card">
          <header>
            <div>
              <h2>Most clicked menu items</h2>
              <p>Items customers showed interest in.</p>
            </div>
          </header>
          <div className="hospitality-ranking">
            {analytics.menuItems.length ? (
              analytics.menuItems.map((entry) => (
                <div key={entry.target}>
                  <span>{entry.target || "Menu item"}</span>
                  <strong>{entry.count}</strong>
                </div>
              ))
            ) : (
              <p>No menu-item clicks yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

type MenuRow = Item & { categoryName: string };

function menuPrice(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `NPR ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : value;
}

export function HospitalityMenuManager({
  venue,
  item,
  setItem,
  categoryName,
  setCategoryName,
  onAddCategory,
  onAddItem,
  onToggleAvailability,
}: {
  venue: Venue;
  item: DraftItem;
  setItem: (item: DraftItem) => void;
  categoryName: string;
  setCategoryName: (name: string) => void;
  onAddCategory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAddItem: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onToggleAvailability: (item: Item) => Promise<void>;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "special" | "offers"
  >("all");
  const [availability, setAvailability] = useState("all");
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [offerSettingsOpen, setOfferSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const rows: MenuRow[] = venue.categories.flatMap((category) =>
    (category.items || []).map((entry) => ({
      ...entry,
      categoryName: category.name,
    })),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = rows.filter((entry) => {
    if (
      selectedCategory !== "all" &&
      String(entry.category_id) !== selectedCategory
    )
      return false;
    if (selectedFilter === "special" && !entry.is_today_special) return false;
    if (selectedFilter === "offers" && !entry.is_offer) return false;
    if (availability === "available" && entry.is_available === false)
      return false;
    if (availability === "unavailable" && entry.is_available !== false)
      return false;
    return (
      !normalizedQuery ||
      entry.name.toLowerCase().includes(normalizedQuery) ||
      entry.categoryName.toLowerCase().includes(normalizedQuery)
    );
  });
  const specialCount = rows.filter((entry) => entry.is_today_special).length;
  const offerCount = rows.filter((entry) => entry.is_offer).length;
  const selectedCategoryName =
    venue.categories.find(
      (category) => String(category.id) === selectedCategory,
    )?.name || "All items";

  function openItemDrawer() {
    const preferredCategory =
      selectedCategory !== "all"
        ? selectedCategory
        : String(venue.categories[0]?.id || "");
    setItem({ ...emptyItem, category_id: preferredCategory });
    setOfferSettingsOpen(false);
    setDrawerOpen(true);
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("action") !== "add-item") return;
    setItem({ ...emptyItem, category_id: String(venue.categories[0]?.id || "") });
    setDrawerOpen(true);
    window.history.replaceState({}, "", `${window.location.pathname}?tab=menu`);
  }, [venue.categories, setItem]);

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    setSaving(true);
    const saved = await onAddItem(event);
    setSaving(false);
    if (saved) setDrawerOpen(false);
  }

  return (
    <div
      className={`hospitality-menu-manager${drawerOpen ? " is-drawer-open" : ""}`}
    >
      <aside className="hospitality-menu-rail">
        <div className="hospitality-menu-rail-heading">
          <h2>Categories</h2>
          <span>{rows.length} items</span>
        </div>
        <button
          type="button"
          className={selectedCategory === "all" ? "is-active" : ""}
          onClick={() => {
            setSelectedCategory("all");
            setSelectedFilter("all");
          }}
        >
          <strong>All items</strong>
          <span>{rows.length}</span>
        </button>
        {venue.categories.map((category) => (
          <button
            type="button"
            className={
              selectedCategory === String(category.id) ? "is-active" : ""
            }
            key={category.id}
            onClick={() => {
              setSelectedCategory(String(category.id));
              setSelectedFilter("all");
            }}
          >
            <strong>{category.name}</strong>
            <span>{category.items?.length || 0}</span>
          </button>
        ))}
        {categoryFormOpen ? (
          <form
            className="hospitality-category-create"
            onSubmit={async (event) => {
              await onAddCategory(event);
              setCategoryFormOpen(false);
            }}
          >
            <TextInput
              autoFocus
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Category name"
              required
            />
            <div>
              <button
                type="button"
                className="manage-button"
                onClick={() => setCategoryFormOpen(false)}
              >
                Cancel
              </button>
              <button className="manage-button is-primary">Add</button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="hospitality-add-category"
            onClick={() => setCategoryFormOpen(true)}
          >
            <Plus size={15} /> Add category
          </button>
        )}
        <div className="hospitality-menu-filters">
          <h3>Filters</h3>
          <button
            type="button"
            className={selectedFilter === "special" ? "is-active" : ""}
            onClick={() => {
              setSelectedCategory("all");
              setSelectedFilter(
                selectedFilter === "special" ? "all" : "special",
              );
            }}
          >
            <Star size={15} />
            <strong>Today&apos;s special</strong>
            <span>{specialCount}</span>
          </button>
          <button
            type="button"
            className={selectedFilter === "offers" ? "is-active" : ""}
            onClick={() => {
              setSelectedCategory("all");
              setSelectedFilter(
                selectedFilter === "offers" ? "all" : "offers",
              );
            }}
          >
            <Tag size={15} />
            <strong>Offers</strong>
            <span>{offerCount}</span>
          </button>
        </div>
      </aside>

      <section className="hospitality-menu-table-panel">
        <header>
          <div>
            <h2>{selectedCategoryName}</h2>
            <p>{visibleRows.length} menu items</p>
          </div>
          <button
            type="button"
            className="manage-button is-primary"
            onClick={openItemDrawer}
            disabled={!venue.categories.length}
          >
            <Plus size={15} /> Add item
          </button>
        </header>
        <div className="hospitality-menu-toolbar">
          <label>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search menu items…"
            />
          </label>
          <SelectInput
            aria-label="Filter by availability"
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option value="all">Availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </SelectInput>
        </div>
        <div className="hospitality-menu-table">
          <div className="hospitality-menu-table-head">
            <span>Item</span>
            <span>Price</span>
            <span>Status</span>
            <span />
          </div>
          {visibleRows.map((entry) => (
            <article className="hospitality-menu-row" key={entry.id}>
              <div className="hospitality-menu-item-main">
                {entry.image ? (
                  <img src={entry.image} alt="" />
                ) : (
                  <span className="hospitality-menu-row-placeholder">
                    <Utensils size={18} />
                  </span>
                )}
                <div>
                  <strong>
                    {entry.name}
                    {entry.is_today_special ? (
                      <small>Today&apos;s special</small>
                    ) : null}
                    {entry.is_offer ? (
                      <small>{entry.offer_label || "Offer"}</small>
                    ) : null}
                  </strong>
                  <span>{entry.categoryName}</span>
                </div>
              </div>
              <b>{menuPrice(entry.price)}</b>
              <button
                type="button"
                className={`hospitality-availability ${entry.is_available === false ? "is-unavailable" : ""}`}
                onClick={() => void onToggleAvailability(entry)}
              >
                <i />
                {entry.is_available === false ? "Unavailable" : "Available"}
              </button>
              <button
                type="button"
                className="hospitality-row-menu"
                title="Toggle availability"
                aria-label={`Toggle availability for ${entry.name}`}
                onClick={() => void onToggleAvailability(entry)}
              >
                <MoreHorizontal size={17} />
              </button>
            </article>
          ))}
          {!visibleRows.length ? (
            <div className="hospitality-menu-empty">
              <Utensils size={22} />
              <strong>No menu items found</strong>
              <p>Change the filters or add a new item to this menu.</p>
            </div>
          ) : null}
        </div>
      </section>

      {drawerOpen ? (
        <>
          <button
            type="button"
            className="hospitality-drawer-backdrop"
            aria-label="Close add item panel"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="hospitality-item-drawer" aria-label="Add menu item">
            <header>
              <div>
                <h2>Add item</h2>
                <p>Create a new menu item.</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close add item panel"
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={(event) => void submitItem(event)}>
              <div className="hospitality-drawer-fields">
                <Field label="Item name">
                  <TextInput
                    required
                    value={item.name}
                    onChange={(event) =>
                      setItem({ ...item, name: event.target.value })
                    }
                    placeholder="e.g. Chicken Momo"
                  />
                </Field>
                <Field label="Category">
                  <SelectInput
                    required
                    value={item.category_id}
                    onChange={(event) =>
                      setItem({ ...item, category_id: event.target.value })
                    }
                  >
                    <option value="">Select a category</option>
                    {venue.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Price (NPR)">
                  <TextInput
                    required
                    inputMode="decimal"
                    value={item.price}
                    onChange={(event) =>
                      setItem({ ...item, price: event.target.value })
                    }
                    placeholder="e.g. 220"
                  />
                </Field>
                <Field label="Description (optional)">
                  <TextArea
                    value={item.description}
                    onChange={(event) =>
                      setItem({ ...item, description: event.target.value })
                    }
                    placeholder="Ingredients, preparation method, or what customers should know"
                  />
                </Field>
                <Field label="Photo (optional)">
                  <label className="hospitality-photo-upload">
                    <ImageIcon size={21} />
                    <strong>{item.image?.name || "+ Upload photo"}</strong>
                    <small>JPG or PNG</small>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setItem({
                          ...item,
                          image: event.target.files?.[0] || null,
                        })
                      }
                    />
                  </label>
                </Field>
                <label className="hospitality-drawer-toggle">
                  <span>
                    <strong>Available</strong>
                    <small>Item will be visible on the menu</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={item.is_available}
                    onChange={(event) =>
                      setItem({ ...item, is_available: event.target.checked })
                    }
                  />
                  <i />
                </label>
                <label className="hospitality-drawer-check">
                  <input
                    type="checkbox"
                    checked={item.is_today_special}
                    onChange={(event) =>
                      setItem({
                        ...item,
                        is_today_special: event.target.checked,
                      })
                    }
                  />
                  <span>
                    <strong>Today&apos;s special</strong>
                    <small>Highlight this item as today&apos;s special</small>
                  </span>
                </label>
                <div className="hospitality-offer-settings">
                  <button
                    type="button"
                    onClick={() => setOfferSettingsOpen((current) => !current)}
                  >
                    <Tag size={17} />
                    <span>
                      <strong>Offer settings</strong>
                      <small>Add discount or special offer for this item</small>
                    </span>
                    <b>{offerSettingsOpen ? "−" : "+"}</b>
                  </button>
                  {offerSettingsOpen ? (
                    <div>
                      <label className="hospitality-drawer-check">
                        <input
                          type="checkbox"
                          checked={item.is_offer}
                          onChange={(event) =>
                            setItem({ ...item, is_offer: event.target.checked })
                          }
                        />
                        <span><strong>Show as offer</strong></span>
                      </label>
                      <Field label="Original price">
                        <TextInput
                          inputMode="decimal"
                          value={item.original_price}
                          onChange={(event) =>
                            setItem({
                              ...item,
                              original_price: event.target.value,
                            })
                          }
                          placeholder="Optional"
                        />
                      </Field>
                      <Field label="Offer label">
                        <TextInput
                          value={item.offer_label}
                          onChange={(event) =>
                            setItem({ ...item, offer_label: event.target.value })
                          }
                          placeholder="e.g. 10% off"
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </div>
              <footer>
                <button
                  type="button"
                  className="manage-button"
                  onClick={() => setDrawerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="manage-button is-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save item"}
                </button>
              </footer>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function HospitalityAdminPanel() {
  const id = organizationId();
  const [shell, setShell] = useState<HospitalityShell | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [overviewData, setOverviewData] = useState<HospitalityOverviewData | null>(null);
  const [organizationOptions, setOrganizationOptions] = useState<Array<{ id: number; name: string }> | null>(null);
  const [overviewDays, setOverviewDays] = useState(7);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [organizationContact, setOrganizationContact] = useState<OrganizationContact>({ address: "", phone: "", email: "", website: "", mapUrl: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const activeTab = hospitalityAdminSection();
  const legacyProfileEnabled = false;
  const [categoryName, setCategoryName] = useState("");
  const [item, setItem] = useState<DraftItem>(emptyItem);
  const [link, setLink] = useState<{ id?: number; link_type: string; label: string; value: string }>({
    link_type: "instagram",
    label: "Instagram",
    value: "",
  });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const settingsPayload = await apiFetch<{ shell: HospitalityShell }>(
        `/api/organizations/${id}/venue/settings/`,
      );
      const canReadFeedback = settingsPayload.shell.capabilities.includes("feedback");
      const [payload, categories, items, feedbackPayload] = await Promise.all([
        apiFetch<Venue>(`/api/organizations/${id}/venue/`),
        apiFetch<{ categories: Category[] }>(
          `/api/organizations/${id}/venue/menu/categories/`,
        ),
        apiFetch<{ items: Item[] }>(
          `/api/organizations/${id}/venue/menu/items/`,
        ),
        canReadFeedback
          ? apiFetch<{ feedback: Feedback[] }>(`/api/organizations/${id}/venue/feedback/`)
          : Promise.resolve({ feedback: [] }),
      ]);
      const byCategory = new Map<number, Item[]>();
      items.items.forEach((entry) => {
        if (entry.category_id)
          byCategory.set(entry.category_id, [
            ...(byCategory.get(entry.category_id) || []),
            entry,
          ]);
      });
      setVenue({
        ...payload,
        categories: categories.categories.map((entry) => ({
          ...entry,
          items: byCategory.get(entry.id || 0) || [],
        })),
      });
      setItem((current) =>
        current.category_id || !categories.categories[0]?.id
          ? current
          : { ...current, category_id: String(categories.categories[0].id) },
      );
      setFeedback(feedbackPayload.feedback);
      setOrganizationContact({ address: "", phone: "", email: "", website: "", mapUrl: "" });
      setShell(settingsPayload.shell);
    } catch (reason) {
      setError(displayError(reason));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!shell) return;
    const capabilityFor: Record<HospitalityAdminSection, string> = {
      overview: "overview", profile: "profile", menu: "menu", feedback: "feedback", staff: "staff", loyalty: "settings", members: "staff", analytics: "analytics",
    };
    if (!shell.capabilities.includes(capabilityFor[activeTab])) {
      window.location.replace(`/dashboard/organizations/${id}/hospitality/?tab=menu`);
    }
  }, [activeTab, id, shell]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const response = await apiFetch<HospitalityOverviewData>(
        `/api/organizations/${id}/venue/overview/${queryString({ days: overviewDays })}`,
      );
      setOverviewData(response);
      setOrganizationOptions(response.organizations);
    } catch (reason) {
      setOverviewError(displayError(reason));
    } finally {
      setOverviewLoading(false);
    }
  }, [id, overviewDays]);

  const canLoadOverview = shell?.capabilities.includes("overview") ?? false;

  useEffect(() => {
    if (!canLoadOverview) return;
    void loadOverview();
  }, [canLoadOverview, loadOverview]);

  useEffect(() => {
    if (!organizationOptions) return;
    setShell((current) => {
      if (!current) return current;
      const unchanged = current.schools.length === organizationOptions.length
        && current.schools.every((school, index) => school.id === organizationOptions[index]?.id && school.name === organizationOptions[index]?.name);
      return unchanged ? current : { ...current, schools: organizationOptions };
    });
  }, [organizationOptions]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venue) return;
    setProfileSaving(true);
    setProfileSaved(false);
    setError("");
    try {
      const body = new FormData();
      const { phone: _phone, email: _email, website: _website, address: _address, mapUrl: _mapUrl, ...venueFields } = venue.venue;
      const apiFields: Record<string, unknown> = {
        venue_type: venueFields.type,
        description: venueFields.description,
        primary_color: venueFields.primaryColor,
        secondary_color: venueFields.secondaryColor,
        whatsapp: venueFields.whatsapp,
        google_review_url: venueFields.googleReviewUrl,
        reservation_url: venueFields.reservationUrl,
        opening_hours: venueFields.openingHours,
        feedback_enabled: venue.feedbackEnabled,
      };
      Object.entries(apiFields).forEach(([key, value]) => body.append(key, String(value ?? "")));
      if (logoFile) body.append("logo", logoFile);
      if (coverFile) body.append("cover_image", coverFile);
      await apiFetch(
        `/api/organizations/${id}/venue/`,
        {
          method: "POST",
          body,
        },
      );
      setLogoFile(null);
      setCoverFile(null);
      await load();
      setProfileSaved(true);
    } catch (reason) {
      setError(displayError(reason));
    } finally {
      setProfileSaving(false);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await apiFetch(`/api/organizations/${id}/venue/menu/categories/`, {
        method: "POST",
        body: jsonBody({
          name: categoryName,
          slug: categoryName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        }),
      });
      setCategoryName("");
      await load();
    } catch (reason) {
      setError(displayError(reason));
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item.category_id || !item.name.trim() || !item.price.trim())
      return false;
    try {
      const body = new FormData();
      Object.entries({
        ...item,
        category_id: Number(item.category_id),
        image: undefined,
      }).forEach(([key, value]) => {
        if (value !== undefined && value !== null)
          body.append(key, String(value));
      });
      if (item.image) body.append("image", item.image);
      await apiFetch(`/api/organizations/${id}/venue/menu/items/`, {
        method: "POST",
        body,
      });
      setItem({ ...emptyItem, category_id: item.category_id });
      await load();
      return true;
    } catch (reason) {
      setError(displayError(reason));
      return false;
    }
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!link.value.trim()) return;
    try {
      await apiFetch(`/api/organizations/${id}/venue/links/`, {
        method: link.id ? "PATCH" : "POST",
        body: jsonBody(link),
      });
      setLink({ link_type: "instagram", label: "Instagram", value: "" });
      await load();
    } catch (reason) {
      setError(displayError(reason));
    }
  }

  async function deleteLink(linkId: number) {
    try {
      await apiFetch(`/api/organizations/${id}/venue/links/`, {
        method: "DELETE",
        body: jsonBody({ id: linkId }),
      });
      await load();
    } catch (reason) {
      setError(displayError(reason));
    }
  }

  async function updateFeedbackStatus(feedbackId: number, status: string) {
    try {
      await apiFetch(`/api/organizations/${id}/venue/feedback/`, {
        method: "PATCH",
        body: jsonBody({ id: feedbackId, status }),
      });
      setFeedback((rows) =>
        rows.map((row) => (row.id === feedbackId ? { ...row, status } : row)),
      );
    } catch (reason) {
      setError(displayError(reason));
    }
  }

  if (!venue || !shell)
    return (
      <div className="manage-state">
        {error || "Loading hospitality profile…"}
      </div>
    );
  const updateVenue = (field: keyof Venue["venue"], value: string) =>
    setVenue({ ...venue, venue: { ...venue.venue, [field]: value } });
  return (
    <VenueShell
      shell={shell}
      publicIdentifier={venue.venue.publicIdentifier}
      section={activeTab}
    >
      {error ? <div className="manage-alert">{error}</div> : null}
      {activeTab === "analytics" ? (
        <HospitalityAnalytics organizationId={id} />
      ) : null}
      {activeTab === "overview" ? (
        <HospitalityOverview
          organizationId={id}
          publicIdentifier={venue.venue.publicIdentifier}
          organizationName={venue.organization.name}
          days={overviewDays}
          onDaysChange={setOverviewDays}
          data={overviewData}
          loading={overviewLoading}
          error={overviewError}
          onRetry={() => void loadOverview()}
        />
      ) : null}
      {activeTab === "menu" ? (
        <HospitalityMenuManagement
          organizationId={id}
          publicIdentifier={venue.venue.publicIdentifier}
        />
      ) : null}
      {activeTab === "profile" ? (
        <HospitalityBusinessProfile
          organizationId={id}
          initial={venue}
          onSaved={setVenue}
        />
      ) : null}
      {activeTab === "feedback" ? <HospitalityFeedback organizationId={id} googleReviewUrl={venue.venue.googleReviewUrl} /> : null}
      {activeTab === "staff" ? <HospitalityStaffCards organizationId={id} organizationName={venue.organization.name} logo={venue.venue.logo} /> : null}
      {activeTab === "loyalty" ? <HospitalityRewardsProgram organizationId={id} /> : null}
      {activeTab === "members" ? <HospitalityRewardsMembers organizationId={id} /> : null}
      <div hidden>
        {venue && legacyProfileEnabled ? (
          <div className="hospitality-profile-grid">
            <form onSubmit={saveProfile}>
              <FormSection
                title="Home profile"
                description="This information appears on the public Home tab."
              >
                <div className="form-grid">
                  <Field label="Venue type">
                    <SelectInput
                      value={venue!.venue.type}
                      onChange={(e) => updateVenue("type", e.target.value)}
                    >
                      <option value="hotel">Hotel</option>
                      <option value="cafe">Café</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="bar">Bar</option>
                      <option value="other">Other</option>
                    </SelectInput>
                  </Field>
                  <Field label="Description" wide>
                    <TextArea
                      value={venue!.venue.description}
                      onChange={(e) => updateVenue("description", e.target.value)}
                      placeholder="Tell visitors what makes this place special"
                    />
                  </Field>
                  <Field label="WhatsApp">
                    <TextInput value={venue!.venue.whatsapp} onChange={(e) => updateVenue("whatsapp", e.target.value)} placeholder="+977 98XXXXXXXX" />
                  </Field>
                  <Field label="Google review link">
                    <TextInput type="url" value={venue!.venue.googleReviewUrl} onChange={(e) => updateVenue("googleReviewUrl", e.target.value)} placeholder="https://..." />
                  </Field>
                  <Field label="Reservation link">
                    <TextInput type="url" value={venue!.venue.reservationUrl} onChange={(e) => updateVenue("reservationUrl", e.target.value)} placeholder="Booking or reservation page" />
                  </Field>
                  <Field label="Opening hours" wide hint="For example: Sun–Fri, 8:00 AM–8:00 PM · Saturday, 10:00 AM–6:00 PM">
                    <TextArea value={venue!.venue.openingHours} onChange={(e) => updateVenue("openingHours", e.target.value)} placeholder="Add opening hours customers can see" />
                  </Field>
                  <Field label="About photo / logo">
                    <FileInput label="Upload profile logo" currentUrl={venue!.venue.logo || undefined} accept="image/*" onChange={setLogoFile} />
                  </Field>
                  <Field label="Cover photo">
                    <FileInput label="Upload cover photo" currentUrl={venue!.venue.coverImage || undefined} accept="image/*" onChange={setCoverFile} />
                  </Field>
                  <Field label="Profile color">
                    <TextInput type="color" value={venue!.venue.primaryColor} onChange={(e) => updateVenue("primaryColor", e.target.value)} />
                  </Field>
                  <Field label="Accent color">
                    <TextInput type="color" value={venue!.venue.secondaryColor} onChange={(e) => updateVenue("secondaryColor", e.target.value)} />
                  </Field>
                </div>
                <div className="hospitality-contact-source">
                  <div><strong>Organization contact details</strong><span>These are shared with the organization and used on the public profile.</span></div>
                  <dl>
                    <div><dt>Phone</dt><dd>{organizationContact.phone || "Not added"}</dd></div>
                    <div><dt>Email</dt><dd>{organizationContact.email || "Not added"}</dd></div>
                    <div><dt>Website</dt><dd>{organizationContact.website || "Not added"}</dd></div>
                    <div><dt>Address</dt><dd>{organizationContact.address || "Not added"}</dd></div>
                    <div><dt>Directions</dt><dd>{organizationContact.mapUrl ? <a href={organizationContact.mapUrl} target="_blank" rel="noreferrer">Open map <ExternalLink size={12} /></a> : "Add a map link in Settings"}</dd></div>
                  </dl>
                  <a href={`/dashboard/organizations/${id}/settings/`}>Edit shared details in Settings</a>
                </div>
                <label className="hospitality-check-row">
                  <input
                    type="checkbox"
                    checked={venue!.feedbackEnabled}
                    onChange={(e) =>
                      setVenue({ ...venue!, feedbackEnabled: e.target.checked })
                    }
                  />
                  Allow anonymous customer feedback
                </label>
                <button className="manage-button is-primary" disabled={profileSaving}>
                  <Save size={14} />
                  {profileSaving ? "Saving…" : "Save profile"}
                </button>
                {profileSaved ? <small className="hospitality-profile-saved" role="status">Profile saved successfully.</small> : null}
              </FormSection>
            </form>
            <FormSection
              title="Social links"
              description="Add the channels customers use to find you."
            >
              <form onSubmit={addLink} className="hospitality-link-form">
                <SelectInput
                  value={link.link_type}
                  onChange={(e) =>
                    setLink({
                      ...link,
                      link_type: e.target.value,
                      label: e.target.options[e.target.selectedIndex].text,
                    })
                  }
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="tripadvisor">Tripadvisor</option>
                  <option value="x">X</option>
                </SelectInput>
                <TextInput
                  value={link.value}
                  onChange={(e) => setLink({ ...link, value: e.target.value })}
                  placeholder="Paste the full profile URL"
                />
                <button className="manage-button">
                  <Plus size={14} />
                  {link.id ? "Save link" : "Add link"}
                </button>
                {link.id ? <button type="button" className="manage-button" onClick={() => setLink({ link_type: "instagram", label: "Instagram", value: "" })}>Cancel</button> : null}
              </form>
              <div className="hospitality-links-admin">
                {venue!.links.map((entry) => (
                  <div key={entry.id}>
                    <strong>{entry.label || entry.link_type}</strong>
                    <span>{entry.value}</span>
                    <span className="hospitality-link-actions">
                      <button type="button" aria-label={`Edit ${entry.label}`} onClick={() => setLink(entry)}><Pencil size={14} /> Edit</button>
                      <button type="button" aria-label={`Remove ${entry.label}`} onClick={() => void deleteLink(entry.id)}><Trash2 size={14} /> Remove</button>
                    </span>
                  </div>
                ))}
              </div>
            </FormSection>
          </div>
        ) : activeTab === "menu" ? (
          <div className="hospitality-menu-admin">
            <section className="manage-card">
              <FormSection
                title="Menu categories"
                description="Create categories first, then choose one when adding an item."
              >
                <form
                  onSubmit={addCategory}
                  className="hospitality-inline-form"
                >
                  <TextInput
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Breakfast, Rooms, Drinks…"
                  />
                  <button className="manage-button">
                    <Plus size={14} />
                    Add category
                  </button>
                </form>
                <div className="hospitality-category-list">
                  {venue!.categories.map((category) => (
                    <div key={category.id} className="hospitality-category">
                      <strong>{category.name}</strong>
                      <small>{category.items?.length || 0} items</small>
                    </div>
                  ))}
                </div>
              </FormSection>
            </section>
            <FormSection
              title="Add a menu item"
              description="Add a picture, description, price, offer, or today’s special label."
            >
              <form onSubmit={addItem} className="form-grid">
                <Field label="Choose category" wide>
                  <div className="hospitality-category-picker">
                    {venue!.categories.map((category) => (
                      <button
                        type="button"
                        key={category.id}
                        className={
                          item.category_id === String(category.id)
                            ? "is-selected"
                            : ""
                        }
                        onClick={() =>
                          setItem({ ...item, category_id: String(category.id) })
                        }
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                  <SelectInput
                    required
                    value={item.category_id}
                    onChange={(e) =>
                      setItem({ ...item, category_id: e.target.value })
                    }
                  >
                    <option value="">Select a category</option>
                    {venue!.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Item name">
                  <TextInput
                    required
                    value={item.name}
                    onChange={(e) => setItem({ ...item, name: e.target.value })}
                    placeholder="e.g. Newari Khaja Set"
                  />
                </Field>
                <Field label="Price">
                  <TextInput
                    required
                    value={item.price}
                    onChange={(e) =>
                      setItem({ ...item, price: e.target.value })
                    }
                    placeholder="e.g. NPR 450"
                  />
                </Field>
                <Field label="Picture">
                  <FileInput
                    label={item.image?.name || "Choose item picture"}
                    accept="image/*"
                    onChange={(file) => setItem({ ...item, image: file })}
                  />
                </Field>
                <Field label="Original price">
                  <TextInput
                    value={item.original_price}
                    onChange={(e) =>
                      setItem({ ...item, original_price: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Offer label">
                  <TextInput
                    value={item.offer_label}
                    onChange={(e) =>
                      setItem({ ...item, offer_label: e.target.value })
                    }
                    placeholder="10% off"
                  />
                </Field>
                <Field label="Description" wide>
                  <TextArea
                    value={item.description}
                    onChange={(e) =>
                      setItem({ ...item, description: e.target.value })
                    }
                    placeholder="Ingredients, room details, or what customers should know"
                  />
                </Field>
                <div className="hospitality-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={item.is_offer}
                      onChange={(e) =>
                        setItem({ ...item, is_offer: e.target.checked })
                      }
                    />
                    Show as offer
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.is_today_special}
                      onChange={(e) =>
                        setItem({ ...item, is_today_special: e.target.checked })
                      }
                    />
                    Today’s special
                  </label>
                </div>
                <button className="manage-button is-primary">
                  <Plus size={14} />
                  Add menu item
                </button>
              </form>
            </FormSection>
            <div className="hospitality-item-grid">
              {venue!.categories.flatMap((category) =>
                (category.items || []).map((entry) => (
                  <article className="hospitality-item-card" key={entry.id}>
                    <div>
                      {entry.image ? (
                        <img src={entry.image} alt="" />
                      ) : (
                        <div className="hospitality-item-placeholder">
                          <Utensils size={20} />
                        </div>
                      )}
                      <span>{category.name}</span>
                    </div>
                    <section>
                      <strong>{entry.name}</strong>
                      <b>{entry.price}</b>
                      <p>{entry.description || "No description added yet."}</p>
                      {entry.is_offer || entry.is_today_special ? (
                        <small>
                          {entry.is_offer
                            ? entry.offer_label || "Offer"
                            : "Today’s special"}
                        </small>
                      ) : null}
                    </section>
                  </article>
                )),
              )}
            </div>
          </div>
        ) : (
          <section className="hospitality-feedback-admin">
            <div className="hospitality-feedback-summary">
              <strong>{venue.rating.average.toFixed(1)}</strong>
              <span>out of 5 · {venue.rating.count} public ratings</span>
            </div>
            {feedback.length ? (
              feedback.map((entry) => (
                <article className="hospitality-feedback-card" key={entry.id}>
                  <div>
                    <strong>
                      {"★".repeat(entry.rating)}
                      <span className="muted-stars">
                        {"★".repeat(5 - entry.rating)}
                      </span>
                    </strong>
                    <small>{new Date(entry.created_at).toLocaleString()}</small>
                  </div>
                  <p>{entry.comment || "No written comment."}</p>
                  <SelectInput
                    value={entry.status}
                    onChange={(e) =>
                      void updateFeedbackStatus(entry.id, e.target.value)
                    }
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="archived">Archived</option>
                  </SelectInput>
                </article>
              ))
            ) : (
              <div className="manage-card hospitality-empty">
                <MessageSquare size={24} />
                <h3>No feedback yet</h3>
                <p>
                  Customer submissions will appear here when they use the
                  feedback form on your public profile.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </VenueShell>
  );
}

export function HospitalityWorkspace() {
  return <HospitalityAdminPanel />;
}

function openingScheduleRows(schedule: Venue["venue"]["openingSchedule"]) {
  const labels: Record<string, string> = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
  return Object.entries(labels).map(([key, label]) => {
    const day = schedule?.[key];
    const value = !day || day.closed || !day.intervals.length
      ? "Closed"
      : day.intervals.map((interval) => `${interval.start}–${interval.end}`).join(", ");
    return { label, value };
  });
}

function CafeSocialIcon({ type }: { type: string }) {
  if (type === "instagram") return <FaInstagram aria-hidden="true" />;
  if (type === "facebook") return <FaFacebookF aria-hidden="true" />;
  if (type === "tiktok") return <FaTiktok aria-hidden="true" />;
  if (type === "whatsapp") return <FaWhatsapp aria-hidden="true" />;
  if (type === "website") return <FaGlobe aria-hidden="true" />;
  if (type === "email") return <HiOutlineEnvelope aria-hidden="true" />;
  return <ExternalLink aria-hidden="true" />;
}

function CafeLoyaltyPanel({ programName, stampGoal, onJoin }: { programName: string; stampGoal: number; onJoin: () => void }) {
  return <section className="cafe-loyalty" aria-labelledby="cafe-loyalty-title">
    <span className="cafe-loyalty-mark" aria-hidden="true"><Gift size={20} /></span>
    <div>
      <strong id="cafe-loyalty-title">{programName}</strong>
      <p>Collect {stampGoal} stamps. Your {stampGoal + 1}th coffee is on us.</p>
    </div>
    <button type="button" onClick={onJoin}>Join rewards</button>
  </section>;
}

const loyaltyPhoneCountries = [
  { id: "NP", flag: "🇳🇵", label: "Nepal", prefix: "+977", placeholder: "9812345678" },
  { id: "IN", flag: "🇮🇳", label: "India", prefix: "+91", placeholder: "9876543210" },
  { id: "BD", flag: "🇧🇩", label: "Bangladesh", prefix: "+880", placeholder: "1712345678" },
  { id: "BT", flag: "🇧🇹", label: "Bhutan", prefix: "+975", placeholder: "17123456" },
  { id: "AE", flag: "🇦🇪", label: "United Arab Emirates", prefix: "+971", placeholder: "501234567" },
  { id: "QA", flag: "🇶🇦", label: "Qatar", prefix: "+974", placeholder: "33123456" },
  { id: "SA", flag: "🇸🇦", label: "Saudi Arabia", prefix: "+966", placeholder: "501234567" },
  { id: "GB", flag: "🇬🇧", label: "United Kingdom", prefix: "+44", placeholder: "7700900123" },
  { id: "US", flag: "🇺🇸", label: "United States / Canada", prefix: "+1", placeholder: "4155550123" },
  { id: "AU", flag: "🇦🇺", label: "Australia", prefix: "+61", placeholder: "412345678" },
  { id: "SG", flag: "🇸🇬", label: "Singapore", prefix: "+65", placeholder: "81234567" },
  { id: "MY", flag: "🇲🇾", label: "Malaysia", prefix: "+60", placeholder: "123456789" },
  { id: "OTHER", flag: "🌐", label: "Other country", prefix: "", placeholder: "+14155550123" },
] as const;

function CafeLoyaltySheet({
  cafeName, programName, stampGoal, phone, message, membership, joining, stage, onClose, onPhoneChange, onSubmit,
}: {
  cafeName: string;
  programName: string;
  stampGoal: number;
  phone: string;
  message: string;
  membership: LoyaltyMembership | null;
  joining: boolean;
  stage: "join" | "card";
  onClose: () => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, formattedPhone: string) => void;
}) {
  const activeMembership = membership ?? { memberId: '', stampCount: 0, stampGoal, rewardsRedeemed: 0, isActive: true };
  const [countryId, setCountryId] = useState<(typeof loyaltyPhoneCountries)[number]["id"]>("NP");
  const country = loyaltyPhoneCountries.find((item) => item.id === countryId) ?? loyaltyPhoneCountries[0];
  const [qrImage, setQrImage] = useState("");
  useEffect(() => {
    if (stage !== "card" || !activeMembership.memberId) {
      setQrImage("");
      return;
    }
    let active = true;
    void QRCode.toDataURL(`T2C-LOYALTY:${activeMembership.memberId}`, {
      width: 260,
      margin: 1,
      color: { dark: "#102644", light: "#ffffff" },
    }).then((image) => { if (active) setQrImage(image); });
    return () => { active = false; };
  }, [activeMembership.memberId, stage]);
  return <div className="cafe-loyalty-sheet-wrap" role="presentation">
    <button className="cafe-loyalty-backdrop" type="button" aria-label="Close rewards" onClick={onClose} />
    <section className="cafe-loyalty-sheet" role="dialog" aria-modal="true" aria-labelledby="cafe-loyalty-sheet-title">
      <span className="cafe-loyalty-sheet-handle" aria-hidden="true" />
      <button className="cafe-loyalty-close" type="button" onClick={onClose} aria-label="Close rewards" autoFocus={stage === "card"}><X size={20} /></button>
      {stage === "join" ? <form onSubmit={(event) => onSubmit(event, country.prefix ? `${country.prefix}${phone.replace(/\D/g, "")}` : phone)}>
        <span className="cafe-loyalty-sheet-icon" aria-hidden="true"><Coffee size={24} /></span>
        <h2 id="cafe-loyalty-sheet-title">Join {programName}</h2>
        <p>Enter your phone number to collect stamps and keep one card with {cafeName}.</p>
        <label>Mobile number
          <span className="cafe-loyalty-phone-field">
            <select className="cafe-loyalty-country" aria-label="Country code" value={countryId} onChange={(event) => setCountryId(event.target.value as typeof countryId)}>
              {loyaltyPhoneCountries.map((item) => <option key={item.id} value={item.id}>{item.flag} {item.label} ({item.prefix || "E.164"})</option>)}
            </select>
            <input autoFocus value={phone} onChange={(event) => onPhoneChange(event.target.value)} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country.placeholder} required />
          </span>
        </label>
        <button className="cafe-primary" type="submit" disabled={joining}>{joining ? "Opening your card…" : "Continue"}</button>
        <small>Already a member? Enter the same number to open your card.</small>
        {message ? <p className="cafe-loyalty-message" role="status">{message}</p> : null}
      </form> : <div className="cafe-loyalty-card-state">
        <h2 id="cafe-loyalty-sheet-title">{programName}</h2>
        <p>{activeMembership.stampCount} of {activeMembership.stampGoal} stamps</p>
        <div className="cafe-loyalty-stamps" aria-label={`${activeMembership.stampCount} of ${activeMembership.stampGoal} stamps collected`}>
          {Array.from({ length: activeMembership.stampGoal }, (_, index) => <span className={index < activeMembership.stampCount ? "is-filled" : ""} key={index}><Coffee size={18} /></span>)}
        </div>
        <div className="cafe-loyalty-member-id"><small>Member ID</small><strong>{activeMembership.memberId}</strong></div>
        <p className="cafe-loyalty-card-note">Show this card at {cafeName} when you collect a stamp.</p>
        <div className="cafe-loyalty-wallet-row">
          <div className="cafe-loyalty-qr">{qrImage ? <img src={qrImage} alt={`Rewards QR code for ${activeMembership.memberId}`} /> : <span>Preparing QR…</span>}</div>
          <div className="cafe-loyalty-wallet-actions">
            <p>Scan at {cafeName} to collect a stamp.</p>
            <button type="button" disabled title="Wallet pass setup is coming next"><FaApple aria-hidden="true" /> Add to Apple Wallet</button>
            <button type="button" disabled title="Wallet pass setup is coming next"><img src={googleGLogo} alt="" aria-hidden="true" /> Add to Google Wallet</button>
          </div>
        </div>
        <small className="cafe-loyalty-wallet-note">Wallet passes will be available after the Apple and Google pass setup is complete.</small>
      </div>}
    </section>
  </div>;
}

export function PublicHospitalityProfile() {
  const identifier =
    window.location.pathname.match(/^\/venue\/([^/]+)/)?.[1] || "";
  const publicParams = new URLSearchParams(window.location.search);
  const touchpointSource = publicParams.get("source") || "public_profile";
  const entryChannel = publicParams.get("entry") || "";
  const dashboardPreview = publicParams.get("preview") === "dashboard" ? "dashboard" : "";
  const feedbackSource = entryChannel ? `${touchpointSource}:${entryChannel}` : touchpointSource;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loadError, setLoadError] = useState(false);
  const activeTab = usePublicCafeUIStore((state) => state.activeTab);
  const feedback = usePublicCafeUIStore((state) => state.feedback);
  const selectedCategory = usePublicCafeUIStore((state) => state.selectedCategory);
  const menuSearch = usePublicCafeUIStore((state) => state.menuSearch);
  const shareMessage = usePublicCafeUIStore((state) => state.shareMessage);
  const sendingFeedback = usePublicCafeUIStore((state) => state.sendingFeedback);
  const feedbackMessage = usePublicCafeUIStore((state) => state.feedbackMessage);
  const selectedMenuItem = usePublicCafeUIStore((state) => state.selectedMenuItem);
  const loyaltySheet = usePublicCafeUIStore((state) => state.loyaltySheet);
  const loyaltyPhone = usePublicCafeUIStore((state) => state.loyaltyPhone);
  const joiningLoyalty = usePublicCafeUIStore((state) => state.joiningLoyalty);
  const loyaltyMessage = usePublicCafeUIStore((state) => state.loyaltyMessage);
  const loyaltyMembership = usePublicCafeUIStore((state) => state.loyaltyMembership);
  const resetPublicCafeUI = usePublicCafeUIStore((state) => state.reset);
  const setActiveTab = usePublicCafeUIStore((state) => state.setActiveTab);
  const setFeedback = usePublicCafeUIStore((state) => state.setFeedback);
  const setSelectedCategory = usePublicCafeUIStore((state) => state.setSelectedCategory);
  const setMenuSearch = usePublicCafeUIStore((state) => state.setMenuSearch);
  const setShareMessage = usePublicCafeUIStore((state) => state.setShareMessage);
  const setSendingFeedback = usePublicCafeUIStore((state) => state.setSendingFeedback);
  const setFeedbackMessage = usePublicCafeUIStore((state) => state.setFeedbackMessage);
  const setSelectedMenuItem = usePublicCafeUIStore((state) => state.setSelectedMenuItem);
  const setLoyaltySheet = usePublicCafeUIStore((state) => state.setLoyaltySheet);
  const setLoyaltyPhone = usePublicCafeUIStore((state) => state.setLoyaltyPhone);
  const setJoiningLoyalty = usePublicCafeUIStore((state) => state.setJoiningLoyalty);
  const setLoyaltyMessage = usePublicCafeUIStore((state) => state.setLoyaltyMessage);
  const setLoyaltyMembership = usePublicCafeUIStore((state) => state.setLoyaltyMembership);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    resetPublicCafeUI(feedbackSource, new URLSearchParams(window.location.search).get("tab") === "menu" ? "menu" : "home");
  }, [feedbackSource, resetPublicCafeUI]);
  useEffect(() => {
    if (!selectedMenuItem) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedMenuItem(null);
      if (event.key === "Tab") { event.preventDefault(); detailRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [selectedMenuItem, setSelectedMenuItem]);
  useEffect(() => {
    if (loyaltySheet === "closed") return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLoyaltySheet("closed");
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [loyaltySheet, setLoyaltySheet]);
  const track = useCallback((eventType: string, destination: string, detail = "") => {
    void apiFetch(`/api/venue/${identifier}/track/`, {
      method: "POST",
      body: jsonBody({ eventType, destination, detail, source: touchpointSource, entry: entryChannel }),
    }).catch(() => undefined);
  }, [entryChannel, identifier, touchpointSource]);
  useEffect(() => {
    apiFetch<Venue>(`/api/venue/${identifier}/${queryString({ source: touchpointSource, entry: entryChannel, preview: dashboardPreview })}`)
      .then(setVenue)
      .catch(() => setLoadError(true));
  }, [dashboardPreview, entryChannel, identifier, touchpointSource]);
  if (!venue)
    return (
      <main className="hospitality-public-state">{loadError ? "This café profile could not be loaded. Please refresh to try again." : "Loading café profile…"}</main>
    );
  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingFeedback) return;
    if (feedback.rating < 1) {
      setFeedbackMessage("Please select a star rating before submitting.");
      return;
    }
    setSendingFeedback(true);
    try {
      await apiFetch(`/api/venue/${identifier}/feedback/`, {
        method: "POST",
        body: jsonBody(feedback),
      });
      setFeedbackMessage("Thank you for your feedback.");
      setFeedback(newCafeFeedbackDraft(feedbackSource));
    } catch (reason) {
      setFeedbackMessage(displayError(reason));
    } finally {
      setSendingFeedback(false);
    }
  }
  async function joinLoyalty(event: FormEvent<HTMLFormElement>, formattedPhone = loyaltyPhone) {
    event.preventDefault();
    if (joiningLoyalty) return;
    setJoiningLoyalty(true);
    setLoyaltyMessage("");
    try {
      const response = await apiFetch<{ created: boolean; membership: LoyaltyMembership }>(`/api/venue/${identifier}/loyalty/join/`, {
        method: "POST",
        body: jsonBody({ phone: formattedPhone, source: touchpointSource, entry: entryChannel }),
      });
      setLoyaltyMembership(response.membership);
      setLoyaltyMessage(response.created ? "Your rewards card is ready." : "Welcome back — your rewards card is ready.");
      setLoyaltySheet("card");
    } catch (reason) {
      setLoyaltyMessage(displayError(reason));
    } finally {
      setJoiningLoyalty(false);
    }
  }
  const searchTerm = menuSearch.trim().toLocaleLowerCase();
  const menuCategories = venue.categories
    .filter((category) => selectedCategory === null || category.slug === selectedCategory)
    .map((category) => ({
      ...category,
      items: (category.items || []).filter((item) => !searchTerm || `${item.name} ${item.description}`.toLocaleLowerCase().includes(searchTerm)),
    }))
    .filter((category) => category.items?.length);
  const availableMenuItems = venue.categories.flatMap((category) =>
    (category.items || [])
      .filter((entry) => entry.isAvailable !== false)
      .map((entry) => ({ ...entry, categoryName: category.name })),
  );
  const specialItems = availableMenuItems.filter((entry) => itemIsTodaySpecial(entry));
  const loyaltyProgram = venue.loyalty ?? {
    enabled: venue.venue.type === "cafe" || venue.venue.type === "restaurant",
    programName: `${venue.organization.name} Rewards`,
    stampGoal: 5,
  };
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kathmandu' }).format(new Date()).toLowerCase();
  const todaySchedule = venue.venue.openingSchedule?.[today];
  const todayHours = todaySchedule
    ? (todaySchedule.closed || !todaySchedule.intervals.length ? 'Closed today' : todaySchedule.intervals.map((interval) => `${interval.start}–${interval.end}`).join(', '))
    : venue.venue.openingHours || 'View weekly hours';
  const todayLabel = todaySchedule ? (todaySchedule.closed || !todaySchedule.intervals.length ? 'Closed today' : 'Open today') : 'Hours';
  const hoursStatusClass = todaySchedule ? (todaySchedule.closed || !todaySchedule.intervals.length ? 'is-closed' : 'is-open') : 'is-neutral';
  const isClosedToday = Boolean(todaySchedule?.closed || (todaySchedule && !todaySchedule.intervals.length));
  const scheduleEntries = Object.entries(venue.venue.openingSchedule || {});
  const scheduleShapes = scheduleEntries.map(([, value]) => JSON.stringify(value));
  const hasVariableHours = scheduleEntries.length > 1 && new Set(scheduleShapes).size > 1;
  const initials = venue.organization.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  const socialPriority: Record<string, number> = { instagram: 0, tiktok: 1, facebook: 2 };
  const socialLinks = [...venue.links].sort((left, right) =>
    (socialPriority[left.link_type] ?? 99) - (socialPriority[right.link_type] ?? 99)
  );
  const openMenu = () => { setActiveTab("menu"); track("menu_open", "menu"); };
  async function shareProfile() {
    try {
      if (navigator.share) await navigator.share({ title: venue!.organization.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setShareMessage("Profile link copied"); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareMessage("Copy the page address to share this profile.");
    }
  }
  function saveContact() {
    if (!venue) return;
    const contactVenue = venue;
    const escapeVCard = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
    const lines = [
      "BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCard(contactVenue.organization.name)}`,
      contactVenue.venue.phone ? `TEL;TYPE=WORK,VOICE:${escapeVCard(contactVenue.venue.phone)}` : "",
      contactVenue.venue.email ? `EMAIL;TYPE=WORK:${escapeVCard(contactVenue.venue.email)}` : "",
      contactVenue.venue.website ? `URL:${escapeVCard(contactVenue.venue.website)}` : "",
      contactVenue.venue.address ? `ADR;TYPE=WORK:;;${escapeVCard(contactVenue.venue.address)};;;` : "",
      "END:VCARD",
    ].filter(Boolean).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines], { type: "text/vcard;charset=utf-8" }));
    link.download = `${contactVenue.organization.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cafe"}.vcf`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShareMessage("Contact card downloaded");
  }
  return (
    <main className={`hospitality-public cafe-public ${activeTab === "menu" ? "is-menu" : ""}`} style={{ "--cafe-brand": /^#[0-9a-f]{6}$/i.test(venue.venue.primaryColor) ? venue.venue.primaryColor : "#3e5948" } as CSSProperties}>
      <header className="cafe-header">
        <div className="cafe-toolbar">
          <button type="button" aria-label="Back to café home" onClick={() => { setActiveTab("home"); setSelectedCategory(null); }}><ArrowLeft size={21} /></button>
          <button type="button" aria-label="Share café profile" onClick={() => void shareProfile()}><Share2 size={21} /></button>
        </div>
        {shareMessage ? <p role="status" className="cafe-share-status">{shareMessage}</p> : null}
        {venue.venue.coverImage ? <img className="cafe-cover" src={venue.venue.coverImage} alt={`${venue.organization.name} café`} fetchPriority="high" /> : null}
        <div className="cafe-identity">
          {venue.venue.logo ? <img className="hospitality-public-logo" src={venue.venue.logo} alt="" /> : <span className="cafe-monogram" aria-hidden="true">{initials}</span>}
          <div><h1>{venue.organization.name}</h1>
          {venue.venue.address ? <p className="cafe-location"><MapPin size={15} />{venue.venue.address}</p> : null}
          {venue.organization.slogan ? <p className="cafe-description">{venue.organization.slogan} <Leaf size={17} /></p> : null}</div>
        </div>
        <div className="cafe-entry-actions">
          <div className="cafe-quick-actions">
            {venue.venue.phone ? <a href={`tel:${venue.venue.phone}`} onClick={() => track("social_click", "call")}><Phone size={17} />Call</a> : null}
            <button type="button" onClick={saveContact}><UserPlus size={17} />Save contact</button>
          </div>
        </div>
      </header>
      <nav className="hospitality-public-tabs">
        <button
          aria-pressed={activeTab === "home"}
          className={activeTab === "home" ? "is-active" : ""}
          onClick={() => setActiveTab("home")}
        >
          Overview
        </button>
        <button
          aria-pressed={activeTab === "menu"}
          className={activeTab === "menu" ? "is-active" : ""}
          onClick={openMenu}
        >
          Menu
        </button>
      </nav>
      {activeTab === "home" ? (
        <section>
          {specialItems.length ? <section className="cafe-specials" aria-labelledby="cafe-specials-title">
            <div className="cafe-section-heading"><h2 id="cafe-specials-title">Our Specials</h2></div>
            <div className="cafe-specials-rail">
              {specialItems.map((entry) => <button type="button" className="cafe-special-card" aria-label={`View details for ${entry.name}`} key={entry.id ?? `${entry.categoryName}:${entry.name}`} onClick={() => { setSelectedMenuItem(entry); track("menu_item_click", "special", entry.name); }}>
                {entry.image ? <img src={entry.image} alt="" loading="lazy" /> : <span className="cafe-special-placeholder"><Utensils size={24} /></span>}
              </button>)}
            </div>
          </section> : null}
          {loyaltyProgram.enabled ? <CafeLoyaltyPanel
            programName={loyaltyProgram.programName}
            stampGoal={loyaltyProgram.stampGoal}
            onJoin={() => { setLoyaltyMessage(""); setLoyaltySheet("join"); }}
          /> : null}
          {(scheduleEntries.length || venue.venue.openingHours) ? (hasVariableHours ? <details className="hospitality-public-hours">
            <summary><span aria-hidden="true" className={`cafe-hours-status ${hoursStatusClass}`} /><span className="cafe-hours-copy"><small>Today</small><strong>{isClosedToday ? "Closed" : todaySchedule ? "Open" : todayLabel}</strong>{!isClosedToday ? <span>{todayHours}</span> : null}</span><span className="cafe-hours-action">View weekly hours <ChevronRight size={18} /></span></summary>
            {scheduleEntries.length ? <dl><div className="cafe-weekly-hours-label">Weekly hours</div>{openingScheduleRows(venue.venue.openingSchedule).map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : <p>{venue.venue.openingHours}</p>}
          </details> : <div className="cafe-simple-hours"><span aria-hidden="true" className={`cafe-hours-status ${hoursStatusClass}`} /><span><strong>{todayLabel}</strong><span>{todayHours}</span></span></div>) : null}
          {(venue.venue.email || venue.venue.whatsapp || venue.venue.website || venue.links.length > 0) ? <div className="cafe-connect"><div className="hospitality-links">
            {venue.venue.whatsapp ? <a href={`https://wa.me/${venue.venue.whatsapp.replace(/\D/g, "")}`} onClick={() => track("social_click", "whatsapp")} target="_blank" rel="noreferrer"><span className="cafe-social-icon is-whatsapp"><CafeSocialIcon type="whatsapp" /></span>WhatsApp</a> : null}
            {socialLinks.map((link) => (
              <a href={link.value} key={link.id} onClick={() => track("social_click", `social_${link.link_type}`)} target="_blank" rel="noreferrer">
                <span className={`cafe-social-icon is-${link.link_type}`}><CafeSocialIcon type={link.link_type} /></span>{link.label || link.link_type}
              </a>
            ))}
            {venue.venue.website ? <a href={venue.venue.website} onClick={() => track("social_click", "website")} target="_blank" rel="noreferrer"><span className="cafe-social-icon is-website"><CafeSocialIcon type="website" /></span>Website</a> : null}
            {venue.venue.email ? <a href={`mailto:${venue.venue.email}`}><span className="cafe-social-icon is-email"><CafeSocialIcon type="email" /></span>Email</a> : null}
          </div></div> : null}
          {venue.feedbackEnabled ? <section className="cafe-feedback-section" aria-labelledby="cafe-feedback-title">
              <header>
                <h2 id="cafe-feedback-title">Customer feedback</h2>
                {venue.rating.count > 0 ? <div className="cafe-feedback-score" aria-label={`${venue.rating.average.toFixed(1)} out of 5 from ${venue.rating.count} ${venue.rating.count === 1 ? "rating" : "ratings"}`}>
                  <strong>{venue.rating.average.toFixed(1)}</strong>
                  <span aria-hidden="true">{[1, 2, 3, 4, 5].map((rating) => <Star key={rating} size={18} fill={rating <= Math.round(venue.rating.average) ? "currentColor" : "none"} />)}</span>
                  <small>{venue.rating.count} {venue.rating.count === 1 ? "rating" : "ratings"}</small>
                </div> : null}
              </header>
              <form id="feedback" onSubmit={submitFeedback} className="hospitality-feedback">
                <div className="cafe-rating-prompt">
                  <div><strong>How was your visit?</strong><span>Your feedback is private to this café.</span></div>
                  <div className="cafe-stars" role="group" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`Rate ${rating} out of 5`} aria-pressed={feedback.rating === rating} data-selected={rating <= feedback.rating ? "true" : undefined} onClick={() => { setFeedback({ ...feedback, rating }); track("rating_click", "rating", String(rating)); }}><Star size={27} fill={rating <= feedback.rating ? "currentColor" : "none"} /></button>)}
                  </div>
                </div>
                <label className="cafe-message">Message <span>(optional)</span><TextArea value={feedback.comment} maxLength={2000} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} placeholder="Tell us more…" /></label>
                <label className="hospitality-feedback-contact-toggle"><input type="checkbox" checked={feedback.shareContact} onChange={(e) => setFeedback({ ...feedback, shareContact: e.target.checked })} /> Let the café contact me about this feedback</label>
                {feedback.shareContact ? <div className="hospitality-feedback-contact-fields">
                    <label>Name <span>(optional)</span><TextInput value={feedback.contactName} maxLength={120} onChange={(e) => setFeedback({ ...feedback, contactName: e.target.value })} /></label>
                    <label>Email <span>(optional)</span><TextInput type="email" value={feedback.contactEmail} onChange={(e) => setFeedback({ ...feedback, contactEmail: e.target.value })} /></label>
                    <label>Phone <span>(optional)</span><TextInput type="tel" value={feedback.contactPhone} maxLength={40} onChange={(e) => setFeedback({ ...feedback, contactPhone: e.target.value })} /></label>
                    <small>These details are visible only to this business and are never displayed publicly.</small>
                </div>
                : null}
                <label className="hospitality-feedback-honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={feedback.company_website} onChange={(e) => setFeedback({ ...feedback, company_website: e.target.value })} /></label>
                <button type="submit" className="cafe-primary" disabled={sendingFeedback}>{sendingFeedback ? "Sending…" : "Send feedback"}</button>
                {feedbackMessage ? <small role="status">{feedbackMessage}</small> : null}
              </form>
            </section> : null}
          {venue.venue.mapUrl ? <article className="cafe-map">
            {venue.venue.address ? <iframe title={`Map for ${venue.organization.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(`${venue.organization.name}, ${venue.venue.address}`)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div><MapPin size={28} />{venue.organization.name}</div>}
          </article> : null}
          {venue.venue.googleReviewUrl ? <article className="cafe-google-reviews">
            <div className="cafe-google-review-copy"><img src={googleGLogo} alt="" /><span><strong>Review us on Google</strong><small>Share your public review</small></span></div>
            <a className="cafe-google-review-link" href={venue.venue.googleReviewUrl} onClick={() => track("google_review_click", "google_review")} target="_blank" rel="noreferrer">Write a review</a>
          </article> : null}
        </section>
      ) : (
        <section>
          <h2 className="cafe-menu-title">Our menu</h2>
          <label className="cafe-menu-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search menu</span><input type="search" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} placeholder="Search menu" /></label>
          {venue.categories.length ? <nav className="cafe-categories" aria-label="Menu categories">
            <button type="button" className={selectedCategory === null ? "is-active" : ""} aria-pressed={selectedCategory === null} onClick={() => setSelectedCategory(null)}>All</button>
            {venue.categories.map((category) => <button type="button" key={category.slug} className={selectedCategory === category.slug ? "is-active" : ""} aria-pressed={selectedCategory === category.slug} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>)}
          </nav> : null}
          {!menuCategories.length ? <p className="cafe-empty">No menu items match your search.</p> : null}
          {menuCategories.map((category) => (
            <article key={category.slug}>
              <h3>{category.name}<span>{category.items?.length || 0} {category.items?.length === 1 ? "item" : "items"}</span></h3>
              {category.items?.map((entry) => (
                <button type="button" className="hospitality-menu-item" key={entry.id} onClick={() => { setSelectedMenuItem(entry); track("menu_item_click", "menu_item", entry.name); }} aria-label={`View details for ${entry.name}`}>
                  {entry.image ? (
                    <img
                      className="hospitality-menu-image"
                      src={entry.image}
                      alt=""
                    />
                  ) : null}
                  <div>
                    <strong>{entry.name}</strong>
                    {itemIsOffer(entry) ? (
                      <small className="hospitality-badge is-offer">{itemOfferLabel(entry)}</small>
                    ) : null}
                    {itemIsTodaySpecial(entry) ? (
                      <small className="hospitality-badge is-special"><span aria-hidden="true">★</span>Today’s special</small>
                    ) : null}
                    {entry.isAvailable === false ? (
                      <small className="hospitality-badge is-sold-out">Sold out</small>
                    ) : null}
                    <p>{entry.description}</p>
                    {entry.priceVariants?.length ? <small>{entry.priceVariants.map((variant) => `${variant.label}: Rs. ${variant.price}`).join(" · ")}</small> : null}
                  </div>
                  <span className="cafe-menu-pricing">
                    {itemHasReducedPrice(entry) ? <del>Rs. {itemOriginalPrice(entry)}</del> : null}
                    <b>Rs. {entry.price}</b>
                  </span>
                </button>
              ))}
            </article>
          ))}
        </section>
      )}
      {selectedMenuItem ? <section ref={detailRef} className="hospitality-menu-detail" role="dialog" aria-modal="true" aria-labelledby="hospitality-menu-detail-title">
        <button type="button" onClick={() => setSelectedMenuItem(null)} aria-label="Close menu item details"><X size={18} /></button>
        {selectedMenuItem.image ? <img src={selectedMenuItem.image} alt="" /> : null}
        {(itemIsTodaySpecial(selectedMenuItem) || itemIsOffer(selectedMenuItem)) ? <div className="cafe-detail-badges">
          {itemIsTodaySpecial(selectedMenuItem) ? <span className="is-special">Today’s special</span> : null}
          {itemIsOffer(selectedMenuItem) ? <span className="is-offer">{itemOfferLabel(selectedMenuItem)}</span> : null}
        </div> : null}
        <h3 id="hospitality-menu-detail-title">{selectedMenuItem.name}</h3>
        <p>{selectedMenuItem.description || 'No additional description has been provided.'}</p>
        {selectedMenuItem.priceVariants?.length ? <ul>{selectedMenuItem.priceVariants.map((variant) => <li key={variant.label}>{variant.label}: Rs. {variant.price}</li>)}</ul> : null}
        <div className="cafe-detail-price">
          {itemHasReducedPrice(selectedMenuItem) ? <span>Was <del>Rs. {itemOriginalPrice(selectedMenuItem)}</del></span> : null}
          <strong>{itemHasReducedPrice(selectedMenuItem) ? 'Now ' : ''}Rs. {selectedMenuItem.price}</strong>
        </div>
      </section> : null}
      <footer className="cafe-footer">Powered by <a href="/">Tap2Connect</a></footer>
      {loyaltySheet !== "closed" ? <CafeLoyaltySheet
        cafeName={venue.organization.name}
        programName={loyaltyProgram.programName}
        stampGoal={loyaltyProgram.stampGoal}
        phone={loyaltyPhone}
        message={loyaltyMessage}
        membership={loyaltyMembership}
        joining={joiningLoyalty}
        stage={loyaltySheet}
        onClose={() => setLoyaltySheet("closed")}
        onPhoneChange={setLoyaltyPhone}
        onSubmit={joinLoyalty}
      /> : null}
    </main>
  );
}
