"use client";
import { useEffect, useState } from "react";
import { PostCard, type Post } from "@/components/PostCard";

export default function PostsPage() {
  const [items, setItems] = useState<Post[]>([]);
  const load = async () => {
    const r = await fetch(`/api/posts`);
    const d = await r.json();
    setItems(d.items || []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 grid gap-3">
      <div className="text-xl font-semibold">Посты</div>
      <div className="grid gap-3">
        {items.map((p) => (
          <PostCard key={p.id} post={p} onChanged={load} />
        ))}
      </div>
    </div>
  );
}


