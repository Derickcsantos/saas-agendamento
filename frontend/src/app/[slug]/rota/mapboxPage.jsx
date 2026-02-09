"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { Router } from "lucide-react";

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
      if (mapInstance.getLayer("route-line")) {
        mapInstance.removeLayer("route-line");
      }
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
        setLoading(true);
        setError("");
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
                onClick={() => window.location.href=`/${slug}`}
                className="rounded-xl px-4 py-2 text-sm border border-gray-200 font-semibold text-white shadow-lg transition"
                style={{ backgroundColor: "#ffffff"|| "#7c3aed" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="-19.04 0 75.803 75.803"
                >
                  <g
                    id="Group_64"
                    data-name="Group 64"
                    transform="translate(-624.082 -383.588)"
                  >
                    <path
                      id="Path_56"
                      fill={palette?.strong_color || "#7c3aed"}
                      d="M660.313 383.588a1.5 1.5 0 0 1 1.06 2.561l-33.556 33.56a2.53 2.53 0 0 0 0 3.564l33.556 33.558a1.5 1.5 0 0 1-2.121 2.121L625.7 425.394a5.527 5.527 0 0 1 0-7.807l33.556-33.559a1.5 1.5 0 0 1 1.057-.44"
                      data-name="Path 56"
                    ></path>
                  </g>
                </svg>
              </button>
              <button
                onClick={handleCopy}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg transition"
                style={{ backgroundColor: palette?.strong_color || "#7c3aed" }}
              >
                <div className="flex">
                  <span className="px-2">Google Maps</span> <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 48 48"
                    >
                      <path
                        fill="#48b564"
                        d="M35.76 26.36h.01S32 31.89 28.83 36c-2.74 3.55-3.54 6.59-3.77 8.06-.09.54-.53.94-1.06.94s-.97-.4-1.06-.94c-.23-1.47-1.03-4.51-3.77-8.06-.42-.55-.85-1.12-1.28-1.7L28.24 22l8.33-9.88c.92 1.93 1.43 4.09 1.43 6.38 0 2.9-.83 5.59-2.24 7.86"
                      ></path>
                      <path
                        fill="#fcc60e"
                        d="M28.24 22 17.89 34.3c-2.82-3.78-5.66-7.94-5.66-7.94h.01c-.3-.48-.57-.97-.8-1.48L19.76 15c-.79.95-1.26 2.17-1.26 3.5 0 3.04 2.46 5.5 5.5 5.5 1.71 0 3.24-.78 4.24-2"
                      ></path>
                      <path
                        fill="#2c85eb"
                        d="m28.4 4.74-8.57 10.18-6.56-5.72C15.83 6.02 19.69 4 24 4c1.54 0 3.02.26 4.4.74"
                      ></path>
                      <path
                        fill="#ed5748"
                        d="m19.83 14.92-.07.08-8.32 9.88C10.52 22.95 10 20.79 10 18.5c0-3.54 1.23-6.79 3.27-9.3z"
                      ></path>
                      <path
                        fill="#5695f6"
                        d="M28.24 22c.79-.95 1.26-2.17 1.26-3.5 0-3.04-2.46-5.5-5.5-5.5-1.71 0-3.24.78-4.24 2L28.4 4.74c3.59 1.22 6.53 3.91 8.17 7.38z"
                      ></path>
                    </svg>
                </div>
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
