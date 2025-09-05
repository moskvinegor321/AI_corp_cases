import { Post, PostStatus } from '@/generated/prisma';

type StatusPayload = {
  status: PostStatus;
  scheduledAt?: string;
  reviewDueAt?: string;
  publishedAt?: string;
};

export type StatusUpdate = Partial<Pick<Post, 'status' | 'scheduledAt' | 'reviewDueAt' | 'publishedAt'>>;
export type StatusValidationResult =
  | { ok: true; data: StatusUpdate }
  | { ok: false; error: string };

export function validateStatusTransition(current: Post, payload: StatusPayload): StatusValidationResult {
  const { status, scheduledAt, reviewDueAt, publishedAt } = payload;
  if (!status) return { ok: false, error: 'status required' };

  const data: StatusUpdate = { status };

  if (status === 'REJECTED') {
    // allow rejecting from any non-published state, clear scheduling
    if (current.status === 'PUBLISHED') return { ok: false, error: 'cannot reject published' };
    data.scheduledAt = null as unknown as undefined;
    data.publishedAt = null as unknown as undefined;
    data.reviewDueAt = null as unknown as undefined;
    return { ok: true, data };
  }

  if (status === 'READY_TO_PUBLISH') {
    if (!scheduledAt) return { ok: false, error: 'scheduledAt required' };
    data.scheduledAt = new Date(scheduledAt);
  }

  if (status === 'NEEDS_REVIEW') {
    if (!reviewDueAt) return { ok: false, error: 'reviewDueAt required' };
    data.reviewDueAt = new Date(reviewDueAt);
  }

  if (status === 'PUBLISHED') {
    data.publishedAt = publishedAt ? new Date(publishedAt) : new Date();
  }

  // Prevent going backwards from PUBLISHED unless explicitly allowed later
  const order: Record<PostStatus, number> = { DRAFT: 1, NEEDS_REVIEW: 2, READY_TO_PUBLISH: 3, PUBLISHED: 4, REJECTED: 5 } as const;
  if (order[status] < order[current.status]) {
    return { ok: false, error: 'invalid transition' };
  }

  return { ok: true, data };
}


