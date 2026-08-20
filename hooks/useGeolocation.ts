import { useState, useEffect } from 'react';
import geolocationService, { UserLocation } from '../services/geolocationService';

interface UseGeolocationResult {
    location: UserLocation | null;
    ipLocation: UserLocation | null;
    gpsLocation: UserLocation | null;
    loading: boolean;
    error: string | null;
    requestGPS: () => Promise<UserLocation | null>;
    refreshIP: () => Promise<void>;
}

export const useGeolocation = (): UseGeolocationResult => {
    const [ipLocation, setIpLocation] = useState<UserLocation | null>(null);
    const [gpsLocation, setGpsLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial fetch of IP location
    useEffect(() => {
        const fetchIP = async () => {
            try {
                const loc = await geolocationService.getIPLocation();
                if (loc) setIpLocation(loc);
            } catch (err) {
                console.warn('Failed to fetch IP location', err);
            }
        };
        fetchIP();
    }, []);

    const requestGPS = async () => {
        setLoading(true);
        setError(null);
        try {
            const loc = await geolocationService.getCurrentLocation(true);
            if (loc) {
                setGpsLocation(loc);
                return loc;
            } else {
                setError('Location access denied or unavailable');
                return null;
            }
        } catch (err) {
            setError('Failed to get GPS location');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const refreshIP = async () => {
        const loc = await geolocationService.getIPLocation();
        if (loc) setIpLocation(loc);
    };

    return {
        location: gpsLocation || ipLocation, // Prefer GPS if available
        ipLocation,
        gpsLocation,
        loading,
        error,
        requestGPS,
        refreshIP
    };
};
