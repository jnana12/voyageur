
import { useState, useEffect } from 'react';

/**
 * A hook to delay the display of a loading indicator.
 * Helps prevent flashing loaders for fast operations.
 * 
 * @param isLoading - The boolean trigger
 * @param delay - Delay in ms (default 3000ms)
 * @returns boolean - True if loading should be shown
 */
export const useDelayedLoading = (isLoading: boolean, delay: number = 3000) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        let timer: any;

        if (isLoading) {
            timer = setTimeout(() => {
                setShow(true);
            }, delay);
        } else {
            setShow(false);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading, delay]);

    return show;
};
