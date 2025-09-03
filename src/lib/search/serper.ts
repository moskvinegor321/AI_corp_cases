import axios from 'axios';
import type { FoundDoc } from './index';

type SerperNewsItem = {
  title: string;
  link: string;
  source?: string;
  date?: string;
  snippet?: string;
};

type SerperResponse = { news?: SerperNewsItem[] };

export async function searchSerper(query: string, limit = 20): Promise<FoundDoc[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  const url = 'https://google.serper.dev/news';
  const { data } = await axios.post<SerperResponse>(
    url,
    { q: query, num: Math.min(limit, 100) },
    { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }
  );
  const items = data?.news ?? [];
  return items.map((n) => ({
    title: n.title,
    url: n.link,
    source: n.source,
    publishedAt: n.date,
    snippet: n.snippet,
  }));
}


