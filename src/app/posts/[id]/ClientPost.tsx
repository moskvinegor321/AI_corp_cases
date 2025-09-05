"use client";
import { useRouter } from "next/navigation";
import { PostCard, type Post } from "@/components/PostCard";

export default function ClientPost({ post }: { post: Post }) {
  const router = useRouter();
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PostCard post={post} onChanged={() => router.refresh()} />
    </div>
  );
}


