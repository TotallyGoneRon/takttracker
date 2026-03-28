const fetcher = (url: string) => fetch(`/tracking${url}`).then(res => {
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
});

export default fetcher;
