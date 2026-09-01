"use client";
import { useInView } from "@/hooks/useInView";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: 1 | 2 | 3 | 4;
}

export default function RevealSection({ children, className = "", delay }: Props) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`reveal-up ${inView ? "is-visible" : ""} ${delay ? `reveal-stagger-${delay}` : ""} ${className}`}
    >
      {children}
    </div>
  );
}
