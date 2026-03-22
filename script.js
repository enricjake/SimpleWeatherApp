const apiKey = ''; // Open-Meteo doesn't require an API key
const apiUrl = 'https://api.open-meteo.com/v1/forecast';

// Geocoding API to convert city name to coordinates
const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const themeToggle = document.getElementById('theme-toggle');
const weatherInfo = document.getElementById('weather-info');
const cityNameElement = document.getElementById('city-name');
const temperatureElement = document.getElementById('temperature');
const weatherDescriptionElement = document.getElementById('weather-description');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const weatherIconElement = document.querySelector('.weather-icon');
const loadingDiv = document.getElementById('loading');
const suggestionsDiv = document.getElementById('suggestions');

// Debounce timer for autocomplete
let debounceTimer;

searchBtn.addEventListener('click', getWeather);
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
    
    debounceTimer = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
});

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.input-wrapper')) {
        hideSuggestions();
    }
});

locationBtn.addEventListener('click', function() {
    console.log('Location button clicked');
    getWeatherByLocation();
});
themeToggle.addEventListener('click', toggleDarkMode);

async function fetchCitySuggestions(query) {
    try {
        // Fetch more results to show multiple cities with same name
        const response = await fetch(`${geocodingUrl}?name=${query}&count=10&language=en&format=json`);
        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displaySuggestions(data.results);
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
    
    // Group cities by name to show duplicates together
    const cityGroups = {};
    results.forEach(city => {
        const key = city.name.toLowerCase();
        if (!cityGroups[key]) {
            cityGroups[key] = [];
        }
        cityGroups[key].push(city);
    });
    
    results.forEach(city => {
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
    loadingDiv.hidden = false;
    weatherInfo.classList.add('dimmed');
    hideSuggestions();

    try {
        // First, get the coordinates for the city
        const geoResponse = await fetch(`${geocodingUrl}?name=${city}&count=5&language=en&format=json`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        // If multiple results, show suggestions for user to choose
        if (geoData.results.length > 1) {
            loadingDiv.hidden = true;
            weatherInfo.classList.remove('dimmed');
            displaySuggestions(geoData.results);
            showError('Please select a location from the suggestions');
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // Then, get the weather data using the coordinates
        const weatherResponse = await fetch(`${apiUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherResponse.json();

        displayWeather(weatherData, name, country);
    } catch (error) {
        console.error('Weather fetch error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error. Please check your internet connection and try again.');
        } else {
            showError(error.message);
        }
    } finally {
        loadingDiv.hidden = true;
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
    loadingDiv.hidden = false;
    weatherInfo.classList.add('dimmed');
    hideSuggestions();

    try {
        const { latitude, longitude, name, country } = selectedLocation;

        // Get the weather data using the coordinates
        const weatherResponse = await fetch(`${apiUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherResponse.json();

        displayWeather(weatherData, name, country);
    } catch (error) {
        console.error('Weather fetch error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error. Please check your internet connection and try again.');
        } else {
            showError(error.message);
        }
    } finally {
        loadingDiv.hidden = true;
        weatherInfo.classList.remove('dimmed');
    }
}

function getWeatherByLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    // Show spinner
    loadingDiv.hidden = false;
    weatherInfo.classList.add('dimmed');
    
    // Show loading state
    cityNameElement.textContent = 'Getting location...';
    temperatureElement.textContent = '--°C';
    weatherDescriptionElement.textContent = 'Please allow location access';
    humidityElement.textContent = '--%';
    windSpeedElement.textContent = '-- km/h';

    // Use getCurrentPosition with proper error handling
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Got position:', latitude, longitude);

            try {
                // Get the weather data using the coordinates
                const weatherUrl = `${apiUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
                console.log('Fetching weather from:', weatherUrl);
                
                const weatherResponse = await fetch(weatherUrl);
                if (!weatherResponse.ok) {
                    throw new Error(`Weather API error: ${weatherResponse.status}`);
                }
                const weatherData = await weatherResponse.json();
                console.log('Weather data:', weatherData);

                // Get the city name from the reverse geocoding API
                const reverseGeoUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`;
                console.log('Reverse geocoding from:', reverseGeoUrl);
                
                const reverseGeoResponse = await fetch(reverseGeoUrl);
                if (!reverseGeoResponse.ok) {
                    throw new Error(`Reverse geocoding API error: ${reverseGeoResponse.status}`);
                }
                const reverseGeoData = await reverseGeoResponse.json();
                console.log('Reverse geocoding data:', reverseGeoData);

                if (reverseGeoData.results && reverseGeoData.results.length > 0) {
                    const { name, country } = reverseGeoData.results[0];
                    displayWeather(weatherData, name, country);
                } else {
                    displayWeather(weatherData, 'Unknown Location', '');
                }
            } catch (error) {
                console.error('Error in getWeatherByLocation:', error);
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    showError('Network error. Please check your internet connection and try again.');
                } else {
                    showError(error.message || 'Unable to get weather data');
                }
            } finally {
                loadingDiv.hidden = true;
                weatherInfo.classList.remove('dimmed');
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to retrieve your location';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Please try again.';
                    break;
            }
            
            showError(errorMessage);
            loadingDiv.hidden = true;
            weatherInfo.classList.remove('dimmed');
        },
        {
            enableHighAccuracy: false, // Use network-based location (faster, works indoors)
            timeout: 30000, // 30 seconds timeout
            maximumAge: 600000 // Allow cached location up to 10 minutes old
        }
    );
}

function displayWeather(data, cityName, country) {
    const { current } = data;
    const { temperature_2m: temp, relative_humidity_2m: humidity, wind_speed_10m: windSpeed, weather_code: weatherCode } = current;

    // Convert weather code to description and get appropriate icon class
    const weatherDetails = getWeatherInfo(weatherCode);

    // Update the UI elements
    cityNameElement.textContent = country ? `${cityName}, ${country}` : cityName;
    temperatureElement.textContent = `${Math.round(temp)}°C`;
    weatherDescriptionElement.textContent = weatherDetails.description;
    humidityElement.textContent = `${humidity}%`;
    windSpeedElement.textContent = `${Math.round(windSpeed * 3.6)} km/h`; // Convert m/s to km/h

    // Update the weather icon
    weatherIconElement.className = `wi ${weatherDetails.icon}`;
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
    temperatureElement.textContent = '--°C';
    weatherDescriptionElement.textContent = message;
    humidityElement.textContent = '--%';
    windSpeedElement.textContent = '-- km/h';
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