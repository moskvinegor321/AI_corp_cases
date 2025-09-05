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
  const explicit = (process.env.SEARCH_PROVIDER || '').toLowerCase();
  const candidates: Array<'serper' | 'newsapi' | 'tavily'> = [];
  // Build preference list. Prefer Serper if available, then NewsAPI, then Tavily.
  if (explicit) {
    if (explicit === 'serper' && process.env.SERPER_API_KEY) candidates.push('serper');
    else if (explicit === 'newsapi' && process.env.NEWSAPI_KEY) candidates.push('newsapi');
    else if (explicit === 'tavily' && process.env.TAVILY_API_KEY) candidates.push('tavily');
  }
  if (process.env.SERPER_API_KEY && !candidates.includes('serper')) candidates.push('serper');
  if (process.env.NEWSAPI_KEY && !candidates.includes('newsapi')) candidates.push('newsapi');
  if (process.env.TAVILY_API_KEY && !candidates.includes('tavily')) candidates.push('tavily');

  if (candidates.length === 0) return [];

  const seen = new Set<string>();
  const out: FoundDoc[] = [];

  async function fetchFromProvider(provider: 'serper' | 'newsapi' | 'tavily'): Promise<FoundDoc[]> {
    const local: FoundDoc[] = [];
    let page = 1;
    while (local.length < limit && page <= 10) {
      let docs: FoundDoc[] = [];
      if (provider === 'newsapi') docs = await searchNewsApi(query, 100, { page });
      else if (provider === 'serper') docs = await searchSerper(query, 100, { page });
      else if (provider === 'tavily') docs = await searchTavily(query, 20);
      if (!docs.length) break;
      for (const d of docs) {
        if (local.length >= limit) break;
        const key = (d.url || '').trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        local.push(d);
      }
      page += 1;
      if (local.length === 0 && page > 2) break;
    }
    return local;
  }

  for (const provider of candidates) {
    try {
      const docs = await fetchFromProvider(provider);
      if (docs.length) return docs; // success
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Search provider error (${provider}):`, e);
    }
  }
  return out;
}


