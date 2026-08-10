# SimpleWeatherApp

The repo name is "SimpleWeatherApp" but the app brand is **SkyCast** (used in `<title>`, header, `localStorage` key `skycast-dark-mode`).

Static weather app (HTML/CSS/JS). No build step, no package manager, no tests.

## Running

Open `index.html` in a browser or serve with any static file server:
```
npx serve .
```

## Structure

- `index.html` - Single page entry point, loads all resources via `<script>` and `<link>` tags
- `script.js` - All application logic (autocomplete, geolocation, API calls, rendering; ~530 lines)
- `styles.css` - All styles including dark mode, weather themes, and responsive layout
- `REQUIREMENTS.md` - Development plan and milestones through 2026-07-22
- `test_app.py` - Playwright integration tests (requires venv: `/tmp/playwright-env/bin/python3 test_app.py http://localhost:8765`)
- `android-widget/` - Android home screen widget (Kotlin + AppWidgetProvider)

## API

- Weather data: Open-Meteo API (`api.open-meteo.com`), no API key required
- Geocoding: Open-Meteo Geocoding API (`geocoding-api.open-meteo.com`)
- IP fallback: `ipapi.co` (used when browser geolocation is denied)

## Conventions

- All JS is vanilla, no frameworks, no modules (single file, no `import`/`export`)
- DOM element IDs match `const` variable names in `script.js` (e.g. `#city-input` → `cityInput`)
- Weather icons use `weather-icons` CDN (`wi-*` classes)
- Background gradient changes via `body.weather-*` classes; nighttime overrides via `body.nighttime`
- Dark mode: `body.dark` class, persisted to `localStorage` key `skycast-dark-mode`
- Metric-only (Celsius, km/h) — Imperial listed as planned in `REQUIREMENTS.md` but not implemented

## MCP Usage

- Use MCPs as much as possible, when necessary.

## Gotchas

- `selectedLocation` state tracks the last picked suggestion; cleared when the input text changes away from the selected display name
- Autocomplete requests `count=50` results, deduplicates by name+admin1+country, sorts exact matches first then by population descending, and shows at most 8
- Shared helpers: `showLoading()`/`hideLoading()`, `fetchWeatherData()`, `handleWeatherError()`, `filterPopulatedPlaces()`, `startTimeUpdates()`
- `CITY_FEATURE_CODES` constant filters geocoding results to populated places only
- Browser geolocation first (`getCurrentPosition`), falls back to `ipapi.co` for IP-based lookup
- **Live clock**: `startTimeUpdates(timezone)` stores IANA timezone from API response and ticks via `setInterval` every 10s; `clearInterval` in `showError` stops updates on error
- **Auto-refresh**: `startAutoRefresh()` fires `refreshWeather()` every 60s to re-fetch weather silently (no loading overlay). Tracks last coords via `lastCoords`. Cleared on error via `showError`.
