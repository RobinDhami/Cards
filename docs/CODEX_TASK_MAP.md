# Codex Task Map

This is the permanent working map for Codex tasks in this repository. Keep each task focused on one major module and treat the current repository code as the source of truth.

## 01 — Authentication, Roles & Access Control

### Purpose

Own login, logout, sessions, role detection, permission scoping, and role-based redirects.

### Normally inspect

- `frontend/src/pages/auth/`
- `frontend/src/lib/api.ts`
- Relevant routing in `frontend/src/App.tsx`
- Session and authentication sections of `vcard_backend/react_api.py`
- Permission and role helpers in `vcards/views.py`
- `vcard_backend/settings.py` and relevant routes in `vcard_backend/urls.py`
- Authentication-related tests

### Avoid

- Profile layouts and card-canvas internals
- Printing/export implementation
- Marketing UI
- Domain fields unrelated to access control

### Direct dependencies

- Django `User`
- Organization administrators
- Member profile ownership
- Professional profile ownership

### Scope notes

- This is the foundational module and should normally be stabilized before other private workspaces.
- Profile-specific owner login UI may remain with the corresponding member or professional module, but shared authentication policy belongs here.

## 02 — Super Admin Platform & Organization Lifecycle

### Purpose

Own the platform-wide Super Admin overview, organization directory, organization creation/deletion, administrator assignment, and platform navigation.

### Normally inspect

- `frontend/src/pages/dashboard/`
- Organization-directory portions of `frontend/src/pages/school/`
- `frontend/src/pages/school/schoolWorkspaceNav.ts`
- `frontend/src/components/manage/ManageShell.tsx`
- The organization model in `vcards/models.py`
- Dashboard overview and organization lifecycle endpoints
- Organization-scope tests

### Avoid

- Member editor internals
- Public card layouts
- Professional profiles
- Print/PDF generation
- Card Designer internals

### Direct dependencies

- Authentication and Super Admin permissions
- Organization records and assigned administrators
- Aggregate member/activity data used by the platform overview

### Scope notes

- Super Admin Dashboard and Organization Management belong together.
- Organization-specific operational work belongs to module 03.

## 03 — Organization Workspace & Member Operations

### Purpose

Own the organization-scoped dashboard, member management, Bulk Upload, credentials, settings, and scoped reports.

### Normally inspect

- `frontend/src/pages/school/`
- Organization and member sections of `vcard_backend/react_api.py`
- Organization/member models in `vcards/models.py`
- Relevant organization helpers in `vcards/views.py`
- Organization and permission tests in `vcards/tests.py`

### Avoid

- Professional profile code
- Card Designer implementation
- Public marketing pages
- PDF/QR implementation unless changing an export contract

### Direct dependencies

- Authentication and organization scoping
- Organization lifecycle from module 02
- Member profiles, activity records, and issued cards
- Member field contracts consumed by module 04

### Scope notes

- Organization Dashboard, member management, Bulk Upload, credentials, settings, and scoped reports belong together.
- Bulk Upload is not a separate major Codex task.
- Preserve the separation between Super Admin platform scope and organization scope.

## 04 — Member Digital Card & Self-Service

### Purpose

Own the public member digital card, owner dashboard/editor, visibility controls, private details, documents, social links, and tracked interactions.

### Normally inspect

- `frontend/src/pages/students/`
- `frontend/src/features/digital-card/`
- Student/member public and management API sections
- Member profile and activity models in `vcards/models.py`
- Tracked contact and vCard endpoints in `vcards/views.py`
- Member digital-card tests

### Avoid

- Organization provisioning
- Professional profile code
- Template administration
- Bulk Upload unless changing the shared member data contract

### Direct dependencies

- Authentication and profile ownership
- Organization/member data from module 03
- Shared media storage and public URL helpers

### Scope notes

- Member Digital Cards and Professional Profiles must remain separate because they use different models, APIs, ownership rules, routes, and UI.

## 05 — ID Card Printing, QR & Data Exports

### Purpose

Own organization print controls, card previews, PDF generation, QR images and archives, spreadsheet exports, and vCard downloads where applicable.

### Normally inspect

- Print and QR portions of `frontend/src/pages/school/SchoolDashboard.tsx`
- Print/export helpers and endpoints in `vcards/views.py`
- Relevant routes in `vcard_backend/urls.py`
- Member print fields and issued-card models in `vcards/models.py`
- Export-specific tests and dependencies

### Avoid

- Public profile layout redesigns
- Professional networking
- Marketing pages
- Card Designer internals unless an explicit integration is being implemented

### Direct dependencies

- Organizations, members, organization branding, and card status
- Server-side PDF, QR, and spreadsheet libraries

### Scope notes

- Printing/exports must remain separate from Template Studio for now.
- The current print/export implementation is not yet the same system as `CardTemplate` and `CardDesign`.

## 06 — Card Designer & Template Studio

### Purpose

Own the visual card editor, asset library, reusable templates, publishing, version history, and user-owned card designs.

### Normally inspect

- `frontend/src/features/card-editor/`
- `card_designer/`
- `/card-editor/` and `/dashboard/templates/` routing
- Private card-media configuration
- `card_designer/tests.py`

### Avoid

- Organization print generation
- Member CRUD and Bulk Upload
- Professional editor fields except the profile-token contract
- Dashboard analytics

### Direct dependencies

- Authentication and design ownership
- Shared/private media storage
- Member and professional profile token data

### Scope notes

- Template Studio and Card Designer belong together.
- Do not treat the organization ID-card print system as part of this module until a deliberate integration is designed.

## 07 — Professional Profiles & Networking

### Purpose

Own professional profile administration, owner editing, public profile rendering, services/highlights/documents, and professional networking.

### Normally inspect

- `frontend/src/pages/professional/`
- `frontend/src/pages/profiles/PublicProfessionalProfile.tsx`
- `frontend/src/pages/profiles/PublicProfessionalProfile.css`
- `professional_cards/`
- Professional sections of `vcard_backend/react_api.py`
- `professional_cards/tests.py`

### Avoid

- Member/student profile workflows
- Organization workspace operations
- Card-canvas internals
- Organization printing and export logic

### Direct dependencies

- Authentication and professional profile ownership
- Shared API/UI helpers and media storage
- Profile data exposed to the Card Designer token system

### Scope notes

- Professional profile administration, owner editing, public profile rendering, and networking belong together.
- Keep this system separate from Member Digital Cards.

## 08 — Marketing Website & Contact

### Purpose

Own the public homepage, audience/product presentation, FAQs, contact submission, SEO-facing content, and marketing assets.

### Normally inspect

- `frontend/src/pages/home/`
- Relevant assets under `theme/static/home/`, `theme/static/branding/`, and `theme/static/products/`
- Contact and SEO endpoints in `vcards/views.py`
- Root route handling

### Avoid

- Dashboard APIs
- Domain models unrelated to contact submission
- Authentication policy
- Card design persistence

### Direct dependencies

- Shared API client
- Branding/static assets
- Contact submission endpoint

### Scope notes

- Do not create a Shop module: the current repository has no `shops` application.

## 09 — Legacy Route Migration & Architecture Cleanup

### Purpose

Own migration fallbacks, obsolete routes, duplicated Django/React handlers, dead code, stale terminology, and cleanup after active modules are stable.

### Normally inspect

- `frontend/src/pages/migration/`
- Legacy route definitions in `frontend/src/App.tsx`
- `vcard_backend/urls.py`
- Relevant legacy sections of `vcards/views.py`
- `docs/react-migration-inventory.md`
- Suspected unused files only after confirming their references

### Avoid

- Changing active feature behavior as part of cleanup
- Deleting routes based only on documentation
- Broad cleanup spanning unstable modules

### Direct dependencies

- Completion and stability of modules 01–08
- Confirmed current routes and production behavior

### Scope notes

- Legacy cleanup should happen after active modules are stable.
- The migration inventory may be stale; the current repository state is authoritative.
- Do not create a Shop task solely because older documentation mentions one.

# Shared / Architectural Hotspots

Shared areas:

- `frontend/src/App.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/components/manage/`
- `frontend/src/design-system/`
- `theme/static/`
- `vcard_backend/urls.py`
- `vcard_backend/react_views.py`
- `vcard_backend/react_api.py`
- `vcards/views.py`
- `frontend/src/pages/school/SchoolDashboard.tsx`
- Common Django `User` and authentication helpers
- Shared media/storage configuration
- Shared permission and role helpers

Hotspot rules:

- Do not read the full file by default.
- Search for the relevant function or component first.
- Read only the relevant range where possible.
- Avoid broad refactoring unless the current task specifically requires it.
- Treat the current repository state as the source of truth.
- Changes to shared areas must remain narrowly scoped and should consider every direct consumer.

# Codex Context & Token Efficiency Rules

- Do not scan the entire repository unless explicitly requested.
- Do not repeatedly rediscover architecture already documented in this file.
- Prefer targeted `rg` searches in known folders.
- Prefer reading relevant function ranges over entire large files.
- Do not repeatedly reopen files whose relevant content is already known in the current task.
- Do not load unrelated documentation or skills unless required.
- Avoid repeated full `git diff`.
- Run the smallest relevant validation first.
- Do not run the full frontend build, full lint, or full backend test suite unless necessary.
- Keep each Codex task focused on one major module.
- If the user starts requesting work from another major module, identify the appropriate Codex task rather than silently expanding scope.
- Current repository code is the source of truth if this document becomes stale.

# How New Codex Tasks Should Use This File

A new Codex task should normally begin by reading this file once, identifying its assigned module, and limiting discovery and implementation to that scope. Shared hotspots should be opened only when the assigned module directly depends on them.

Example task prompt:

```text
Read docs/CODEX_TASK_MAP.md.

This task is:
03 — Organization Workspace & Member Operations.

Follow the module scope and efficiency rules defined there.
Do not rediscover the whole repository architecture.
```
