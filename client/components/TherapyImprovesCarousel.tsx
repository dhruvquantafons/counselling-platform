"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const items: { title: string; description: string; image?: string }[] = [
  {
    title: "Relationships",
    image: "/relationship-therapy.jpg",
    description:
      "Therapy helps you build deeper, more honest connections with the people you love — and gently let go of the ones that no longer serve you. Learn to communicate, set boundaries, and trust again.",
  },
  {
    title: "Confidence",
    image: "/confidence-therapy.jpg",
    description:
      "Feel like you're always one step behind? Therapy helps you silence the inner critic, challenge unhelpful beliefs, and show up in the world with a quiet, grounded assurance.",
  },
  {
    title: "Stress",
    image: "/stress-therapy.jpg",
    description:
      "When everything feels urgent and nothing feels manageable, therapy gives you tools to slow down, regain perspective, and build a life that doesn't run on adrenaline.",
  },
  {
    title: "Anxiety",
    image: "/anxiety.png",
    description:
      "Anxiety is your mind trying to protect you — sometimes too hard. Therapy helps you understand those signals, reduce their grip, and move through the world with more ease.",
  },
  {
    title: "Career",
    image: "/depression-therapy.png",
    description:
      "Feeling stuck, burnt out, or unsure of your direction? Therapy helps you untangle work-related stress, find clarity on your path, and build the confidence to take the next step in your career.",
  },
  {
    title: "Lifestyle Issues",
    image: "/lifestyle.png",
    description:
      "From doom-scrolling to burnout, modern life has quiet traps. Therapy helps you identify patterns that drain you and replace them with choices that actually feel good.",
  },
];

export default function TherapyImprovesCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const scroll = (dir: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth;
      carouselRef.current.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeftPos(carouselRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    carouselRef.current.scrollLeft = scrollLeftPos - walk;
  };

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        id="therapy-scroll-left"
        aria-label="Scroll left"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 md:-translate-x-12 z-20 w-11 h-11 rounded-full bg-white border border-sage/30 shadow-md flex items-center justify-center text-sage-dark hover:bg-sage-light hover:border-sage/50 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Right arrow */}
      <button
        id="therapy-scroll-right"
        aria-label="Scroll right"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 md:translate-x-12 z-20 w-11 h-11 rounded-full bg-white border border-sage/30 shadow-md flex items-center justify-center text-sage-dark hover:bg-sage-light hover:border-sage/50 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Scrollable row */}
      <div
        ref={carouselRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`flex gap-5 overflow-x-auto scroll-smooth pb-4 pt-2 px-1 ${
          isMouseDown ? "cursor-grabbing select-none scroll-auto" : "cursor-grab"
        }`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="flex-none w-[85vw] sm:w-[calc(50%-10px)] md:w-[calc((100%-2.5rem)/3)] bg-white rounded-2xl border border-sage/15 shadow-soft overflow-hidden flex flex-col group hover:shadow-lg hover:-translate-y-1 hover:border-sage/30 transition-all duration-300"
          >
            {/* Image / placeholder */}
            <div className="relative h-44 w-full overflow-hidden flex items-center justify-center bg-sage-light/20">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sage-light via-paper to-amber/10 flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `radial-gradient(circle at ${30 + i * 10}% ${40 + i * 8}%, rgba(74,99,85,0.6) 0%, transparent 60%), radial-gradient(circle at ${70 - i * 8}% ${60 - i * 5}%, rgba(184,128,74,0.4) 0%, transparent 55%)`,
                    }}
                  />
                  <svg className="w-16 h-16 text-sage/30" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 64 64">
                    <rect x="8" y="8" width="48" height="48" rx="8" strokeDasharray="4 3" />
                    <circle cx="32" cy="26" r="8" />
                    <path d="M16 56c0-8.837 7.163-16 16-16s16 7.163 16 16" strokeLinecap="round" />
                  </svg>
                  <span className="absolute bottom-2 right-3 font-mono text-[10px] tracking-widest text-sage/40 uppercase">
                    Image
                  </span>
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-display text-lg font-bold text-ink mb-2 group-hover:text-sage-dark transition-colors duration-150">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink/65 flex-1">
                {item.description}
              </p>
              <Link
                href="/directory"
                className="mt-4 inline-flex items-center text-xs font-semibold text-sage-dark hover:text-sage gap-1 group/link transition-colors duration-150"
              >
                Read More
                <svg className="w-3 h-3 group-hover/link:translate-x-1 transition-transform duration-150" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
