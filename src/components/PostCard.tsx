"use client";
import { useRef, useState } from "react";

export type Post = {
  id: string;
  title: string;
  status: "DRAFT" | "NEEDS_REVIEW" | "READY_TO_PUBLISH" | "PUBLISHED";
  scheduledAt?: string | null;
  publishedAt?: string | null;
  reviewDueAt?: string | null;
  topic?: string | null;
  pillar?: { id: string; name: string } | null;
};

export function PostCard({ post, onChanged }: { post: Post; onChanged?: () => void }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const callStatus = async (status: Post["status"], extra?: { scheduledAt?: string; reviewDueAt?: string; publishedAt?: string }) => {
    setLoading(true);
    try {
      await fetch(`/api/posts/${post.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "" },
        body: JSON.stringify({ status, ...extra }),
      });
      onChanged?.();
    } finally {
      setLoading(false);
    }
  };

  const onChooseFile = () => fileInputRef.current?.click();
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const token = (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
      const signRes = await fetch(`/api/uploads/s3`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ filename: f.name, contentType: f.type || "application/octet-stream", prefix: `posts/${post.id}` }),
      });
      const { url, publicUrl } = await signRes.json();
      if (!url) throw new Error("签名 не получен");
      await fetch(url, { method: "PUT", headers: { "content-type": f.type || "application/octet-stream" }, body: f });
      await fetch(`/api/posts/${post.id}/attachments`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ name: f.name, url: publicUrl, mimeType: f.type, sizeBytes: f.size }),
      });
      onChanged?.();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert("Не удалось загрузить файл");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="panel rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{post.title}</div>
        <div className="text-xs opacity-70">{post.status}</div>
      </div>
      <div className="text-xs opacity-80 flex gap-3 flex-wrap">
        {post.pillar?.name && <span>Страница: {post.pillar.name}</span>}
        {post.topic && <span>Тема: {post.topic}</span>}
        {post.scheduledAt && <span>Запланировано: {new Date(post.scheduledAt).toLocaleString()}</span>}
        {post.publishedAt && <span>Опубликовано: {new Date(post.publishedAt).toLocaleString()}</span>}
        {post.reviewDueAt && <span>Разбор до: {new Date(post.reviewDueAt).toLocaleString()}</span>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn-glass btn-sm" disabled={loading} onClick={async () => {
          const v = prompt("Укажите дату разбора (ISO или локальное 'YYYY-MM-DDThh:mm')");
          if (!v) return;
          const iso = new Date(v).toISOString();
          await callStatus("NEEDS_REVIEW", { reviewDueAt: iso });
        }}>Отдать на разбор</button>
        <button className="btn-glass btn-sm" disabled={loading} onClick={async () => {
          const v = prompt("Укажите дату публикации (ISO или 'YYYY-MM-DDThh:mm')");
          if (!v) return;
          const iso = new Date(v).toISOString();
          await callStatus("READY_TO_PUBLISH", { scheduledAt: iso });
        }}>Готово к публикации</button>
        <button className="btn-glass btn-sm" disabled={loading} onClick={async () => {
          if (!confirm("Отметить как опубликовано сейчас?")) return;
          await callStatus("PUBLISHED");
        }}>Опубликовано</button>
        <button className="btn-glass btn-sm" disabled={loading} onClick={onChooseFile}>Добавить файл</button>
        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={onFileSelected} />
      </div>
    </div>
  );
}


