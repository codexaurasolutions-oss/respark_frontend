import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_CENTER = { lat: 25.407492, lng: 68.361368 };
const DEFAULT_ZOOM = 12;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function MapPicker({ latitude, longitude, onChange, address, onAddressChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locStatus, setLocStatus] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const onChangeRef = useRef(onChange);
  const onAddressChangeRef = useRef(onAddressChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  const hasCoords = latitude !== "" && latitude != null && longitude !== "" && longitude != null;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const initMap = useCallback(async () => {
    if (!apiKey) { setNoKey(true); return; }
    try {
      await loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`);
      const center = hasCoords ? { lat: Number(latitude), lng: Number(longitude) } : DEFAULT_CENTER;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: hasCoords ? 15 : DEFAULT_ZOOM,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        mapId: "respark-branch-picker"
      });

      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        animation: window.google.maps.Animation.DROP
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        onChangeRef.current({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
        reverseGeocode(lat, lng);
      });

      map.addListener("click", (e) => {
        marker.setPosition(e.latLng);
        marker.setAnimation(null);
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onChangeRef.current({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
        reverseGeocode(lat, lng);
      });

      if (inputRef.current) {
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry.location", "name"]
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.geometry || !place.geometry.location) return;
          const loc = place.geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          map.setCenter(loc);
          map.setZoom(16);
          marker.setPosition(loc);
          onChangeRef.current({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
          const addr = place.formatted_address || place.name || "";
          if (addr && onAddressChangeRef.current) {
            onAddressChangeRef.current(addr);
          }
          setSearchQuery(addr);
        });
        autocompleteRef.current = ac;
      }

      mapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    } catch (err) {
      console.error("Google Maps failed to load:", err);
      setNoKey(true);
    }
  }, [apiKey, hasCoords, latitude, longitude]);

  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!onAddressChangeRef.current) return;
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (result.results && result.results[0]) {
        onAddressChangeRef.current(result.results[0].formatted_address);
      }
    } catch {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
          headers: { "User-Agent": "ResparkApp/1.0" }
        });
        const data = await res.json();
        if (data.display_name) onAddressChangeRef.current(data.display_name);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    initMap();
    return () => {
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initMap]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!hasCoords) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.setCenter(pos);
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom(), 15));
    }
  }, [latitude, longitude, hasCoords]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ address: q });
        if (result.results && result.results[0]) {
          const loc = result.results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          if (mapRef.current && markerRef.current) {
            mapRef.current.setCenter(loc);
            mapRef.current.setZoom(16);
            markerRef.current.setPosition(loc);
          }
          onChangeRef.current({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
          const addr = result.results[0].formatted_address || q;
          setSearchQuery(addr);
          if (onAddressChangeRef.current) onAddressChangeRef.current(addr);
          setSearching(false);
          return;
        }
      }
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`, {
        headers: { "User-Agent": "ResparkApp/1.0" }
      });
      const results = await res.json();
      if (!results.length) {
        setSearchError("Location not found. Try a different search.");
        setSearching(false);
        return;
      }
      const { lat, lon, display_name } = results[0];
      if (mapRef.current && markerRef.current) {
        mapRef.current.setCenter({ lat: parseFloat(lat), lng: parseFloat(lon) });
        mapRef.current.setZoom(16);
        markerRef.current.setPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });
      }
      onChangeRef.current({ latitude: parseFloat(lat).toFixed(6), longitude: parseFloat(lon).toFixed(6) });
      setSearchQuery(display_name || q);
      if (onAddressChangeRef.current && display_name) onAddressChangeRef.current(display_name);
    } catch {
      setSearchError("Search failed. Please try again.");
    }
    setSearching(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocStatus("");
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onChangeRef.current({ latitude: String(lat.toFixed(6)), longitude: String(lng.toFixed(6)) });
        if (mapRef.current && markerRef.current) {
          const p = { lat, lng };
          mapRef.current.setCenter(p);
          mapRef.current.setZoom(16);
          markerRef.current.setPosition(p);
        }
        reverseGeocode(lat, lng);
        setLocating(false);
        setLocStatus("Location found!");
        setTimeout(() => setLocStatus(""), 3000);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setLocStatus("Location access denied. Please allow location in browser settings.");
        else if (err.code === 2) setLocStatus("Location unavailable. Try again.");
        else if (err.code === 3) setLocStatus("Location request timed out. Try again.");
        else setLocStatus("Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (noKey) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ padding: 20, background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 8, textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#92400e" }}>Google Maps API key not found</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#78350f" }}>
            Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your <code>.env</code> file and restart the dev server.
          </p>
        </div>
        <div ref={mapContainerRef} style={{ height: 280, width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", background: "#f1f5f9" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSearchError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          placeholder="Search address, shop, or place..."
          style={{ flex: 1, padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}
        />
        <button type="button" onClick={handleSearch} disabled={searching} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #0f766e", background: "#f0fdfa", color: "#0f766e", fontWeight: 600, fontSize: 13, cursor: searching ? "wait" : "pointer", whiteSpace: "nowrap", opacity: searching ? 0.6 : 1 }}>
          {searching ? "Searching..." : "Search"}
        </button>
        <button type="button" onClick={useMyLocation} disabled={locating} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#eff6ff", color: "#1d4ed8", fontWeight: 600, fontSize: 13, cursor: locating ? "wait" : "pointer", whiteSpace: "nowrap", opacity: locating ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          {locating && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
          {locating ? "Locating..." : "My Location"}
        </button>
      </div>
      {searchError && <div style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px" }}>{searchError}</div>}
      {locStatus && <div style={{ fontSize: 13, color: locStatus.includes("found") ? "#166534" : "#b91c1c", background: locStatus.includes("found") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${locStatus.includes("found") ? "#bbf7d0" : "#fecaca"}`, borderRadius: 6, padding: "6px 10px" }}>{locStatus}</div>}
      <div ref={mapContainerRef} style={{ height: 280, width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }} />
      <div style={{ fontSize: 12, color: "#64748b" }}>
        Click on the map or drag the marker. Selected: {hasCoords ? `${latitude}, ${longitude}` : "Not set"}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
