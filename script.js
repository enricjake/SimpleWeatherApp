const apiKey = ''; // Open-Meteo doesn't require an API key
const apiUrl = 'https://api.open-meteo.com/v1/forecast';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.getElementById('weather-info');
const cityNameElement = document.getElementById('city-name');
const temperatureElement = document.getElementById('temperature');
const weatherDescriptionElement = document.getElementById('weather-description');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const weatherIconElement = document.querySelector('.weather-icon');

// Geocoding API to convert city name to coordinates
const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';

searchBtn.addEventListener('click', getWeather);
cityInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getWeather();
    }
});

async function getWeather() {
    const city = cityInput.value.trim();
    
    if (city === '') {
        weatherInfo.innerHTML = '<p>Please enter a city name</p>';
        return;
    }
    
    try {
        // First, get the coordinates for the city
        const geoResponse = await fetch(`${geocodingUrl}?name=${city}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }
        
        const { latitude, longitude, name, country } = geoData.results[0];
        
        // Then, get the weather data using the coordinates
        const weatherResponse = await fetch(`${apiUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherResponse.json();
        
        displayWeather(weatherData, name, country);
    } catch (error) {
        cityNameElement.textContent = 'City Not Found';
        temperatureElement.textContent = '--°C';
        weatherDescriptionElement.textContent = error.message;
        humidityElement.textContent = '--%';
        windSpeedElement.textContent = '-- km/h';
        weatherIconElement.className = 'wi wi-na';
    }
}

function displayWeather(data, cityName, country) {
    const { current } = data;
    const { temperature_2m: temp, relative_humidity_2m: humidity, wind_speed_10m: windSpeed, weather_code: weatherCode } = current;

    // Convert weather code to description and get appropriate icon class
    const weatherDetails = getWeatherInfo(weatherCode);

    // Update the UI elements
    cityNameElement.textContent = `${cityName}, ${country}`;
    temperatureElement.textContent = `${Math.round(temp)}°C`;
    weatherDescriptionElement.textContent = weatherDetails.description;
    humidityElement.textContent = `${humidity}%`;
    windSpeedElement.textContent = `${Math.round(windSpeed * 3.6)} km/h`; // Convert m/s to km/h

    // Update the weather icon
    weatherIconElement.className = `wi ${weatherDetails.icon}`;
}

// Function to convert weather code to description and icon class
function getWeatherInfo(weatherCode) {
    const weatherMap = {
        // Weather codes from Open-Meteo API
        // 0-3: Clear and sunny conditions
        0: { description: 'Clear sky', icon: 'wi-day-sunny' },
        1: { description: 'Mainly clear', icon: 'wi-day-cloudy' },
        2: { description: 'Partly cloudy', icon: 'wi-cloud' },
        3: { description: 'Overcast', icon: 'wi-cloudy' },
        // 45-48: Fog and depositing rime fog
        45: { description: 'Fog', icon: 'wi-fog' },
        48: { description: 'Depositing rime fog', icon: 'wi-fog' },
        // 51-67: Drizzle
        51: { description: 'Light drizzle', icon: 'wi-sprinkle' },
        53: { description: 'Moderate drizzle', icon: 'wi-rain' },
        55: { description: 'Dense drizzle', icon: 'wi-rain' },
        56: { description: 'Light freezing drizzle', icon: 'wi-rain-mix' },
        57: { description: 'Dense freezing drizzle', icon: 'wi-rain-mix' },
        61: { description: 'Slight rain', icon: 'wi-rain' },
        63: { description: 'Moderate rain', icon: 'wi-rain' },
        65: { description: 'Heavy rain', icon: 'wi-rain' },
        66: { description: 'Light freezing rain', icon: 'wi-rain-mix' },
        67: { description: 'Heavy freezing rain', icon: 'wi-rain-mix' },
        // 71-77: Snow fall
        71: { description: 'Slight snow fall', icon: 'wi-snow' },
        73: { description: 'Moderate snow fall', icon: 'wi-snow' },
        75: { description: 'Heavy snow fall', icon: 'wi-snow' },
        77: { description: 'Snow grains', icon: 'wi-snow' },
        // 80-82: Rain showers
        80: { description: 'Slight rain showers', icon: 'wi-showers' },
        81: { description: 'Moderate rain showers', icon: 'wi-showers' },
        82: { description: 'Violent rain showers', icon: 'wi-thunderstorm' },
        // 85-86: Snow showers
        85: { description: 'Slight snow showers', icon: 'wi-snow' },
        86: { description: 'Heavy snow showers', icon: 'wi-snow' },
        // 95-99: Thunderstorm
        95: { description: 'Thunderstorm', icon: 'wi-thunderstorm' },
        96: { description: 'Thunderstorm with slight hail', icon: 'wi-hail' },
        99: { description: 'Thunderstorm with heavy hail', icon: 'wi-hail' }
    };

    return weatherMap[weatherCode] || { description: 'Unknown', icon: 'wi-na' };
}
