import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { CheckCircle2, LoaderCircle, LocateFixed, MapPin, Search } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapPicker.css";

const DEFAULT_CENTER = [77.209, 28.6139];
const DEFAULT_ZOOM = 11;
const OPENFREE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const NOMINATIM_BASE_URL = import.meta.env.VITE_NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
const NOMINATIM_CACHE_KEY = "respark-nominatim-cache-v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

let nominatimCache;
let nominatimRequestQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

function getCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng };
}

function loadCache() {
  if (nominatimCache) return nominatimCache;

  nominatimCache = new Map();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(NOMINATIM_CACHE_KEY) || "[]");
    if (Array.isArray(stored)) {
      stored.forEach(([key, entry]) => nominatimCache.set(key, entry));
    }
  } catch {
    // Session storage is optional; the in-memory cache still prevents duplicate requests.
  }

  return nominatimCache;
}

function persistCache(cache) {
  try {
    window.sessionStorage.setItem(NOMINATIM_CACHE_KEY, JSON.stringify([...cache.entries()]));
  } catch {
    // Browsers can disable storage; requests remain cached for the current page lifetime.
  }
}

function readCachedResult(key) {
  const cache = loadCache();
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    persistCache(cache);
    return null;
  }

  return entry.value;
}

function cacheResult(key, value) {
  const cache = loadCache();
  cache.delete(key);
  cache.set(key, { createdAt: Date.now(), value });

  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }

  persistCache(cache);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function requestNominatim(cacheKey, url) {
  const cached = readCachedResult(cacheKey);
  if (cached) return cached;

  const request = nominatimRequestQueue.then(async () => {
    const queuedCacheHit = readCachedResult(cacheKey);
    if (queuedCacheHit) return queuedCacheHit;

    const elapsed = Date.now() - lastNominatimRequestAt;
    if (elapsed < 1000) await wait(1000 - elapsed);

    lastNominatimRequestAt = Date.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Nominatim request failed with ${response.status}`);

      const data = await response.json();
      cacheResult(cacheKey, data);
      return data;
    } finally {
      window.clearTimeout(timeoutId);
    }
  });

  nominatimRequestQueue = request.catch(() => undefined);
  return request;
}

function getNominatimUrl(pathname, params) {
  const url = new URL(`${NOMINATIM_BASE_URL.replace(/\/$/, "")}/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("accept-language", window.navigator.language || "en");
  return url.toString();
}

async function searchAddress(query) {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  const url = getNominatimUrl("search", {
    q: normalizedQuery,
    limit: "5",
    addressdetails: "1"
  });

  return requestNominatim(`search:${normalizedQuery.toLocaleLowerCase()}`, url);
}

async function reverseGeocode(lat, lng) {
  const roundedLat = Number(lat).toFixed(6);
  const roundedLng = Number(lng).toFixed(6);
  const url = getNominatimUrl("reverse", {
    lat: roundedLat,
    lon: roundedLng,
    zoom: "18",
    addressdetails: "1"
  });

  return requestNominatim(`reverse:${roundedLat},${roundedLng}`, url);
}

export default function MapPicker({ latitude, longitude, onChange, address, onAddressChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const selectCoordinatesRef = useRef(null);
  const reverseRequestIdRef = useRef(0);
  const [initialCoordinates] = useState(() => getCoordinates(latitude, longitude));

  const [mapStatus, setMapStatus] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState(initialCoordinates);
  const [selectedAddress, setSelectedAddress] = useState(initialCoordinates ? address?.trim() || "" : "");
  const [confirmed, setConfirmed] = useState(Boolean(initialCoordinates));

  const placeMarker = useCallback((lat, lng) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      const marker = new maplibregl.Marker({
        color: "#2563eb",
        draggable: true
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      marker.on("dragend", () => {
        const position = marker.getLngLat();
        selectCoordinatesRef.current?.({
          lat: position.lat,
          lng: position.lng,
          moveMap: false
        });
      });

      markerRef.current = marker;
      return;
    }

    markerRef.current.setLngLat([lng, lat]);
  }, []);

  const selectCoordinates = useCallback(async ({ lat, lng, knownAddress = "", moveMap = true }) => {
    const nextCoordinates = {
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6))
    };
    const requestId = ++reverseRequestIdRef.current;

    setSelectedCoordinates(nextCoordinates);
    setConfirmed(false);
    setFeedback(null);
    placeMarker(nextCoordinates.lat, nextCoordinates.lng);

    if (moveMap && mapRef.current) {
      mapRef.current.easeTo({
        center: [nextCoordinates.lng, nextCoordinates.lat],
        zoom: Math.max(mapRef.current.getZoom(), 16),
        duration: 600
      });
    }

    if (knownAddress) {
      setSelectedAddress(knownAddress);
      setReverseGeocoding(false);
      return;
    }

    setSelectedAddress("");
    setReverseGeocoding(true);

    try {
      const result = await reverseGeocode(nextCoordinates.lat, nextCoordinates.lng);
      if (requestId !== reverseRequestIdRef.current) return;

      setSelectedAddress(result?.display_name || "");
      if (!result?.display_name) {
        setFeedback({ type: "warning", message: "Address not found. You can still confirm these coordinates." });
      }
    } catch {
      if (requestId !== reverseRequestIdRef.current) return;
      setFeedback({ type: "warning", message: "Address lookup failed. You can still confirm these coordinates." });
    } finally {
      if (requestId === reverseRequestIdRef.current) setReverseGeocoding(false);
    }
  }, [placeMarker]);

  useEffect(() => {
    selectCoordinatesRef.current = selectCoordinates;
  }, [selectCoordinates]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENFREE_STYLE_URL,
      center: initialCoordinates ? [initialCoordinates.lng, initialCoordinates.lat] : DEFAULT_CENTER,
      zoom: initialCoordinates ? 16 : DEFAULT_ZOOM,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false
    });

    let hasLoaded = false;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      hasLoaded = true;
      setMapStatus("ready");
      map.resize();
    });
    map.on("click", (event) => {
      selectCoordinatesRef.current?.({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        moveMap: false
      });
    });
    map.on("error", (event) => {
      if (!hasLoaded) {
        console.error("MapLibre map failed to load:", event.error);
        setMapStatus("error");
      }
    });

    mapRef.current = map;
    if (initialCoordinates) placeMarker(initialCoordinates.lat, initialCoordinates.lng);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [initialCoordinates, placeMarker]);

  const handleSearch = async (event) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query || searching) return;

    setSearching(true);
    setFeedback(null);
    setSearchResults([]);

    try {
      const results = await searchAddress(query);
      if (!results.length) {
        setFeedback({ type: "error", message: "Location not found. Try a more specific address." });
        return;
      }

      setSearchResults(results);
      setFeedback({ type: "success", message: `${results.length} matching location${results.length === 1 ? "" : "s"} found. Choose the correct one below.` });
    } catch {
      setFeedback({ type: "error", message: "Search failed. Please wait a moment and try again." });
    } finally {
      setSearching(false);
    }
  };

  const chooseSearchResult = async (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setFeedback({ type: "error", message: "This location could not be selected. Please try another result." });
      return;
    }

    const displayName = result.display_name || searchQuery.trim();
    setSearchQuery(displayName);
    setSearchResults([]);
    await selectCoordinates({ lat, lng, knownAddress: displayName });
    setFeedback({ type: "success", message: "Location selected. Review it and confirm below." });
  };

  const useCurrentLocation = () => {
    if (!window.navigator.geolocation) {
      setFeedback({ type: "error", message: "Current location is not supported by this browser." });
      return;
    }

    setLocating(true);
    setFeedback(null);
    window.navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await selectCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setFeedback({ type: "success", message: "Current location selected. Review it and confirm below." });
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        const messages = {
          1: "Location access was denied. Allow it in your browser settings and try again.",
          2: "Your current location is unavailable. Please try again.",
          3: "The location request timed out. Please try again."
        };
        setLocating(false);
        setFeedback({ type: "error", message: messages[error.code] || "Could not get your current location." });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const confirmLocation = () => {
    if (!selectedCoordinates || reverseGeocoding) return;

    onChange?.({
      latitude: selectedCoordinates.lat.toFixed(6),
      longitude: selectedCoordinates.lng.toFixed(6)
    });
    if (selectedAddress) onAddressChange?.(selectedAddress);

    setConfirmed(true);
    setFeedback({ type: "success", message: "Location confirmed and added to the branch form." });
  };

  return (
    <section className="map-picker" aria-label="Branch location picker">
      <form className="map-picker__toolbar" onSubmit={handleSearch}>
        <label className="map-picker__search-field">
          <span className="sr-only">Search for an address</span>
          <Search size={17} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchResults([]);
              setFeedback(null);
            }}
            placeholder="Search an address or place"
            autoComplete="off"
          />
        </label>
        <button className="map-picker__button map-picker__button--search" type="submit" disabled={!searchQuery.trim() || searching}>
          {searching ? <LoaderCircle className="map-picker__spinner" size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
          {searching ? "Searching" : "Search"}
        </button>
        <button className="map-picker__button map-picker__button--location" type="button" onClick={useCurrentLocation} disabled={locating}>
          {locating ? <LoaderCircle className="map-picker__spinner" size={16} aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />}
          {locating ? "Locating" : "Current location"}
        </button>
      </form>

      {feedback && (
        <div className={`map-picker__feedback map-picker__feedback--${feedback.type}`} role="status">
          {feedback.message}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="map-picker__suggestions" aria-label="Location search results">
          <strong>Choose a location</strong>
          <div className="map-picker__suggestion-list">
            {searchResults.map((result) => {
              const resultName = result.name || result.display_name?.split(",")[0] || "Location";
              return (
                <button
                  key={`${result.place_id}-${result.lat}-${result.lon}`}
                  className="map-picker__suggestion"
                  type="button"
                  onClick={() => chooseSearchResult(result)}
                >
                  <span className="map-picker__suggestion-icon"><MapPin size={16} aria-hidden="true" /></span>
                  <span className="map-picker__suggestion-copy">
                    <b>{resultName}</b>
                    <small>{result.display_name}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="map-picker__map-shell">
        <div ref={mapContainerRef} className="map-picker__map" />
        {mapStatus === "loading" && (
          <div className="map-picker__map-message">
            <LoaderCircle className="map-picker__spinner" size={20} aria-hidden="true" />
            Loading map
          </div>
        )}
        {mapStatus === "error" && (
          <div className="map-picker__map-message map-picker__map-message--error">
            The map could not load. Check your connection and try again.
          </div>
        )}
      </div>

      <p className="map-picker__hint">Click anywhere on the map or drag the blue marker to fine-tune the branch location.</p>

      <div className="map-picker__preview" aria-live="polite">
        <div className="map-picker__preview-icon">
          <MapPin size={19} aria-hidden="true" />
        </div>
        <div className="map-picker__preview-copy">
          <strong>Selected address</strong>
          <span>
            {reverseGeocoding
              ? "Finding the address…"
              : selectedAddress || (selectedCoordinates ? "Address unavailable; coordinates are ready to confirm." : "Search, use your current location, or click the map.")}
          </span>
          {selectedCoordinates && (
            <small>{selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}</small>
          )}
        </div>
        <button
          className={`map-picker__confirm${confirmed ? " map-picker__confirm--confirmed" : ""}`}
          type="button"
          onClick={confirmLocation}
          disabled={!selectedCoordinates || reverseGeocoding}
        >
          <CheckCircle2 size={17} aria-hidden="true" />
          {confirmed ? "Location Confirmed" : "Confirm Location"}
        </button>
      </div>

      <div className="map-picker__attribution">
        <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>
        <span>·</span>
        <a href="https://openmaptiles.org" target="_blank" rel="noreferrer">© OpenMapTiles</a>
        <span>·</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
    </section>
  );
}
