import axios from 'axios';
import type { FoundDoc } from './index';

export async function searchNewsApi(query: string, limit = 20): Promise<FoundDoc[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];
  const url = `https://newsapi.org/v2/everything`;
  const params = {
    q: query,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: Math.min(limit, 100),
  } as any;
  const { data } = await axios.get(url, { headers: { 'X-Api-Key': apiKey }, params });
  const items = (data?.articles || []) as any[];
  return items.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source?.name,
    publishedAt: a.publishedAt,
    snippet: a.description,
  }));
}


