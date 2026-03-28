import { NextRequest, NextResponse } from 'next/server';

// Sync endpoint for offline mode
// Accepts batched mutations from the offline queue and applies them
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { mutations } = body;

  if (!mutations || !Array.isArray(mutations)) {
    return NextResponse.json({ error: 'mutations array required' }, { status: 400 });
  }

  const results = [];
  const conflicts = [];

  for (const mutation of mutations) {
    try {
      // Forward each mutation to its target endpoint
      const { method, path, body: mutationBody, timestamp } = mutation;

      const baseUrl = new URL(request.url).origin;
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: mutationBody ? JSON.stringify(mutationBody) : undefined,
      });

      const data = await res.json();

      if (res.ok) {
        results.push({ success: true, mutation, result: data });
      } else {
        conflicts.push({ mutation, error: data.error || 'Failed' });
      }
    } catch (error) {
      conflicts.push({
        mutation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    applied: results.length,
    conflicts: conflicts.length,
    results,
    conflictDetails: conflicts,
  });
}
