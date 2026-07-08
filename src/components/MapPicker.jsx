import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [24.8607, 67.0011];
const DEFAULT_ZOOM = 12;

export default function MapPicker({ latitude, longitude, onChange, address, onAddressChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locStatus, setLocStatus] = useState("");
  const onChangeRef = useRef(onChange);
  const onAddressChangeRef = useRef(onAddressChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  const hasCoords = latitude !== "" && latitude != null && longitude !== "" && longitude != null;

  const placeMarker = useCallback((map, lat, lng) => {
    if (!map) return;
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    } else {
      circleRef.current = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: "#0f766e",
        color: "#fff",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 4,
        fillColor: "#fff",
        color: "#0f766e",
        weight: 0,
        fillOpacity: 1
      }).addTo(map);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!onAddressChangeRef.current) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
        headers: { "User-Agent": "SkillifyApp/1.0" }
      });
      const data = await res.json();
      if (data.display_name) {
        onAddressChangeRef.current(data.display_name);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const startLat = hasCoords ? Number(latitude) : DEFAULT_CENTER[0];
    const startLng = hasCoords ? Number(longitude) : DEFAULT_CENTER[1];

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([startLat, startLng], DEFAULT_ZOOM);

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    if (hasCoords) {
      placeMarker(map, startLat, startLng);
    }

    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      placeMarker(map, clickLat, clickLng);
      onChangeRef.current({ latitude: String(clickLat.toFixed(6)), longitude: String(clickLng.toFixed(6)) });
      reverseGeocode(clickLat, clickLng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!hasCoords) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      placeMarker(map, lat, lng);
      map.setView([lat, lng], Math.max(map.getZoom(), 15));
    }
  }, [latitude, longitude, hasCoords, placeMarker]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: { "User-Agent": "SkillifyApp/1.0" }
      });
      const results = await res.json();
      if (!results.length) {
        setSearchError("Location not found. Try a different search.");
        setSearching(false);
        return;
      }
      const { lat, lon, display_name } = results[0];
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([parseFloat(lat), parseFloat(lon)], 16);
        placeMarker(map, parseFloat(lat), parseFloat(lon));
      }
      onChangeRef.current({ latitude: parseFloat(lat).toFixed(6), longitude: parseFloat(lon).toFixed(6) });
      if (onAddressChangeRef.current && display_name) {
        onAddressChangeRef.current(display_name);
      }
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
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([lat, lng], 16);
          placeMarker(map, lat, lng);
        }
        reverseGeocode(lat, lng);
        setLocating(false);
        setLocStatus("Location found!");
        setTimeout(() => setLocStatus(""), 3000);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocStatus("Location access denied. Please allow location in browser settings.");
        } else if (err.code === 2) {
          setLocStatus("Location unavailable. Try again.");
        } else if (err.code === 3) {
          setLocStatus("Location request timed out. Try again.");
        } else {
          setLocStatus("Could not get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          placeholder="Search address (e.g. Johar Town Lahore)"
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
      <div ref={mapRef} style={{ height: 280, width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }} />
      <div style={{ fontSize: 12, color: "#64748b" }}>
        Click on the map to set branch location. Selected: {hasCoords ? `${latitude}, ${longitude}` : "Not set"}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
