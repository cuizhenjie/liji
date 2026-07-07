"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function usePageTransition() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return ref;
}

export function useStaggerAnimation<T extends HTMLElement>(
  deps: unknown[] = []
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;
    const children = ref.current.children;
    if (!children.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power3.out",
        }
      );
    }, ref);
    return () => ctx.revert();
  }, deps);

  return ref;
}

export function useHoverScale() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const onEnter = () => {
      gsap.to(el, { scale: 1.02, duration: 0.2, ease: "power2.out" });
    };
    const onLeave = () => {
      gsap.to(el, { scale: 1, duration: 0.2, ease: "power2.out" });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return ref;
}

export function useSlideIn(direction: "left" | "right" | "up" | "down" = "up") {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const fromVars: Record<string, number> = { opacity: 0 };
    if (direction === "left") fromVars.x = -50;
    if (direction === "right") fromVars.x = 50;
    if (direction === "up") fromVars.y = 50;
    if (direction === "down") fromVars.y = -50;

    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, fromVars, {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    }, ref);
    return () => ctx.revert();
  }, [direction]);

  return ref;
}
