import { searchNewsApi } from './newsapi';
import { searchSerper } from './serper';
import { searchTavily } from './tavily';

export type FoundDoc = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  snippet?: string;
};

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


