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

  // Prefer news endpoint; if 400 (plan restriction) fallback to /search
  async function tryEndpoint(endpoint: 'news' | 'search'): Promise<SerperResponse | null> {
    try {
      const { data } = await axios.post<SerperResponse>(`https://google.serper.dev/${endpoint}`, payload, { headers });
      return data;
    } catch (e: unknown) {
      // 400 indicates plan not supporting endpoint or bad params; fall through
      return null;
    }
  }

  const prefer = (process.env.SERPER_ENDPOINT as 'news' | 'search' | undefined) || 'news';
  const first = await tryEndpoint(prefer);
  const data = first ?? (await tryEndpoint(prefer === 'news' ? 'search' : 'news')) ?? {};

  const news = data.news || [];
  const organic = data.organic || [];

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


