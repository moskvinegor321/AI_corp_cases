import axios from 'axios';
import type { FoundDoc } from './index';

type TavilyItem = {
  title: string;
  url: string;
  source?: string;
  published_date?: string;
  content?: string;
};

type TavilyResponse = { results?: TavilyItem[] };

export async function searchTavily(query: string, limit = 20): Promise<FoundDoc[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const url = 'https://api.tavily.com/search';
  const { data } = await axios.post<TavilyResponse>(
    url,
    { api_key: apiKey, query, max_results: Math.min(limit, 20) },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const items = data?.results ?? [];
  return items.map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source,
    publishedAt: r.published_date,
    snippet: r.content,
  }));
}


