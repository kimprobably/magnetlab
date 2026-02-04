# Libraries & Assets Feature Design

## Overview

Add a "Library" concept to magnetlab that allows grouping multiple lead magnets into a single deliverable. Rename "Pages" to "Assets" to accommodate Lead Magnets, Libraries, and External Resources as first-class asset types.

## Goals

- Enable modular reuse of lead magnets across multiple libraries
- Support importing pre-existing lead magnet collections
- Create beautiful library browsing experience that encourages survey completion
- Allow funnels to deliver single assets, libraries, or external tracked links

## Data Model

### New Tables

```sql
-- Libraries: collections of assets
CREATE TABLE libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon identifier
  slug TEXT NOT NULL,
  auto_feature_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Junction table: many-to-many between libraries and assets
CREATE TABLE library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('lead_magnet', 'external_resource')),
  lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE CASCADE,
  external_resource_id UUID REFERENCES external_resources(id) ON DELETE CASCADE,
  icon_override TEXT, -- per-library emoji/icon override
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE, -- manual feature flag
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(library_id, lead_magnet_id),
  UNIQUE(library_id, external_resource_id),
  CHECK (
    (asset_type = 'lead_magnet' AND lead_magnet_id IS NOT NULL AND external_resource_id IS NULL) OR
    (asset_type = 'external_resource' AND external_resource_id IS NOT NULL AND lead_magnet_id IS NULL)
  )
);

-- External resources: tracked outbound links
CREATE TABLE external_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT, -- default emoji/icon
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track individual clicks for analytics
CREATE TABLE external_resource_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_resource_id UUID NOT NULL REFERENCES external_resources(id) ON DELETE CASCADE,
  funnel_page_id UUID REFERENCES funnel_pages(id) ON DELETE SET NULL,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modify Existing Tables

```sql
-- Add target type flexibility to funnel_pages
ALTER TABLE funnel_pages
  ADD COLUMN target_type TEXT DEFAULT 'lead_magnet'
    CHECK (target_type IN ('lead_magnet', 'library', 'external_resource')),
  ADD COLUMN library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  ADD COLUMN external_resource_id UUID REFERENCES external_resources(id) ON DELETE SET NULL;

-- Backfill existing funnels
UPDATE funnel_pages SET target_type = 'lead_magnet' WHERE target_type IS NULL;
```

## Routes

### Public Routes

| Route | Purpose |
|-------|---------|
| `/p/[username]/[slug]` | Opt-in page (unchanged) |
| `/p/[username]/[slug]/thankyou` | Thank-you page (unchanged) |
| `/p/[username]/[slug]/content` | Single lead magnet content (unchanged) |
| `/p/[username]/[slug]/library` | Library grid page (NEW) |
| `/p/[username]/[slug]/library/[itemSlug]` | Content page within library context (NEW) |
| `/p/[username]/[slug]/r/[resourceId]` | External resource tracked redirect (NEW) |

### Dashboard Routes

| Route | Purpose |
|-------|---------|
| `/(dashboard)/assets` | Asset management (replaces /pages) |
| `/(dashboard)/assets/libraries` | Library list |
| `/(dashboard)/assets/libraries/[id]` | Library editor |
| `/(dashboard)/assets/external` | External resources list |
| `/(dashboard)/assets/external/new` | Create external resource |

Redirect `/pages` → `/assets` for bookmarks.

## UI Components

### Library Page (`/p/[user]/[slug]/library`)

```
┌─────────────────────────────────────────────────────────────┐
│ [Icon] Library Name                                         │
│ Description / subtitle                                      │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Search resources...]                                    │
├─────────────────────────────────────────────────────────────┤
│ ☆ New resources                                             │
│ [Featured cards - larger, with backgrounds]                 │
├─────────────────────────────────────────────────────────────┤
│ All resources                                               │
│ [3-column grid of resource cards]                           │
└─────────────────────────────────────────────────────────────┘
                                          [Floating survey card]
```

Features:
- Client-side search filtering
- "New" section: `is_featured=true` OR `added_at` within `auto_feature_days`
- Featured cards are larger with subtle background
- Responsive grid: 3 cols desktop, 2 tablet, 1 mobile
- External resources show external link indicator
- Floating survey card (bottom-right) if user hasn't completed qualification
- Survey card dismissible for session

### Content Page Sidebar (Library Context)

When accessed via library (`?from=library` param):

```
┌─────────────────────────┐
│ ← Back to [Library]     │
├─────────────────────────┤
│ IN THIS LIBRARY         │
│   📋 Resource 1         │
│ ● 💎 Current Page       │  (highlighted)
│   📅 Resource 3         │
│   🔗 External →         │
├─────────────────────────┤
│ ON THIS PAGE            │
│ • Section 1             │  (existing ToC)
│ • Section 2             │
└─────────────────────────┘
```

- Library section only shows in library context
- Items ordered same as library page
- Current item highlighted, non-clickable
- External resources open in new tab with tracking

### Dashboard - Assets Section

Main view shows all asset types with filter tabs:
- [All] [Lead Magnets] [Libraries] [External Resources]
- Each item shows type icon, title, metadata (item count, click count, library memberships)
- "+ New Asset" dropdown: Create Lead Magnet, Create Library, Add External Resource

### Library Editor (`/assets/libraries/[id]`)

- Icon picker, name, description fields
- Auto-feature days setting
- Drag-and-drop item reordering
- Per-item icon override picker
- Star toggle for manual featuring
- Add Items modal (shows available lead magnets and external resources)

### Funnel Builder Modifications

New "Delivers to" setting:
```
○ Single Lead Magnet    ○ Library    ○ External Resource
[Selector based on chosen type]
```

Thank-you page CTA adapts:
- Lead Magnet → "Access Content" → `/content`
- Library → "Access Library" → `/library`
- External Resource → "Access Resource" → tracked redirect

## Context-Aware Navigation

When a lead magnet belongs to multiple libraries, navigation depends on entry point:

1. User clicks item in Library A → URL includes `?from=library&lib=[libraryId]`
2. Content page reads param, shows "Back to Library A"
3. Sidebar shows Library A's items in Library A's order
4. If accessed directly (no param), no library navigation shown

## Survey Prompt (Library Page)

Floating card in bottom-right corner:
- Appears if user hasn't completed qualification questions
- "Complete your profile survey" with CTA button
- "Maybe later" dismisses for session (sessionStorage)
- Non-blocking - users can browse freely

## Implementation Order

1. **Database migrations**
   - Create `libraries`, `library_items`, `external_resources`, `external_resource_clicks` tables
   - Add `target_type`, `library_id`, `external_resource_id` to `funnel_pages`
   - Backfill existing funnel_pages with `target_type='lead_magnet'`

2. **Types and API routes**
   - TypeScript types for new entities
   - CRUD APIs: `/api/libraries`, `/api/external-resources`
   - Library items management: `/api/libraries/[id]/items`

3. **Dashboard rename**
   - Rename `/pages` → `/assets`
   - Update nav sidebar
   - Add redirect for old route

4. **Assets dashboard UI**
   - Combined asset list with type filters
   - Library list view
   - External resources list view

5. **Library editor**
   - Create/edit library settings
   - Manage items (add, remove, reorder, icons, featuring)

6. **Funnel builder modifications**
   - Target type selector
   - Library/external resource pickers
   - Thank-you page CTA adaptation

7. **Public library page**
   - `/p/[user]/[slug]/library` route
   - Library grid component
   - Search functionality
   - Featured section logic

8. **Content page sidebar integration**
   - Library context detection
   - Combined sidebar (library nav + page ToC)
   - Context-aware back link

9. **External resource tracking**
   - `/p/[user]/[slug]/r/[resourceId]` redirect route
   - Click logging
   - Analytics increment

10. **Floating survey card**
    - Component for library page
    - Session-based dismissal
    - Qualification status check

## What Stays Unchanged

- Lead magnet creation wizard
- Existing funnel pages targeting single lead magnets
- Existing public pages (opt-in, thank-you, content when accessed directly)
- All existing APIs continue working
- Lead magnets can still exist independently (not in any library)
