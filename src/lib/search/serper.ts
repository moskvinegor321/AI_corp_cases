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
  const gl = process.env.SERPER_GL || 'ru';
  const hl = process.env.SERPER_HL || 'ru';
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

  const news = data?.news || [];
  const organic = data?.organic || [];

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


