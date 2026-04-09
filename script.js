const apiKey = ''; // Open-Meteo doesn't require an API key
const apiUrl = 'https://api.open-meteo.com/v1/forecast';

// Geocoding API to convert city name to coordinates
const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';

const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const themeToggle = document.getElementById('theme-toggle');
const weatherInfo = document.getElementById('weather-info');
const cityNameElement = document.getElementById('city-name');
const temperatureElement = document.getElementById('temperature');
const weatherDescriptionElement = document.getElementById('weather-description');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const maxTempElement = document.getElementById('max-temp');
const minTempElement = document.getElementById('min-temp');
const currentTimeElement = document.getElementById('current-time');
const dateDisplayElement = document.getElementById('date-display');
const weatherIconElement = document.querySelector('.weather-icon');
const loadingDiv = document.getElementById('loading');
const suggestionsDiv = document.getElementById('suggestions');

// Debounce timer for autocomplete
let debounceTimer;

function checkInputOverflow() {
    if (cityInput.scrollWidth > cityInput.clientWidth) {
        const scrollDist = -(cityInput.scrollWidth - cityInput.clientWidth) - 10;
        cityInput.style.setProperty('--scroll-dist', scrollDist + 'px');
        cityInput.classList.add('overflowing');
    } else {
        cityInput.classList.remove('overflowing');
        cityInput.style.removeProperty('--scroll-dist');
    }
}

// Set current date in the header
const dateTagline = document.getElementById('current-date');
if (dateTagline) {
    const now = new Date();
    dateTagline.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

cityInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        hideSuggestions();
        // If we have a selected location, use it directly
        if (selectedLocation) {
            getWeatherBySelectedLocation();
        } else {
            getWeather();
        }
    }
});

// Store selected location data to avoid re-fetching
let selectedLocation = null;

// Autocomplete functionality
cityInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const query = this.value.trim();
    
    // Clear selected location if user is typing a new query
    if (selectedLocation && query !== selectedLocation.displayName) {
        selectedLocation = null;
    }
    
    if (query.length < 2) {
        hideSuggestions();
        return;
    }
    
    // Check if input text overflows and apply scroll animation
    requestAnimationFrame(checkInputOverflow);
    
    debounceTimer = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
});

// Reset scroll animation on focus, re-check on blur
cityInput.addEventListener('focus', function() {
    this.classList.remove('overflowing');
    this.style.textIndent = '0';
});

cityInput.addEventListener('blur', function() {
    requestAnimationFrame(checkInputOverflow);
});

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.input-wrapper')) {
        hideSuggestions();
    }
});

locationBtn.addEventListener('click', function() {
    // Show loading state when button is clicked
    loadingDiv.classList.add('visible');
    weatherInfo.classList.add('dimmed');
    getWeatherByLocation();
});
themeToggle.addEventListener('click', toggleDarkMode);

async function fetchCitySuggestions(query) {
    try {
        // Fetch a large pool of results to filter for major cities
        const response = await fetch(`${geocodingUrl}?name=${query}&count=50&language=en&format=json`);
        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Filter to actual populated places (cities/towns) with population data
            const cityFeatureCodes = ['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLG', 'PPLS'];
            const cities = data.results.filter(city =>
                cityFeatureCodes.includes(city.feature_code) && city.population > 0
            );
            if (cities.length > 0) {
                displaySuggestions(cities);
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
        hideSuggestions();
    }
}

function displaySuggestions(results) {
    suggestionsDiv.innerHTML = '';
    
    // Deduplicate cities: keep only unique city+region+country combinations
    // This prevents showing the same location multiple times
    const seenLocations = new Set();
    const uniqueResults = [];
    
    results.forEach(city => {
        // Create a unique key based on name, admin1, and country
        const key = `${city.name.toLowerCase()}-${(city.admin1 || '').toLowerCase()}-${(city.country || '').toLowerCase()}`;
        
        if (!seenLocations.has(key)) {
            seenLocations.add(key);
            uniqueResults.push(city);
        }
    });
    
    // Sort by relevance: exact name matches first, then by population (largest first)
    const query = cityInput.value.toLowerCase().trim();
    uniqueResults.sort((a, b) => {
        const aExact = a.name.toLowerCase() === query;
        const bExact = b.name.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Secondary sort: by population descending (larger cities first)
        return (b.population || 0) - (a.population || 0);
    });
    
    // Limit to top 8 suggestions
    const topSuggestions = uniqueResults.slice(0, 8);
    
    topSuggestions.forEach(city => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        
        // Build location string with more context (country, admin1/state)
        let locationParts = [city.name];
        if (city.admin1) {
            locationParts.push(city.admin1); // State/Province
        }
        if (city.country) {
            locationParts.push(city.country);
        }
        
        const displayName = locationParts.join(', ');
        const fullName = city.country ? `${city.name}, ${city.country}` : city.name;
        
        suggestionItem.innerHTML = `
            <span class="city-name">${city.name}</span>
            <span class="location-detail">${city.admin1 ? city.admin1 + ', ' : ''}${city.country || ''}</span>
        `;
        
        suggestionItem.addEventListener('click', () => {
            // Store the full location data for later use
            selectedLocation = {
                latitude: city.latitude,
                longitude: city.longitude,
                name: city.name,
                country: city.country,
                admin1: city.admin1,
                displayName: fullName
            };
            cityInput.value = displayName;
            hideSuggestions();
            requestAnimationFrame(checkInputOverflow);
            getWeatherBySelectedLocation();
        });
        
        suggestionsDiv.appendChild(suggestionItem);
    });
    
    suggestionsDiv.classList.add('active');
}

function hideSuggestions() {
    suggestionsDiv.classList.remove('active');
    suggestionsDiv.innerHTML = '';
}

async function getWeather() {
    const city = cityInput.value.trim();

    if (city === '') {
        showError('Please enter a city name');
        return;
    }

    // Show spinner
    loadingDiv.classList.add('visible');
    weatherInfo.classList.add('dimmed');
    hideSuggestions();

    try {
        // First, get the coordinates for the city
        const geoResponse = await fetch(`${geocodingUrl}?name=${city}&count=5&language=en&format=json`);
        
        if (!geoResponse.ok) {
            throw new Error(`Geocoding API error: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        // If multiple results, show suggestions for user to choose
        if (geoData.results.length > 1) {
            loadingDiv.classList.remove('visible');
            weatherInfo.classList.remove('dimmed');
            // Filter to actual populated places (cities/towns) with population data
            const cityFeatureCodes = ['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLG', 'PPLS'];
            const cities = geoData.results.filter(city =>
                cityFeatureCodes.includes(city.feature_code) && city.population > 0
            );
            displaySuggestions(cities.length > 0 ? cities : geoData.results);
            showError('Please select a location from the suggestions');
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // Then, get the weather data using the coordinates
        const weatherResponse = await fetch(`${apiUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        
        if (!weatherResponse.ok) {
            throw new Error(`Weather API error: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();

        displayWeather(weatherData, name, country);
    } catch (error) {
        console.error('Weather fetch error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('API error')) {
            showError(error.message);
        } else {
            showError(error.message);
        }
    } finally {
        loadingDiv.classList.remove('visible');
        weatherInfo.classList.remove('dimmed');
    }
}

// Get weather using pre-selected location from suggestions
async function getWeatherBySelectedLocation() {
    if (!selectedLocation) {
        showError('Please select a location from the suggestions');
        return;
    }

    // Show spinner
    loadingDiv.classList.add('visible');
    weatherInfo.classList.add('dimmed');
    hideSuggestions();

    try {
        const { latitude, longitude, name, country } = selectedLocation;

        // Get the weather data using the coordinates
        const weatherResponse = await fetch(`${apiUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        
        if (!weatherResponse.ok) {
            throw new Error(`Weather API error: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();

        displayWeather(weatherData, name, country);
    } catch (error) {
        console.error('Weather fetch error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('API error')) {
            showError(error.message);
        } else {
            showError(error.message);
        }
    } finally {
        loadingDiv.classList.remove('visible');
        weatherInfo.classList.remove('dimmed');
    }
}

// Browser Geolocation API (primary method for mobile devices)
function getWeatherByBrowserGeolocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported by browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access or search by city name.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable. Please search by city name.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please search by city name.';
                        break;
                    default:
                        errorMessage = 'Unable to get location. Please search by city name.';
                }
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes cache
            }
        );
    });
}

// IP-based geolocation (fallback method)
async function getWeatherByIPGeolocation() {
    try {
        // Use ipapi.co as fallback (more mobile-friendly)
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (!ipResponse.ok) {
            throw new Error('Failed to get location from IP');
        }
        const ipData = await ipResponse.json();
        
        if (ipData.latitude && ipData.longitude) {
            return {
                latitude: ipData.latitude,
                longitude: ipData.longitude,
                city: ipData.city,
                region: ipData.region,
                country: ipData.country_name
            };
        } else {
            throw new Error('Unable to determine location from IP address');
        }
    } catch (error) {
        console.error('IP geolocation error:', error);
        throw error;
    }
}

// Main location function with fallback mechanism
async function getWeatherByLocation() {
    // Show loading state when button is clicked
    loadingDiv.classList.add('visible');
    weatherInfo.classList.add('dimmed');
    
    cityNameElement.textContent = 'Detecting location...';
    temperatureElement.textContent = '--';
    weatherDescriptionElement.textContent = 'Getting your weather data...';
    humidityElement.textContent = '--%';
    windSpeedElement.textContent = '-- km/h';
    maxTempElement.textContent = '--°';
    minTempElement.textContent = '--°';

    try {
        let lat, lon, displayName;
        
        // Try browser geolocation first (primary method)
        try {
            const coords = await getWeatherByBrowserGeolocation();
            lat = coords.latitude;
            lon = coords.longitude;
            displayName = 'Your Location';
        } catch (browserError) {
            console.log('Browser geolocation failed, trying IP-based:', browserError.message);
            
            // Fall back to IP-based geolocation
            try {
                const ipData = await getWeatherByIPGeolocation();
                lat = ipData.latitude;
                lon = ipData.longitude;
                
                // Create display name from IP data
                let locationParts = [];
                if (ipData.city) locationParts.push(ipData.city);
                if (ipData.region) locationParts.push(ipData.region);
                if (ipData.country) locationParts.push(ipData.country);
                displayName = locationParts.length > 0 ? locationParts.join(', ') : 'Your Location';
            } catch (ipError) {
                // Both methods failed
                throw new Error(browserError.message.includes('permission') ? browserError.message : 'Unable to determine location. Please search by city name.');
            }
        }
        
        // Get weather data using the coordinates
        const weatherUrl = `${apiUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) {
            throw new Error(`Weather API error: ${weatherResponse.status}`);
        }
        const weatherData = await weatherResponse.json();
        
        // Hide loading spinner and remove dim
        loadingDiv.classList.remove('visible');
        weatherInfo.classList.remove('dimmed');
        
        displayWeather(weatherData, displayName, '');
    } catch (error) {
        console.error('Location error:', error);
        
        // Hide loading spinner and remove dim
        loadingDiv.classList.remove('visible');
        weatherInfo.classList.remove('dimmed');
        
        showError(error.message || 'Unable to determine location. Please search by city name.');
    }
}

function displayWeather(data, cityName, country) {
    const { current, daily } = data;
    const { temperature_2m: temp, relative_humidity_2m: humidity, wind_speed_10m: windSpeed, weather_code: weatherCode } = current;

    // Convert weather code to description and get appropriate icon class
    const weatherDetails = getWeatherInfo(weatherCode);

    // Update the primary UI elements
    cityNameElement.textContent = country ? `${cityName}, ${country}` : cityName;
    temperatureElement.textContent = `${Math.round(temp)}`;
    weatherDescriptionElement.textContent = weatherDetails.description;
    humidityElement.textContent = `${humidity}%`;
    windSpeedElement.textContent = `${Math.round(windSpeed * 3.6)} km/h`;

    // Update max/min temps from daily forecast
    if (daily) {
        maxTempElement.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
        minTempElement.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;
    }

    // Update time and date
    const now = new Date();
    currentTimeElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dateDisplayElement.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    // Update the weather icon
    weatherIconElement.className = `wi ${weatherDetails.icon}`;

    // Set the atmospheric background theme
    setWeatherTheme(weatherCode);
}

function setWeatherTheme(weatherCode) {
    // Remove all weather theme classes
    document.body.classList.remove(
        'weather-clear', 'weather-cloudy', 'weather-overcast',
        'weather-rain', 'weather-snow', 'weather-storm',
        'weather-fog', 'weather-drizzle'
    );

    // Map weather codes to theme classes
    if (weatherCode === 0 || weatherCode === 1) {
        document.body.classList.add('weather-clear');
    } else if (weatherCode === 2) {
        document.body.classList.add('weather-cloudy');
    } else if (weatherCode === 3) {
        document.body.classList.add('weather-overcast');
    } else if (weatherCode === 45 || weatherCode === 48) {
        document.body.classList.add('weather-fog');
    } else if (weatherCode >= 51 && weatherCode <= 57) {
        document.body.classList.add('weather-drizzle');
    } else if (weatherCode >= 61 && weatherCode <= 67) {
        document.body.classList.add('weather-rain');
    } else if (weatherCode >= 71 && weatherCode <= 77) {
        document.body.classList.add('weather-snow');
    } else if (weatherCode >= 80 && weatherCode <= 82) {
        document.body.classList.add('weather-rain');
    } else if (weatherCode >= 85 && weatherCode <= 86) {
        document.body.classList.add('weather-snow');
    } else if (weatherCode >= 95) {
        document.body.classList.add('weather-storm');
    }
}

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

function showError(message) {
    cityNameElement.textContent = 'Error';
    temperatureElement.textContent = '--';
    weatherDescriptionElement.textContent = message;
    humidityElement.textContent = '--%';
    windSpeedElement.textContent = '-- km/h';
    maxTempElement.textContent = '--°';
    minTempElement.textContent = '--°';
    currentTimeElement.textContent = '--:--';
    dateDisplayElement.textContent = '--';
    weatherIconElement.className = 'wi wi-alert';
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    
    // Update the icon based on current mode
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark')) {
        icon.className = 'wi wi-sun';
    } else {
        icon.className = 'wi wi-moon-alt';
    }
}