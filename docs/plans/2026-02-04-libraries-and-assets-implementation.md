# Libraries & Assets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add library collections and external resources to magnetlab, rename Pages to Assets, and enable funnels to target any asset type.

**Architecture:** Many-to-many relationship between libraries and assets (lead magnets + external resources). Funnels gain a `target_type` field to point to lead_magnet, library, or external_resource. New public routes for library pages and tracked redirects.

**Tech Stack:** Next.js 15, Supabase (PostgreSQL), TypeScript, Tailwind CSS, shadcn/ui

---

## Phase 1: Database Schema

### Task 1: Create libraries and external_resources tables

**Files:**
- Create: `supabase/migrations/20260204_libraries_and_assets.sql`

**Step 1: Write the migration file**

```sql
-- Libraries & Assets Schema
-- Adds libraries (collections), external resources (tracked links), and funnel target flexibility

-- ============================================
-- EXTERNAL RESOURCES
-- ============================================

CREATE TABLE external_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🔗',
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_external_resources_user ON external_resources(user_id);

-- ============================================
-- LIBRARIES
-- ============================================

CREATE TABLE libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  slug TEXT NOT NULL,
  auto_feature_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_libraries_user ON libraries(user_id);
CREATE INDEX idx_libraries_slug ON libraries(user_id, slug);

-- ============================================
-- LIBRARY ITEMS (Junction Table)
-- ============================================

CREATE TABLE library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_id UUID REFERENCES libraries(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('lead_magnet', 'external_resource')),
  lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE CASCADE,
  external_resource_id UUID REFERENCES external_resources(id) ON DELETE CASCADE,
  icon_override TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(library_id, lead_magnet_id),
  UNIQUE(library_id, external_resource_id),
  CHECK (
    (asset_type = 'lead_magnet' AND lead_magnet_id IS NOT NULL AND external_resource_id IS NULL) OR
    (asset_type = 'external_resource' AND external_resource_id IS NOT NULL AND lead_magnet_id IS NULL)
  )
);

CREATE INDEX idx_library_items_library ON library_items(library_id);
CREATE INDEX idx_library_items_lead_magnet ON library_items(lead_magnet_id);
CREATE INDEX idx_library_items_external_resource ON library_items(external_resource_id);
CREATE INDEX idx_library_items_sort ON library_items(library_id, sort_order);

-- ============================================
-- EXTERNAL RESOURCE CLICKS (Analytics)
-- ============================================

CREATE TABLE external_resource_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_resource_id UUID REFERENCES external_resources(id) ON DELETE CASCADE NOT NULL,
  funnel_page_id UUID REFERENCES funnel_pages(id) ON DELETE SET NULL,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_external_resource_clicks_resource ON external_resource_clicks(external_resource_id);
CREATE INDEX idx_external_resource_clicks_funnel ON external_resource_clicks(funnel_page_id);

-- ============================================
-- MODIFY FUNNEL PAGES
-- ============================================

-- Add target type flexibility
ALTER TABLE funnel_pages
  ADD COLUMN target_type TEXT DEFAULT 'lead_magnet' CHECK (target_type IN ('lead_magnet', 'library', 'external_resource')),
  ADD COLUMN library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  ADD COLUMN external_resource_id UUID REFERENCES external_resources(id) ON DELETE SET NULL;

-- Remove NOT NULL constraint from lead_magnet_id (libraries and external resources don't need it)
ALTER TABLE funnel_pages ALTER COLUMN lead_magnet_id DROP NOT NULL;

-- Remove UNIQUE constraint on lead_magnet_id (libraries can be used by multiple funnels)
ALTER TABLE funnel_pages DROP CONSTRAINT IF EXISTS funnel_pages_lead_magnet_id_key;

-- Add check constraint for target consistency
ALTER TABLE funnel_pages ADD CONSTRAINT check_funnel_target CHECK (
  (target_type = 'lead_magnet' AND lead_magnet_id IS NOT NULL) OR
  (target_type = 'library' AND library_id IS NOT NULL) OR
  (target_type = 'external_resource' AND external_resource_id IS NOT NULL)
);

-- Index for library lookups
CREATE INDEX idx_funnel_pages_library ON funnel_pages(library_id) WHERE library_id IS NOT NULL;
CREATE INDEX idx_funnel_pages_external_resource ON funnel_pages(external_resource_id) WHERE external_resource_id IS NOT NULL;

-- Backfill existing funnel pages
UPDATE funnel_pages SET target_type = 'lead_magnet' WHERE target_type IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE external_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_resource_clicks ENABLE ROW LEVEL SECURITY;

-- External resources: users can manage their own
CREATE POLICY "Users can manage own external resources" ON external_resources
  FOR ALL USING (auth.uid() = user_id);

-- Libraries: users can manage their own
CREATE POLICY "Users can manage own libraries" ON libraries
  FOR ALL USING (auth.uid() = user_id);

-- Library items: users can manage through library ownership
CREATE POLICY "Users can manage own library items" ON library_items
  FOR ALL USING (library_id IN (SELECT id FROM libraries WHERE user_id = auth.uid()));

-- Anyone can view library items for published funnels (for public library pages)
CREATE POLICY "Anyone can view library items for published funnels" ON library_items
  FOR SELECT USING (library_id IN (
    SELECT library_id FROM funnel_pages WHERE is_published = TRUE AND library_id IS NOT NULL
  ));

-- Anyone can view libraries for published funnels
CREATE POLICY "Anyone can view published libraries" ON libraries
  FOR SELECT USING (id IN (
    SELECT library_id FROM funnel_pages WHERE is_published = TRUE AND library_id IS NOT NULL
  ));

-- External resource clicks: anyone can insert (for tracking), only owner can view
CREATE POLICY "Anyone can insert clicks" ON external_resource_clicks
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view own clicks" ON external_resource_clicks
  FOR SELECT USING (external_resource_id IN (SELECT id FROM external_resources WHERE user_id = auth.uid()));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_external_resources_updated_at BEFORE UPDATE ON external_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_libraries_updated_at BEFORE UPDATE ON libraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply the migration**

Run: `npm run db:push`
Expected: Migration applies successfully

**Step 3: Verify tables exist**

Run: `npx supabase db dump --schema public | grep -E "CREATE TABLE (libraries|library_items|external_resources)"`
Expected: All three tables appear in output

**Step 4: Commit**

```bash
git add supabase/migrations/20260204_libraries_and_assets.sql
git commit -m "feat(db): add libraries, external_resources, and library_items tables

- Libraries for grouping assets into collections
- External resources for tracked outbound links
- Library items junction table with many-to-many support
- Funnel pages now support target_type: lead_magnet | library | external_resource
- RLS policies for all new tables

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: TypeScript Types

### Task 2: Add types for libraries and external resources

**Files:**
- Create: `src/lib/types/library.ts`
- Modify: `src/lib/types/funnel.ts:10-42` (add target_type to FunnelPage interface)

**Step 1: Create library types file**

```typescript
// Library Types for MagnetLab

// ============================================
// EXTERNAL RESOURCES
// ============================================

export interface ExternalResource {
  id: string;
  userId: string;
  title: string;
  url: string;
  icon: string;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalResourceRow {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon: string;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export function externalResourceFromRow(row: ExternalResourceRow): ExternalResource {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    url: row.url,
    icon: row.icon || '🔗',
    clickCount: row.click_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// LIBRARIES
// ============================================

export interface Library {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string;
  slug: string;
  autoFeatureDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  slug: string;
  auto_feature_days: number;
  created_at: string;
  updated_at: string;
}

export function libraryFromRow(row: LibraryRow): Library {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    icon: row.icon || '📚',
    slug: row.slug,
    autoFeatureDays: row.auto_feature_days || 14,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// LIBRARY ITEMS
// ============================================

export type LibraryItemAssetType = 'lead_magnet' | 'external_resource';

export interface LibraryItem {
  id: string;
  libraryId: string;
  assetType: LibraryItemAssetType;
  leadMagnetId: string | null;
  externalResourceId: string | null;
  iconOverride: string | null;
  sortOrder: number;
  isFeatured: boolean;
  addedAt: string;
}

export interface LibraryItemRow {
  id: string;
  library_id: string;
  asset_type: string;
  lead_magnet_id: string | null;
  external_resource_id: string | null;
  icon_override: string | null;
  sort_order: number;
  is_featured: boolean;
  added_at: string;
}

export function libraryItemFromRow(row: LibraryItemRow): LibraryItem {
  return {
    id: row.id,
    libraryId: row.library_id,
    assetType: row.asset_type as LibraryItemAssetType,
    leadMagnetId: row.lead_magnet_id,
    externalResourceId: row.external_resource_id,
    iconOverride: row.icon_override,
    sortOrder: row.sort_order,
    isFeatured: row.is_featured,
    addedAt: row.added_at,
  };
}

// ============================================
// LIBRARY ITEM WITH ASSET DATA (for display)
// ============================================

export interface LibraryItemWithAsset extends LibraryItem {
  // Lead magnet data (if asset_type = 'lead_magnet')
  leadMagnet?: {
    id: string;
    title: string;
    slug?: string;
  };
  // External resource data (if asset_type = 'external_resource')
  externalResource?: {
    id: string;
    title: string;
    url: string;
    icon: string;
  };
  // Computed display properties
  displayTitle: string;
  displayIcon: string;
  isNew: boolean; // Based on addedAt and library's autoFeatureDays
}

// ============================================
// API PAYLOADS
// ============================================

export interface CreateLibraryPayload {
  name: string;
  description?: string;
  icon?: string;
  slug?: string;
  autoFeatureDays?: number;
}

export interface UpdateLibraryPayload {
  name?: string;
  description?: string | null;
  icon?: string;
  slug?: string;
  autoFeatureDays?: number;
}

export interface AddLibraryItemPayload {
  assetType: LibraryItemAssetType;
  leadMagnetId?: string;
  externalResourceId?: string;
  iconOverride?: string;
  sortOrder?: number;
  isFeatured?: boolean;
}

export interface UpdateLibraryItemPayload {
  iconOverride?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
}

export interface ReorderLibraryItemsPayload {
  items: Array<{ id: string; sortOrder: number }>;
}

export interface CreateExternalResourcePayload {
  title: string;
  url: string;
  icon?: string;
}

export interface UpdateExternalResourcePayload {
  title?: string;
  url?: string;
  icon?: string;
}

// ============================================
// PUBLIC LIBRARY PAGE DATA
// ============================================

export interface PublicLibraryPageData {
  // Library info
  libraryId: string;
  name: string;
  description: string | null;
  icon: string;
  autoFeatureDays: number;

  // Items with display data
  items: Array<{
    id: string;
    assetType: LibraryItemAssetType;
    title: string;
    icon: string;
    slug: string | null; // For lead magnets
    externalUrl: string | null; // For external resources
    isFeatured: boolean;
    isNew: boolean;
    sortOrder: number;
  }>;

  // Funnel info (for theming and context)
  funnelSlug: string;
  username: string;

  // User info
  userName: string | null;
  userAvatar: string | null;

  // Theme
  theme: 'dark' | 'light';
  primaryColor: string;
  logoUrl: string | null;

  // Qualification status
  hasQuestions: boolean;
  leadId: string | null;
  hasCompletedSurvey: boolean;
}
```

**Step 2: Update FunnelPage interface in funnel.ts**

Add these fields to the `FunnelPage` interface after `leadMagnetId`:

```typescript
export type FunnelTargetType = 'lead_magnet' | 'library' | 'external_resource';

export interface FunnelPage {
  id: string;
  leadMagnetId: string | null; // Now nullable
  userId: string;
  slug: string;

  // Target type (what this funnel delivers)
  targetType: FunnelTargetType;
  libraryId: string | null;
  externalResourceId: string | null;

  // ... rest of existing fields
```

Also update `FunnelPageRow` and `funnelPageFromRow` to include:

```typescript
// In FunnelPageRow:
target_type: string;
library_id: string | null;
external_resource_id: string | null;

// In funnelPageFromRow:
targetType: (row.target_type || 'lead_magnet') as FunnelTargetType,
libraryId: row.library_id || null,
externalResourceId: row.external_resource_id || null,
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors (may have errors from code not yet updated - that's expected)

**Step 4: Commit**

```bash
git add src/lib/types/library.ts src/lib/types/funnel.ts
git commit -m "feat(types): add library and external resource types

- ExternalResource type for tracked outbound links
- Library type for asset collections
- LibraryItem junction type with asset data
- FunnelPage now supports targetType field
- API payload types for all new entities

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: API Routes for Libraries

### Task 3: Create libraries CRUD API

**Files:**
- Create: `src/app/api/libraries/route.ts`
- Create: `src/app/api/libraries/[id]/route.ts`
- Create: `src/app/api/libraries/[id]/items/route.ts`
- Create: `src/app/api/libraries/[id]/items/[itemId]/route.ts`
- Create: `src/app/api/libraries/[id]/items/reorder/route.ts`

**Step 1: Create main libraries route (list + create)**

File: `src/app/api/libraries/route.ts`

```typescript
// API Route: Libraries List and Create
// GET /api/libraries - List all libraries
// POST /api/libraries - Create new library

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryFromRow, type LibraryRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

// GET - List all libraries for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('libraries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logApiError('libraries/list', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to fetch libraries');
    }

    const libraries = (data as LibraryRow[]).map(libraryFromRow);

    return NextResponse.json({ libraries });
  } catch (error) {
    logApiError('libraries/list', error);
    return ApiErrors.internalError('Failed to fetch libraries');
  }
}

// POST - Create a new library
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { name, description, icon, slug: requestedSlug, autoFeatureDays } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validationError('name is required');
    }

    const supabase = createSupabaseAdminClient();

    // Generate slug from name if not provided
    let baseSlug = requestedSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let finalSlug = baseSlug;
    let slugSuffix = 0;

    // Check for slug collision and auto-increment if needed
    while (true) {
      const { data: slugExists } = await supabase
        .from('libraries')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('slug', finalSlug)
        .single();

      if (!slugExists) break;

      slugSuffix++;
      finalSlug = `${baseSlug}-${slugSuffix}`;
    }

    const insertData = {
      user_id: session.user.id,
      name: name.trim(),
      description: description || null,
      icon: icon || '📚',
      slug: finalSlug,
      auto_feature_days: autoFeatureDays || 14,
    };

    const { data, error } = await supabase
      .from('libraries')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logApiError('libraries/create', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to create library');
    }

    return NextResponse.json(
      { library: libraryFromRow(data as LibraryRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('libraries/create', error);
    return ApiErrors.internalError('Failed to create library');
  }
}
```

**Step 2: Create single library route (get, update, delete)**

File: `src/app/api/libraries/[id]/route.ts`

```typescript
// API Route: Single Library
// GET /api/libraries/[id] - Get library
// PUT /api/libraries/[id] - Update library
// DELETE /api/libraries/[id] - Delete library

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryFromRow, type LibraryRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single library
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('libraries')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return ApiErrors.notFound('Library');
    }

    return NextResponse.json({ library: libraryFromRow(data as LibraryRow) });
  } catch (error) {
    logApiError('libraries/get', error);
    return ApiErrors.internalError('Failed to fetch library');
  }
}

// PUT - Update library
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, slug, autoFeatureDays } = body;

    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('Library');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (autoFeatureDays !== undefined) updateData.auto_feature_days = autoFeatureDays;

    // Handle slug change with collision check
    if (slug !== undefined) {
      const { data: slugExists } = await supabase
        .from('libraries')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (slugExists) {
        return ApiErrors.conflict('Slug already in use');
      }
      updateData.slug = slug;
    }

    const { data, error } = await supabase
      .from('libraries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logApiError('libraries/update', error, { userId: session.user.id, libraryId: id });
      return ApiErrors.databaseError('Failed to update library');
    }

    return NextResponse.json({ library: libraryFromRow(data as LibraryRow) });
  } catch (error) {
    logApiError('libraries/update', error);
    return ApiErrors.internalError('Failed to update library');
  }
}

// DELETE - Delete library
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('Library');
    }

    const { error } = await supabase
      .from('libraries')
      .delete()
      .eq('id', id);

    if (error) {
      logApiError('libraries/delete', error, { userId: session.user.id, libraryId: id });
      return ApiErrors.databaseError('Failed to delete library');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('libraries/delete', error);
    return ApiErrors.internalError('Failed to delete library');
  }
}
```

**Step 3: Create library items route (list + add)**

File: `src/app/api/libraries/[id]/items/route.ts`

```typescript
// API Route: Library Items
// GET /api/libraries/[id]/items - List items in library
// POST /api/libraries/[id]/items - Add item to library

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryItemFromRow, type LibraryItemRow, type LibraryItemWithAsset } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List all items in library with asset data
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId } = await params;
    const supabase = createSupabaseAdminClient();

    // Verify library ownership
    const { data: library } = await supabase
      .from('libraries')
      .select('id, auto_feature_days')
      .eq('id', libraryId)
      .eq('user_id', session.user.id)
      .single();

    if (!library) {
      return ApiErrors.notFound('Library');
    }

    // Fetch items with joined asset data
    const { data: itemRows, error } = await supabase
      .from('library_items')
      .select(`
        *,
        lead_magnets:lead_magnet_id (id, title, slug),
        external_resources:external_resource_id (id, title, url, icon)
      `)
      .eq('library_id', libraryId)
      .order('sort_order', { ascending: true });

    if (error) {
      logApiError('libraries/items/list', error, { userId: session.user.id, libraryId });
      return ApiErrors.databaseError('Failed to fetch library items');
    }

    // Calculate "new" status based on auto_feature_days
    const autoFeatureDays = library.auto_feature_days || 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoFeatureDays);

    const items: LibraryItemWithAsset[] = (itemRows || []).map((row: LibraryItemRow & { lead_magnets?: { id: string; title: string; slug?: string }; external_resources?: { id: string; title: string; url: string; icon: string } }) => {
      const baseItem = libraryItemFromRow(row);
      const isNew = new Date(baseItem.addedAt) > cutoffDate;

      if (row.asset_type === 'lead_magnet' && row.lead_magnets) {
        return {
          ...baseItem,
          leadMagnet: row.lead_magnets,
          displayTitle: row.lead_magnets.title,
          displayIcon: row.icon_override || '📄',
          isNew,
        };
      } else if (row.asset_type === 'external_resource' && row.external_resources) {
        return {
          ...baseItem,
          externalResource: row.external_resources,
          displayTitle: row.external_resources.title,
          displayIcon: row.icon_override || row.external_resources.icon || '🔗',
          isNew,
        };
      }

      // Fallback (shouldn't happen)
      return {
        ...baseItem,
        displayTitle: 'Unknown',
        displayIcon: '❓',
        isNew,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    logApiError('libraries/items/list', error);
    return ApiErrors.internalError('Failed to fetch library items');
  }
}

// POST - Add item to library
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId } = await params;
    const body = await request.json();
    const { assetType, leadMagnetId, externalResourceId, iconOverride, sortOrder, isFeatured } = body;

    if (!assetType || !['lead_magnet', 'external_resource'].includes(assetType)) {
      return ApiErrors.validationError('assetType must be lead_magnet or external_resource');
    }

    if (assetType === 'lead_magnet' && !leadMagnetId) {
      return ApiErrors.validationError('leadMagnetId is required for lead_magnet type');
    }

    if (assetType === 'external_resource' && !externalResourceId) {
      return ApiErrors.validationError('externalResourceId is required for external_resource type');
    }

    const supabase = createSupabaseAdminClient();

    // Verify library ownership
    const { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', session.user.id)
      .single();

    if (!library) {
      return ApiErrors.notFound('Library');
    }

    // Verify asset ownership
    if (assetType === 'lead_magnet') {
      const { data: lm } = await supabase
        .from('lead_magnets')
        .select('id')
        .eq('id', leadMagnetId)
        .eq('user_id', session.user.id)
        .single();

      if (!lm) {
        return ApiErrors.notFound('Lead magnet');
      }
    } else {
      const { data: er } = await supabase
        .from('external_resources')
        .select('id')
        .eq('id', externalResourceId)
        .eq('user_id', session.user.id)
        .single();

      if (!er) {
        return ApiErrors.notFound('External resource');
      }
    }

    // Get max sort_order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('library_items')
        .select('sort_order')
        .eq('library_id', libraryId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      finalSortOrder = (maxOrder?.sort_order ?? -1) + 1;
    }

    const insertData = {
      library_id: libraryId,
      asset_type: assetType,
      lead_magnet_id: assetType === 'lead_magnet' ? leadMagnetId : null,
      external_resource_id: assetType === 'external_resource' ? externalResourceId : null,
      icon_override: iconOverride || null,
      sort_order: finalSortOrder,
      is_featured: isFeatured || false,
    };

    const { data, error } = await supabase
      .from('library_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return ApiErrors.conflict('Item already exists in this library');
      }
      logApiError('libraries/items/add', error, { userId: session.user.id, libraryId });
      return ApiErrors.databaseError('Failed to add item to library');
    }

    return NextResponse.json(
      { item: libraryItemFromRow(data as LibraryItemRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('libraries/items/add', error);
    return ApiErrors.internalError('Failed to add item to library');
  }
}
```

**Step 4: Create single library item route (update, delete)**

File: `src/app/api/libraries/[id]/items/[itemId]/route.ts`

```typescript
// API Route: Single Library Item
// PUT /api/libraries/[id]/items/[itemId] - Update item
// DELETE /api/libraries/[id]/items/[itemId] - Remove item

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryItemFromRow, type LibraryItemRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// PUT - Update library item
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId, itemId } = await params;
    const body = await request.json();
    const { iconOverride, sortOrder, isFeatured } = body;

    const supabase = createSupabaseAdminClient();

    // Verify library ownership
    const { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', session.user.id)
      .single();

    if (!library) {
      return ApiErrors.notFound('Library');
    }

    // Verify item exists in library
    const { data: existing } = await supabase
      .from('library_items')
      .select('id')
      .eq('id', itemId)
      .eq('library_id', libraryId)
      .single();

    if (!existing) {
      return ApiErrors.notFound('Library item');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (iconOverride !== undefined) updateData.icon_override = iconOverride;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isFeatured !== undefined) updateData.is_featured = isFeatured;

    const { data, error } = await supabase
      .from('library_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      logApiError('libraries/items/update', error, { userId: session.user.id, libraryId, itemId });
      return ApiErrors.databaseError('Failed to update library item');
    }

    return NextResponse.json({ item: libraryItemFromRow(data as LibraryItemRow) });
  } catch (error) {
    logApiError('libraries/items/update', error);
    return ApiErrors.internalError('Failed to update library item');
  }
}

// DELETE - Remove item from library
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId, itemId } = await params;
    const supabase = createSupabaseAdminClient();

    // Verify library ownership
    const { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', session.user.id)
      .single();

    if (!library) {
      return ApiErrors.notFound('Library');
    }

    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('id', itemId)
      .eq('library_id', libraryId);

    if (error) {
      logApiError('libraries/items/delete', error, { userId: session.user.id, libraryId, itemId });
      return ApiErrors.databaseError('Failed to remove item from library');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('libraries/items/delete', error);
    return ApiErrors.internalError('Failed to remove item from library');
  }
}
```

**Step 5: Create reorder route**

File: `src/app/api/libraries/[id]/items/reorder/route.ts`

```typescript
// API Route: Reorder Library Items
// POST /api/libraries/[id]/items/reorder - Batch update sort orders

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId } = await params;
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return ApiErrors.validationError('items array is required');
    }

    const supabase = createSupabaseAdminClient();

    // Verify library ownership
    const { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', session.user.id)
      .single();

    if (!library) {
      return ApiErrors.notFound('Library');
    }

    // Update each item's sort_order
    const updates = items.map((item: { id: string; sortOrder: number }) =>
      supabase
        .from('library_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)
        .eq('library_id', libraryId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      logApiError('libraries/items/reorder', errors[0].error, { userId: session.user.id, libraryId });
      return ApiErrors.databaseError('Failed to reorder some items');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('libraries/items/reorder', error);
    return ApiErrors.internalError('Failed to reorder items');
  }
}
```

**Step 6: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/api/libraries/
git commit -m "feat(api): add libraries CRUD API routes

- GET/POST /api/libraries - list and create libraries
- GET/PUT/DELETE /api/libraries/[id] - single library operations
- GET/POST /api/libraries/[id]/items - list and add items
- PUT/DELETE /api/libraries/[id]/items/[itemId] - item operations
- POST /api/libraries/[id]/items/reorder - batch reorder

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Create external resources CRUD API

**Files:**
- Create: `src/app/api/external-resources/route.ts`
- Create: `src/app/api/external-resources/[id]/route.ts`

**Step 1: Create main external resources route**

File: `src/app/api/external-resources/route.ts`

```typescript
// API Route: External Resources List and Create
// GET /api/external-resources - List all external resources
// POST /api/external-resources - Create new external resource

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { externalResourceFromRow, type ExternalResourceRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

// GET - List all external resources for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('external_resources')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logApiError('external-resources/list', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to fetch external resources');
    }

    const resources = (data as ExternalResourceRow[]).map(externalResourceFromRow);

    return NextResponse.json({ resources });
  } catch (error) {
    logApiError('external-resources/list', error);
    return ApiErrors.internalError('Failed to fetch external resources');
  }
}

// POST - Create a new external resource
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { title, url, icon } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return ApiErrors.validationError('title is required');
    }

    if (!url || typeof url !== 'string') {
      return ApiErrors.validationError('url is required');
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return ApiErrors.validationError('url must be a valid URL');
    }

    const supabase = createSupabaseAdminClient();

    const insertData = {
      user_id: session.user.id,
      title: title.trim(),
      url: url.trim(),
      icon: icon || '🔗',
    };

    const { data, error } = await supabase
      .from('external_resources')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logApiError('external-resources/create', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to create external resource');
    }

    return NextResponse.json(
      { resource: externalResourceFromRow(data as ExternalResourceRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('external-resources/create', error);
    return ApiErrors.internalError('Failed to create external resource');
  }
}
```

**Step 2: Create single external resource route**

File: `src/app/api/external-resources/[id]/route.ts`

```typescript
// API Route: Single External Resource
// GET /api/external-resources/[id] - Get external resource
// PUT /api/external-resources/[id] - Update external resource
// DELETE /api/external-resources/[id] - Delete external resource

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { externalResourceFromRow, type ExternalResourceRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single external resource
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('external_resources')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return ApiErrors.notFound('External resource');
    }

    return NextResponse.json({ resource: externalResourceFromRow(data as ExternalResourceRow) });
  } catch (error) {
    logApiError('external-resources/get', error);
    return ApiErrors.internalError('Failed to fetch external resource');
  }
}

// PUT - Update external resource
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { title, url, icon } = body;

    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('external_resources')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('External resource');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url;
      } catch {
        return ApiErrors.validationError('url must be a valid URL');
      }
    }
    if (icon !== undefined) updateData.icon = icon;

    const { data, error } = await supabase
      .from('external_resources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logApiError('external-resources/update', error, { userId: session.user.id, resourceId: id });
      return ApiErrors.databaseError('Failed to update external resource');
    }

    return NextResponse.json({ resource: externalResourceFromRow(data as ExternalResourceRow) });
  } catch (error) {
    logApiError('external-resources/update', error);
    return ApiErrors.internalError('Failed to update external resource');
  }
}

// DELETE - Delete external resource
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('external_resources')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('External resource');
    }

    const { error } = await supabase
      .from('external_resources')
      .delete()
      .eq('id', id);

    if (error) {
      logApiError('external-resources/delete', error, { userId: session.user.id, resourceId: id });
      return ApiErrors.databaseError('Failed to delete external resource');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('external-resources/delete', error);
    return ApiErrors.internalError('Failed to delete external resource');
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/external-resources/
git commit -m "feat(api): add external resources CRUD API routes

- GET/POST /api/external-resources - list and create
- GET/PUT/DELETE /api/external-resources/[id] - single resource operations
- URL validation on create/update

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Dashboard Rename (Pages → Assets)

### Task 5: Rename Pages to Assets in dashboard

**Files:**
- Rename: `src/app/(dashboard)/pages/` → `src/app/(dashboard)/assets/`
- Create: `src/app/(dashboard)/pages/page.tsx` (redirect)
- Modify: Dashboard navigation (sidebar)

**Step 1: Move the pages directory to assets**

Run: `mv "src/app/(dashboard)/pages" "src/app/(dashboard)/assets"`

**Step 2: Create redirect from old /pages route**

File: `src/app/(dashboard)/pages/page.tsx`

```typescript
import { redirect } from 'next/navigation';

export default function PagesRedirect() {
  redirect('/assets');
}
```

**Step 3: Update the assets page to reflect new naming**

Update heading in `src/app/(dashboard)/assets/page.tsx`:
- Change "Funnel Pages" to "Assets"
- Change subtitle to "Manage your lead magnets, libraries, and external resources"

**Step 4: Update navigation sidebar**

Find the sidebar component and change "Pages" to "Assets" and update the href.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/assets/ src/app/\(dashboard\)/pages/
git commit -m "refactor(dashboard): rename Pages to Assets

- Move /pages route to /assets
- Add redirect from /pages for bookmarks
- Update navigation and headings

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Public Library Page

### Task 6: Create public library page route

**Files:**
- Create: `src/app/p/[username]/[slug]/library/page.tsx`
- Create: `src/components/library/LibraryPageClient.tsx`
- Create: `src/components/library/LibraryGrid.tsx`
- Create: `src/components/library/LibrarySearch.tsx`
- Create: `src/components/library/SurveyPromptCard.tsx`

This is a larger task - implement the server component that fetches library data and the client components for the interactive library page.

**Step 1: Create the server component**

File: `src/app/p/[username]/[slug]/library/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { LibraryPageClient } from '@/components/library/LibraryPageClient';
import type { Metadata } from 'next';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ leadId?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (!user) return { title: 'Page Not Found' };

  const { data: funnel } = await supabase
    .from('funnel_pages')
    .select('library_id')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('target_type', 'library')
    .single();

  if (!funnel?.library_id) return { title: 'Page Not Found' };

  const { data: library } = await supabase
    .from('libraries')
    .select('name, description')
    .eq('id', funnel.library_id)
    .single();

  if (!library) return { title: 'Page Not Found' };

  return {
    title: library.name,
    description: library.description || `Access the ${library.name} resource library`,
  };
}

export default async function PublicLibraryPage({ params, searchParams }: PageProps) {
  const { username, slug } = await params;
  const { leadId } = await searchParams;
  const supabase = createSupabaseAdminClient();

  // Find user
  const { data: user } = await supabase
    .from('users')
    .select('id, name, image')
    .eq('username', username)
    .single();

  if (!user) notFound();

  // Find published funnel with library target
  const { data: funnel } = await supabase
    .from('funnel_pages')
    .select(`
      id,
      slug,
      library_id,
      theme,
      primary_color,
      logo_url,
      calendly_url
    `)
    .eq('user_id', user.id)
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('target_type', 'library')
    .single();

  if (!funnel?.library_id) notFound();

  // Get library with items
  const { data: library } = await supabase
    .from('libraries')
    .select('id, name, description, icon, auto_feature_days')
    .eq('id', funnel.library_id)
    .single();

  if (!library) notFound();

  // Get library items with asset data
  const { data: itemRows } = await supabase
    .from('library_items')
    .select(`
      id,
      asset_type,
      icon_override,
      sort_order,
      is_featured,
      added_at,
      lead_magnets:lead_magnet_id (id, title, slug),
      external_resources:external_resource_id (id, title, url, icon)
    `)
    .eq('library_id', library.id)
    .order('sort_order', { ascending: true });

  // Calculate "new" cutoff
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (library.auto_feature_days || 14));

  // Transform items for display
  const items = (itemRows || []).map((row: Record<string, unknown>) => {
    const addedAt = new Date(row.added_at as string);
    const isNew = addedAt > cutoffDate;
    const lm = row.lead_magnets as { id: string; title: string; slug?: string } | null;
    const er = row.external_resources as { id: string; title: string; url: string; icon: string } | null;

    if (row.asset_type === 'lead_magnet' && lm) {
      return {
        id: row.id as string,
        assetType: 'lead_magnet' as const,
        title: lm.title,
        icon: (row.icon_override as string) || '📄',
        slug: lm.slug || lm.id,
        externalUrl: null,
        isFeatured: row.is_featured as boolean,
        isNew,
        sortOrder: row.sort_order as number,
      };
    } else if (row.asset_type === 'external_resource' && er) {
      return {
        id: row.id as string,
        assetType: 'external_resource' as const,
        title: er.title,
        icon: (row.icon_override as string) || er.icon || '🔗',
        slug: null,
        externalUrl: er.url,
        isFeatured: row.is_featured as boolean,
        isNew,
        sortOrder: row.sort_order as number,
        resourceId: er.id,
      };
    }
    return null;
  }).filter(Boolean);

  // Check if lead has completed survey
  let hasCompletedSurvey = false;
  if (leadId) {
    const { data: lead } = await supabase
      .from('funnel_leads')
      .select('qualification_answers')
      .eq('id', leadId)
      .single();
    hasCompletedSurvey = lead?.qualification_answers && Object.keys(lead.qualification_answers).length > 0;
  }

  // Check if funnel has questions
  let hasQuestions = false;
  if (funnel.calendly_url) {
    const { count } = await supabase
      .from('qualification_questions')
      .select('*', { count: 'exact', head: true })
      .eq('funnel_page_id', funnel.id);
    hasQuestions = (count ?? 0) > 0;
  }

  return (
    <LibraryPageClient
      library={{
        id: library.id,
        name: library.name,
        description: library.description,
        icon: library.icon,
      }}
      items={items}
      funnelSlug={funnel.slug}
      username={username}
      userName={user.name}
      userAvatar={user.image}
      theme={(funnel.theme as 'dark' | 'light') || 'dark'}
      primaryColor={funnel.primary_color || '#8b5cf6'}
      logoUrl={funnel.logo_url}
      hasQuestions={hasQuestions}
      leadId={leadId || null}
      hasCompletedSurvey={hasCompletedSurvey}
      funnelPageId={funnel.id}
    />
  );
}
```

(Continue with client components in subsequent steps...)

**Step 2-5: Implement client components**

Due to length, these will be created as separate files following the same patterns. Key components:
- `LibraryPageClient.tsx` - Main client wrapper with theme, search state
- `LibraryGrid.tsx` - Grid of resource cards
- `LibrarySearch.tsx` - Search input with filtering
- `SurveyPromptCard.tsx` - Floating survey prompt card

**Step 6: Commit**

```bash
git add src/app/p/\[username\]/\[slug\]/library/ src/components/library/
git commit -m "feat(public): add public library page

- Server component fetches library and items
- Client components for grid, search, survey prompt
- Respects funnel theming
- Featured/new items section

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Content Page Sidebar Integration

### Task 7: Update TableOfContents to support library context

**Files:**
- Modify: `src/components/content/TableOfContents.tsx`
- Modify: `src/components/content/ContentPageClient.tsx`
- Create: `src/app/p/[username]/[slug]/library/[itemSlug]/page.tsx`

Add library navigation section above existing ToC when in library context.

---

## Phase 7: External Resource Tracking

### Task 8: Create external resource redirect route

**Files:**
- Create: `src/app/p/[username]/[slug]/r/[resourceId]/route.ts`

This route logs the click and redirects to the external URL.

---

## Phase 8: Funnel Builder Modifications

### Task 9: Update funnel builder to support target type selection

**Files:**
- Modify funnel builder components to add target type selector
- Update funnel API to handle library/external resource targets

---

## Phase 9: Assets Dashboard UI

### Task 10: Build complete Assets dashboard

**Files:**
- Modify: `src/app/(dashboard)/assets/page.tsx` - Add tabs and filters
- Create: `src/app/(dashboard)/assets/libraries/page.tsx`
- Create: `src/app/(dashboard)/assets/libraries/[id]/page.tsx` - Library editor
- Create: `src/app/(dashboard)/assets/external/page.tsx`

---

## Summary

This plan covers:
1. Database schema for libraries, external resources, and funnel targeting
2. TypeScript types for all new entities
3. API routes for CRUD operations
4. Dashboard rename (Pages → Assets)
5. Public library page with search and featured items
6. Content page sidebar with library navigation
7. External resource click tracking
8. Funnel builder target type selection
9. Complete Assets dashboard with library editor

Each task is designed to be independently testable and committable.
