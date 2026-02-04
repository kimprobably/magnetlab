// API Route: Library Items
// GET /api/libraries/[id]/items - List items in library
// POST /api/libraries/[id]/items - Add item to library

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryItemFromRow, type LibraryItemRow, type LibraryItemWithAsset } from '@/lib/types/library';
import { ApiErrors, logApiError, isValidUUID } from '@/lib/api/errors';

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
    if (!isValidUUID(libraryId)) {
      return ApiErrors.validationError('Invalid library ID');
    }

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
    if (!isValidUUID(libraryId)) {
      return ApiErrors.validationError('Invalid library ID');
    }

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
