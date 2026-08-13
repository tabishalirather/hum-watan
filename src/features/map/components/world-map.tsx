"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPerson } from "@/features/map/queries/get-map-people";

const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const ROLE_COLOR: Record<string, string> = {
  mentee: "#6366f1",
  mentor: "#10b981",
  admin: "#f59e0b",
};

export function WorldMap({ people }: { people: MapPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: OPEN_FREE_MAP_STYLE,
      center: [20, 30],
      zoom: 1.5,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

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
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2)";
      el.style.background = ROLE_COLOR[person.role] ?? "#6366f1";
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

  return <div ref={containerRef} className="h-full w-full" />;
}
