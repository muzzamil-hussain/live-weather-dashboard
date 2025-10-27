import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CloudSun, Menu, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeatherCard } from "@/components/WeatherCard";
import { Sidebar } from "@/components/Sidebar";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface HourlyWeather {
  time: string;
  temp_c: number;
  condition: { text: string };
  precip_mm: number;
  humidity: number;
  wind_kph: number;
  uv: number;
  pressure_mb: number;
  vis_km: number;
}

export default function Dashboard() {
  const [location, setLocation] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F" | "K">("C");
  const [selectedDay, setSelectedDay] = useState<"yesterday" | "today" | "tomorrow">("today");
  const [userId] = useState(() => localStorage.getItem("weatherUserId") || `user_${Date.now()}`);
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);

  // Add: theme presets and custom theme state
  const [themePreset, setThemePreset] = useState<"sunny" | "cloudy" | "rainy" | "custom">("sunny");
  const [customTheme, setCustomTheme] = useState<{ background?: string; foreground?: string; primary?: string } | undefined>(undefined);

  // Add: search suggestions state
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<string>>([]);
  // Add: active index for keyboard navigation in suggestions
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const savePreferences = useMutation(api.weather.saveUserPreferences);
  const userPreferences = useQuery(api.weather.getUserPreferences, { userId });

  // Helper: apply preset colors to CSS variables
  const applyPreset = (preset: "sunny" | "cloudy" | "rainy" | "custom", custom?: { background?: string; foreground?: string; primary?: string }) => {
    const root = document.documentElement;
    const palettes: Record<string, { background: string; foreground: string; primary: string }> = {
      sunny: { background: "#e9f5ff", foreground: "#1f2937", primary: "#f59e0b" },
      cloudy: { background: "#e0e5ec", foreground: "#2c3e50", primary: "#64748b" },
      rainy: { background: "#dbeafe", foreground: "#0f172a", primary: "#3b82f6" },
    };
    let p = preset === "custom"
      ? {
          background: custom?.background || getComputedStyle(root).getPropertyValue("--background").trim() || "#e0e5ec",
          foreground: custom?.foreground || getComputedStyle(root).getPropertyValue("--foreground").trim() || "#2c3e50",
          primary: custom?.primary || getComputedStyle(root).getPropertyValue("--primary").trim() || "#4f46e5",
        }
      : palettes[preset];

    root.style.setProperty("--background", p.background);
    root.style.setProperty("--card", p.background);
    root.style.setProperty("--popover", p.background);
    root.style.setProperty("--foreground", p.foreground);
    root.style.setProperty("--card-foreground", p.foreground);
    root.style.setProperty("--popover-foreground", p.foreground);
    root.style.setProperty("--primary", p.primary);
    // keep --primary-foreground as is for contrast
  };

  useEffect(() => {
    localStorage.setItem("weatherUserId", userId);
  }, [userId]);

  useEffect(() => {
    if (userPreferences) {
      setTheme(userPreferences.theme);
      setTemperatureUnit(userPreferences.temperatureUnit);
      if (userPreferences.apiKey) {
        setApiKey(userPreferences.apiKey);
      } else {
        const localApiKey = localStorage.getItem("weatherApiKey") || undefined;
        if (localApiKey) setApiKey(localApiKey);
      }
      if (userPreferences.location) {
        setLocation(userPreferences.location);
        fetchWeatherData(userPreferences.location);
      }
      // Load theme preset + custom
      if (userPreferences.themePreset) {
        setThemePreset(userPreferences.themePreset);
        applyPreset(userPreferences.themePreset, userPreferences.customTheme ?? undefined);
      }
      if (userPreferences.customTheme) {
        setCustomTheme(userPreferences.customTheme);
      }
      // Initialize suggestions from history or defaults
      if (userPreferences.searchHistory && userPreferences.searchHistory.length > 0) {
        setSuggestions(userPreferences.searchHistory.slice(0, 8));
      } else {
        setSuggestions(["Use Current Location", "New York", "London", "Tokyo", "Sydney"].sort(() => 0.5 - Math.random()).slice(0, 4));
      }
    } else if (userPreferences === null) {
      const localApiKey = localStorage.getItem("weatherApiKey") || undefined;
      if (localApiKey) setApiKey(localApiKey);
      // Default suggestions when no prefs exist
      setSuggestions(["Use Current Location", "Paris", "Berlin", "Singapore", "Toronto"].sort(() => 0.5 - Math.random()).slice(0, 4));
    }
  }, [userPreferences]);

  useEffect(() => {
    const savedLocation = localStorage.getItem("weatherLocation");
    if (savedLocation && !location) {
      setLocation(savedLocation);
      fetchWeatherData(savedLocation);
    } else if (!savedLocation) {
      requestLocation();
    }
  }, []);

  const resolveApiKey = () => {
    return apiKey || import.meta.env.VITE_WEATHER_API_KEY || "";
  };

  // Update suggestions as user types
  useEffect(() => {
    if (!userPreferences) return;

    // Popular fallback cities for pattern-based matching
    const POPULAR_CITIES: Array<string> = [
      "New York", "London", "Tokyo", "Sydney", "Paris", "Berlin", "Singapore", "Toronto",
      "San Francisco", "Los Angeles", "Chicago", "Houston", "Phoenix",
      "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata",
      "Dubai", "Abu Dhabi", "Doha", "Riyadh",
      "Johannesburg", "Cape Town",
      "Mexico City", "Sao Paulo"
    ];

    const history = userPreferences.searchHistory ?? [];

    const makeSuggestions = (q: string) => {
      const pool = Array.from(new Set(["Use Current Location", ...history, ...POPULAR_CITIES]));
      if (q.trim().length === 0) {
        // Keep existing defaults if any, otherwise provide a random set
        return pool.slice(0, 8);
      }
      // Prioritize startsWith matches, then includes
      const lower = q.toLowerCase();
      const starts = pool.filter(
        (x) => x !== "Use Current Location" && x.toLowerCase().startsWith(lower)
      );
      const includes = pool.filter(
        (x) =>
          x !== "Use Current Location" &&
          !starts.includes(x) &&
          x.toLowerCase().includes(lower)
      );
      const base = ["Use Current Location", ...starts, ...includes];
      // If nothing meaningful found, include the raw query as a suggestion
      const withQuery =
        starts.length === 0 && includes.length === 0 ? [...base, q] : base;
      return withQuery.slice(0, 8);
    };

    setSuggestions(makeSuggestions(searchInput));
  }, [searchInput, userPreferences]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = `${latitude},${longitude}`;
          setLocation(coords);
          localStorage.setItem("weatherLocation", coords);
          fetchWeatherData(coords);
          savePreferences({
            userId,
            temperatureUnit,
            theme,
            latitude,
            longitude,
            location: coords,
            apiKey,
            themePreset,
            customTheme,
          });
        },
        (error) => {
          toast.error("Unable to get location. Please search manually.");
          console.error(error);
        }
      );
    }
  };

  const persistSearchHistory = (newEntry: string) => {
    const current = userPreferences?.searchHistory ?? [];
    const updated = [newEntry, ...current.filter((v) => v.toLowerCase() !== newEntry.toLowerCase())].slice(0, 10);
    savePreferences({
      userId,
      temperatureUnit,
      theme,
      location,
      apiKey,
      themePreset,
      customTheme,
      searchHistory: updated,
    });
  };

  const fetchWeatherData = async (loc: string) => {
    setLoading(true);
    try {
      const key = resolveApiKey();
      if (!key) {
        toast.error("Please enter your Weather API key in Settings.");
        setLoading(false);
        return;
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      const [todayData, yesterdayData, tomorrowData] = await Promise.all([
        fetch(`https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${loc}&days=1&aqi=yes`).then(r => r.json()),
        fetch(`https://api.weatherapi.com/v1/history.json?key=${key}&q=${loc}&dt=${formatDate(yesterday)}`).then(r => r.json()),
        fetch(`https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${loc}&days=2&aqi=yes`).then(r => r.json()),
      ]);

      setWeatherData({
        location: todayData?.location,
        current: todayData?.current,
        today: todayData?.forecast?.forecastday?.[0],
        yesterday: yesterdayData?.forecast?.forecastday?.[0],
        tomorrow: tomorrowData?.forecast?.forecastday?.[1],
      });

      toast.success("Weather data updated!");
    } catch (error) {
      toast.error("Failed to fetch weather data. Please check your API key.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestionsOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
      // If a suggestion is highlighted, use it
      handleSuggestionClick(suggestions[activeIndex]);
      return;
    }
    let query = searchInput.trim();
    if (!query) return;
    if (query === "Use Current Location") {
      requestLocation();
      setSuggestionsOpen(false);
      return;
    }
    setLocation(query);
    localStorage.setItem("weatherLocation", query);
    fetchWeatherData(query);
    persistSearchHistory(query);
    savePreferences({
      userId,
      temperatureUnit,
      theme,
      location: query,
      apiKey,
      themePreset,
      customTheme,
    });
    setSuggestionsOpen(false);
  };

  const handleSuggestionClick = (s: string) => {
    if (s === "Use Current Location") {
      requestLocation();
      setSuggestionsOpen(false);
      return;
    }
    setSearchInput(s);
    setLocation(s);
    localStorage.setItem("weatherLocation", s);
    fetchWeatherData(s);
    persistSearchHistory(s);
    setSuggestionsOpen(false);
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    savePreferences({
      userId,
      temperatureUnit,
      theme: newTheme,
      location,
      apiKey,
      themePreset,
      customTheme,
    });
  };

  const handleTemperatureUnitChange = (unit: "C" | "F" | "K") => {
    setTemperatureUnit(unit);
    savePreferences({
      userId,
      temperatureUnit: unit,
      theme,
      location,
      apiKey,
      themePreset,
      customTheme,
    });
  };

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    localStorage.setItem("weatherApiKey", key);
    savePreferences({
      userId,
      temperatureUnit,
      theme,
      location,
      apiKey: key,
      themePreset,
      customTheme,
    });
    toast.success("API key saved.");
  };

  // New: handlers for theme presets and custom theme saving
  const handleThemePresetChange = (preset: "sunny" | "cloudy" | "rainy" | "custom") => {
    setThemePreset(preset);
    applyPreset(preset, customTheme);
    savePreferences({
      userId,
      temperatureUnit,
      theme,
      location,
      apiKey,
      themePreset: preset,
      customTheme,
    });
    toast("Theme preset applied");
  };

  const handleCustomThemeSave = (custom: { background?: string; foreground?: string; primary?: string }) => {
    setCustomTheme(custom);
    applyPreset("custom", custom);
    savePreferences({
      userId,
      temperatureUnit,
      theme,
      location,
      apiKey,
      themePreset: "custom",
      customTheme: custom,
    });
    toast.success("Custom theme saved");
  };

  // Add: temperature conversion helper for Weather Now
  const convertTemp = (celsius: number | undefined) => {
    if (celsius === undefined) return "—";
    if (temperatureUnit === "F") return (celsius * 9 / 5 + 32).toFixed(1);
    if (temperatureUnit === "K") return (celsius + 273.15).toFixed(1);
    return celsius.toFixed(1);
  };

  const getCurrentDayData = () => {
    if (!weatherData) return null;
    return weatherData[selectedDay];
  };

  const dayData = getCurrentDayData();

  // ADD: derive current data safely
  const currentData = weatherData?.current as
    | {
        temp_c?: number;
        condition?: { text?: string };
        precip_mm?: number;
        humidity?: number;
        wind_kph?: number;
        uv?: number;
        pressure_mb?: number;
        vis_km?: number;
      }
    | undefined;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark bg-gradient-to-br from-[#0b1430] via-[#0b1b34] to-[#0a1e3a]" : "bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200"} transition-colors duration-300`}>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-neumorphism p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-800">
              Dashboard
            </span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search location..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setActiveIndex(-1); // reset highlight when typing
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                onKeyDown={(e) => {
                  if (!suggestionsOpen || suggestions.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((prev) =>
                      prev < suggestions.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((prev) =>
                      prev > 0 ? prev - 1 : suggestions.length - 1
                    );
                  } else if (e.key === "Enter") {
                    if (activeIndex >= 0 && activeIndex < suggestions.length) {
                      e.preventDefault();
                      handleSuggestionClick(suggestions[activeIndex]);
                    }
                  } else if (e.key === "Escape") {
                    setSuggestionsOpen(false);
                  }
                }}
                className="pl-10 shadow-neumorphism-inset border-none"
              />
            </div>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute mt-2 left-0 right-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-lg shadow-neumorphism rounded-md border z-20">
                <ul className="max-h-64 overflow-auto py-2">
                  {suggestions.map((s, i) => (
                    <li
                      key={`${s}-${i}`}
                      className={`px-3 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer ${
                        i === activeIndex
                          ? "bg-white/70 dark:bg-white/15"
                          : "hover:bg-white/50 dark:hover:bg-white/10"
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="shadow-neumorphism hover:shadow-neumorphism-hover"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : weatherData ? (
          <>
            {/* ADD: Current/Now section with animation */}
            {currentData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Weather Now</h2>
                <div className="max-w-2xl mx-auto">
                  <div className="rounded-2xl p-6 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md shadow-neumorphism hover:shadow-neumorphism-hover transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100">
                          {convertTemp(currentData.temp_c)}°{temperatureUnit}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {weatherData?.location?.name ?? "—"}
                        </div>
                        <div className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-200 mt-1">
                          {currentData.condition?.text ?? "—"}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
                        <div className="rounded-lg bg-white/50 dark:bg-slate-800/60 backdrop-blur-sm shadow-neumorphism-inset p-3 text-center">
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Precip</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {Number(currentData.precip_mm ?? 0)} mm
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/50 dark:bg-slate-800/60 backdrop-blur-sm shadow-neumorphism-inset p-3 text-center">
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Humidity</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {Number(currentData.humidity ?? 0)}%
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/50 dark:bg-slate-800/60 backdrop-blur-sm shadow-neumorphism-inset p-3 text-center">
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Wind</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {Number(currentData.wind_kph ?? 0)} km/h
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Optional hi/lo similar to Google */}
                    <div className="mt-4 text-center sm:text-left text-xs text-gray-600">
                      {(() => {
                        const max = weatherData?.today?.day?.maxtemp_c as number | undefined;
                        const min = weatherData?.today?.day?.mintemp_c as number | undefined;
                        const convert = (c: number | undefined) => {
                          if (c === undefined) return undefined;
                          if (temperatureUnit === "F") return (c * 9/5 + 32).toFixed(0);
                          if (temperatureUnit === "K") return (c + 273.15).toFixed(0);
                          return c.toFixed(0);
                        };
                        const hi = convert(max);
                        const lo = convert(min);
                        return (hi !== undefined && lo !== undefined) ? `H: ${hi}°  L: ${lo}°` : null;
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Day Selector */}
            <div className="flex gap-4 mb-6 justify-center">
              {["yesterday", "today", "tomorrow"].map((day) => (
                <Button
                  key={day}
                  onClick={() => setSelectedDay(day as any)}
                  variant={selectedDay === day ? "default" : "outline"}
                  className={`shadow-neumorphism capitalize ${
                    selectedDay === day ? "shadow-neumorphism-inset" : ""
                  }`}
                >
                  {day}
                </Button>
              ))}
            </div>

            {/* Hourly Forecast */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Hourly Forecast
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {dayData?.hour?.map((hour: HourlyWeather, index: number) => (
                  <WeatherCard
                    key={index}
                    time={new Date(hour.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    temp={hour.temp_c}
                    condition={hour.condition.text}
                    precipitation={hour.precip_mm}
                    humidity={hour.humidity}
                    windSpeed={hour.wind_kph}
                    uvIndex={hour.uv}
                    pressure={hour.pressure_mb}
                    visibility={hour.vis_km}
                    unit={temperatureUnit}
                  />
                ))}
              </div>
            </motion.div>
          </>
        ) : (
          <div className="text-center text-gray-600">
            <p>Search for a location to see weather data</p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
        temperatureUnit={temperatureUnit}
        onTemperatureUnitChange={handleTemperatureUnitChange}
        apiKey={apiKey}
        onApiKeySave={handleApiKeySave}
        // New props for theme presets
        themePreset={themePreset}
        onThemePresetChange={handleThemePresetChange}
        customTheme={customTheme}
        onCustomThemeSave={handleCustomThemeSave}
      />
    </div>
  );
}