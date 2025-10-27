import { motion } from "framer-motion";
import { X, Sun, Moon, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  temperatureUnit: "C" | "F" | "K";
  onTemperatureUnitChange: (unit: "C" | "F" | "K") => void;
  apiKey?: string;
  onApiKeySave: (key: string) => void;
  themePreset?: "sunny" | "cloudy" | "rainy" | "custom";
  onThemePresetChange?: (preset: "sunny" | "cloudy" | "rainy" | "custom") => void;
  customTheme?: { background?: string; foreground?: string; primary?: string };
  onCustomThemeSave?: (custom: { background?: string; foreground?: string; primary?: string }) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  temperatureUnit,
  onTemperatureUnitChange,
  apiKey,
  onApiKeySave,
  themePreset,
  onThemePresetChange,
  customTheme,
  onCustomThemeSave,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-40"
          onClick={onClose}
        />
      )}
      
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md shadow-neumorphism-inset z-50 p-6 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shadow-neumorphism hover:shadow-neumorphism-hover"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Theme Toggle */}
          <div className="p-4 rounded-lg shadow-neumorphism-inset bg-white/60 dark:bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {theme === "light" ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-500" />
                )}
                <span className="font-medium text-gray-800">Theme</span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => onThemeChange(checked ? "dark" : "light")}
              />
            </div>
            <p className="text-xs text-gray-600">
              {theme === "light" ? "Light Mode" : "Dark Mode"}
            </p>
          </div>

          {/* Temperature Unit */}
          <div className="p-4 rounded-lg shadow-neumorphism-inset bg-white/60 dark:bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <Thermometer className="w-5 h-5 text-red-500" />
              <span className="font-medium text-gray-800">Temperature Unit</span>
            </div>
            <Select value={temperatureUnit} onValueChange={(value) => onTemperatureUnitChange(value as "C" | "F" | "K")}>
              <SelectTrigger className="w-full shadow-neumorphism">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">Celsius (°C)</SelectItem>
                <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                <SelectItem value="K">Kelvin (K)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme Presets */}
          <div className="p-4 rounded-lg shadow-neumorphism-inset bg-white/60 dark:bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-800">Theme Preset</span>
            </div>
            <Select
              value={themePreset ?? "sunny"}
              onValueChange={(value) =>
                onThemePresetChange && onThemePresetChange(value as "sunny" | "cloudy" | "rainy" | "custom")
              }
            >
              <SelectTrigger className="w-full shadow-neumorphism">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunny">Sunny</SelectItem>
                <SelectItem value="cloudy">Cloudy</SelectItem>
                <SelectItem value="rainy">Rainy</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {themePreset === "custom" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[11px] text-gray-600 mb-1">Background</p>
                    <Input
                      type="text"
                      placeholder="e.g. #e0e5ec"
                      defaultValue={customTheme?.background ?? ""}
                      className="shadow-neumorphism-inset"
                      onBlur={(e) => {
                        const updated = { ...customTheme, background: e.currentTarget.value || undefined };
                        onCustomThemeSave && onCustomThemeSave(updated);
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-600 mb-1">Foreground</p>
                    <Input
                      type="text"
                      placeholder="e.g. #2c3e50"
                      defaultValue={customTheme?.foreground ?? ""}
                      className="shadow-neumorphism-inset"
                      onBlur={(e) => {
                        const updated = { ...customTheme, foreground: e.currentTarget.value || undefined };
                        onCustomThemeSave && onCustomThemeSave(updated);
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-600 mb-1">Primary</p>
                    <Input
                      type="text"
                      placeholder="e.g. #4f46e5"
                      defaultValue={customTheme?.primary ?? ""}
                      className="shadow-neumorphism-inset"
                      onBlur={(e) => {
                        const updated = { ...customTheme, primary: e.currentTarget.value || undefined };
                        onCustomThemeSave && onCustomThemeSave(updated);
                      }}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="shadow-neumorphism w-full"
                  onClick={() => onCustomThemeSave && onCustomThemeSave(customTheme ?? {})}
                >
                  Save Custom Preset
                </Button>
              </div>
            )}
          </div>

          {/* API Key Section */}
          <div className="p-4 rounded-lg shadow-neumorphism-inset bg-white/60 dark:bg-slate-900/50 backdrop-blur-md">
            <h3 className="font-medium text-gray-800 mb-2">Weather API Key</h3>
            <p className="text-xs text-gray-600 mb-3">
              Paste your WeatherAPI.com key. It will be saved for future sessions.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder="Enter API Key"
                defaultValue={apiKey ?? ""}
                className="shadow-neumorphism-inset"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) onApiKeySave(val);
                  }
                }}
              />
              <Button
                variant="outline"
                className="shadow-neumorphism"
                onClick={() => {
                  const el = (document.activeElement as HTMLInputElement) || null;
                  const container = (e?: Event) => {
                    // no-op, just ensures types
                  };
                  // Find the closest input in this section
                  const parent = (document.activeElement as HTMLElement)?.closest("div");
                  const input = parent?.querySelector("input") as HTMLInputElement | null;
                  const val = input?.value.trim() || "";
                  if (val) onApiKeySave(val);
                }}
              >
                Save
              </Button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Tip: You can create a free key at weatherapi.com.
            </p>
          </div>

          {/* About Section */}
          <div className="p-4 rounded-lg shadow-neumorphism-inset bg-white/60 dark:bg-slate-900/50 backdrop-blur-md">
            <h3 className="font-medium text-gray-800 mb-2">About</h3>
            <p className="text-xs text-gray-600 mb-2">
              Live Weather Dashboard
            </p>
            <p className="text-xs text-gray-500">
              Developed by: A. MOHAMED ARSHAD
            </p>
            <p className="text-xs text-gray-500">
              Team: MOHAMMED AZARUDHIN A, MUZZAMMIL HUSIAN P S, SANTHANA PRAKASH R
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Date: 01-10-2025
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}