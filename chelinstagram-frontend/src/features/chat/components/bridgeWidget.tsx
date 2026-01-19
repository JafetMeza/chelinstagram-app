import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faSun, faCloudRain, faSnowflake, faCloudSun } from '@fortawesome/free-solid-svg-icons';

const API_KEY = "1c0f3d402bb13e9260034643db179b1f"; // 👈 Get yours at openweathermap.org

const BridgeWidget = () => {
    const [times, setTimes] = useState({ gdl: "", wag: "" });
    const [weather, setWeather] = useState({
        gdl: { temp: 0, icon: faSun },
        wag: { temp: 0, icon: faCloud }
    });

    const getWeatherIcon = (main: string) => {
        switch (main) {
            case 'Rain': return faCloudRain;
            case 'Snow': return faSnowflake;
            case 'Clear': return faSun;
            case 'Clouds': return faCloudSun;
            default: return faCloud;
        }
    };

    const fetchWeather = useCallback(async () => {
        // Precise coordinates to avoid name conflicts
        const gdl = { lat: 20.6597, lon: -103.3496 };
        const wag = { lat: 51.9700, lon: 5.6667 };

        const gdlUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${gdl.lat}&lon=${gdl.lon}&units=metric&appid=${API_KEY}`;
        const wagUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${wag.lat}&lon=${wag.lon}&units=metric&appid=${API_KEY}`;

        try {
            const [resGdl, resWag] = await Promise.all([
                fetch(gdlUrl).then(res => {
                    if (!res.ok) throw new Error(`GDL Error: ${res.status}`);
                    return res.json();
                }),
                fetch(wagUrl).then(res => {
                    if (!res.ok) throw new Error(`WAG Error: ${res.status}`);
                    return res.json();
                })
            ]);

            setWeather({
                gdl: { temp: Math.round(resGdl.main.temp), icon: getWeatherIcon(resGdl.weather[0].main) },
                wag: { temp: Math.round(resWag.main.temp), icon: getWeatherIcon(resWag.weather[0].main) }
            });
        } catch (error) {
            console.error("Weather fetch failed:", error);
        }
    }, []);

    useEffect(() => {
        const updateClocks = () => {
            const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            setTimes({
                gdl: new Date().toLocaleTimeString('en-US', { ...options, timeZone: 'America/Mexico_City' }),
                wag: new Date().toLocaleTimeString('en-US', { ...options, timeZone: 'Europe/Amsterdam' })
            });
        };

        updateClocks();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchWeather();

        const clockTimer = setInterval(updateClocks, 60000);
        const weatherTimer = setInterval(fetchWeather, 1800000); // 30 mins

        return () => {
            clearInterval(clockTimer);
            clearInterval(weatherTimer);
        };
    }, [fetchWeather]);

    return (
        <div className="p-4 border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex justify-between items-center max-w-sm mx-auto">
                {/* Guadalajara */}
                <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase font-black text-zinc-400 tracking-widest">Guadalajara</span>
                    <span className="text-xl font-bold font-mono tracking-tighter">{times.gdl || "--:--"}</span>
                    <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold">
                        <FontAwesomeIcon icon={weather.gdl.icon} />
                        <span>{weather.gdl.temp}°C</span>
                    </div>
                </div>

                <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-800" />

                {/* Wageningen */}
                <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase font-black text-zinc-400 tracking-widest">Wageningen</span>
                    <span className="text-xl font-bold font-mono tracking-tighter">{times.wag || "--:--"}</span>
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 font-bold">
                        <FontAwesomeIcon icon={weather.wag.icon} />
                        <span>{weather.wag.temp}°C</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BridgeWidget;