
export interface WeatherData {
    temperature: number;
    windspeed: number;
    weathercode: number;
    is_day: number;
    time: string;
}

export const fetchWeather = async (lat: number, lng: number): Promise<WeatherData | null> => {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );

        if (!response.ok) {
            throw new Error('Weather API failed');
        }

        const data = await response.json();
        return data.current_weather;
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return null;
    }
};

export const getWeatherDescription = (code: number): string => {
    // WMO Weather interpretation codes (WW)
    const codes: { [key: number]: string } = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
    };
    return codes[code] || 'Unknown';
};

export const getWeatherIconName = (code: number): string => {
    if (code === 0 || code === 1) return 'Sun';
    if (code === 2 || code === 3) return 'Cloud';
    if (code >= 45 && code <= 48) return 'CloudFog';
    if (code >= 51 && code <= 67) return 'CloudRain';
    if (code >= 71 && code <= 77) return 'CloudSnow';
    if (code >= 80 && code <= 82) return 'CloudRain';
    if (code >= 85 && code <= 86) return 'CloudSnow';
    if (code >= 95) return 'CloudLightning';
    return 'Cloud';
};
