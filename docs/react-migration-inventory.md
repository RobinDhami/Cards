# React Migration Inventory

This project is moving toward a React frontend with Django kept as the backend. The homepage has an initial React mirror already. The Django templates should stay in place until each React replacement is working, tested, and wired to real backend data.

## Current React State

- `frontend/src/pages/home/HomePage.tsx` mirrors the Django homepage.
- `frontend/src/pages/dashboard/DashboardHome.tsx` migrates the dashboard overview screen and reads from `/api/dashboard/overview/`.
- `frontend/src/pages/profiles/PublicProfessionalProfile.tsx` migrates the live professional public profile route for `modern_identity` and `organization_focus`, reading from `/api/professional-profiles/<slug>/`.
- `frontend/src/components/ModernIdentityPreview.tsx` and `OrganizationFocusPreview.tsx` are older preview/demo components and should be removed or refactored after the live React profile route fully replaces them.
- `frontend/src/data/demoProfile.ts` is demo data only.
- The React app still needs authenticated form APIs, CSRF handling, upload handling, and the remaining dashboard/shop/profile editor endpoints.

## Foundation To Convert First

- App routing for public pages, auth pages, dashboards, profile editors, and shop screens.
- Session auth helpers: current user, login, logout, permission redirects, CSRF token handling.
- Shared API client with consistent error handling.
- File upload support for profile photos, covers, logos, documents, QR/payment images, product images, and certificates.
- Toast/message system to replace Django messages.
- Shared layout components: admin sidebar, mobile drawer, top bar, public phone-card shell, shop owner shell.
- Media/static URL helpers so Django media and static files work from React.
- Form validation parity with Django forms before deleting templates.

## Dashboard Templates To Convert

### School/Admin Dashboard

Source templates:

- `vcards/Templates/dashboard/home.html`
- `vcards/Templates/dashboard/_sidebar.html`
- `vcards/Templates/dashboard/schools.html`
- `vcards/Templates/dashboard/students.html`
- `vcards/Templates/dashboard/teachers.html`
- `vcards/Templates/dashboard/reports.html`
- `vcards/Templates/dashboard/settings.html`
- `vcards/Templates/dashboard/bulk_upload.html`
- `vcards/Templates/dashboard/print.html`
- `vcards/Templates/dashboard/qr_export.html`
- `vcards/Templates/dashboard/student_credentials.html`
- `vcards/Templates/add_student_to_college.html`
- `vcards/Templates/edit_student_manual.html`
- `vcards/Templates/edit_student_auth.html`
- `vcards/Templates/student_owner_dashboard.html`

Backend data/functions to expose:

- User role detection: super admin, school admin, student/teacher owner, public profile owner.
- School selector and managed school permissions.
- College CRUD: name, admin user, slogan, address, logo, principal, signature, website, email, phone, theme colors, username prefix.
- Student/teacher CRUD: profile details, contact info, academic fields, role, organization, emergency contact, card settings, media uploads, skills, social links, template selections.
- Student credentials: username assignment, password reset, credential display.
- Bulk upload: CSV/Excel parsing, validation errors, preview/result reporting.
- Reports: analytics by class, section, level, active cards, missing data, clicks/views/downloads.
- Settings: school branding, identity card defaults, username prefix, theme colors.
- Student owner dashboard: profile completion, password change, visibility toggles, contact card links.

High-risk UI behavior:

- Large print builder form with many options.
- Bulk upload error handling.
- Image/file previews.
- Conditional academic/member fields.
- Search/filter tables for students and teachers.
- Permission redirects based on user role.

### Professional Card Dashboard

Source templates:

- `professional_cards/templates/professional_cards/_dashboard_shell_start.html`
- `professional_cards/templates/professional_cards/_dashboard_shell_end.html`
- `professional_cards/templates/professional_cards/profile_list.html`
- `professional_cards/templates/professional_cards/profile_form.html`
- `professional_cards/templates/professional_cards/profile_owner_form.html`
- `professional_cards/templates/professional_cards/profile_edit_login.html`
- `professional_cards/templates/professional_cards/profile_confirm_delete.html`

Backend data/functions to expose:

- Professional profile list/search/counts.
- Create/edit/delete profile.
- Owner edit login and owner-only profile editor.
- Profile completion score and suggestions.
- Profession suggestions API.
- vCard download and QR image endpoints can stay Django endpoints.

Profile fields to support:

- Main identity: owner, type, full name, slug, profile photo, cover photo, profession, designation, company, industry, verification, active status.
- Header identity: organization logo/tagline, personal logo, brand name/tagline, identifier label/value.
- Work identity: work role, organization, experience, address.
- Academic identity: section, degree/program, institution, level, year/semester, specialization, status, certification, address.
- About/current focus: short tagline, about, current focus, featured interest, current status, looking for, preferred work mode, networking statement.
- Contact/social: phone, WhatsApp, email, website, LinkedIn, Facebook, Instagram, YouTube, GitHub, booking link, office address, Google Maps URL, business hours, location.
- Styling/template: template name and accent color.

Nested collections to support:

- Services: title, description, icon, display order.
- Highlights/portfolio: title, type, organization, period, description, image, project link, display order.
- Testimonials: review, client name, role, organization, photo, rating, display order.
- Documents: title, file, type, public/private, display order.

High-risk UI behavior:

- Repeatable formsets must become React repeatable sections.
- Add/remove/reorder rows.
- Upload previews and remove-image states.
- Dirty form warning.
- Password update panel.
- Accent color swatches.
- Header identity conditional fields.

### Shop Owner Dashboard

Source templates:

- `shops/templates/shop/dashboard/owner_base.html`
- `shops/templates/shop/dashboard/overview.html`
- `shops/templates/shop/dashboard/orders.html`
- `shops/templates/shop/dashboard/products.html`
- `shops/templates/shop/dashboard/product_create.html`
- `shops/templates/shop/dashboard/categories.html`
- `shops/templates/shop/dashboard/customers.html`
- `shops/templates/shop/dashboard/discounts.html`
- `shops/templates/shop/dashboard/marketing.html`
- `shops/templates/shop/dashboard/reports.html`
- `shops/templates/shop/dashboard/website_editor.html`
- `shops/templates/shop/dashboard/staff.html`
- `shops/templates/shop/dashboard/billing.html`
- `shops/templates/shop/dashboard/settings.html`
- `shops/templates/shop/dashboard/support.html`
- `shops/templates/shop/dashboard/inventory.html`
- `shops/templates/shop/dashboard/payment_verification.html`
- `shops/templates/shop/dashboard/notifications.html`
- `shops/templates/shop/dashboard/store_preview.html`
- `shops/templates/shop/dashboard/business_suite.html`

Backend data/functions to expose:

- Store access and permissions for owner/staff/platform admin.
- Store overview stats: sales, orders, pending orders, customers, product count, active products, conversion rate.
- Orders list/detail/status/payment status.
- Products, product images, product options, option values, variants, stock.
- Categories with hierarchy and display order.
- Customers and order history.
- Discounts/promotions.
- Store website settings: logo, favicon, colors, selected theme, hero, promo section, domain/subdomain, publish state.
- Staff permissions.
- Billing/subscription status.
- Inventory alerts and stock adjustments.
- Payment verification.
- Notifications.

High-risk UI behavior:

- Many current shop dashboard pages mix real data and placeholder demo content; React should separate real API data from temporary mock UI.
- Product creation needs image upload, variants, pricing, inventory, SEO, shipping, and publish/draft behavior.
- Categories currently include drag/drop ordering and preview behavior.
- Discounts include builder, tabs, search, generated code, and live summary.
- Website editor includes section tabs, device preview, and drag ordering.

## Digital Profile Templates To Convert

### Professional Public Profiles

Source templates:

- `professional_cards/templates/professional_cards/modern_identity.html`
- `professional_cards/templates/professional_cards/organization_focus.html`
- `professional_cards/templates/professional_cards/professional_premium.html`

Currently active template choices:

- `modern_identity`
- `organization_focus`

Data/context to expose:

- Public profile details.
- Primary actions: Call, WhatsApp, Email, Map.
- Extra/social actions: LinkedIn, Facebook, Instagram, YouTube, GitHub, booking link.
- Services, highlights, testimonials, public documents.
- Public map URL, QR URL, vCard URL, public URL.
- JSON-LD profile schema.
- Owner edit-login link when relevant.
- Views/downloads tracking.

Interaction to rebuild:

- Share button with native share/copy fallback.
- Toast feedback.
- Complete-details drawer.
- "Let's Connect" preview/coming-soon action.
- Organization-focused layout with services row and social row.

### Student/School Digital Contact Card

Source template:

- `vcards/Templates/contact/student_digital_card.html`

Data/context to expose:

- Student/member details, school details, school logo, profile/cover photos.
- Role, organization/school, academic label, section, student identifier, blood group.
- Emergency/guardian details, address privacy rules, website, map.
- Phone, WhatsApp, vCard download, QR code, edit profile, birth certificate access.
- Social links and tracked action URLs.
- About/current focus/skills.

Interaction to rebuild:

- Share button.
- Details drawer.
- Toast feedback.
- Tracked contact action redirects.
- Privacy rules for private student details.

## Print And Export Work

These should mostly remain Django-backed because they generate files and strict print layouts:

- `vcards/Templates/print/preview.html`
- `vcards/Templates/print/a4_print.html`
- `vcards/Templates/print/single_card.html`
- `vcards/Templates/print/partials/card_front.html`
- `vcards/Templates/print/partials/card_back.html`
- `vcards/Templates/print/partials/theme_styles.html`
- `vcards/Templates/print/themes/front_official_wave.html`
- `vcards/Templates/print/themes/back_official_wave.html`

React can provide the print settings UI and call Django for preview/PDF/ZIP exports.

## Shop Storefront To Convert Later

Source templates:

- `shops/templates/shop/base.html`
- `shops/templates/shop/home.html`
- `shops/templates/shop/product_list.html`
- `shops/templates/shop/product_detail.html`
- `shops/templates/shop/cart.html`
- `shops/templates/shop/checkout.html`
- `shops/templates/shop/order_success.html`
- `shops/templates/shop/track_order.html`
- `shops/templates/shop/partials/announcement_bar.html`
- `shops/templates/shop/partials/navbar.html`
- `shops/templates/shop/partials/product_card.html`
- `shops/templates/shop/partials/benefits.html`
- `shops/templates/shop/partials/footer.html`

Backend/API behavior to support:

- Store public data and theme.
- Product listing, search, category filtering, sorting.
- Product detail and variants.
- Cart session, add/update/remove.
- Checkout and order creation.
- Order success and order tracking.

## Existing Static Assets To Carry Forward

- `theme/static/css/homepage.css`
- `theme/static/css/dist/styles.css`
- `theme/static/branding/tap2connect-logo.png`
- `theme/static/hero/professional-profile-preview.webp`
- `theme/static/collection/card-collection-latest.webp`
- `theme/static/products/*`
- `shops/static/shop/css/storefront.css`
- `shops/static/shop/css/owner_dashboard.css`
- `shops/static/shop/js/storefront.js`
- `shops/static/shop/images/*`

During React migration, CSS can be reused first, then cleaned up once each page is stable.

## Suggested Migration Order

1. Build the React routing/auth/API foundation.
2. Convert public professional profile templates first: `modern_identity` and `organization_focus`. Done as an initial React route; keep validating against more real profiles.
3. Convert professional owner profile editor because it directly feeds the public templates.
4. Convert professional admin list/create/edit/delete.
5. Convert student digital contact card.
6. Convert student owner dashboard and manual edit form.
7. Convert school/admin dashboard core: home, schools, students, teachers. Dashboard overview is started; schools/students/teachers remain.
8. Convert school settings, reports, credentials, bulk upload.
9. Convert print/QR dashboard controls while keeping export generation in Django.
10. Convert shop owner dashboard core: overview, products, product create, orders.
11. Convert shop categories, customers, discounts, website editor, staff/settings/billing.
12. Convert public shop storefront after product/cart APIs are stable.

## Delete-After-Migration Checklist

Only delete old Django templates after:

- React page matches current content and behavior.
- Backend APIs fully replace Django form posts for that page.
- File uploads work.
- Permissions match Django behavior.
- Important mobile and desktop views are checked.
- Existing URLs either still work or redirect cleanly.
- `manage.py check`, React build, and a browser smoke test pass.
