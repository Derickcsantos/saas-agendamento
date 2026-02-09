"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function RotaPage({ slug }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [orgName, setOrgName] = useState("");
  const [travelMode, setTravelMode] = useState("driving");
  const [copied, setCopied] = useState(false);
  const [originCep, setOriginCep] = useState("");
  const [originNumber, setOriginNumber] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [useUserLocation, setUseUserLocation] = useState(true);
  const { palette } = useOrganizationColors(slug);

  const addRouteLayer = (mapInstance, route) => {
    if (!route) return;

    const sourceId = "route";
    if (mapInstance.getSource(sourceId)) {
      mapInstance.removeLayer("route-line");
      mapInstance.removeSource(sourceId);
    }

    mapInstance.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: route,
      },
    });

    mapInstance.addLayer({
      id: "route-line",
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette?.strong_color || "#7c3aed",
        "line-width": 5,
      },
    });

    if (route?.coordinates?.length) {
      const bounds = route.coordinates.reduce(
        (b, coord) => b.extend(coord),
        new mapboxgl.LngLatBounds(route.coordinates[0], route.coordinates[0])
      );
      mapInstance.fitBounds(bounds, { padding: 60, duration: 800 });
    }
  };

  const initMap = ({ destination, route, userLocation }) => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_KEY;
    if (typeof mapboxgl.setTelemetryEnabled === "function") {
      mapboxgl.setTelemetryEnabled(false);
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [destination.lng, destination.lat],
      zoom: 13,
      transformRequest: (url) => {
        if (url.startsWith("https://api.mapbox.com")) {
          return { url, credentials: "omit" };
        }
        return { url };
      },
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    new mapboxgl.Marker({ color: "#7c3aed" })
      .setLngLat([destination.lng, destination.lat])
      .setPopup(new mapboxgl.Popup().setText(orgName || "Destino"))
      .addTo(mapRef.current);

    if (userLocation) {
      new mapboxgl.Marker({ color: "#2563eb" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setText("Sua localização"))
        .addTo(mapRef.current);
    }

    if (route) {
      mapRef.current.on("load", () => {
        addRouteLayer(mapRef.current, route);
      });
    }
  };

  const fetchRoute = async (userCoords, mode, origin) => {
    const params = new URLSearchParams();
    if (userCoords) {
      params.set("start_lng", userCoords.lng);
      params.set("start_lat", userCoords.lat);
    }
    if (mode) params.set("mode", mode);
    if (origin) params.set("origin_address", origin);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}/route?${params.toString()}`,
      { credentials: "include" }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Falha ao carregar rota");
    }

    return res.json();
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_KEY) {
          throw new Error("MAPBOX_PUBLIC_KEY não configurada");
        }

        const getLocation = () =>
          new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);

            navigator.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  lng: pos.coords.longitude,
                  lat: pos.coords.latitude,
                });
              },
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          });

        const userLocation = useUserLocation ? await getLocation() : null;
        setLocationUnavailable(useUserLocation && !userLocation);

        const data = await fetchRoute(userLocation, travelMode, originAddress);

        if (cancelled) return;

        setOrgName(data?.organization?.name || "");
        setAddress(data?.organization?.address || "");

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        initMap({
          destination: data.destination,
          route: data.route,
          userLocation,
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "Erro ao carregar rota");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [slug, travelMode, originAddress, useUserLocation]);

  const handleOriginSubmit = () => {
    const cep = originCep.replace(/\D/g, "");
    const number = originNumber.trim();
    if (!cep || !number) return;

    const formattedCep = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
    setOriginAddress(`CEP ${formattedCep}, ${number}`);
    setUseUserLocation(false);
  };

  const handleUseLocation = () => {
    setOriginAddress("");
    setUseUserLocation(true);
  };

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const googleMapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "https://www.google.com/maps";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-6xl flex-col gap-5">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 sm:p-6 shadow-[0_16px_50px_rgba(15,23,42,0.12)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/80"
          style={{
            backgroundImage: `radial-gradient(1200px 300px at 20% -30%, ${palette?.soft_color || "#e0e7ff"}55, transparent)`
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Como chegar
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {orgName ? `${orgName} — ` : ""}{address || "Carregando endereço..."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleUseLocation}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition"
                style={{ backgroundColor: palette?.strong_color || "#7c3aed" }}
              >
                Usar minha localização
              </button>
              <button
                onClick={handleCopy}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {copied ? "Endereço copiado" : "Copiar endereço"}
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg transition"
                style={{ backgroundColor: palette?.strong_color || "#7c3aed" }}
              >
                Abrir no Google Maps
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-3xl border border-white/60 bg-white/95 p-3 sm:p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
          {(locationUnavailable || !useUserLocation) && !originAddress && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Informe CEP e número para calcular a rota com mais precisão.
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
                <input
                  value={originCep}
                  onChange={(e) => setOriginCep(e.target.value)}
                  placeholder="CEP"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none dark:border-amber-500/40 dark:bg-gray-900 dark:text-gray-100"
                />
                <input
                  value={originNumber}
                  onChange={(e) => setOriginNumber(e.target.value)}
                  placeholder="Número"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none dark:border-amber-500/40 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleOriginSubmit}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: palette?.strong_color || "#7c3aed" }}
                >
                  Calcular rota
                </button>
              </div>
            </div>
          )}
          <div className="relative flex-1 overflow-hidden rounded-2xl">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Carregando mapa...
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500">
                {error}
              </div>
            )}

            <div
              ref={mapContainerRef}
              className={`absolute inset-0 ${loading || error ? "hidden" : "block"}`}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-50 w-[94%] max-w-xl -translate-x-1/2 sm:bottom-6">
        <div className="flex items-center justify-between gap-1 rounded-2xl border border-white/60 bg-white/95 px-2 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          {[
            { key: "driving", label: "Carro" },
            { key: "walking", label: "Caminhada" },
            { key: "cycling", label: "Bicicleta" },
            { key: "driving-traffic", label: "Trânsito" },
          ].map((item) => {
            const active = travelMode === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTravelMode(item.key)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "text-white shadow"
                    : "text-gray-600 dark:text-gray-300"
                }`}
                style={
                  active
                    ? { backgroundColor: palette?.strong_color || "#7c3aed" }
                    : { backgroundColor: "transparent" }
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
