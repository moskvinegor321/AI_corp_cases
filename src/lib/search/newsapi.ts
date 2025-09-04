import axios from 'axios';
import type { FoundDoc } from './index';

type NewsApiArticle = {
  title: string;
  url: string;
  source?: { name?: string };
  publishedAt?: string;
  description?: string;
};

type NewsApiResponse = { articles?: NewsApiArticle[] };

export async function searchNewsApi(query: string, limit = 20, options?: { page?: number }): Promise<FoundDoc[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];
  const url = `https://newsapi.org/v2/everything`;
  const params = {
    q: query,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: Math.min(limit, 100),
    ...(options?.page ? { page: options.page } : {}),
  } as Record<string, string | number>;
  const { data } = await axios.get<NewsApiResponse>(url, { headers: { 'X-Api-Key': apiKey }, params });
  const items = data?.articles ?? [];
  return items.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source?.name,
    publishedAt: a.publishedAt,
    snippet: a.description,
  }));
}


