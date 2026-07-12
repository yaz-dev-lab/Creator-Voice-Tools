// Normalizes watch/short/embed YouTube URL forms into a canonical embed URL
// suitable for an iframe `src`. Returns null if no video id can be found.
export function toYoutubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1).split('/')[0] || null;
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else if (parsed.pathname.startsWith('/embed/')) {
      id = parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/shorts/')) {
      id = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
    }
  }

  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
