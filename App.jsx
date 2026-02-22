# ⛳ Golf Shot Dispersion App

Mobile-first PWA for shot dispersion analysis and on-course distance overlay.

---

## Stack

- **React + Vite** — fast dev server, optimized builds
- **Mapbox GL JS** — satellite imagery + zoom-responsive ellipse scaling
- **vite-plugin-pwa** — service worker, offline caching, "Add to Home Screen"
- **localStorage** — persistent shot data, no backend needed

---

## Project Structure

```
src/
  components/
    DispersionChart.jsx   # Chart tab — ellipses, scatter, stats
    MapView.jsx           # On Course tab — satellite + fixed overlay
    UploadTab.jsx         # Upload tab — CSV merge UI
  hooks/
    useGPS.js             # Browser geolocation wrapper
  utils/
    ellipse.js            # Math: covariance, chi-squared, haversine
    csv.js                # CSV parser + column validation
    storage.js            # localStorage wrapper
  data/
    seedData.js           # Century Golf session (built-in baseline)
  App.jsx                 # Nav shell, state, merge logic
  main.jsx                # Entry point
```

---

## Setup (one time)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/golf-dispersion.git
cd golf-dispersion
npm install
```

### 2. Get a Mapbox token (free)

1. Go to [account.mapbox.com](https://account.mapbox.com)
2. Sign up / log in
3. Copy your **Default public token** (starts with `pk.`)

### 3. Create your local env file

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your token:

```
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiWU9VUl9UT0tFTiJ9...
```

> ⚠️ `.env.local` is gitignored — your token never touches GitHub.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to Vercel (free, ~5 minutes)

### First deploy

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. In **Environment Variables**, add:
   - Name: `VITE_MAPBOX_TOKEN`
   - Value: your `pk.` token
5. Click **Deploy**

Vercel auto-detects Vite. Build command is `npm run build`, output dir is `dist`.

### Subsequent deploys

```bash
git add . && git commit -m "your message" && git push
```

Vercel auto-deploys on every push to `main`. Done.

---

## Add to iPhone Home Screen (PWA)

Once deployed to Vercel:

1. Open your Vercel URL in **Safari** on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Name it "Dispersion" → **Add**

It now launches full-screen with no browser chrome, just like a native app.

---

## On Course Tab — GPS Setup

- Tap **Enable GPS** in the bottom bar
- iOS Safari will ask for location permission — tap **Allow**
- The distance readout at the top updates live as you drag the map
- Drag the satellite map so the crosshair is over your target
- Switch clubs in the bottom bar to reshapes the ellipse instantly

**GPS accuracy notes:**
- Outdoors on course: typically ±3–5 meters (plenty accurate)  
- Inside simulator: GPS may struggle — use the chart tab there
- HTTPS is required for GPS (Vercel gives you this automatically)

---

## Changing the Default Map Location

In `src/components/MapView.jsx`, line 10:

```js
const DEFAULT_CENTER = [-121.9242, 37.5485] // Change to your home course
```

Replace with the `[longitude, latitude]` of your home course.
Find coordinates: right-click any spot on Google Maps → "What's here?"

---

## CSV Upload Format

Export from your simulator and upload via the Upload tab.

| Column | Required | Notes |
|--------|----------|-------|
| `Club` | ✅ | e.g. `7-iron`, `Sand Wedge` |
| `Flat_Carry` | ✅ | Carry in yards |
| `Offline` | ✅ | App flips sign automatically (right=negative) |
| `Type` | ✅ | `Clean` or `Mishit` |
| `Shot_No` | optional | Used for dedup on re-upload |
| `Ball_Speed`, `Launch_Angle`, etc. | optional | Stored but not yet displayed |

---

## Future: Migrating to React Native

When you're ready for the App Store, the migration is clean:

1. `computeEllipse`, `haversine`, `parseCSV` — move to `utils/` unchanged
2. `DispersionChart` — swap `<svg>` → `react-native-svg` (1:1 API)
3. `MapView` — swap `mapbox-gl` → `@rnmapbox/maps` (same concepts)
4. `useGPS` — swap `navigator.geolocation` → `expo-location` (same interface)
5. `storage.js` — swap `localStorage` → `@react-native-async-storage/async-storage`

Expo makes steps 3–5 one-line installs. The ellipse math and all business logic
moves over completely untouched.
