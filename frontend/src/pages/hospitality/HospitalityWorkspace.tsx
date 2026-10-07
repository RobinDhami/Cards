import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import ImageIcon from "lucide-react/dist/esm/icons/image.js";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal.js";
import Pencil from "lucide-react/dist/esm/icons/pencil.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Save from "lucide-react/dist/esm/icons/save.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import Star from "lucide-react/dist/esm/icons/star.js";
import Tag from "lucide-react/dist/esm/icons/tag.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Utensils from "lucide-react/dist/esm/icons/utensils.js";
import X from "lucide-react/dist/esm/icons/x.js";
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
import "./HospitalityWorkspace.css";

type Venue = {
  organization: { id: number; name: string };
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
  };
  categories: Category[];
  links: Link[];
  rating: { average: number; count: number };
  feedbackEnabled: boolean;
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
  offer_label?: string;
  dietary_info?: string;
  is_vegetarian?: boolean;
  is_available?: boolean;
  is_today_special?: boolean;
  is_offer?: boolean;
  image?: string;
  display_order?: number;
};
type Link = { id: number; link_type: string; label: string; value: string };
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
type Analytics = {
  totals: {
    profile_view: number;
    menu_open: number;
    menu_item_click: number;
    rating_click: number;
    feedback_submit: number;
    social_click: number;
  };
  feedback: {
    count: number;
    average: number;
    ratingBreakdown: Record<string, number>;
  };
  daily: Array<{ date: string; count: number }>;
  socialClicks: Array<{ target: string; count: number }>;
  menuItems: Array<{ target: string; count: number }>;
};
type HospitalityShell = {
  isSuperAdmin: boolean;
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
type HospitalityAdminSection = "profile" | "menu" | "feedback" | "analytics";

function organizationId() {
  return Number(
    window.location.pathname.match(/organizations\/(\d+)/)?.[1] || 0,
  );
}

function hospitalityAdminSection(): HospitalityAdminSection {
  const section = new URLSearchParams(window.location.search).get("tab");
  return section === "menu" || section === "feedback" || section === "analytics"
    ? section
    : "profile";
}

const hospitalitySectionDetails: Record<
  HospitalityAdminSection,
  { title: string; subtitle: string }
> = {
  profile: {
    title: "Profile",
    subtitle:
      "Manage the information and social links shown on the public Home page.",
  },
  menu: {
    title: "Menu",
    subtitle: "Manage categories, items, prices, offers, and today’s specials.",
  },
  feedback: {
    title: "Customer Feedback",
    subtitle: "Review ratings and anonymous feedback submitted by customers.",
  },
  analytics: {
    title: "Analytics",
    subtitle:
      "See how customers engage with the profile, menu, ratings, and social links.",
  },
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
  const previewMenu = section === "menu";
  return (
    <ManageShell
      brand={school?.name || "Hospitality"}
      brandDetail={
        shell.isSuperAdmin
          ? "Super Admin · Organization workspace"
          : "Organization administration"
      }
      logo={school?.logo}
      nav={schoolWorkspaceNav(school?.id, shell.isSuperAdmin, "hospitality")}
      title={details.title}
      subtitle={details.subtitle}
      userName={shell.user.displayName}
      userRole={
        shell.isSuperAdmin
          ? "Platform administrator"
          : "Organization administrator"
      }
      accent={school?.themePrimary || "#0b4bcb"}
      schoolOptions={shell.isSuperAdmin ? shell.schools : undefined}
      selectedSchool={school?.id ?? null}
      onSchoolChange={(schoolId) => {
        window.location.href = `/dashboard/organizations/${schoolId}/hospitality/?tab=profile`;
      }}
      actions={
        <>
          <span className="hospitality-admin-context">
            {shell.isSuperAdmin ? "Viewing as Super Admin" : school?.name}
          </span>
          <a
            className="manage-button is-primary"
            href={`/venue/${publicIdentifier}/${previewMenu ? "?tab=menu" : ""}`}
            target="_blank"
            rel="noreferrer"
          >
            {previewMenu ? <Eye size={14} /> : null}
            {previewMenu ? "Preview menu" : "Preview Digital Profile"}
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
const emptyAnalytics: Analytics = {
  totals: {
    profile_view: 0,
    menu_open: 0,
    menu_item_click: 0,
    rating_click: 0,
    feedback_submit: 0,
    social_click: 0,
  },
  feedback: { count: 0, average: 0, ratingBreakdown: {} },
  daily: [],
  socialClicks: [],
  menuItems: [],
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

function HospitalityAnalyticsVisuals({ analytics }: { analytics: Analytics }) {
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

function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
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

function HospitalityMenuManager({
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
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [organizationContact, setOrganizationContact] = useState<OrganizationContact>({ address: "", phone: "", email: "", website: "", mapUrl: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const activeTab = hospitalityAdminSection();
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
      const [
        payload,
        categories,
        items,
        feedbackPayload,
        analyticsPayload,
        settingsPayload,
      ] = await Promise.all([
        apiFetch<Venue>(`/api/organizations/${id}/venue/`),
        apiFetch<{ categories: Category[] }>(
          `/api/organizations/${id}/venue/menu/categories/`,
        ),
        apiFetch<{ items: Item[] }>(
          `/api/organizations/${id}/venue/menu/items/`,
        ),
        apiFetch<{ feedback: Feedback[] }>(
          `/api/organizations/${id}/venue/feedback/`,
        ),
        apiFetch<{ analytics: Analytics }>(
          `/api/organizations/${id}/venue/analytics/`,
        ),
        apiFetch<{ shell: HospitalityShell; school: OrganizationContact & { logo: string } }>(
          `/api/dashboard/settings/${queryString({ school: id })}`,
        ),
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
      setAnalytics(analyticsPayload.analytics);
      setOrganizationContact(settingsPayload.school);
      setShell(settingsPayload.shell);
    } catch (reason) {
      setError(displayError(reason));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function toggleItemAvailability(menuItem: Item) {
    if (!menuItem.id) return;
    try {
      await apiFetch(`/api/organizations/${id}/venue/menu/items/`, {
        method: "PATCH",
        body: jsonBody({
          id: menuItem.id,
          is_available: menuItem.is_available === false,
        }),
      });
      await load();
    } catch (reason) {
      setError(displayError(reason));
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
      <div className="hospitality-workspace-hero">
        <div>
          <span className="hospitality-eyebrow">Digital profile</span>
          <h1>{venue.organization.name}</h1>
          <p>
            Keep your home profile welcoming, your menu current, and your
            customer voice visible.
          </p>
        </div>
        <a
          className="manage-button is-primary"
          href={`/venue/${venue.venue.publicIdentifier}/`}
          target="_blank"
          rel="noreferrer"
        >
          View public profile
        </a>
      </div>
      {activeTab === "analytics" ? (
        <>
          <HospitalityAnalyticsVisuals analytics={analytics} />
          <AnalyticsPanel analytics={analytics} />
        </>
      ) : null}
      {activeTab === "menu" ? (
        <HospitalityMenuManager
          venue={venue}
          item={item}
          setItem={setItem}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
          onAddCategory={addCategory}
          onAddItem={addItem}
          onToggleAvailability={toggleItemAvailability}
        />
      ) : null}
      <div hidden={activeTab === "analytics" || activeTab === "menu"}>
        {activeTab === "profile" ? (
          <div className="hospitality-profile-grid">
            <form onSubmit={saveProfile}>
              <FormSection
                title="Home profile"
                description="This information appears on the public Home tab."
              >
                <div className="form-grid">
                  <Field label="Venue type">
                    <SelectInput
                      value={venue.venue.type}
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
                      value={venue.venue.description}
                      onChange={(e) => updateVenue("description", e.target.value)}
                      placeholder="Tell visitors what makes this place special"
                    />
                  </Field>
                  <Field label="WhatsApp">
                    <TextInput value={venue.venue.whatsapp} onChange={(e) => updateVenue("whatsapp", e.target.value)} placeholder="+977 98XXXXXXXX" />
                  </Field>
                  <Field label="Google review link">
                    <TextInput type="url" value={venue.venue.googleReviewUrl} onChange={(e) => updateVenue("googleReviewUrl", e.target.value)} placeholder="https://..." />
                  </Field>
                  <Field label="Reservation link">
                    <TextInput type="url" value={venue.venue.reservationUrl} onChange={(e) => updateVenue("reservationUrl", e.target.value)} placeholder="Booking or reservation page" />
                  </Field>
                  <Field label="Opening hours" wide hint="For example: Sun–Fri, 8:00 AM–8:00 PM · Saturday, 10:00 AM–6:00 PM">
                    <TextArea value={venue.venue.openingHours} onChange={(e) => updateVenue("openingHours", e.target.value)} placeholder="Add opening hours customers can see" />
                  </Field>
                  <Field label="About photo / logo">
                    <FileInput label="Upload profile logo" currentUrl={venue.venue.logo || undefined} accept="image/*" onChange={setLogoFile} />
                  </Field>
                  <Field label="Cover photo">
                    <FileInput label="Upload cover photo" currentUrl={venue.venue.coverImage || undefined} accept="image/*" onChange={setCoverFile} />
                  </Field>
                  <Field label="Profile color">
                    <TextInput type="color" value={venue.venue.primaryColor} onChange={(e) => updateVenue("primaryColor", e.target.value)} />
                  </Field>
                  <Field label="Accent color">
                    <TextInput type="color" value={venue.venue.secondaryColor} onChange={(e) => updateVenue("secondaryColor", e.target.value)} />
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
                    checked={venue.feedbackEnabled}
                    onChange={(e) =>
                      setVenue({ ...venue, feedbackEnabled: e.target.checked })
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
                {venue.links.map((entry) => (
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

export function PublicHospitalityProfile() {
  const identifier =
    window.location.pathname.match(/^\/venue\/([^/]+)/)?.[1] || "";
  const [venue, setVenue] = useState<Venue | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "menu">(() =>
    new URLSearchParams(window.location.search).get("tab") === "menu"
      ? "menu"
      : "home",
  );
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  useEffect(() => {
    apiFetch<Venue>(`/api/venue/${identifier}/`)
      .then(setVenue)
      .catch(() => setVenue(null));
  }, [identifier]);
  useEffect(() => {
    const track = (eventType: string, target = "") => {
      void apiFetch(`/api/venue/${identifier}/track/`, {
        method: "POST",
        body: jsonBody({ eventType, target }),
      }).catch(() => undefined);
    };
    const handleClick = (event: MouseEvent) => {
      const element = event.target as HTMLElement;
      const tab = element.closest<HTMLButtonElement>(
        ".hospitality-public-tabs button",
      );
      if (tab?.textContent?.trim() === "Menu") track("menu_open");
      const social = element.closest<HTMLAnchorElement>(
        ".hospitality-links a, .hospitality-public-contact a",
      );
      if (social) track("social_click", social.textContent?.trim() || "link");
      const menuItem = element.closest<HTMLElement>(".hospitality-menu-item");
      if (menuItem)
        track(
          "menu_item_click",
          menuItem.querySelector("strong")?.textContent?.trim() || "menu item",
        );
      const rating = element.closest<HTMLSelectElement>(
        ".hospitality-feedback select",
      );
      if (rating) track("rating_click", rating.value);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [identifier]);
  if (!venue)
    return (
      <main className="hospitality-public-state">Loading venue profile…</main>
    );
  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiFetch(`/api/venue/${identifier}/feedback/`, {
        method: "POST",
        body: jsonBody(feedback),
      });
      setFeedbackMessage("Thank you for your feedback.");
      setFeedback({ rating: 5, comment: "" });
    } catch (reason) {
      setFeedbackMessage(displayError(reason));
    }
  }
  return (
    <main className="hospitality-public">
      <header
        style={{
          background: venue.venue.coverImage
            ? `linear-gradient(0deg, ${venue.venue.primaryColor}dd, ${venue.venue.primaryColor}55), url(${venue.venue.coverImage}) center/cover`
            : venue.venue.primaryColor,
        }}
      >
        {venue.venue.logo ? <img className="hospitality-public-logo" src={venue.venue.logo} alt="" /> : null}
        <h1>{venue.organization.name}</h1>
        <p>{venue.venue.description}</p>
      </header>
      <nav className="hospitality-public-tabs">
        <button
          className={activeTab === "home" ? "is-active" : ""}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          className={activeTab === "menu" ? "is-active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          Menu
        </button>
      </nav>
      {activeTab === "home" ? (
        <section>
          <h2>Home</h2>
          <div className="hospitality-public-contact">
            {venue.venue.address ? <p>{venue.venue.address}</p> : null}
            <p>{[venue.venue.phone, venue.venue.email].filter(Boolean).join(" · ")}</p>
            {venue.venue.website ? <a href={venue.venue.website} target="_blank" rel="noreferrer">Website</a> : null}
            {venue.venue.whatsapp ? <a href={`https://wa.me/${venue.venue.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
            {venue.venue.mapUrl ? <a href={venue.venue.mapUrl} target="_blank" rel="noreferrer">Directions</a> : null}
            {venue.venue.reservationUrl ? <a href={venue.venue.reservationUrl} target="_blank" rel="noreferrer">Reserve / Book</a> : null}
            {venue.venue.googleReviewUrl ? <a href={venue.venue.googleReviewUrl} target="_blank" rel="noreferrer">Review us on Google</a> : null}
          </div>
          {venue.venue.openingHours ? <article className="hospitality-public-hours"><h3>Opening hours</h3><p>{venue.venue.openingHours}</p></article> : null}
          <div className="hospitality-links">
            {venue.links.map((link) => (
              <a href={link.value} key={link.id} target="_blank" rel="noreferrer">
                {link.label || link.link_type}
              </a>
            ))}
          </div>
          <p className="hospitality-rating">
            Rating: {venue.rating.average.toFixed(1)} / 5 ({venue.rating.count})
          </p>
          {venue.feedbackEnabled ? (
            <form onSubmit={submitFeedback} className="hospitality-feedback">
              <h3>Leave anonymous feedback</h3>
              <select
                value={feedback.rating}
                onChange={(e) =>
                  setFeedback({ ...feedback, rating: Number(e.target.value) })
                }
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — Average</option>
                <option value="2">2 — Needs improvement</option>
                <option value="1">1 — Poor</option>
              </select>
              <TextArea
                value={feedback.comment}
                onChange={(e) =>
                  setFeedback({ ...feedback, comment: e.target.value })
                }
                placeholder="Your feedback"
              />
              <button className="manage-button is-primary">
                Send feedback
              </button>
              {feedbackMessage ? <small>{feedbackMessage}</small> : null}
            </form>
          ) : null}
        </section>
      ) : (
        <section>
          <h2>Menu</h2>
          {venue.categories.map((category) => (
            <article key={category.id}>
              <h3>{category.name}</h3>
              {category.items?.map((entry) => (
                <div className="hospitality-menu-item" key={entry.id}>
                  {entry.image ? (
                    <img
                      className="hospitality-menu-image"
                      src={entry.image}
                      alt=""
                    />
                  ) : null}
                  <div>
                    <strong>{entry.name}</strong>
                    {entry.is_offer ? (
                      <small className="hospitality-badge">
                        {entry.offer_label || "Offer"}
                      </small>
                    ) : null}
                    {entry.is_today_special ? (
                      <small className="hospitality-badge">
                        Today’s special
                      </small>
                    ) : null}
                    <p>{entry.description}</p>
                  </div>
                  <b>{entry.price}</b>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
