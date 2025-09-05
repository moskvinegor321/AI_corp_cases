import { prisma } from "@/lib/db";
import ClientPost from "./ClientPost";
import { notFound } from "next/navigation";

type RouteParams = { id: string };

export default async function PostPage({ params }: { params: RouteParams }) {
  const { id } = params;
  const post = await prisma.post.findUnique({ where: { id }, include: { attachments: true, comments: { orderBy: { createdAt: 'desc' }, take: 5 }, pillar: true } });
  if (!post) return notFound();
  const clientPost = {
    id: post.id,
    title: post.title,
    status: post.status as 'DRAFT' | 'NEEDS_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED',
    scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    reviewDueAt: post.reviewDueAt ? post.reviewDueAt.toISOString() : null,
    topic: post.topic,
    pillar: post.pillar ? { id: post.pillar.id, name: post.pillar.name } : null,
    body: post.body,
    source: post.source,
    createdAt: post.createdAt ? post.createdAt.toISOString() : undefined,
    attachments: post.attachments.map(a=>({ id: a.id, name: a.name, url: a.url, mimeType: a.mimeType, sizeBytes: (a.sizeBytes as number|null) })),
    comments: post.comments.map(c=>({ id: c.id, text: c.text, isTask: c.isTask, taskStatus: (c.taskStatus as 'OPEN'|'IN_PROGRESS'|'DONE'|null), dueAt: c.dueAt ? c.dueAt.toISOString() : null, createdAt: c.createdAt.toISOString(), assignee: c.assignee })),
  };
  return <ClientPost post={clientPost} />;
}


