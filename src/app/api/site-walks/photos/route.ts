import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { siteWalkPhotos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseIntParam } from '@/lib/validations';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const PHOTO_DIR = path.join(process.cwd(), 'data', 'photos');
const THUMB_WIDTH = 128;
const ORIGINAL_MAX_WIDTH = 1920;

// POST /api/site-walks/photos — upload a photo for a site walk entry
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const entryIdRaw = formData.get('entryId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'photo file is required' }, { status: 400 });
    }
    if (!entryIdRaw) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }

    const parsed = parseIntParam(entryIdRaw, 'entryId');
    if ('error' in parsed) return parsed.error;
    const entryId = parsed.value;

    // Ensure photo directory exists
    fs.mkdirSync(PHOTO_DIR, { recursive: true });

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate filenames with timestamp for uniqueness
    const timestamp = Date.now();
    const originalFilename = `${entryId}-${timestamp}.jpg`;
    const thumbFilename = `${entryId}-${timestamp}-thumb.jpg`;

    const originalPath = path.join(PHOTO_DIR, originalFilename);
    const thumbPath = path.join(PHOTO_DIR, thumbFilename);

    // Resize original to max 1920px wide, JPEG quality 85
    await sharp(buffer)
      .rotate() // auto-rotate based on EXIF
      .resize({ width: ORIGINAL_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(originalPath);

    // Generate thumbnail at 128px wide, JPEG quality 70
    await sharp(buffer)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toFile(thumbPath);

    // Check if a photo already exists for this entry (one photo per entry per D-02)
    const existing = await db
      .select()
      .from(siteWalkPhotos)
      .where(eq(siteWalkPhotos.site_walk_entry_id, entryId));

    if (existing.length > 0) {
      for (const old of existing) {
        // Delete old files from disk
        try { fs.unlinkSync(path.join(PHOTO_DIR, old.original_url)); } catch { /* file may be missing */ }
        if (old.thumbnail_url) {
          try { fs.unlinkSync(path.join(PHOTO_DIR, old.thumbnail_url)); } catch { /* file may be missing */ }
        }
        // Delete old DB row
        await db.delete(siteWalkPhotos).where(eq(siteWalkPhotos.id, old.id));
      }
    }

    // Insert new photo record
    const [photo] = await db.insert(siteWalkPhotos).values({
      site_walk_entry_id: entryId,
      original_url: originalFilename,
      thumbnail_url: thumbFilename,
      content_type: 'image/jpeg',
      file_size: buffer.length,
    }).returning();

    return NextResponse.json({
      id: photo.id,
      originalUrl: `/api/site-walks/${entryId}/photo?type=original`,
      thumbnailUrl: `/api/site-walks/${entryId}/photo?type=thumb`,
    });
  } catch (error) {
    console.error('Error in site-walks/photos POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/site-walks/photos — delete a photo by entryId
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseIntParam(String(body.entryId), 'entryId');
    if ('error' in parsed) return parsed.error;
    const entryId = parsed.value;

    const photos = await db
      .select()
      .from(siteWalkPhotos)
      .where(eq(siteWalkPhotos.site_walk_entry_id, entryId));

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photo found for this entry' }, { status: 404 });
    }

    for (const photo of photos) {
      // Delete files from disk
      try { fs.unlinkSync(path.join(PHOTO_DIR, photo.original_url)); } catch { /* file may be missing */ }
      if (photo.thumbnail_url) {
        try { fs.unlinkSync(path.join(PHOTO_DIR, photo.thumbnail_url)); } catch { /* file may be missing */ }
      }
      // Delete DB row
      await db.delete(siteWalkPhotos).where(eq(siteWalkPhotos.id, photo.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in site-walks/photos DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
