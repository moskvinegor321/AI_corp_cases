import axios from 'axios';
import type { FoundDoc } from './index';

type SerperNewsItem = {
  title: string;
  link: string;
  source?: string;
  date?: string;
  snippet?: string;
};

type SerperSearchItem = { title: string; link: string; snippet?: string; date?: string; source?: string };
type SerperResponse = { news?: SerperNewsItem[]; organic?: SerperSearchItem[] };

export async function searchSerper(query: string, limit = 20, options?: { page?: number }): Promise<FoundDoc[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  // Default to US/English unless overridden via env
  const gl = process.env.SERPER_GL || 'us';
  const hl = process.env.SERPER_HL || 'en';
  const page = options?.page ?? 1;
  const payload: Record<string, string | number> = { q: query, num: Math.min(limit, 100), page };
  if (gl) payload.gl = gl;
  if (hl) payload.hl = hl;

  const headers = { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } as const;

  // Prefer news endpoint; if 400 (plan restriction) or empty results, fallback to /search
  async function tryEndpoint(endpoint: 'news' | 'search'): Promise<SerperResponse | null> {
    try {
      const { data } = await axios.post<SerperResponse>(`https://google.serper.dev/${endpoint}`, payload, { headers });
      if (process.env.DEBUG_SEARCH === 'true') {
        // eslint-disable-next-line no-console
        console.log(`[serper] ${endpoint} q="${query}" page=${page} → news:${data.news?.length||0} organic:${data.organic?.length||0}`);
      }
      return data;
    } catch (_e: unknown) {
      // 400 indicates plan not supporting endpoint or bad params; fall through
      return null;
    }
  }

  const prefer = (process.env.SERPER_ENDPOINT as 'news' | 'search' | undefined) || 'news';
  let data: SerperResponse | null = await tryEndpoint(prefer);
  // Fallback if empty payload (some plans return 200 with empty array)
  if (!data || ((data.news?.length || 0) + (data.organic?.length || 0)) === 0) {
    data = (await tryEndpoint(prefer === 'news' ? 'search' : 'news')) ?? data;
  }

  let news = data?.news || [];
  let organic = data?.organic || [];

  // If still empty, try a simplified query (remove quotes/AND/parentheses/time hints)
  if ((news.length + organic.length) === 0) {
    const simplify = (q: string) => q
      .replace(/last\s*\d+\s*days/ig, ' ')
      .replace(/[()\"]+/g, ' ')
      .replace(/\bAND\b/ig, ' ')
      .replace(/\s+OR\s+/ig, ' OR ')
      .replace(/\s+/g, ' ') // collapse
      .trim();
    const simpler = simplify(query);
    if (simpler && simpler !== query) {
      const payload2: Record<string, string | number> = { q: simpler, num: Math.min(limit, 100), page };
      if (gl) payload2.gl = gl;
      if (hl) payload2.hl = hl;
      try {
        const { data: data2 } = await axios.post<SerperResponse>(`https://google.serper.dev/${prefer}`, payload2, { headers });
        if (process.env.DEBUG_SEARCH === 'true') {
          // eslint-disable-next-line no-console
          console.log(`[serper] simplified q="${simpler}" → news:${data2.news?.length||0} organic:${data2.organic?.length||0}`);
        }
        news = data2.news || [];
        organic = data2.organic || [];
      } catch { /* ignore */ }
    }
  }

  if (news.length) {
    return news.map((n) => ({
      title: n.title,
      url: n.link,
      source: n.source,
      publishedAt: n.date,
      snippet: n.snippet,
    }));
  }
  return organic.map((o) => ({
    title: o.title,
    url: o.link,
    source: o.source,
    publishedAt: o.date,
    snippet: o.snippet,
  }));
}


