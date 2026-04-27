import { useState, useEffect, useRef } from 'react';

export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.2, ...options });

    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return [ref, isIntersecting];
}
