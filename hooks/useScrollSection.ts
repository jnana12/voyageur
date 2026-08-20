import { useState, useEffect, useRef, RefObject } from 'react';

interface UseScrollSectionOptions {
    threshold?: number;
    rootMargin?: string;
}

/**
 * Custom hook to detect when a section enters the viewport during scroll snap.
 * Returns isInView status and a ref to attach to the section.
 */
export function useScrollSection<T extends HTMLElement = HTMLDivElement>(
    options: UseScrollSectionOptions = {}
): [RefObject<T>, boolean, boolean] {
    const { threshold = 0.5, rootMargin = '0px' } = options;
    const ref = useRef<T>(null);
    const [isInView, setIsInView] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const inView = entry.isIntersecting && entry.intersectionRatio >= threshold;
                setIsInView(inView);
                if (inView && !hasAnimated) {
                    setHasAnimated(true);
                }
            },
            {
                threshold: [0, 0.25, 0.5, 0.75, 1],
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [threshold, rootMargin, hasAnimated]);

    return [ref, isInView, hasAnimated];
}

/**
 * Hook to track the active section index in a scroll-snap container.
 */
export function useActiveSectionIndex(sectionCount: number): [number, (index: number) => void] {
    const [activeIndex, setActiveIndex] = useState(0);

    return [activeIndex, setActiveIndex];
}
