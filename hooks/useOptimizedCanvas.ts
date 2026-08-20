import { useState, useEffect } from 'react';

interface CanvasConfig {
    pixelRatio: number;
    particleCount: number;
    enableInteraction: boolean;
    isMobile: boolean;
}

export function useOptimizedCanvas(): CanvasConfig {
    const [config, setConfig] = useState<CanvasConfig>(() => {
        // Initial state based on current window (SSR safe-ish, but mainly for client)
        const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
        return {
            pixelRatio: isMobile ? 1 : (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1),
            particleCount: isMobile ? 80 : 250,
            enableInteraction: !isMobile,
            isMobile
        };
    });

    useEffect(() => {
        const updateConfig = () => {
            const width = window.innerWidth;
            const isMobile = width < 768;

            setConfig({
                // Mobile: Force 1x resolution. Desktop: Allow up to 2x (cap at 2 saves laptop batteries too)
                // Oppo A77 benefits MASSIVELY from pixelRatio = 1
                pixelRatio: isMobile ? 1 : Math.min(window.devicePixelRatio, 2),

                // Mobile: 60% reduction. Desktop: Full visuals.
                particleCount: isMobile ? 80 : 250,

                // Disable mouse math on mobile
                enableInteraction: !isMobile,
                isMobile
            });
        };

        // Debounce slightly to avoid thrashing on resize
        let timeoutId: any;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateConfig, 100);
        };

        window.addEventListener('resize', handleResize);

        // Run once on mount to ensure accuracy
        updateConfig();

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    return config;
}
