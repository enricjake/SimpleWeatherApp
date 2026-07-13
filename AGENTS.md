# SimpleWeatherApp

Static weather app (HTML/CSS/JS). No build step, no package manager, no tests.

## Running

Open `index.html` in a browser or serve with any static file server:
```
npx serve .
```

## Structure

- `index.html` - Single page entry point, loads all resources via `<script>` and `<link>` tags
- `script.js` - All application logic (autocomplete, geolocation, API calls, rendering)
- `styles.css` - All styles including dark mode, weather themes, and responsive layout

## API

- Weather data: Open-Meteo API (`api.open-meteo.com`), no API key required
- Geocoding: Open-Meteo Geocoding API (`geocoding-api.open-meteo.com`)
- IP fallback: `ipapi.co` (used when browser geolocation is denied)

## Conventions

- All JS is vanilla, no frameworks, no modules (single file, no imports/exports)
- DOM element IDs match the `const` variable names in `script.js` (e.g. `#city-input` -> `cityInput`)
- Weather icons use the `weather-icons` CDN library (`wi-*` classes)
- Background gradient changes based on weather code via `body.weather-*` classes
- Dark mode toggled by adding/removing `body.dark` class
- Temperature units are metric-only (Celsius, km/h) - `REQUIREMENTS.md` lists Imperial as planned but not implemented

## Gotchas

- `script.js` is ~460 lines of imperative DOM manipulation; no abstraction layers
- Shared helpers: `showLoading()`/`hideLoading()`, `fetchWeatherData()`, `handleWeatherError()`, `filterPopulatedPlaces()`
- `CITY_FEATURE_CODES` constant is shared between geocoding filter and suggestion display
- Autocomplete uses Open-Meteo geocoding with debounce (300ms) and filters by populated place feature codes
- Geolocation tries browser API first, falls back to IP-based lookup
- Dark mode preference persists to `localStorage`
