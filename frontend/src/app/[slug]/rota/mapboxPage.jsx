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
  const { palette } = useOrganizationColors(slug);

  const initMap = ({ destination, route, userLocation }) => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_KEY;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [destination.lng, destination.lat],
      zoom: 13,
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
        mapRef.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route,
          },
        });

        mapRef.current.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#7c3aed",
            "line-width": 5,
          },
        });
      });
    }
  };

  const fetchRoute = async (userCoords, mode) => {
    const params = new URLSearchParams();
    if (userCoords) {
      params.set("start_lng", userCoords.lng);
      params.set("start_lat", userCoords.lat);
    }
    if (mode) params.set("mode", mode);

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

        const userLocation = await getLocation();
        const data = await fetchRoute(userLocation, travelMode);

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
  }, [slug, travelMode]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/70"
          style={{
            backgroundImage: `radial-gradient(1200px 300px at 20% -30%, ${palette?.soft_color || "#e0e7ff"}55, transparent)`
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Como chegar
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {orgName ? `${orgName} — ` : ""}{address || "Carregando endereço..."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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

        <div className="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          {loading && (
            <div className="flex h-[520px] items-center justify-center text-gray-500">
              Carregando mapa...
            </div>
          )}

          {error && !loading && (
            <div className="flex h-[520px] items-center justify-center text-red-500">
              {error}
            </div>
          )}

          <div
            ref={mapContainerRef}
            className={`h-[520px] w-full rounded-2xl ${loading || error ? "hidden" : "block"}`}
          />
        </div>
      </div>

      <div className="fixed bottom-5 left-1/2 z-50 w-[92%] max-w-xl -translate-x-1/2">
        <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/90 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
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
