import { prisma } from "@/lib/db";
import ClientPost from "./ClientPost";
import { notFound } from "next/navigation";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, include: { attachments: true, comments: { orderBy: { createdAt: 'desc' }, take: 5 }, pillar: true } });
  if (!post) return notFound();
  return <ClientPost post={{
    id: post.id,
    title: post.title,
    status: post.status as any,
    scheduledAt: post.scheduledAt?.toISOString?.() || (post.scheduledAt as unknown as string|null),
    publishedAt: post.publishedAt?.toISOString?.() || (post.publishedAt as unknown as string|null),
    reviewDueAt: post.reviewDueAt?.toISOString?.() || (post.reviewDueAt as unknown as string|null),
    topic: post.topic,
    pillar: post.pillar ? { id: post.pillar.id, name: post.pillar.name } : null,
    body: post.body,
    source: post.source,
    createdAt: post.createdAt?.toISOString?.() || (post.createdAt as unknown as string),
    attachments: post.attachments.map(a=>({ id: a.id, name: a.name, url: a.url, mimeType: a.mimeType, sizeBytes: a.sizeBytes as number|null })),
    comments: post.comments.map(c=>({ id: c.id, text: c.text, isTask: c.isTask, taskStatus: c.taskStatus as any, dueAt: c.dueAt?.toISOString?.() || (c.dueAt as unknown as string|null), createdAt: c.createdAt.toISOString(), assignee: c.assignee })),
  } as any} />;
}


