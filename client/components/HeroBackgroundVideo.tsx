"use client";

import { useEffect, useRef } from "react";

export default function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      // Force programmatic play to override browser autoplay restrictions on hydrated React components
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay deferred by browser policy, retrying on user interaction:", error);
          // Retry playing on any user touch/click/scroll interaction
          const handleUserInteraction = () => {
            video.play();
            window.removeEventListener("touchstart", handleUserInteraction);
            window.removeEventListener("click", handleUserInteraction);
            window.removeEventListener("scroll", handleUserInteraction);
          };
          window.addEventListener("touchstart", handleUserInteraction, { once: true });
          window.addEventListener("click", handleUserInteraction, { once: true });
          window.addEventListener("scroll", handleUserInteraction, { once: true });
        });
      }
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover -z-20 pointer-events-none transition-opacity duration-1000"
    >
      <source src="/hero-bg.mp4" type="video/mp4" />
      <source src="https://assets.mixkit.co/videos/4531/4531-720.mp4" type="video/mp4" />
      <source src="https://assets.mixkit.co/videos/4510/4510-720.mp4" type="video/mp4" />
    </video>
  );
}
