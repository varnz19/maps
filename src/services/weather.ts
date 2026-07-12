import type { WeatherInfo } from '../types/tour';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

/**
 * Maps WMO Weather Code to condition, icon and description.
 */
function mapWmoCodeToWeather(code: number, temp: number): WeatherInfo {
  let condition = 'Clear';
  let icon = '01d';
  let description = 'clear sky';

  if (code === 0) {
    condition = 'Clear';
    icon = '01d';
    description = 'clear sky';
  } else if (code >= 1 && code <= 3) {
    condition = 'Clouds';
    icon = '03d';
    description = code === 1 ? 'mainly clear' : code === 2 ? 'partly cloudy' : 'overcast';
  } else if (code === 45 || code === 48) {
    condition = 'Fog';
    icon = '50d';
    description = 'foggy';
  } else if (code >= 51 && code <= 57) {
    condition = 'Drizzle';
    icon = '09d';
    description = 'light drizzle';
  } else if (code >= 61 && code <= 67) {
    condition = 'Rain';
    icon = '10d';
    description = 'moderate rain';
  } else if (code >= 71 && code <= 77) {
    condition = 'Snow';
    icon = '13d';
    description = 'snow fall';
  } else if (code >= 80 && code <= 82) {
    condition = 'Rain';
    icon = '09d';
    description = 'rain showers';
  } else if (code >= 85 && code <= 86) {
    condition = 'Snow';
    icon = '13d';
    description = 'snow showers';
  } else if (code >= 95 && code <= 99) {
    condition = 'Thunderstorm';
    icon = '11d';
    description = 'thunderstorm';
  }

  const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

  return {
    temp: Math.round(temp),
    condition,
    icon: iconUrl,
    description,
  };
}

/**
 * Fetches current weather details for a specific latitude and longitude.
 * Integrates Open-Meteo as a free live source before falling back to static mocks.
 */
export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  city: string
): Promise<WeatherInfo> {
  // 1. If API key is available, fetch from OpenWeather
  if (API_KEY) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      if (response.ok) {
        const data = await response.json();
        return {
          temp: Math.round(data.main.temp),
          condition: data.weather[0].main,
          icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
          description: data.weather[0].description,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch from OpenWeather API:', error);
    }
  }

  // 2. Keyless Free Open-Meteo live API call
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.current_weather) {
        return mapWmoCodeToWeather(
          data.current_weather.weathercode,
          data.current_weather.temperature
        );
      }
    }
  } catch (error) {
    console.warn('Failed to fetch from Open-Meteo API, falling back to mock:', error);
  }

  // 3. Fallback to mock weather if APIs fail or are offline
  return getMockWeatherForCity(city, lat);
}

function getMockWeatherForCity(city: string, lat: number): WeatherInfo {
  const cityName = city.toLowerCase();
  
  // Custom mock data for default stops to make them extremely authentic
  if (cityName.includes('seoul')) {
    return { temp: 16, condition: 'Clear', icon: '01d', description: 'clear sky' };
  } else if (cityName.includes('tokyo')) {
    return { temp: 9, condition: 'Clouds', icon: '02d', description: 'few clouds' };
  } else if (cityName.includes('los angeles')) {
    return { temp: 19, condition: 'Clear', icon: '01d', description: 'sunny' };
  } else if (cityName.includes('new york')) {
    return { temp: 14, condition: 'Rain', icon: '10d', description: 'light rain' };
  } else if (cityName.includes('london')) {
    return { temp: 18, condition: 'Clouds', icon: '03d', description: 'mostly cloudy' };
  } else if (cityName.includes('paris')) {
    return { temp: 22, condition: 'Clear', icon: '01d', description: 'clear sky' };
  } else if (cityName.includes('berlin')) {
    return { temp: 24, condition: 'Clouds', icon: '02d', description: 'scattered clouds' };
  } else if (cityName.includes('toronto')) {
    return { temp: 25, condition: 'Clear', icon: '01d', description: 'sunny' };
  } else if (cityName.includes('chicago')) {
    return { temp: 26, condition: 'Thunderstorm', icon: '11d', description: 'thunderstorm with rain' };
  } else if (cityName.includes('sydney')) {
    // Southern hemisphere is in winter/early spring in July-September
    return { temp: 15, condition: 'Clear', icon: '01d', description: 'breezy and clear' };
  }

  // Generic weather based on latitude
  const absoluteLat = Math.abs(lat);
  let temp = 20;
  let condition = 'Clear';
  let icon = '01d';
  let description = 'clear sky';

  if (absoluteLat < 15) {
    // Equatorial - Hot and rainy
    temp = 28 + Math.round(Math.random() * 4);
    condition = 'Rain';
    icon = '09d';
    description = 'tropical showers';
  } else if (absoluteLat > 50) {
    // High latitudes - Colder
    temp = 8 + Math.round(Math.random() * 8);
    condition = 'Clouds';
    icon = '04d';
    description = 'overcast clouds';
  } else {
    // Mid latitudes
    temp = 15 + Math.round(Math.random() * 10);
    const rand = Math.random();
    if (rand < 0.4) {
      condition = 'Clear';
      icon = '01d';
      description = 'sunny and clear';
    } else if (rand < 0.7) {
      condition = 'Clouds';
      icon = '02d';
      description = 'partly cloudy';
    } else {
      condition = 'Rain';
      icon = '10d';
      description = 'moderate rain';
    }
  }

  // Prepend weathericon base path if using openweather mock icons
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

  return {
    temp,
    condition,
    icon: iconUrl,
    description,
  };
}
