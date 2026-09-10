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

export type ChatRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

type ContactAction = {
  canRequest: boolean;
  viewerUserId: string;
  statusByMentorId: Map<string, ChatRequestStatus>;
  onRequestContact: (mentorUserId: string) => Promise<{ success?: boolean; error?: string }>;
};

// Every mentor at the same university shares that university's single
// lat/lng (the data model doesn't track individual campus positions), so
// two or more mentors there would otherwise render as perfectly overlapping
// markers with only the topmost one clickable. Group them into one marker
// with a count badge instead — this holds regardless of how many people end
// up at one university.
function clusterByLocation(people: MapPerson[]) {
  const clusters = new Map<string, { lat: number; lng: number; people: MapPerson[] }>();
  for (const person of people) {
    const key = `${person.lat},${person.lng}`;
    const cluster = clusters.get(key);
    if (cluster) {
      cluster.people.push(person);
    } else {
      clusters.set(key, { lat: person.lat, lng: person.lng, people: [person] });
    }
  }
  return Array.from(clusters.values());
}

function buildPersonRow(person: MapPerson, contact: ContactAction | undefined) {
  const isCoordinator = person.coordinatorLevel !== "none";
  const row = document.createElement("div");
  row.style.fontSize = "13px";
  row.style.lineHeight = "1.4";

  const name = document.createElement("strong");
  name.textContent = person.name ?? "Anonymous";
  row.append(name, document.createElement("br"));

  if (isCoordinator) {
    row.append(
      document.createTextNode(`${person.coordinatorLevel} coordinator`),
      document.createElement("br"),
    );
  }

  row.append(
    document.createTextNode(
      `${person.subject ?? ""} ${person.degreeLevel ? `(${person.degreeLevel})` : ""}`,
    ),
  );

  if (contact?.canRequest && person.mentorUserId && person.mentorUserId !== contact.viewerUserId) {
    const mentorUserId = person.mentorUserId;
    const requestStatus = contact.statusByMentorId.get(mentorUserId);
    const button = document.createElement("button");
    button.type = "button";
    button.style.display = "block";
    button.style.marginTop = "6px";
    button.style.width = "100%";
    button.style.borderRadius = "9999px";
    button.style.border = "none";
    button.style.padding = "6px 10px";
    button.style.fontSize = "12px";
    button.style.fontWeight = "600";
    button.style.cursor = "pointer";

    const setState = (label: string, disabled: boolean, color: string) => {
      button.textContent = label;
      button.disabled = disabled;
      button.style.background = color;
      button.style.color = disabled ? "#3f3f46" : "white";
      button.style.opacity = disabled ? "0.75" : "1";
      button.style.cursor = disabled ? "default" : "pointer";
    };

    if (requestStatus === "pending") {
      setState("Request sent", true, "#e4e4e7");
    } else if (requestStatus === "accepted") {
      setState("Connected", true, "#e4e4e7");
    } else {
      setState("Request contact", false, MARKER_COLOR);
    }

    button.addEventListener("click", async () => {
      setState("Sending…", true, "#e4e4e7");
      const result = await contact.onRequestContact(mentorUserId);
      if (result.error) {
        setState("Request contact", false, MARKER_COLOR);
        window.alert(result.error);
        return;
      }
      setState("Request sent", true, "#e4e4e7");
    });

    row.append(button);
  }

  return row;
}

export function WorldMap({
  people,
  focusPoints = [],
  contact,
}: {
  people: MapPerson[];
  focusPoints?: { lat: number; lng: number }[];
  contact?: ContactAction;
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

    for (const cluster of clusterByLocation(people)) {
      const count = cluster.people.length;
      const hasCoordinator = cluster.people.some((p) => p.coordinatorLevel !== "none");
      const el = document.createElement("div");
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.borderRadius = "9999px";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
      el.style.background = MARKER_COLOR;
      el.style.cursor = "pointer";

      if (count > 1) {
        // Scales gently with count but stays capped so a university with
        // hundreds of mentors doesn't produce an enormous marker.
        const size = Math.min(20 + Math.round(Math.sqrt(count) * 6), 44);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.color = "white";
        el.style.fontSize = size > 28 ? "13px" : "11px";
        el.style.fontWeight = "700";
        el.textContent = String(count);
        if (hasCoordinator) el.style.outline = "2px solid #f59e0b";
      } else {
        const isCoordinator = hasCoordinator;
        el.style.width = isCoordinator ? "18px" : "12px";
        el.style.height = isCoordinator ? "18px" : "12px";
      }

      const popupContent = document.createElement("div");
      popupContent.style.maxWidth = "240px";

      const first = cluster.people[0];
      const location = document.createElement("div");
      location.style.fontSize = "12px";
      location.style.fontWeight = "600";
      location.style.marginBottom = "6px";
      location.textContent = `${first.universityName}, ${first.cityName}, ${first.countryName}`;
      popupContent.append(location);

      if (count > 1) {
        const summary = document.createElement("div");
        summary.style.fontSize = "11px";
        summary.style.color = "#71717a";
        summary.style.marginBottom = "8px";
        summary.textContent = `${count} mentors here`;
        popupContent.append(summary);
      }

      const list = document.createElement("div");
      if (count > 1) {
        list.style.maxHeight = "260px";
        list.style.overflowY = "auto";
        list.style.paddingRight = "4px";
      }
      cluster.people.forEach((person, index) => {
        const row = buildPersonRow(person, contact);
        if (index > 0) row.style.marginTop = "10px";
        if (count > 1 && index > 0) {
          row.style.borderTop = "1px solid #e4e4e7";
          row.style.paddingTop = "8px";
        }
        list.append(row);
      });
      popupContent.append(list);

      const popup = new maplibregl.Popup({ offset: 12, maxWidth: "260px" }).setDOMContent(popupContent);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cluster.lng, cluster.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [people, contact]);

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
