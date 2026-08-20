import { useEffect, useRef, useState } from 'react';

export interface UseInViewOptions extends IntersectionObserverInit {
    triggerOnce?: boolean;
}

/**
 * Hook to detect when an element enters the viewport.
 * Returns a ref to attach to the element and a boolean indicating visibility.
 * Can be configured to trigger only once.
 */
export function useInView(options?: UseInViewOptions): [React.RefObject<HTMLDivElement>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const optionsJson = JSON.stringify(options);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const parsedOptions = optionsJson ? JSON.parse(optionsJson) : undefined;
        const triggerOnce = parsedOptions?.triggerOnce;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsInView(false);
                }
            },
            {
                threshold: 0.2,
                ...parsedOptions
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [optionsJson]);

    return [ref, isInView];
}