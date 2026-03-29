import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { siteWalkPhotos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseIntParam } from '@/lib/validations';
import path from 'path';
import fs from 'fs';

const PHOTO_DIR = path.join(process.cwd(), 'data', 'photos');

// GET /api/site-walks/[entryId]/photo — serve a photo (original or thumbnail)
export async function GET(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const parsed = parseIntParam(params.entryId, 'entryId');
    if ('error' in parsed) return parsed.error;
    const entryId = parsed.value;

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'thumb';

    const photos = await db
      .select()
      .from(siteWalkPhotos)
      .where(eq(siteWalkPhotos.site_walk_entry_id, entryId));

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photo found for this entry' }, { status: 404 });
    }

    const photo = photos[0];
    const filename = type === 'original' ? photo.original_url : (photo.thumbnail_url || photo.original_url);
    const filePath = path.join(PHOTO_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Photo file not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error in site-walks/[entryId]/photo GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
