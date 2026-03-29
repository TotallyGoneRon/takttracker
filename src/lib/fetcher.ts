const fetcher = (url: string) => fetch(`/tracking${url}`).then(res => {
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
});

export default fetcher;

// Mutation helper for POST/PUT/PATCH/DELETE calls
// Auto-prepends /tracking basePath (same as SWR fetcher)
// Does NOT set Content-Type for FormData bodies (lets browser set multipart boundary)
export async function apiMutate(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`/tracking${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}
