import { z } from 'zod';
import { NextResponse } from 'next/server';

// --- Reusable param schemas ---
export const positiveInt = z.coerce.number().int().positive();
export const optionalPositiveInt = z.coerce.number().int().positive().optional();

// --- Shared route param schemas ---
export const planIdParam = z.object({ planId: positiveInt });
export const taskIdParam = z.object({ taskId: positiveInt });
export const companyIdParam = z.object({ id: positiveInt });

// --- Helper: parse dynamic route param as positive integer ---
// Returns { value: number } on success or { error: NextResponse } on failure
// Per D-03: validates for NaN, returns 400 with message like "planId must be a positive integer"
// Per D-04: error format is { error: "Validation failed", details: [{ field, message }] }
export function parseIntParam(
  value: string,
  fieldName: string
): { value: number } | { error: NextResponse } {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return {
      error: NextResponse.json(
        {
          error: 'Validation failed',
          details: [{ field: fieldName, message: 'Must be a positive integer' }],
        },
        { status: 400 }
      ),
    };
  }
  return { value: num };
}

// --- Helper: validate request body or query params with Zod schema ---
// Per D-01: strict mode, reject malformed with 400
// Per D-02: extra fields stripped via Zod default .strip() behavior
// Per D-04: structured error format { error, details[] }
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return {
      error: NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}
