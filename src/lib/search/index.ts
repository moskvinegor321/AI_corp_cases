import { searchNewsApi } from './newsapi';
import { searchSerper } from './serper';
import { searchTavily } from './tavily';

export type FoundDoc = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string; // ISO string if provided by API
  snippet?: string;
};

// Best-effort extraction of publishedAt from provider data or the page URL string
export function extractPublishedAt(input?: string): Date | null {
  if (!input) return null;
  // try parse ISO
  const iso = Date.parse(input);
  if (!Number.isNaN(iso)) return new Date(iso);
  // try yyyy-mm-dd pattern inside string
  const m = input.match(/(20\d{2})[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}`);
  return null;
}

export async function searchNews(query: string, limit = 20): Promise<FoundDoc[]> {
  const provider = (process.env.SEARCH_PROVIDER || '').toLowerCase();
  try {
    if (provider === 'newsapi') return await searchNewsApi(query, limit);
    if (provider === 'serper') return await searchSerper(query, limit);
    if (provider === 'tavily') return await searchTavily(query, limit);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Search provider error:', e);
  }
  return [];
}


