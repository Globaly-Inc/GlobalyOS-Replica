import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, Wind } from "lucide-react";
import { format, parseISO } from "date-fns";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  forecast: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    condition: string;
  }>;
}

interface WeatherDisplayProps {
  weather: WeatherData;
}

const getWeatherIcon = (condition: string) => {
  switch (condition) {
    case "Clear":
      return Sun;
    case "Partly Cloudy":
      return CloudSun;
    case "Rainy":
    case "Stormy":
      return CloudRain;
    case "Snowy":
      return CloudSnow;
    case "Foggy":
    case "Cloudy":
    default:
      return Cloud;
  }
};

const getWeatherIconColor = (condition: string) => {
  switch (condition) {
    case "Clear":
      return "text-yellow-300";
    case "Partly Cloudy":
      return "text-white/90";
    case "Rainy":
      return "text-blue-300";
    case "Snowy":
      return "text-white";
    case "Stormy":
      return "text-purple-300";
    case "Foggy":
      return "text-white/60";
    default:
      return "text-white/80";
  }
};

export function WeatherDisplay({ weather }: WeatherDisplayProps) {
  const WeatherIcon = getWeatherIcon(weather.condition);
  const iconColor = getWeatherIconColor(weather.condition);

  return (
    <div className="md:text-right">
      <div className="flex md:justify-end gap-3 items-center">
        <div className="flex items-center gap-2">
          <WeatherIcon className={`h-8 w-8 ${iconColor}`} />
          <span className="text-2xl font-semibold text-white">{weather.temperature}°C</span>
        </div>
        <div className="text-left">
          <p className="text-sm text-white/90 font-medium">{weather.condition}</p>
          <p className="text-xs text-white/70">{weather.location}</p>
          <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
            <span>💧 {weather.humidity}%</span>
            <span className="flex items-center gap-0.5">
              <Wind className="h-3 w-3" /> {weather.windSpeed} km/h
            </span>
          </div>
        </div>
        {/* 7-day forecast (desktop only) */}
        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
          {weather.forecast.slice(0, 7).map((day, i) => {
            const DayIcon = getWeatherIcon(day.condition);
            return (
              <div key={i} className="flex flex-col items-center text-center min-w-[40px]">
                <span className="text-[10px] text-white/60">{format(parseISO(day.date), "EEE")}</span>
                <DayIcon className="h-4 w-4 text-white/80 my-0.5" />
                <span className="text-[10px] text-white/90">{day.tempMax}°</span>
                <span className="text-[10px] text-white/50">{day.tempMin}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
