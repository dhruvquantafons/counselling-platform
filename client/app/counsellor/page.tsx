"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CounsellorRoot() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("counsellorToken");
    if (token) {
      router.replace("/counsellor/dashboard");
    } else {
      router.replace("/counsellor/login");
    }
  }, [router]);

  return (
    <main className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="animate-pulse space-y-4">
        <div className="w-12 h-12 rounded-full bg-sage-light mx-auto" />
        <div className="h-4 bg-sage-light/60 rounded w-1/2 mx-auto" />
      </div>
    </main>
  );
}
