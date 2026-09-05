"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPerson } from "@/features/map/queries/get-map-people";

const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MARKER_COLOR = "#18181b";
const DEFAULT_CENTER: [number, number] = [20, 30];
const DEFAULT_ZOOM = 1.5;

// Turbopack doesn't serve maplibre-gl's worker script at the relative URL it
// expects (derived from its own bundled import.meta.url), so the built-in
// worker silently fails to load and no vector tiles (labels, water, land
// fill) ever get requested. Point it at a static copy in /public instead.
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

// This app intentionally shows no political/administrative borders anywhere
// in the world, only terrain and place names, so the map never implies a
// position on any contested boundary (including Kashmir's).
const BORDER_LAYER_IDS = ["boundary_2", "boundary_3", "boundary_disputed"];
const CITY_LABEL_LAYER_IDS = ["label_city", "label_city_capital"];

// The base map data splits Kashmir into separately named administrative
// labels depending on which country administers each part. We hide those
// and show one unified "Kashmir" label instead, front and center.
const FRAGMENTED_KASHMIR_STATE_NAMES = ["Jammu and Kashmir", "Azad Kashmir"];
const KASHMIR_LABEL_COORDINATES: [number, number] = [74.8, 34.35];

function declutterStyle(map: maplibregl.Map) {
  for (const id of BORDER_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  }
  for (const id of CITY_LABEL_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayerZoomRange(id, 0, 24);
  }
  if (map.getLayer("label_state")) {
    map.setFilter("label_state", [
      "all",
      ["==", ["get", "class"], "state"],
      ["!", ["in", ["get", "name_en"], ["literal", FRAGMENTED_KASHMIR_STATE_NAMES]]],
    ] as maplibregl.FilterSpecification);
  }
}

function addKashmirLabel(map: maplibregl.Map) {
  if (!map.getSource("kashmir-label")) {
    map.addSource("kashmir-label", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: KASHMIR_LABEL_COORDINATES },
            properties: {},
          },
        ],
      },
    });
  }

  if (!map.getLayer("kashmir-label-layer")) {
    map.addLayer({
      id: "kashmir-label-layer",
      type: "symbol",
      source: "kashmir-label",
      layout: {
        "text-field": "Kashmir",
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 0, 15, 3, 21, 6, 28, 10, 34],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.12,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#0a0a0a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2.2,
      },
    });
  }
}

export function WorldMap({
  people,
  focusPoints = [],
}: {
  people: MapPerson[];
  focusPoints?: { lat: number; lng: number }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const skipFocusResetRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: OPEN_FREE_MAP_STYLE,
      center: [20, 30],
      zoom: 1.5,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current.on("load", () => {
      if (!mapRef.current) return;
      declutterStyle(mapRef.current);
      addKashmirLabel(mapRef.current);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const person of people) {
      const isCoordinator = person.coordinatorLevel !== "none";
      const el = document.createElement("div");
      el.style.width = isCoordinator ? "18px" : "12px";
      el.style.height = isCoordinator ? "18px" : "12px";
      el.style.borderRadius = "9999px";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
      el.style.background = MARKER_COLOR;
      el.style.cursor = "pointer";

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-size:13px;line-height:1.4">
          <strong>${person.name ?? "Anonymous"}</strong><br/>
          ${isCoordinator ? `${person.coordinatorLevel} coordinator<br/>` : ""}
          ${person.subject ?? ""} ${person.degreeLevel ? `(${person.degreeLevel})` : ""}<br/>
          ${person.universityName}, ${person.cityName}, ${person.countryName}
        </div>`,
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([person.lng, person.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [people]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focusPoints.length === 0) {
      // Skip the very first run (mount) so the map doesn't replay its own
      // default view as an animation; only resets on an actual filter clear.
      if (skipFocusResetRef.current) {
        skipFocusResetRef.current = false;
        return;
      }
      map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 800 });
      return;
    }
    skipFocusResetRef.current = false;

    if (focusPoints.length === 1) {
      const [point] = focusPoints;
      map.flyTo({ center: [point.lng, point.lat], zoom: 9, duration: 800 });
      return;
    }

    const [first, ...rest] = focusPoints;
    const bounds = rest.reduce(
      (b, point) => b.extend([point.lng, point.lat]),
      new maplibregl.LngLatBounds([first.lng, first.lat], [first.lng, first.lat]),
    );
    map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 800 });
  }, [focusPoints]);

  return <div ref={containerRef} className="h-full w-full" />;
}
