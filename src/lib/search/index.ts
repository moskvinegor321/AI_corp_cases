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
  let provider = (process.env.SEARCH_PROVIDER || '').toLowerCase();
  // Auto-pick provider if not specified
  if (!provider) {
    if (process.env.NEWSAPI_KEY) provider = 'newsapi';
    else if (process.env.SERPER_API_KEY) provider = 'serper';
    else if (process.env.TAVILY_API_KEY) provider = 'tavily';
  }

  const seen = new Set<string>();
  const out: FoundDoc[] = [];

  async function fetchPage(page: number): Promise<FoundDoc[]> {
    if (provider === 'newsapi') return await searchNewsApi(query, 100, { page });
    if (provider === 'serper') return await searchSerper(query, 100, { page });
    if (provider === 'tavily') return await searchTavily(query, 20); // Tavily не поддерживает страницы в текущем API
    return [];
  }

  try {
    if (!provider) return [];
    let page = 1;
    while (out.length < limit && page <= 10) {
      const docs = await fetchPage(page);
      if (!docs.length) break;
      for (const d of docs) {
        if (out.length >= limit) break;
        const key = (d.url || '').trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(d);
      }
      page += 1;
      // если за страницу не добавилось ни одного уникального — прекращаем
      if (out.length === 0 && page > 2) break;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Search provider error:', e);
  }
  return out;
}


