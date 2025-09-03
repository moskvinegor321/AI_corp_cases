import { compareTwoStrings } from 'string-similarity';

export function isDuplicate(candidate: string, existing: string[], threshold = 0.82): boolean {
  const normalizedCandidate = candidate.trim().toLowerCase();
  return existing.some((title) => compareTwoStrings(normalizedCandidate, title.trim().toLowerCase()) >= threshold);
}


