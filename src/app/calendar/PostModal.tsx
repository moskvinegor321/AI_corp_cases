"use client";
import React from "react";
import { PostCard, type Post } from "@/components/PostCard";

export default function PostModal({ post, onClose, onChanged, adminToken }: { post: Post; onClose: ()=>void; onChanged: ()=>void; adminToken?: string }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative max-w-[1100px] w-[95vw]" onClick={(e)=> e.stopPropagation()}>
        <button
          aria-label="Закрыть"
          className="btn-glass btn-sm absolute -top-3 -right-3"
          onClick={onClose}
        >
          ✕
        </button>
        <PostCard post={post} onChanged={onChanged} adminToken={adminToken} />
      </div>
    </div>
  );
}


